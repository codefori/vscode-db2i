import assert from "assert";
import { TestSuite } from ".";
import { getInstance } from "../base";
import { ExplainTree } from "../views/results/explain/nodes";
import { ServerComponent } from "../connection/serverComponent";
import { OldSQLJob } from "../connection/sqlJob";

export const JobsSuite: TestSuite = {
  name: `Connection tests`,
  tests: [
    // {name: `Backend check`, test: async () => {
    //   const backendInstalled = await ServerComponent.initialise();
  
    //   // To run these tests, we need the backend server. If this test fails. Don't bother
    //   assert.strictEqual(backendInstalled, true);

    //   console.log(`Starting command: ${ServerComponent.getInitCommand()}`);
    // }},

    // {name: `Backend version check`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);
  
    //   let newJob = new OldSQLJob();
    //   await newJob.connect();

    //   let ver = await newJob.getVersion();
    //   console.log(`backend version: `+ver.version);
    //   console.log(`backend build date: `+ver.build_date);
    //   assert.notEqual(ver.version, ``);
    //   assert.notEqual(ver.build_date, ``);
    //   assert.ok(`backend build date: `+ver.build_date);
    //   newJob.close();
    // }},
    
    // {name: `Verify client special registers are set`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);
    //   let newJob = new OldSQLJob();
    //   await newJob.connect();

    //   let qry = newJob.query(`SELECT V_CLIENT_APPLNAME, V_CLIENT_PROGRAMID FROM TABLE(QSYS2.GET_JOB_INFO('*')) limit 1`);
    //   let qryResults = await qry.execute();
    //   assert.equal(qryResults.success, true);
    //   assert.equal(qryResults.data.length, 1);
    //   let dataRow = qryResults.data[0];
    //   assert.equal((``+dataRow['V_CLIENT_APPLNAME']).startsWith(`vscode-db2i`), true);
    //   assert.equal((``+dataRow['V_CLIENT_PROGRAMID']).startsWith(`VSCode`), true);

    //   newJob.close();
    // }},

    // {name: `Backend set trace options and retrieve`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);
  
    //   let newJob = new OldSQLJob();
    //   await newJob.connect();

    //   let rpy = await newJob.setTraceConfig("IN_MEM", "DATASTREAM");
    //   assert.equal(rpy.success, true);
    //   assert.equal(rpy.tracedest, "IN_MEM");
    //   assert.equal(rpy.tracelevel, "DATASTREAM");
    //   let trace = await newJob.getTraceData();
    //   assert.notEqual(``, trace.tracedata);
    //   console.log(trace.tracedata);
    //   newJob.close();
    // }},

    // {name: `Backend retrieve trace data without turning on trace`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let newJob = new OldSQLJob();
    //   await newJob.connect();
    //   let trace = await newJob.getTraceData();
    //   assert.notEqual(undefined, trace.tracedata);
    //   newJob.close();
    // }},
    
    // {name: `Paging query`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let newJob = new OldSQLJob({libraries: [`QIWS`], naming: `system`});
    //   await newJob.connect();

    //   let rowsAtATime = 4;
    //   let qry = newJob.query(`select * from QIWS.QCUSTCDT`);
    //   let qryResults = await qry.execute(rowsAtATime);
    //   assert.equal(qryResults.success, true);
    //   assert.equal(qryResults.data.length, 4);
    //   assert.equal(qryResults.is_done,false);

    //   while(!qryResults.is_done) {
    //     qryResults = await qry.fetchMore(rowsAtATime);
    //     if(qryResults.is_done) {
    //       assert.equal(qryResults.data.length <= rowsAtATime, true);
    //     }else {
    //       assert.equal(qryResults.data.length,rowsAtATime);
    //     }
    //   }

    //   newJob.close();
    // }},
    // {name: `Query with non-terse results`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let newJob = new OldSQLJob({libraries: [`QIWS`], naming: `system`});
    //   await newJob.connect();

    //   let rowsAtATime = 4;
    //   let qry = newJob.query(`select * from QIWS.QCUSTCDT limit 1`,{isTerseResults: false});
    //   let qryResults = await qry.execute(rowsAtATime);

    //   assert.equal(qryResults.success, true);
    //   let firstRow = qryResults.data[0];
    //   let cusnum = firstRow[`CUSNUM`];
    //   assert.equal(cusnum === undefined, false);
    //   assert.equal(Array.isArray(firstRow), false);
    //   newJob.close();
    // }},
    // {name: `Query with terse results`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let newJob = new OldSQLJob({libraries: [`QIWS`], naming: `system`});
    //   await newJob.connect();

    //   let rowsAtATime = 4;
    //   let qry = newJob.query(`select * from QIWS.QCUSTCDT limit 1`,{isTerseResults: true});
    //   let qryResults = await qry.execute(rowsAtATime);

    //   assert.equal(qryResults.success, true);
    //   let firstRow = qryResults.data[0];
    //   assert.equal(Array.isArray(firstRow), true);
    //   newJob.close();
    // }},
    // {name: `Can round-trip Extended characters`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let testString = `¯\\_(ツ)_/¯`
    //   let newJob = new OldSQLJob();
    //   await newJob.connect();
    //   let qryResults = await newJob.query(`create table qtemp.weewoo (col1 varchar(1208) ccsid 1208)`).execute();
    //   assert.equal(qryResults.success, true);
    //   qryResults = await newJob.query(`insert into qtemp.weewoo values('${testString}')`).execute();
    //   assert.equal(qryResults.success, true);
    //   qryResults = await newJob.query(`select COL1 from qtemp.weewoo`).execute();
    //   assert.equal(qryResults.success, true);
    //   let resultData = qryResults.data[0]['COL1'];
    //   assert.equal(resultData, testString);
    //   newJob.close();
    // }},

    // {name: `CL Command (success)`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);
  
    //   let newJob = new OldSQLJob();
    //   await newJob.connect();

    //   let clRes = await newJob.clcommand(`CPYF FROMFILE(QIWS/QCUSTCDT) TOFILE(QTEMP/ILUVSNAKES)  CRTFILE(*YES) `).execute();
    //   assert.equal(clRes.success, true);
    //   assert.notEqual(0, clRes.data.length);
    //   let CPF2880: boolean = false;
    //   console.log(JSON.stringify(clRes));
    //   for (let joblogEntry of clRes.data) {
    //     if (joblogEntry.MESSAGE_ID === "CPF2880") {
    //       CPF2880 = true;
    //       break;
    //     }
    //   }
    //   assert.equal(CPF2880, true);
    //   newJob.close();
    // }},

    // {name: `CL Command (error)`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let newJob = new OldSQLJob();
    //   await newJob.connect();

    //   let clRes = await newJob.clcommand(`CPYF FROMFILE(QIWS/QCUSTCDT) TOFILE(QTEMP/ILUVDB2) MBROPT(*UPDADD) CRTFILE(*YES) `).execute();
    //   console.log(JSON.stringify(clRes));
    //   assert.equal(clRes.success, false);
    //   let CPD2825: boolean = false;
    //   console.log(JSON.stringify(clRes));
    //   for (let joblogEntry of clRes.data) {
    //     if (joblogEntry.MESSAGE_ID === "CPD2825") {
    //       CPD2825 = true;
    //       break;
    //     }
    //   }
    //   assert.equal(CPD2825, true);
    //   newJob.close();
    // }},

    // {name: `Retrieve job log`, test: async () => {
    //   assert.strictEqual(ServerComponent.isInstalled(), true);

    //   let newJob = new OldSQLJob();
    //   await newJob.connect();

      

    //   await newJob.clcommand(`DLTLIB QTEMP`).execute();
    //   let joblog = await newJob.getJobLog();
    //   assert.equal(joblog.success, true);
    //   let CPD2165: boolean = false;
    //   console.log(JSON.stringify(joblog));
    //   for (let joblogEntry of joblog.data) {
    //     if (joblogEntry.MESSAGE_ID === "CPD2165") {
    //       CPD2165 = true;
    //       break;
    //     }
    //   }
    //   assert.equal(CPD2165, true);
    //   newJob.close();
    // }},

    {name: `Creating a job`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      const newJob = new OldSQLJob();

      assert.strictEqual(newJob.getStatus(), "notStarted");

      assert.strictEqual(newJob.id, undefined);

      await newJob.connect();

      assert.strictEqual(newJob.getStatus(), "ready");

      assert.notStrictEqual(newJob.id, undefined);

      await newJob.close();

      const lastStatus = newJob.getStatus();
      assert.strictEqual(lastStatus, "ended");
    }},

    {name: `Jobs have different job IDs`, test: async () => {
      const jobA = new OldSQLJob();
      const jobB = new OldSQLJob();

      await jobA.connect();
      await jobB.connect();

      assert.notStrictEqual(jobA.id, jobB.id);

      await jobA.close();
      await jobB.close();
    }},

    {name: `Job can run many queries`, test: async () => {
      const newJob = new OldSQLJob();

      await newJob.connect();

      const resultA = await newJob.query(`values (job_name, current_timestamp)`).execute();
      const resultB = await newJob.query(`values (job_name, current_timestamp)`).execute();

      assert.strictEqual(resultA.data[0][`00001`], resultB.data[0][`00001`]);

      newJob.close();
    }},
    
    {name: `Job can run many queries at once `, test: async () => {
      const newJob = new OldSQLJob();

      await newJob.connect();
      let stmt = `select * from QIWS.QCUSTCDT`;
      let stmt2 = `values (job_name)`;
      const resultAPromise = newJob.query(stmt).execute();
      const result2APromise = newJob.query(stmt2).execute();
      const resultBPromise = newJob.query(stmt).execute();
      const resultCPromise = newJob.query(stmt).execute();
      const result2BPromise = newJob.query(stmt2).execute();
      let values = await Promise.all([resultAPromise,result2APromise, resultBPromise, resultCPromise, result2BPromise] );
      assert.strictEqual(values[0].is_done, true);
      assert.strictEqual(values[1].is_done, true);
      assert.strictEqual(values[2].is_done, true);
      assert.strictEqual(values[3].is_done, true);
      assert.strictEqual(values[4].is_done, true);
      assert.strictEqual(values[0].success, true);
      assert.strictEqual(values[1].success, true);
      assert.strictEqual(values[2].success, true);
      assert.strictEqual(values[3].success, true);
      assert.strictEqual(values[4].success, true);
      assert.deepEqual(values[0].data, values[2].data);
      assert.deepEqual(values[0].data, values[3].data);
      assert.deepEqual(values[1].data, values[4].data);
      assert.notDeepEqual(values[0].data, values[1].data);
      newJob.close();
    }},

    {name: `Library list is used`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new OldSQLJob({libraries: [`QSYS`, `SYSTOOLS`], naming: `system`});
      await newJob.connect();

      try {
        await newJob.query(`select * from qcustcdt`).execute();
        assert.fail(`Query should not have worked. Library list issue`);
      } catch (e) {
        assert.notStrictEqual(e.message, undefined);
      }

      newJob.close();

      newJob = new OldSQLJob({libraries: [`QSYS`, `QIWS`], naming: `system`});
      await newJob.connect();

      const rows = await newJob.query(`select * from qcustcdt`).execute();
      assert.notStrictEqual(rows.data.length, 0);

      newJob.close();
    }},

    {name: `Binding parameters`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new OldSQLJob({libraries: [`QIWS`], naming: `system`});
      await newJob.connect();

      try {
        const rows = await newJob.query(`select * from qcustcdt where cusnum = ? and zipcod = ?`, {isClCommand: false, parameters: [938485, 30545]}).execute();
        assert.strictEqual(rows.data.length, 1);
      } catch (e) {
        assert.fail(`Should not have errored.`);
      }

      newJob.close();
    }},

    {name: `Ensure API compatability`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new OldSQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;
      const rowsA = await newJob.query(query).execute();
      const rowsB = await content.runSQL(query);

      newJob.close();

      assert.deepStrictEqual(rowsA.data, rowsB);
    }},

    {name: `Performance measuring`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
      
      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new OldSQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;

      console.log(`Using: ${query}`);

      const ns = performance.now();
      await newJob.query(query).execute();
      await newJob.query(query).execute();
      await newJob.query(query).execute();
      const ne = performance.now();

      console.log(`New query method took ${ne - ns} milliseconds.`);

      newJob.close();

      const os = performance.now();
      await content.runSQL(query);
      await content.runSQL(query);
      await content.runSQL(query);
      const oe = performance.now();

      console.log(`Old query method took ${oe - os} milliseconds.`);
      assert.equal((ne - ns) < (oe - os), true);
    }},

    {name: `Explain API`, test: async () => {
      const newJob = new OldSQLJob({"full open": true});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;

      const result = await newJob.explain(query);

      const tree = new ExplainTree(result.data);

      const topLevel = tree.get();

      assert.notStrictEqual(topLevel, undefined);
    }},
    
    {name: `(long-running) Server-side in-memory tracing doesn't overflow`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new OldSQLJob({naming: `sql`});
      await newJob.connect();
      await newJob.setTraceConfig("IN_MEM", "DATASTREAM");

      let numIterations = 1000;
      for (let i = 0; i < numIterations; i++) {
        let version = await newJob.getVersion();
        if(0 == i%20) {
          console.log(`long-running test interation ${i}/${numIterations}`);
        }
      }
      let bruh = await newJob.getTraceData();
      newJob.close();
    }},
  ]
}