import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import Database from "../database/schemas";
import Statement from "../database/statement";
import Callable from "../database/callable";
import { getInstance } from "../base";
import Table from "../database/table";
import View from "../database/view";

const systemLibrary = `sample`;
const sqlSchema = `"TestDelimiters"`;

export const DatabaseSuite: TestSuite = {
  name: `Database object query tests`,
  tests: [
    {name: `Create environment`, test: async () => {
      try {
        await JobManager.runSQL(`call qsys.create_sql_sample('SAMPLE')`);
      } catch (e) {
        console.log(`Probably exists.`);
      } finally {};

      try {
        const testDelimStatements = [
          `DROP SCHEMA "TestDelimiters";`,
          ``,
          `CREATE SCHEMA "TestDelimiters";`,
          `  `,
          `CREATE TYPE "TestDelimiters"."Delimited Type" AS BIGINT;`,
          `  `,
          `CREATE TABLE "TestDelimiters"."Delimited Table" ("Delimited Column" INTEGER DEFAULT NULL, `,
          `CONSTRAINT "TestDelimiters"."Delimited Key" PRIMARY KEY ("Delimited Column"));`,
          ``,
          `CREATE INDEX "TestDelimiters"."Delimited Index" ON "TestDelimiters"."Delimited Table" ("Delimited Column" ASC);`,
          ``,
          `CREATE TRIGGER "TestDelimiters"."Delimited Trigger" AFTER INSERT ON "TestDelimiters"."Delimited Table" `,
          `FOR EACH ROW MODE DB2SQL BEGIN DECLARE X INT; END;`,
          ``,
          `CREATE VIEW "TestDelimiters"."Delimited View" ("Delimited Column") AS SELECT * FROM "TestDelimiters"."Delimited Table";`,
          ``,
          `CREATE ALIAS "TestDelimiters"."Delimited Alias" FOR "TestDelimiters"."Delimited Table";`,
          ``,
          `CREATE FUNCTION "TestDelimiters"."Delimited Function" ("Delimited Parameter" INTEGER) `,
          `RETURNS INTEGER LANGUAGE SQL BEGIN RETURN "Delimited Parameter"; END;`,
          ``,
          `CREATE PROCEDURE "TestDelimiters"."Delimited Procedure" (INOUT "Delimited Parameter" INTEGER) `,
          `LANGUAGE SQL BEGIN SET "Delimited Parameter" = 13; END;`,
          ``,
          `CREATE VARIABLE "TestDelimiters"."Delimited Global Variable" BIGINT;`,
        ]
        
        // Server component doesn't support running multiple queries in one request
        await getInstance().getContent().runSQL(testDelimStatements.join(`\n`));
      } catch (e) {
        console.log(`Possible fail`);
      
      } finally {};
    }},

    {name: `Delim name tests`, test: async () => {
      const systemDelim = Statement.delimName(systemLibrary);
      assert.strictEqual(systemDelim, `SAMPLE`);

      const sqlDelim = Statement.delimName(sqlSchema);
      assert.strictEqual(sqlDelim, sqlSchema); // No change expect

      const withSpace = Statement.delimName(`my object`);
      assert.strictEqual(withSpace, `"my object"`);

      const longName = Statement.delimName(`create_sql_sample`);
      assert.strictEqual(longName, `"create_sql_sample"`);
    }},

    {name: `Get tables, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get tables, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(sqlSchema, `tables`);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get columns, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await Table.getItems(systemLibrary, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get columns, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(sqlSchema, `tables`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await Table.getItems(sqlSchema, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get view columns, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `views`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await View.getColumns(systemLibrary, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get view columns, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(sqlSchema, `views`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await View.getColumns(sqlSchema, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Generate SQL, system names`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);
      assert.notStrictEqual(objects.length, 0);

      const result = await Database.generateSQL(systemLibrary, objects[0].name, `tables`);
      assert.notStrictEqual(result, ``);
    }},

    {name: `Generate SQL, sql names`, test: async () => {
      const objects = await Database.getObjects(sqlSchema, `tables`);
      assert.notStrictEqual(objects.length, 0);

      const result = await Database.generateSQL(sqlSchema, objects[0].name, `tables`);
      assert.notStrictEqual(result, ``);
    }},

    {name: `Get parms`, test: async () => {
      const qsys = Statement.delimName(`qsys`);
      const createSqlSample = Statement.delimName(`CREATE_SQL_SAMPLE`);

      const parms = await Callable.getParms(qsys, createSqlSample);
      assert.notStrictEqual(parms.length, 0);
    }},
  ]
}