import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import { ServerComponent } from "../connection/serverComponent";
import { JobStatus } from "../connection/sqlJob";
import Database from "../database/schemas";
import Statement from "../database/statement";

const systemLibrary = `sample`;
const sqlSchema = `"TestDelimiters"`;

export const DatabaseSuite: TestSuite = {
  name: `Database object query tests`,
  tests: [
    {name: `DelimName tests`, test: async () => {
      const systemDelim = Statement.delimName(systemLibrary);
      assert.strictEqual(systemDelim, `SAMPLE`);

      const sqlDelim = Statement.delimName(sqlSchema);
      assert.strictEqual(sqlDelim, sqlSchema); // No change expect

      const withSpace = Statement.delimName(`my object`);
      assert.strictEqual(withSpace, `"my object"`);

      const longName = Statement.delimName(`create_sql_sample`);
      assert.strictEqual(longName, `CREATE_SQL_SAMPLE`);
    }},

    {name: `Get tables, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get tables, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(sqlSchema, `tables`);

      assert.notStrictEqual(objects.length, 0);
    }}
  ]
}