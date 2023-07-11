import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import { ServerComponent } from "../connection/serverComponent";
import { JobStatus } from "../connection/sqlJob";
import Database from "../database/schemas";

const systemLibrary = `sample`;
const sqlSchema = `"TestDelimiters"`;

export const DatabaseSuite: TestSuite = {
  name: `Database object query tests`,
  tests: [
    {name: `Get tables, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);;

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get tables, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(sqlSchema, `tables`);;

      assert.notStrictEqual(objects.length, 0);
    }}
  ]
}