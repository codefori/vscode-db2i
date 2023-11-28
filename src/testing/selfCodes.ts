import assert from "assert";
import { TestSuite } from ".";
import { ServerComponent } from "../connection/serverComponent";
import { testSelfCodes } from "../views/jobManager/selfCodes/selfCodesTest";
import { getInstance } from "../base";

export const SelfCodesTestSuite: TestSuite = {
  name: `Self Codes Tests`,
  tests: [
    {name: `Backend check`, test: async () => {
      const backendInstalled = await ServerComponent.initialise();
  
      // To run these tests, we need the backend server. If this test fails. Don't bother
      assert.strictEqual(backendInstalled, true);
      try {
        const selfTestSchema = [
          `CREATE SCHEMA SELFTEST;`,
          ``,
          `CREATE OR REPLACE TABLE SELFTEST.MYTBL (C1 INT, C2 VARCHAR(100), C3 TIMESTAMP, C4 DATE);`,
          ``,
          `CREATE OR REPLACE TABLE SELFTEST.MYTBL2 (C1 INT, C2 VARCHAR(100), C3 TIMESTAMP, C4 DATE);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL VALUES (0, 'ADAM', CURRENT TIMESTAMP, CURRENT DATE);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL VALUES (1, 'LIAM', CURRENT TIMESTAMP + 1 SECOND, CURRENT DATE + 1 DAY);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL VALUES (2, 'RYAN', CURRENT TIMESTAMP + 2 SECOND, CURRENT DATE + 2 DAY);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL VALUES (3, NULL, CURRENT TIMESTAMP + 2 SECOND, CURRENT DATE + 2 DAY);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL2 VALUES (0, 'TIM', CURRENT TIMESTAMP, CURRENT DATE);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL2 VALUES (1, 'SCOTT', CURRENT TIMESTAMP + 1 SECOND, CURRENT DATE + 1 DAY);`,
          ``,
          `INSERT INTO SELFTEST.MYTBL2 VALUES (2, 'JESSIE', CURRENT TIMESTAMP + 2 SECOND, CURRENT DATE + 2 DAY);`
        ]
        await getInstance().getContent().runSQL(selfTestSchema.join(`\n`));

      } catch (e) {
        console.log(`Possible fail`);
      }
    }},
    ...testSelfCodes()]
}