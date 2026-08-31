
import { SQLJob } from "@ibm/mapepire-js";
import { Query } from "@ibm/mapepire-js/dist/src/query";
import { JDBCOptions, QueryOptions, QueryResult } from "@ibm/mapepire-js/dist/src/types";
import { getInstance } from "../base";
import { askAboutNewJob, Config, osDetail } from "../config";
import Configuration from "../configuration";
import { ConfigManager } from "../views/jobManager/ConfigManager";
import { SelfValue } from "../views/jobManager/selfCodes/nodes";
import { ExtendedSQLJob, extendSQLJob } from "./extendedSQLJob";

export interface JobInfo {
  name: string;
  job: ExtendedSQLJob;
}

export type NamingFormats = "sql" | "system";

const NO_SELECTED_JOB = -1;

export class SQLJobManager {
  private totalJobs = 0;
  private readonly jobs: JobInfo[] = [];
  selectedJob: number = NO_SELECTED_JOB;
  private creatingJobs: number = 0;

  constructor() { }

  async newJob(options?: JDBCOptions, name?: string) {
    const connection = getInstance().getConnection()!;
    const config = connection.getConfig();
    const mapepire = await connection.getComponent<any>("mapepire");

    if (!options) {
      options = ConfigManager.getDefaultConfig();
      const startUpConfigList = Config.getStartUpConfigList();
      const startUpConfig = startUpConfigList.find((item) => item.connectionName === connection.currentConnectionName);
      if (startUpConfig) {
        const savedConfig = ConfigManager.getConfig(startUpConfig.configName);
        if (savedConfig) {
          name = startUpConfig.configName;
          options = savedConfig;
        }
      }

      if (!options.libraries) {
        options.libraries = [config.currentLibrary, ...config.libraryList.filter((item) => item != config.currentLibrary)];
      }
    }

    try {
      this.creatingJobs += 1;
      const newJob = extendSQLJob(await mapepire.newJob(connection, { jdbc: options }));

      if (osDetail) {
        const features = osDetail.getFeatures();
        const selfDefault = SQLJobManager.getSelfDefault();
        if (features.SELF && selfDefault !== `*NONE`) {
          await newJob.setSelfState(selfDefault);
        }
      }

      this.totalJobs += 1;

      this.jobs.push({
        name: `${name || 'New job'} (${this.totalJobs})`,
        job: newJob
      });

      this.selectedJob = this.jobs.length - 1;
      return newJob;
    } catch (e: any) {
      throw e;
    } finally {
      this.creatingJobs -= 1;
    }
  }

  isCreatingJob() {
    return this.creatingJobs > 0;
  }

  getRunningJobs() {
    return this.jobs.filter(info => ["ready", "busy"].includes(info.job.getStatus()));
  }

  /**
   * Ends all SQL jobs (unless the connection is gone) and clears the jobs list.
   * 
   * @param disconnected must be `true` if the connection is already lost to skip closing the SQL jobs
   */
  async endAll(disconnected?: boolean) {
    if (!disconnected) {
      await Promise.all(this.jobs.map(current => current.job.close()));
    }
    this.jobs.splice(0, this.jobs.length);
    this.selectedJob = NO_SELECTED_JOB;
    this.creatingJobs = 0;
    this.totalJobs = 0;
  }

  async closeJobById(job: SQLJob) {
    const index = this.jobs.findIndex(j => j.job.id === job.id);
    if (index > -1) {
      return this.closeJob(index);
    }
  }

  async closeJobByName(name: string) {
    const index = this.jobs.findIndex(info => info.name === name);
    if (index > -1) {
      return this.closeJob(index);
    }
  }

  async closeJob(index: number) {
    if (this.jobs[index]) {
      const selected: JobInfo = this.jobs[index];

      selected.job.close();
      this.jobs.splice(index, 1);
      this.selectedJob = this.selectedJob - 1;
    }
  }

  getSelection(): JobInfo | undefined {
    return this.jobs[this.selectedJob];
  }

  getAllJobs(): JobInfo[] {
    return this.jobs;
  }

  getJob(nameOrId: string): JobInfo | undefined {
    return this.jobs.find(info => info.name === nameOrId || info.job.id === nameOrId);
  }

  setSelection(selectedName: string): JobInfo | undefined {
    const jobExists = this.jobs.findIndex(info => info.name === selectedName);

    this.selectedJob = jobExists;

    return this.jobs[jobExists];
  }

  private resetCurrentSchema(query: string, job: ExtendedSQLJob) {
    if (query.toUpperCase().startsWith(`SET`)) {
      const newSchema = query.split(` `)[2];
      if (newSchema) {
        job.resetCurrentSchemaCache();
      }
    }
    return query;
  }

  async runSQL<T>(query: string, opts?: QueryOptions, rowsToFetch = 2147483647): Promise<T[]> {
    // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
    // int. This is the largest number available without overflow (Integer.MAX_VALUE)

    // const s = performance.now()
    // console.log(`Running statement: ${query.padEnd(40).substring(0, 40)}`);

    const statement = await this.getPagingStatement<T>(query, opts);
    const results = await statement.execute(rowsToFetch);
    statement.close();

    this.resetCurrentSchema(query, this.jobs[this.selectedJob].job);
    return results.data;
  }

  async runSQLVerbose<T>(query: string, opts?: QueryOptions, rowsToFetch = 2147483647): Promise<QueryResult<T>> {
    // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
    // int. This is the largest number available without overflow (Integer.MAX_VALUE)

    const statement = await this.getPagingStatement<T>(query, opts);
    const results = await statement.execute(rowsToFetch);
    statement.close();

    this.resetCurrentSchema(query, this.jobs[this.selectedJob].job);
    return results;
  }

  async getPagingStatement<T>(query: string, opts?: QueryOptions): Promise<Query<T>> {
    const selected = this.jobs[this.selectedJob];
    if (selected) {
      this.resetCurrentSchema(query, selected?.job);
      return selected.job.query<T>(query, opts);
    } else {
      const hasNewJob = await askAboutNewJob();
      if (hasNewJob) {
        return this.getPagingStatement(query, opts);
      } else {
        throw new Error(`Active SQL job is required. Please spin one up in the 'SQL Job Manager' view and try again.`);
      }
    }
  }

  static getSelfDefault(): SelfValue {
    return Configuration.get<SelfValue>(`jobManager.jobSelfDefault`) || `*NONE`;
  }
}
