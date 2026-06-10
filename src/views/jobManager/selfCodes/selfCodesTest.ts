import assert from "assert";
import { JobManager } from "../../../config";
import { TestCase } from "../../../testing";
import { SelfValue } from "./nodes";

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

  for (const test of selfCodeTests) {
    const testCase: TestCase = {
      name: `Self code Error for test ${test.name}`,
      test: async () => {
        const newJob = await JobManager.newJob();
        assert.ok(newJob.id);
        await newJob.setSelfState(test.code as SelfValue);
        try {
          await newJob.query(test.sql).execute();
        } catch (e) {}
        const result = await newJob.query<any>(content, {parameters: [newJob.id]}).execute();
        assert(result.data[0]['MATCHES'] >= 1);
        
        newJob.close();
      },
    };
    tests.push(testCase);
  }
  return tests;
}
