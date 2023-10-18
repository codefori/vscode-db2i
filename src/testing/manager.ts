import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import { ServerComponent } from "../connection/serverComponent";
import { JobStatus, SQLJob } from "../connection/sqlJob";

export const ManagerSuite: TestSuite = {
  name: `Job manager tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await ServerComponent.initialise();
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);
      await JobManager.endAll();
    }},

    {name: `Adding a job`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

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
      assert.strictEqual(ServerComponent.isInstalled(), true);

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
      assert.strictEqual(ServerComponent.isInstalled(), true);
      
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
    {name: `Get SELF codes Errors`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      // Ensure we have a blank manager first
      await JobManager.endAll();
      assert.strictEqual(JobManager.getRunningJobs().length, 0);
      assert.strictEqual(JobManager.selectedJob, -1);

      // Add a new job
      await JobManager.newJob();

      // Check the job exists
      assert.strictEqual(JobManager.getRunningJobs().length, 1);

      const curJob = JobManager.getRunningJobs();

      // set self codes
      curJob[0].job.setSelfCodes(['138', '180'])

      // SQL0138, get left-most 1001 characters of C2. C2 is only 100 characters long, so SQL0138 is produced
      const sqlTestChar = `SELECT LEFT(C2, 1001) FROM SELFTEST.MYTBL`

      await JobManager.runSQL(sqlTestChar);

      const content = `SELECT * FROM QSYS2.SQL_ERROR_LOG WHERE JOB_NAME = '${curJob[0].job.id}'`;

      const data = await JobManager.runSQL(content);

      assert.strictEqual(data.length, 1);

      // SQL0180, invalid format for date given
      const sqltestDate = `VALUES DATE('120-1231-12312')`;

      await JobManager.runSQL(sqltestDate);

      const newData = await JobManager.runSQL(content);

      assert.strictEqual(newData.length, 2);

    }}
  ]
}