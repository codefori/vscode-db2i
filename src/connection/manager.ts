
import { getInstance } from "../base";
import { Query } from "./query";
import { ServerComponent, UpdateStatus } from "./serverComponent";
import { JobStatus, SQLJob } from "./sqlJob";
import { QueryOptions } from "./types";
import { askAboutNewJob, onConnectOrServerInstall } from "../config";

export interface JobInfo {
  name: string;
  job: SQLJob;
}

export class SQLJobManager {
  private totalJobs = 0;
  private jobs: JobInfo[] = [];
  selectedJob: number = -1;

  constructor() { }

  async newJob(predefinedJob?: SQLJob, name?: string) {
    if (ServerComponent.isInstalled()) {
      const instance = getInstance();
      const config = instance.getConfig();

      const newJob = predefinedJob || (new SQLJob({
        libraries: [config.currentLibrary, ...config.libraryList],
        naming: `system`,
        "full open": false,
        "transaction isolation": "none",
        "query optimize goal": "1",
        "block size": "512"
      }));

      try {
        await newJob.connect();

        this.totalJobs += 1;

        this.jobs.push({
          name: `${name || 'New job'} ${this.totalJobs}`,
          job: newJob
        });

        this.selectedJob = this.jobs.length - 1;
      } catch (e: any) {
        throw e;
      }
    }
  }

  getRunningJobs() {
    return this.jobs.filter(info => [JobStatus.Ready, JobStatus.Active].includes(info.job.getStatus()));
  }

  async endAll() {
    await Promise.all(this.jobs.map(current => current.job.close()));
    this.jobs = [];
    this.selectedJob = -1;
  }

  async closeJob(index?: number) {
    if (this.jobs[index]) {
      const selected: JobInfo = this.jobs[index];

      selected.job.close();
      this.jobs.splice(index, 1);
      this.selectedJob = this.selectedJob - 1;
    }
  }

  closeJobByName(name: string) {
    const id = this.jobs.findIndex(info => info.name === name);
    return this.closeJob(id);
  }

  getSelection(): JobInfo | undefined {
    return this.jobs[this.selectedJob];
  }

  getAllJobs(): JobInfo[] {
    return this.jobs;
  }

  getJob(name: string): JobInfo | undefined {
    return this.jobs.find(info => info.name === name);
  }

  setSelection(selectedName: string): boolean {
    const jobExists = this.jobs.findIndex(info => info.name === selectedName);

    this.selectedJob = jobExists;

    return (this.selectedJob >= 0);
  }

  /**
   * Runs SQL
   * @param query the SQL query
   * @param parameters the list of parameters (indicated by '?' parameter parkers in the SQL query)
   * @param isTerseResults whether the returned data is in terse format. When set to true, the data is returned as an array
   * of arrays. When set to false, data is returned as an array of objects (compatible with legacy API).
   * @returns 
   */
  async runSQL<T>(query: string, opts?: QueryOptions): Promise<T[]> {

    // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
    // int. This is the largest number available without overflow (Integer.MAX_VALUE)
    const rowsToFetch = 2147483647;

    const statement = await this.getPagingStatement<T>(query, opts);
    const results = await statement.run(rowsToFetch);
    statement.close();
    return results.data;
  }

  async getPagingStatement<T>(query: string, opts?: QueryOptions): Promise<Query<T>> {
    const selected = this.jobs[this.selectedJob]
    if (ServerComponent.isInstalled() && selected) {
      return selected.job.query<T>(query, opts);

    } else if (!ServerComponent.isInstalled()) {
      let updateResult = await ServerComponent.checkForUpdate();
      if (UpdateStatus.JUST_UPDATED === updateResult) {
        await onConnectOrServerInstall();
        return this.getPagingStatement(query, opts);
      }
      throw new Error(`Database server component is required. Please see documentation for details.`);

    } else {
      const hasNewJob = await askAboutNewJob();

      if (hasNewJob) {
        return this.getPagingStatement(query, opts);
      } else {
        throw new Error(`Active SQL job is required. Please spin one up in the 'SQL Job Manager' view and try again.`);
      }
    }
  }
}