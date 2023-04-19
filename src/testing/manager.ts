import assert from "assert";
import { TestSuite } from ".";
import { commands } from "vscode";
import { JobManager } from "../config";
import { SQLJobManager } from "../connection/manager";
import { SQLJob } from "../connection/sqlJob";
import { getInstance } from "../base";

export const ManagerSuite: TestSuite = {
  name: `Job manager tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await SQLJobManager.hasBackendServer();
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);
      await JobManager.endAll();
    }},

    {name: `Test adding job`, test: async () => {
      // Ensure we have a blank manager first
      assert.strictEqual(JobManager.jobs.length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      // Add a new job
      await JobManager.newJob();

      // Check the job exists
      assert.strictEqual(JobManager.jobs.length, 1);
      assert.strictEqual(JobManager.selectedJob, 0);
      
      // Check the job is really real
      const selected = JobManager.getSelection();
      assert.notStrictEqual(selected, undefined);
      assert.notStrictEqual(selected.job.jobId, undefined);
      
      // Close the job and see things go away
      JobManager.closeJob(JobManager.selectedJob);
      assert.strictEqual(JobManager.jobs.length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);
      
      const badSelected = JobManager.getSelection();
      assert.strictEqual(badSelected, undefined);
    }},

    {name: `Testing end all`, test: async () => {
      // Ensure we have a blank manager first
      assert.strictEqual(JobManager.jobs.length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      await JobManager.newJob();
      await JobManager.newJob();

      // Check the job exists
      assert.strictEqual(JobManager.jobs.length, 2);
      assert.strictEqual(JobManager.selectedJob, 1);
      
      // End the jobs
      await JobManager.endAll();
      assert.strictEqual(JobManager.jobs.length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);
    }},
  ]
}