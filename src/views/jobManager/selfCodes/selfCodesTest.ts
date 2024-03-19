import { SQLJob } from "../../../connection/sqlJob";
import { TestCase } from "../../../testing";
import assert from "assert";

export const selfCodeTests = [
  {
    name: "SQL0138 - Left-most 1001 characters of C2",
    code: "138",
    sql: "SELECT LEFT(C2, 1001) FROM SELFTEST.MYTBL",
  },
  {
    name: "SQL0180 - Invalid format for date",
    code: "180",
    sql: "VALUES DATE('120-1231-12312')",
  },
  {
    name: "SQL0181 - Date that doesn't exist",
    code: "181",
    sql: "VALUES DATE('2023-45-45')",
  },
  {
    name: "SQL0182 - Valid datetime, invalid context",
    code: "182",
    sql: "SELECT C3/C4 FROM SELFTEST.MYTBL",
  },
  {
    name: "SQL0199 - Invalid syntax",
    code: "199",
    sql: "SELECT * FROM SELFTEST.MYTBL WHERE ORDER BY C1",
  },
  {
    name: "SQL0203 - C2 without table name",
    code: "203",
    sql: "SELECT C2 FROM SELFTEST.MYTBL T1 JOIN SELFTEST.MYTBL2 T2 ON T1.C1 = T2.C1",
  },
  {
    name: "SQL0204 - Table doesn't exist",
    code: "204",
    sql: "SELECT * FROM NOEXIST",
  },
  {
    name: "SQL0206 - Column doesn't exist",
    code: "206",
    sql: "SELECT NOCOL FROM SELFTEST.MYTBL",
  },
  {
    name: "SQL0420 - Can't cast varchar to int",
    code: "420",
    sql: "SELECT CAST(SELFTEST.MYTBL.C2 AS INT) FROM SELFTEST.MYTBL",
  },
  // this is a sqpecial case, need to think about how to test this one
  // {
  //   name: 'SQL0551 - User profile NOGOOD has no authority',
  //   code: '551',
  //   sql: 'CL: CRTUSRPRF USRPRF(NOGOOD); SET SESSION AUTHORIZATION NOGOOD; SELECT * FROM SELFTEST.MYTBL2; DISCONNECT CURRENT; SET SCHEMA SELFTEST; CL: DLTUSRPRF USRPRF(NOGOOD);',
  // },
  {
    name: "SQL0811 - Subquery returns multiple rows",
    code: "811",
    sql: "UPDATE SELFTEST.MYTBL SET C1 = (SELECT C1 FROM SELFTEST.MYTBL2)",
  },
];

export function testSelfCodes(): TestCase[] {
  let tests: TestCase[] = [];
  for (const test of selfCodeTests) {
    const testCase: TestCase = {
      name: `Self code Error for test ${test.name}`,
      test: async () => {
        let newJob = new SQLJob();
        await newJob.connect();
        await newJob.setSelfState(test.code);
        try {
          await newJob.query(test.sql).run();
        } catch (e) {}

        const content = `SELECT * FROM QSYS2.SQL_ERROR_LOG WHERE JOB_NAME = '${newJob.id}'`;
        let errors = await newJob.query(content).run();
        assert.strictEqual(errors.data.length, 1);
        newJob.close();
      },
    };
    tests.push(testCase);
  }
  return tests;
}
