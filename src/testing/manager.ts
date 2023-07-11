import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import { ServerComponent } from "../connection/serverComponent";
import { JobStatus } from "../connection/sqlJob";

export const ManagerSuite: TestSuite = {
  name: `Job manager tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await ServerComponent.initialise(false);
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);
      await JobManager.endAll();
    }},

    {name: `Adding a job`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);

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
      assert.notStrictEqual(selected, undefined);
      assert.notStrictEqual(selected.job.id, undefined);
      assert.strictEqual(selected.job.getStatus(), JobStatus.Ready);
      
      // Close the job and see things go away
      JobManager.closeJob(JobManager.selectedJob);
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);
      
      const badSelected = JobManager.getSelection();
      assert.strictEqual(badSelected, undefined);
    }},

    {name: `End all jobs`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);

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

    {name: `runSQL method`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);

      // Ensure we have a blank manager first
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      const query = `select * from qiws.qcustcdt`;

      // Run query with no jobs should still work, using the standard API
      const rowsA = await JobManager.runSQL(query);
      assert.notStrictEqual(rowsA.length, 0);

      await JobManager.newJob();

      // Check the job exists
      assert.strictEqual(JobManager.getRunningJobs().length, 1);
      assert.strictEqual(JobManager.selectedJob, 0);

      // Run query will run the statement using the selected job
      const rowsB = await JobManager.runSQL(query);
      assert.notStrictEqual(rowsB.length, 0);
      
      // End the jobs
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);
    }},

    {name: `Set selected by name`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
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
      assert.strictEqual(JobManager.setSelection(`badName`), false);

      assert.strictEqual(JobManager.setSelection(runningJobs[0].name), true);

      assert.strictEqual(JobManager.getSelection().name, runningJobs[0].name);

      await JobManager.endAll();
    }},
  ]
}