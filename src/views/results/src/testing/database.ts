import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import Database from "../database/schemas";
import Statement from "../database/statement";
import Callable from "../database/callable";
import { getInstance } from "../base";
import Table from "../database/table";
import View from "../database/view";

const systemLibrary = Statement.delimName(`sample`, true);
const sqlSchema = `"TestDelimiters"`;

export const DatabaseSuite: TestSuite = {
  name: `Database object query tests`,
  tests: [
    {name: `Delim name tests`, test: async () => {
      // User input
      assert.strictEqual(systemLibrary, `SAMPLE`);

      // Name from user
      const sqlDelimUser = Statement.delimName(sqlSchema, true);
      assert.strictEqual(sqlDelimUser, `"TestDelimiters"`);

      // Name from system
      const sqlDelimFromSys = Statement.delimName(`TestDelimiters`);
      assert.strictEqual(sqlDelimFromSys, sqlSchema);

      // Name from user
      const withSpaceUserA = Statement.delimName(`"my object"`, true);
      assert.strictEqual(withSpaceUserA, `"my object"`);

      // Name from user
      const withSpaceUserB = Statement.delimName(`my object`, true);
      assert.strictEqual(withSpaceUserB, `"my object"`);

      // Name from system
      const withSpaceSys = Statement.delimName(`my object`);
      assert.strictEqual(withSpaceSys, `"my object"`);

      // Name from user
      const longNameUser = Statement.delimName(`create_sql_sample`, true);
      assert.strictEqual(longNameUser, `CREATE_SQL_SAMPLE`);

      // Name from system
      const longNameSystem = Statement.delimName(`CREATE_SQL_SAMPLE`);
      assert.strictEqual(longNameSystem, `CREATE_SQL_SAMPLE`);
    }},

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

    {name: `Get tables, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get tables, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), `tables`);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get columns, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await Table.getItems(systemLibrary, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get columns, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), `tables`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await Table.getItems(Statement.noQuotes(sqlSchema), objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get view columns, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `views`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await View.getColumns(systemLibrary, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get view columns, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), `views`);
      assert.notStrictEqual(objects.length, 0);

      const cols = await View.getColumns(Statement.noQuotes(sqlSchema), objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Generate SQL, system names`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, `tables`);
      assert.notStrictEqual(objects.length, 0);

      const result = await Database.generateSQL(systemLibrary, objects[0].name, `TABLE`);
      assert.notStrictEqual(result, ``);
    }},

    {name: `Generate SQL, sql names`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), `tables`);
      assert.notStrictEqual(objects.length, 0);

      const result = await Database.generateSQL(Statement.noQuotes(sqlSchema), objects[0].name, `TABLE`);
      assert.notStrictEqual(result, ``);
    }},

    {name: `Get parms`, test: async () => {
      const qsys = Statement.delimName(`qsys`, true);
      const createSqlSample = Statement.delimName(`CREATE_SQL_SAMPLE`, true);

      const parms = await Callable.getParms(qsys, createSqlSample);
      assert.notStrictEqual(parms.length, 0);
    }},
  ]
}