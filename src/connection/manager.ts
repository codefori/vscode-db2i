import { getInstance } from "../base";
import { Query } from "./query";
import { JobStatus, SQLJob } from "./sqlJob";
import { QueryOptions, QueryResult, Rows } from "./types";

export interface JobInfo {
  name: string;
  job: SQLJob;
}

export class SQLJobManager {
  static jobSupport: boolean = false;

  private totalJobs = 0;
  private jobs: JobInfo[] = [];
  selectedJob: number = -1;

  constructor() {}

  async newJob(predefinedJob?: SQLJob) {
    if (SQLJobManager.jobSupport) {
      const instance = getInstance();
      const config = instance.getConfig();

      const newJob = predefinedJob || (new SQLJob({
        libraries: [config.currentLibrary, ...config.libraryList], 
        naming: `system`, 
        "full open": false, 
        "transaction isolation": "none"
      }));

      try {
        await newJob.connect();

        this.totalJobs += 1;

        this.jobs.push({
          name: `New job ${this.totalJobs}`,
          job: newJob
        });

        this.selectedJob = this.jobs.length-1;
      } catch (e: any) {
        throw e;
      }
    }
  }

  getRunningJobs() {
    return this.jobs.filter(info => [JobStatus.Ready, JobStatus.Busy].includes(info.job.getStatus()));
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
      this.selectedJob = this.selectedJob-1;
    }
  }

  closeJobByName(name: string) {
    const id = this.jobs.findIndex(info => info.name);
    return this.closeJob(id);
  }

  getSelection(): JobInfo|undefined {
    return this.jobs[this.selectedJob];
  }

  getJob(name: string): JobInfo|undefined {
    return this.jobs.find(info => info.name === name);
  }

  setSelection(selectedName: string): boolean {
    const jobExists = this.jobs.findIndex(info => info.name === selectedName);

    this.selectedJob = jobExists;

    return (this.selectedJob >= 0);
  }

  async runSQL<T>(query: string): Promise<T[]> {
    const selected = this.jobs[this.selectedJob]
    if (SQLJobManager.jobSupport && selected) {
      // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
      // int. This is the largest number available without overflow
      let rowsToFetch = 2147483647;
      let results = await selected.job.query<T>(query).run(rowsToFetch);
      return results.data;
    } else {
      const instance = getInstance();
      const config = instance.getConfig();
      const content = instance.getContent();

      const queryContext = [
        `SET CURRENT SCHEMA = '${config.currentLibrary.toUpperCase()}'`,
        query
      ].join(`;\n`);
      
      return content.runSQL(queryContext) as Promise<T[]>;
    }
  }
  getPagingStatement<T>(query: string, opts?: QueryOptions): Query<T> {
    const selected = this.jobs[this.selectedJob]
    if (SQLJobManager.jobSupport && selected) {
      return selected.job.query<T>(query, opts);
    } else {
      throw new Error(`Active SQL job is required. Please spin one up first.`);
    }
  }
}