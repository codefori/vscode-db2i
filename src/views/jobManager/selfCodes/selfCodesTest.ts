import { OldSQLJob } from "../../../connection/sqlJob";
import { TestCase } from "../../../testing";
import assert from "assert";
import { SelfCodeNode, SelfValue } from "./nodes";
import { QueryResult } from "../../../connection/types";

export const selfCodeTests = [
  {
    name: "Trigger an error",
    code: "*ERROR",
    sql: "SELECT * from qsys2.noexist",
  },
  {
    name: "Tigger a warning",
    code: "*WARNING",
    sql: "SELECT LEFT(C2, 1001) FROM SELFTEST.MYTBL"
  }
];

export function testSelfCodes(): TestCase[] {
  let tests: TestCase[] = [];
  const content = `SELECT job_name, matches FROM qsys2.sql_error_log where job_name = ?`;
  let before: string;
  let after: string;
  for (const test of selfCodeTests) {
    const testCase: TestCase = {
      name: `Self code Error for test ${test.name}`,
      test: async () => {
        let newJob = new OldSQLJob();
        await newJob.connect();
        await newJob.setSelfState(test.code as SelfValue);
        try {
          await newJob.query(test.sql).run();
        } catch (e) {}
        let result = await newJob.query(content, {parameters: [newJob.id]}).run();
        assert(result.data[0]['MATCHES'] >= 1);
        
        newJob.close();
      },
    };
    tests.push(testCase);
  }
  return tests;
}
