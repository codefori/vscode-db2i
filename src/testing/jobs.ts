import assert from "assert";
import { TestSuite } from ".";
import { JobStatus, SQLJob } from "../connection/sqlJob";
import { getInstance } from "../base";
import { ServerComponent } from "../connection/serverComponent";

export const JobsSuite: TestSuite = {
  name: `Connection tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await ServerComponent.initialise(false);
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);

      console.log(`Starting command: ${ServerComponent.getInitCommand()}`);
    }},

    {name: `Backend version check`, test: async () => {
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(ServerComponent.installed, true);

      let newJob = new SQLJob();
      await newJob.connect();

      let ver = await newJob.getVersion();
      console.log(`backend version: `+ver.version);
      console.log(`backend build date: `+ver.build_date);
      assert.notEqual(ver.version, ``);
      assert.notEqual(ver.build_date, ``);
      assert.ok(`backend build date: `+ver.build_date);
      newJob.close();
    }},
    
    {name: `Paging query`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);

      let newJob = new SQLJob({libraries: [`QIWS`], naming: `system`});
      await newJob.connect();

      let correlation_id = `Dig through the ditches and burn through the witches, I slam in the back of my Dragula`;
      let rowsAtATime = 4;
      let qry = await newJob.pagingQuery(correlation_id,`select * from QIWS.QCUSTCDT`, rowsAtATime);
      assert.equal(qry.success, true);
      assert.equal(qry.data.length, 4);
      assert.equal(qry.is_done,false);

      while(!qry.is_done) {
        qry = await newJob.pagingQueryMoreData(correlation_id,rowsAtATime);
        if(qry.is_done) {
          assert.equal(qry.data.length <= rowsAtATime, true);
        }else {
          assert.equal(qry.data.length,rowsAtATime);
        }
      }

      newJob.close();
    }},

    {name: `CL Command (success)`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);

      let newJob = new SQLJob();
      await newJob.connect();

      let clRes = await newJob.clcommand(`CPYF FROMFILE(QIWS/QCUSTCDT) TOFILE(QTEMP/ILUVSNAKES)  CRTFILE(*YES) `);
      assert.equal(clRes.success, true);
      assert.notEqual(0, clRes.data.length);
      let CPF2880: boolean = false;
      console.log(JSON.stringify(clRes));
      for (let joblogEntry of clRes.data) {
        if (joblogEntry.MESSAGE_ID === "CPF2880") {
          CPF2880 = true;
          break;
        }
      }
      assert.equal(CPF2880, true);
      newJob.close();
    }},
    {name: `CL Command (error)`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);

      let newJob = new SQLJob();
      await newJob.connect();

      let clRes = await newJob.clcommand(`CPYF FROMFILE(QIWS/QCUSTCDT) TOFILE(QTEMP/ILUVDB2) MBROPT(*UPDADD) CRTFILE(*YES) `);
      console.log(JSON.stringify(clRes));
      assert.equal(clRes.success, false);
      let CPD2825: boolean = false;
      console.log(JSON.stringify(clRes));
      for (let joblogEntry of clRes.data) {
        if (joblogEntry.MESSAGE_ID === "CPD2825") {
          CPD2825 = true;
          break;
        }
      }
      assert.equal(CPD2825, true);
      newJob.close();
    }},

    {name: `Creating a job`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      const newJob = new SQLJob();

      assert.strictEqual(newJob.getStatus(), JobStatus.NotStarted);

      assert.strictEqual(newJob.id, undefined);

      await newJob.connect();

      assert.strictEqual(newJob.getStatus(), JobStatus.Ready);

      assert.notStrictEqual(newJob.id, undefined);

      await newJob.close();

      assert.strictEqual(newJob.getStatus(), JobStatus.Ended);
    }},

    {name: `Jobs have different job IDs`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      const jobA = new SQLJob();
      const jobB = new SQLJob();

      await jobA.connect();
      await jobB.connect();

      assert.notStrictEqual(jobA.id, jobB.id);

      await jobA.close();
      await jobB.close();
    }},

    {name: `Job can run many queries`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      const newJob = new SQLJob();

      await newJob.connect();

      const resultA = await newJob.query(`values (job_name, current_timestamp)`);
      const resultB = await newJob.query(`values (job_name, current_timestamp)`);

      assert.strictEqual(resultA[0][`00001`], resultB[0][`00001`]);

      newJob.close();
    }},

    {name: `Library list is used`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      let newJob = new SQLJob({libraries: [`QSYS`, `SYSTOOLS`], naming: `system`});
      await newJob.connect();

      try {
        await newJob.query(`select * from qcustcdt`);
        assert.fail(`Query should not have worked. Library list issue`);
      } catch (e) {
        assert.notStrictEqual(e.message, undefined);
      }

      newJob.close();

      newJob = new SQLJob({libraries: [`QSYS`, `QIWS`], naming: `system`});
      await newJob.connect();

      const rows = await newJob.query(`select * from qcustcdt`);
      assert.notStrictEqual(rows.length, 0);

      newJob.close();
    }},

    {name: `Binding parameters`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      let newJob = new SQLJob({libraries: [`QIWS`], naming: `system`});
      await newJob.connect();

      try {
        const rows = await newJob.query(`select * from qcustcdt where cusnum = ? and zipcod = ?`, [938485, 30545]);
        assert.strictEqual(rows.length, 1);
      } catch (e) {
        assert.fail(`Should not have errored.`);
      }

      newJob.close();
    }},

    {name: `Ensure API compatability`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new SQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;
      const rowsA = await newJob.query(query);
      const rowsB = await content.runSQL(query);

      newJob.close();

      assert.deepStrictEqual(rowsA, rowsB);
    }},

    {name: `Performance measuring`, test: async () => {
      assert.strictEqual(ServerComponent.installed, true);
      
      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new SQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;

      console.log(`Using: ${query}`);

      const ns = performance.now();
      await newJob.query(query);
      await newJob.query(query);
      await newJob.query(query);
      const ne = performance.now();

      console.log(`New query method took ${ne - ns} milliseconds.`);

      newJob.close();

      const os = performance.now();
      await content.runSQL(query);
      await content.runSQL(query);
      await content.runSQL(query);
      const oe = performance.now();

      console.log(`Old query method took ${oe - os} milliseconds.`);
    }},
  ]
}