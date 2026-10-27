import assert from "assert";
import { TestSuite } from ".";
import { getInstance } from "../base";
import { Config, JobManager } from "../config";
import { ExtendedSQLJob } from "../connection/extendedSQLJob";

async function getLibraryList(job: ExtendedSQLJob) {
  const result = await job.query<{ SYSTEM_SCHEMA_NAME: string, TYPE: string }>(`select SYSTEM_SCHEMA_NAME, TYPE from QSYS2.LIBRARY_LIST_INFO`).execute();
  return {
    current: result.data.filter(row => row.TYPE === `CURRENT`).map(row => row.SYSTEM_SCHEMA_NAME),
    user: result.data.filter(row => row.TYPE === `USER`).map(row => row.SYSTEM_SCHEMA_NAME)
  };
}

export const ManagerSuite: TestSuite = {
  name: `Job manager tests`,
  tests: [

    {name: `Adding a job`, test: async () => {
      // Ensure we have a blank manager first
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      // Add a new job
      await JobManager.newJob();

      // Check the job exists
      assert.strictEqual(JobManager.getRunningJobs().length, 1);
      assert.strictEqual(JobManager.selectedJob, 0);
      
      // Check the job is really real
      const selected = JobManager.getSelection();
      assert.ok(selected);
      assert.notStrictEqual(selected.job.id, undefined);
      assert.strictEqual(selected.job.getStatus(), "ready");
      
      // Close the job and see things go away
      JobManager.closeJob(JobManager.selectedJob);
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);
      
      const badSelected = JobManager.getSelection();
      assert.strictEqual(badSelected, undefined);
    }},

    {name: `End all jobs`, test: async () => {
      // Ensure we have a blank manager first
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      await JobManager.newJob();
      await JobManager.newJob();

      // Check the job exists
      assert.strictEqual(JobManager.getRunningJobs().length, 2);
      assert.strictEqual(JobManager.selectedJob, 1);
      
      // End the jobs
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);
    }},

    {name: `Set selected by name`, test: async () => {      
      // Ensure we have a blank manager first
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      await JobManager.newJob();
      await JobManager.newJob();

      const runningJobs = JobManager.getRunningJobs();

      // Check the job exists
      assert.strictEqual(runningJobs.length, 2);

      // Returns false due to bad name
      assert.strictEqual(JobManager.setSelection(`badName`), undefined);

      assert.notStrictEqual(JobManager.setSelection(runningJobs[0].name), undefined);

      assert.strictEqual(JobManager.getSelection()?.name, runningJobs[0].name);

      await JobManager.endAll();
    }},

    {name: `Current library can be cleared`, test: async () => {
      const newJob = await JobManager.newJob({libraries: [``, `QIWS`], naming: `system`}, undefined, `*CRTDFT`);
      assert.strictEqual(newJob.appliedCurrentLibrary, `*CRTDFT`);

      const libraryList = await getLibraryList(newJob);
      assert.deepStrictEqual(libraryList.current, []);
      assert.ok(libraryList.user.includes(`QIWS`));

      await JobManager.closeJobById(newJob);
    }},

    {name: `Current library can be cleared with comma decimal separator`, test: async () => {
      const newJob = await JobManager.newJob({libraries: [``, `QIWS`], naming: `system`, "decimal separator": `,`}, undefined, `*CRTDFT`);
      assert.strictEqual(newJob.appliedCurrentLibrary, `*CRTDFT`);

      const libraryList = await getLibraryList(newJob);
      assert.deepStrictEqual(libraryList.current, []);

      await JobManager.closeJobById(newJob);
    }},

    {name: `Current library can be set`, test: async () => {
      const newJob = await JobManager.newJob({libraries: [`QIWS`, `QGPL`], naming: `system`}, undefined, `QIWS`);
      assert.strictEqual(newJob.appliedCurrentLibrary, `QIWS`);

      const libraryList = await getLibraryList(newJob);
      assert.deepStrictEqual(libraryList.current, [`QIWS`]);

      await JobManager.closeJobById(newJob);
    }},

    {name: `Explicit options leave the current library unchanged`, test: async () => {
      // Baseline: the user profile's current library, from a job without a library override
      const baselineJob = await JobManager.newJob({naming: `system`});
      const baseline = await getLibraryList(baselineJob);
      await JobManager.closeJobById(baselineJob);

      const newJob = await JobManager.newJob({libraries: [`QIWS`, `QGPL`], naming: `system`});
      assert.strictEqual(newJob.appliedCurrentLibrary, undefined);

      // The JDBC driver does not use the first library as current library
      const libraryList = await getLibraryList(newJob);
      assert.deepStrictEqual(libraryList.current, baseline.current);

      await JobManager.closeJobById(newJob);
    }},

    {name: `Default job follows the connection current library`, test: async () => {
      const connection = getInstance().getConnection()!;
      const currentLibrary = connection.getConfig().currentLibrary;

      // A startup configuration would be used instead of the connection settings
      const startUpConfigList = Config.getStartUpConfigList();
      await Config.setStartUpConfigList(startUpConfigList.filter(item => item.connectionName !== connection.currentConnectionName));

      try {
        const newJob = await JobManager.newJob();

        const libraryList = await getLibraryList(newJob);
        if (currentLibrary) {
          assert.strictEqual(newJob.appliedCurrentLibrary, currentLibrary);
          assert.deepStrictEqual(libraryList.current, [currentLibrary.toUpperCase()]);
        } else {
          assert.strictEqual(newJob.appliedCurrentLibrary, `*CRTDFT`);
          assert.deepStrictEqual(libraryList.current, []);
        }

        await JobManager.closeJobById(newJob);
      } finally {
        await Config.setStartUpConfigList(startUpConfigList);
      }
    }}
  ]
}