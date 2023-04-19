import assert from "assert";
import { TestSuite } from ".";
import { commands } from "vscode";
import { JobManager } from "../config";
import { SQLJobManager } from "../connection/manager";

export const JobsSuite: TestSuite = {
  name: `Connection tests`,
  tests: [
    {name: `Backend checker`, test: async () => {
      const backendInstalled = await SQLJobManager.hasBackendServer();
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);
    }},
  ]
}