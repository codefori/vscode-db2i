import { getInstance } from "../base";
import { SQLJob } from "./sqlJob";
import { Rows } from "./types";

export interface JobInfo {
  name: string;
  job: SQLJob;
}

export class SQLJobManager {
  static jobSupport: boolean = false;

  selectedJob: number = -1;
  jobs: JobInfo[] = [];

  constructor() {}

  async newJob(predefinedJob?: SQLJob) {
    if (SQLJobManager.jobSupport) {
      const instance = getInstance();
      const config = instance.getConfig();

      const newJob = predefinedJob || (new SQLJob({libraries: [config.currentLibrary, ...config.libraryList], naming: `system`}));

      try {
        await newJob.connect();

        this.jobs.push({
          name: `New job ${this.jobs.length}`,
          job: newJob
        });

        this.selectedJob = this.jobs.length-1;
      } catch (e: any) {
        throw e;
      }
    }
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

  setSelection(selectedName: string): boolean {
    const jobExists = this.jobs.findIndex(info => info.name === selectedName);

    this.selectedJob = jobExists;

    return (this.selectedJob > 0);
  }

  runSQL(query: string): Promise<Rows> {
    const selected = this.jobs[this.selectedJob]
    if (SQLJobManager.jobSupport && selected) {
      return selected.job.query(query);

    } else {
      const instance = getInstance();
      const config = instance.getConfig();
      const content = instance.getContent();

      const queryContext = [
        `SET CURRENT SCHEMA = '${config.currentLibrary.toUpperCase()}'`,
        query
      ].join(`;\n`);
      return content.runSQL(queryContext);
    }
  }
}