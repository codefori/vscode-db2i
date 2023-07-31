import assert from "assert";
import { TestSuite } from ".";
import { JobStatus, SQLJob } from "../connection/sqlJob";
import { getInstance } from "../base";
import { ServerComponent } from "../connection/serverComponent";
import { ServerTraceDest, ServerTraceLevel } from "../connection/types";
import { Query } from "../connection/query";

export const JobsSuite: TestSuite = {
  name: `Connection tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await ServerComponent.initialise();
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);

      console.log(`Starting command: ${ServerComponent.getInitCommand()}`);
    }},

    {name: `Backend version check`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
  
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
    
    {name: `Verify client special registers are set`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
      let newJob = new SQLJob();
      await newJob.connect();

      let qry = newJob.query(`SELECT V_CLIENT_APPLNAME, V_CLIENT_PROGRAMID FROM TABLE(QSYS2.GET_JOB_INFO('*')) limit 1`);
      let qryResults = await qry.run();
      assert.equal(qryResults.success, true);
      assert.equal(qryResults.data.length, 1);
      let dataRow = qryResults.data[0];
      assert.equal((``+dataRow['V_CLIENT_APPLNAME']).startsWith(`vscode-db2i`), true);
      assert.equal((``+dataRow['V_CLIENT_PROGRAMID']).startsWith(`VSCode`), true);

      newJob.close();
    }},

    {name: `Backend set trace options and retrieve`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
  
      let newJob = new SQLJob();
      await newJob.connect();

      let rpy = await newJob.setTraceConfig(ServerTraceDest.IN_MEM, ServerTraceLevel.DATASTREAM);
      assert.equal(rpy.success, true);
      assert.equal(rpy.tracedest, ServerTraceDest.IN_MEM);
      assert.equal(rpy.tracelevel, ServerTraceLevel.DATASTREAM);
      let trace = await newJob.getTraceData();
      assert.notEqual(``, trace.tracedata);
      console.log(trace.tracedata);
      newJob.close();
    }},

    {name: `Backend retrieve trace data without turning on trace`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new SQLJob();
      await newJob.connect();
      let trace = await newJob.getTraceData();
      assert.notEqual(undefined, trace.tracedata);
      newJob.close();
    }},
    
    {name: `Paging query`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new SQLJob({libraries: [`QIWS`], naming: `system`});
      await newJob.connect();

      let rowsAtATime = 4;
      let qry = newJob.query(`select * from QIWS.QCUSTCDT`);
      let qryResults = await qry.run(rowsAtATime);
      assert.equal(qryResults.success, true);
      assert.equal(qryResults.data.length, 4);
      assert.equal(qryResults.is_done,false);

      while(!qryResults.is_done) {
        qryResults = await qry.fetchMore(rowsAtATime);
        if(qryResults.is_done) {
          assert.equal(qryResults.data.length <= rowsAtATime, true);
        }else {
          assert.equal(qryResults.data.length,rowsAtATime);
        }
      }

      newJob.close();
    }},

    {name: `Can round-trip Extended characters`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let testString = `¯\_(ツ)_/¯`
      let newJob = new SQLJob();
      await newJob.connect();
      let qryResults = await newJob.query(`create table qtemp.weewoo (col1 varchar(1208) ccsid 1208)`).run();
      assert.equal(qryResults.success, true);
      qryResults = await newJob.query(`insert into qtemp.weewoo values('${testString}')`).run();
      assert.equal(qryResults.success, true);
      qryResults = await newJob.query(`select COL1 from qtemp.weewoo`).run();
      assert.equal(qryResults.success, true);
      let resultData = qryResults.data[0]['COL1'];
      assert.equal(resultData, testString);
      newJob.close();
    }},
    {name: `Auto close statements`, test: async () => {
      let newJob = new SQLJob();
      await newJob.connect();

      const autoCloseAnyway = newJob.query(`select * from QIWS.QCUSTCDT`, {autoClose: true});
      const noAutoClose = newJob.query(`select * from QIWS.QCUSTCDT`, {autoClose: false});
      const neverRuns = newJob.query(`select * from QIWS.QCUSTCDT`, {autoClose: true});

      assert.strictEqual(Query.getOpenIds(newJob).length, 3);

      // If we ran this, two both autoClose statements would be cleaned up
      // await Query.cleanup();

      await Promise.all([autoCloseAnyway.run(1), noAutoClose.run(1)]);
      assert.strictEqual(Query.getOpenIds(newJob).length, 3);
      
      // Now cleanup should auto close autoCloseAnyway and neverRuns,
      // but not noAutoClose because it hasn't finished running
      await Query.cleanup();

      const leftOverIds = Query.getOpenIds(newJob);
      assert.strictEqual(leftOverIds.length, 1);

      assert.strictEqual(noAutoClose.getId(), leftOverIds[0]);

      newJob.close();
    }},

    {name: `SQL with no result set`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
  
      let newJob = new SQLJob();
      await newJob.connect();

      let result = await newJob.query(`create or replace table qtemp.tt as (select * from sysibm.sysdummy1) with data on replace delete rows`).run();
      assert.equal(result.success, true);
      assert.equal(result.has_results, false);
      assert.equal(result.data, undefined);
      newJob.close();
    }},

    {name: `CL Command (success)`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
  
      let newJob = new SQLJob();
      await newJob.connect();

      let clRes = await newJob.clcommand(`CPYF FROMFILE(QIWS/QCUSTCDT) TOFILE(QTEMP/ILUVSNAKES)  CRTFILE(*YES) `).run();
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
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new SQLJob();
      await newJob.connect();

      let clRes = await newJob.clcommand(`CPYF FROMFILE(QIWS/QCUSTCDT) TOFILE(QTEMP/ILUVDB2) MBROPT(*UPDADD) CRTFILE(*YES) `).run();
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

    {name: `Retrieve job log`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new SQLJob();
      await newJob.connect();

      

      await newJob.clcommand(`DLTLIB QTEMP`).run();
      let joblog = await newJob.getJobLog();
      assert.equal(joblog.success, true);
      let CPD2165: boolean = false;
      console.log(JSON.stringify(joblog));
      for (let joblogEntry of joblog.data) {
        if (joblogEntry.MESSAGE_ID === "CPD2165") {
          CPD2165 = true;
          break;
        }
      }
      assert.equal(CPD2165, true);
      newJob.close();
    }},

    {name: `Creating a job`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

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
      const jobA = new SQLJob();
      const jobB = new SQLJob();

      await jobA.connect();
      await jobB.connect();

      assert.notStrictEqual(jobA.id, jobB.id);

      await jobA.close();
      await jobB.close();
    }},

    {name: `Job can run many queries`, test: async () => {
      const newJob = new SQLJob();

      await newJob.connect();

      const resultA = await newJob.query(`values (job_name, current_timestamp)`).run();
      const resultB = await newJob.query(`values (job_name, current_timestamp)`).run();

      assert.strictEqual(resultA.data[0][`00001`], resultB.data[0][`00001`]);

      newJob.close();
    }},
    
    {name: `Job can run many queries at once `, test: async () => {
      const newJob = new SQLJob();

      await newJob.connect();
      let stmt = `select * from QIWS.QCUSTCDT`;
      let stmt2 = `values (job_name)`;
      const resultAPromise = newJob.query(stmt).run();
      const result2APromise = newJob.query(stmt2).run();
      const resultBPromise = newJob.query(stmt).run();
      const resultCPromise = newJob.query(stmt).run();
      const result2BPromise = newJob.query(stmt2).run();
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

      let newJob = new SQLJob({libraries: [`QSYS`, `SYSTOOLS`], naming: `system`});
      await newJob.connect();

      try {
        await newJob.query(`select * from qcustcdt`).run();
        assert.fail(`Query should not have worked. Library list issue`);
      } catch (e) {
        assert.notStrictEqual(e.message, undefined);
      }

      newJob.close();

      newJob = new SQLJob({libraries: [`QSYS`, `QIWS`], naming: `system`});
      await newJob.connect();

      const rows = await newJob.query(`select * from qcustcdt`).run();
      assert.notStrictEqual(rows.data.length, 0);

      newJob.close();
    }},

    {name: `Binding parameters`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);

      let newJob = new SQLJob({libraries: [`QIWS`], naming: `system`});
      await newJob.connect();

      try {
        const rows = await newJob.query(`select * from qcustcdt where cusnum = ? and zipcod = ?`, {isClCommand: false, parameters: [938485, 30545]}).run();
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

      const newJob = new SQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;
      const rowsA = await newJob.query(query).run();
      const rowsB = await content.runSQL(query);

      newJob.close();

      assert.deepStrictEqual(rowsA.data, rowsB);
    }},

    {name: `Performance measuring`, test: async () => {
      assert.strictEqual(ServerComponent.isInstalled(), true);
      
      const instance = getInstance();
      const content = instance.getContent();

      const newJob = new SQLJob({naming: `sql`});
      await newJob.connect();

      const query = `select * from qiws.qcustcdt`;

      console.log(`Using: ${query}`);

      const ns = performance.now();
      await newJob.query(query).run();
      await newJob.query(query).run();
      await newJob.query(query).run();
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
  ]
}