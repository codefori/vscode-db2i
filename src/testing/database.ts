import assert from "assert";
import { TestSuite } from ".";
import { JobManager } from "../config";
import Database, { AllSQLTypes } from "../database/schemas";
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

    {name: `Setup for delimited names`, test: async () => {
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
      const objects = await Database.getObjects(systemLibrary, [`tables`]);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Schema filter test`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, AllSQLTypes, {filter: `emp`});

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get tables, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), [`tables`]);

      assert.notStrictEqual(objects.length, 0);
    }},

    {name: `Get columns, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, [`tables`]);
      assert.notStrictEqual(objects.length, 0);

      const cols = await Table.getItems(systemLibrary, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get columns, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), [`tables`]);
      assert.notStrictEqual(objects.length, 0);

      const cols = await Table.getItems(Statement.noQuotes(sqlSchema), objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get view columns, system name`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, [`views`]);
      assert.notStrictEqual(objects.length, 0);

      const cols = await View.getColumns(systemLibrary, objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Get view columns, sqlSchema name`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), [`views`]);
      assert.notStrictEqual(objects.length, 0);

      const cols = await View.getColumns(Statement.noQuotes(sqlSchema), objects[0].name);
      assert.notStrictEqual(cols.length, 0);
    }},

    {name: `Generate SQL, system names`, test: async () => {
      const objects = await Database.getObjects(systemLibrary, [`tables`]);
      assert.notStrictEqual(objects.length, 0);

      const result = await Database.generateSQL(systemLibrary, objects[0].name, `TABLE`);
      assert.notStrictEqual(result, ``);
    }},

    {name: `Generate SQL, sql names`, test: async () => {
      const objects = await Database.getObjects(Statement.noQuotes(sqlSchema), [`tables`]);
      assert.notStrictEqual(objects.length, 0);

      const result = await Database.generateSQL(Statement.noQuotes(sqlSchema), objects[0].name, `TABLE`);
      assert.notStrictEqual(result, ``);
    }},

    {name: `Get parms`, test: async () => {
      const qsys = Statement.delimName(`qsys`, true);
      const createSqlSample = Statement.delimName(`CREATE_SQL_SAMPLE`, true);

      const parms = await Callable.getSignaturesFor(qsys, [createSqlSample]);
      assert.notStrictEqual(parms.length, 0);
    }},

    {name: `Setup for overloaded routines`, test: async () => {
      // Setup overloaded routines
      try {
        await JobManager.runSQL(`DROP SCHEMA OVERLOAD`);
      } catch (e) {
        console.log(`Probably doesn't exist.`);
      }

      try {
        await JobManager.runSQL(`CREATE SCHEMA OVERLOAD`);
      } catch (e) {
        console.log(`Probably exists.`);
      }
      try {
        const statements = [
          `CREATE OR REPLACE FUNCTION OVERLOAD.MULTI_FUNC (P1 INTEGER) RETURNS INTEGER SPECIFIC OVERLOAD.MULTI_FUNC_SQUARED RETURN P1 * P1`,
          `LABEL ON SPECIFIC FUNCTION OVERLOAD.MULTI_FUNC_SQUARED IS 'Accepts One Integer and Returns Its Square'`,
          `COMMENT ON PARAMETER SPECIFIC FUNCTION OVERLOAD.MULTI_FUNC_SQUARED (P1 IS 'Value to Square')`,

          `CREATE OR REPLACE FUNCTION OVERLOAD.MULTI_FUNC (P1 INTEGER, P2 INTEGER) RETURNS INTEGER SPECIFIC OVERLOAD.MULTI_FUNC_PRODUCT RETURN P1 * P2`,
          `LABEL ON SPECIFIC FUNCTION OVERLOAD.MULTI_FUNC_PRODUCT IS 'Accepts Two Integer and Returns the Product'`,
          `COMMENT ON PARAMETER SPECIFIC FUNCTION OVERLOAD.MULTI_FUNC_PRODUCT (P1 IS 'First Value', P2 IS 'Second Value')`,

          `CREATE OR REPLACE PROCEDURE OVERLOAD.MULTI_PROC () SPECIFIC OVERLOAD.MULTI_PROC_ALL_MONITORS PROGRAM TYPE SUB DYNAMIC RESULT SETS 1 BEGIN DECLARE MONITORS CURSOR WITH RETURN FOR SELECT * FROM QUSRSYS.QAUGDBPMD2; OPEN MONITORS; END`,
          `LABEL ON SPECIFIC PROCEDURE OVERLOAD.MULTI_PROC_ALL_MONITORS IS 'Returns the Entire List of Monitors'`,

          `CREATE OR REPLACE PROCEDURE OVERLOAD.MULTI_PROC (IN CREATOR CHARACTER(10)) SPECIFIC OVERLOAD.MULTI_PROC_MY_MONITORS PROGRAM TYPE SUB DYNAMIC RESULT SETS 1 BEGIN DECLARE MONITORS CURSOR WITH RETURN FOR SELECT * FROM QUSRSYS.QAUGDBPMD2 WHERE "Created by" = CREATOR; OPEN MONITORS; END`,
          `LABEL ON SPECIFIC PROCEDURE OVERLOAD.MULTI_PROC_MY_MONITORS IS 'Returns the List of My Monitors'`,
          `COMMENT ON PARAMETER SPECIFIC PROCEDURE OVERLOAD.MULTI_PROC_MY_MONITORS (CREATOR IS 'User That Created the Monitor')`,
        ]
        
        for (const statement of statements) {
          await JobManager.runSQL(statement);
        }
      } catch (e) {
        assert.fail(e);
        console.log(`Possible fail`);
        console.log(e);
      }
    }},

    {name: `Retrieve overloaded function parameters`, test: async () => {
      const functions = await Database.getObjects(`OVERLOAD`, [`functions`]);
      assert.ok(functions.some(f => f.specificName === `MULTI_FUNC_SQUARED`));
      assert.ok(functions.some(f => f.specificName === `MULTI_FUNC_PRODUCT`));

      const multiFuncSquared = await Callable.getSignaturesFor(`OVERLOAD`, [`MULTI_FUNC_SQUARED`]);
      assert.strictEqual(multiFuncSquared.length, 1);
      assert.strictEqual(multiFuncSquared[0].parms.length, 1);

      const multiFuncProduct = await Callable.getSignaturesFor(`OVERLOAD`, [`MULTI_FUNC_PRODUCT`]);

      assert.strictEqual(multiFuncProduct.length, 1);
      assert.strictEqual(multiFuncProduct[0].parms.length, 2);
    }},

    {name: `Generate SQL for overloaded functions`, test: async () => {
      // Generate SQL for overloaded functions, verify they are different
      const func1 = await Database.generateSQL(`OVERLOAD`, `MULTI_FUNC_SQUARED`, `FUNCTION`);
      const func2 = await Database.generateSQL(`OVERLOAD`, `MULTI_FUNC_PRODUCT`, `FUNCTION`);
      assert.notStrictEqual(func1, func2);
    }},

    {name: `Delete overloaded function`, test: async () => {
      // Delete one of the overloaded functions
      await Database.deleteObject(`OVERLOAD`, `MULTI_FUNC_SQUARED`, `function`);
      const functions = await Database.getObjects(`OVERLOAD`, [`functions`]);
      // Verify only one function remains and it is not the one deleted
      assert.strictEqual(functions.length, 1);
      assert.strictEqual(functions[0].specificName, `MULTI_FUNC_PRODUCT`);
    }},

    {name: `Retrieve overloaded procedure parameters`, test: async () => {
      const procedures = await Database.getObjects(`OVERLOAD`, [`procedures`]);
      assert.ok(procedures.some(proc => proc.specificName === `MULTI_PROC_ALL_MONITORS`));
      assert.ok(procedures.some(proc => proc.specificName === `MULTI_PROC_MY_MONITORS`));

      const specificNames = procedures.map(proc => proc.specificName);

      const signatures = await Callable.getSignaturesFor(`OVERLOAD`, specificNames);

      // Only one procedure should have parameters
      assert.strictEqual(signatures.length, 1);
      const multiProcAllMonitors = signatures.find(sig => sig.specificName === `MULTI_PROC_MY_MONITORS`);
      assert.strictEqual(multiProcAllMonitors.parms.length, 1);
    }},

    {name: `Generate SQL for overloaded procedures`, test: async () => {
      // Generate SQL for overloaded procedures, verify they are different
      const proc1 = await Database.generateSQL(`OVERLOAD`, `MULTI_PROC_ALL_MONITORS`, `PROCEDURE`);
      const proc2 = await Database.generateSQL(`OVERLOAD`, `MULTI_PROC_MY_MONITORS`, `PROCEDURE`);
      assert.notStrictEqual(proc1, proc2);
    }},

    {name: `Delete overloaded procedure`, test: async () => {
      // Delete one of the overloaded procedures
      await Database.deleteObject(`OVERLOAD`, `MULTI_PROC_ALL_MONITORS`, `procedure`);
      const procedures = await Database.getObjects(`OVERLOAD`, [`procedures`]);
      // Verify only one procedure remains and it is not the one deleted
      assert.strictEqual(procedures.length, 1);
      assert.strictEqual(procedures[0].specificName, `MULTI_PROC_MY_MONITORS`);
    }},
  ]
}