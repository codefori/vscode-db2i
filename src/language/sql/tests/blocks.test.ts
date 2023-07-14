
import { assert, describe, expect, test } from 'vitest'
import Document from '../document';
import { StatementType } from '../types';

describe(`Block statement tests`, () => {
  test('Block start tests', () => {
    const lines = [
      `CREATE ALIAS "TestDelimiters"."Delimited Alias" FOR "TestDelimiters"."Delimited Table";`,
      ``,
      `CREATE FUNCTION "TestDelimiters"."Delimited Function" ("Delimited Parameter" INTEGER) `,
      `RETURNS INTEGER LANGUAGE SQL BEGIN RETURN "Delimited Parameter"; END;`,
      ``,
      `CREATE PROCEDURE "TestDelimiters"."Delimited Procedure" (INOUT "Delimited Parameter" INTEGER) `,
      `LANGUAGE SQL BEGIN SET "Delimited Parameter" = 13; END;`,
    ].join(`\n`);

    const doc = new Document(lines);

    // CREATE, CREATE, RETURN, END, CREATE, SET, END
    expect(doc.statements.length).toBe(7);

    const aliasDef = doc.statements[0];
    expect(aliasDef.isBlockOpener()).toBeFalsy();

    const functionDef = doc.statements[1];
    expect(functionDef.isBlockOpener()).toBeTruthy();

    const procedureDef = doc.statements[4];
    expect(procedureDef.isBlockOpener()).toBeTruthy();
  });

  test('Compound statement test', () => {
    const lines = [
      `CREATE ALIAS "TestDelimiters"."Delimited Alias" FOR "TestDelimiters"."Delimited Table";`,
      ``,
      `CREATE FUNCTION "TestDelimiters"."Delimited Function" ("Delimited Parameter" INTEGER) `,
      `RETURNS INTEGER LANGUAGE SQL BEGIN RETURN "Delimited Parameter"; END;`,

      `BEGIN`,
      `  DECLARE already_exists SMALLINT DEFAULT 0;`,
      `  DECLARE dup_object_hdlr CONDITION FOR SQLSTATE '42710';`,
      `  DECLARE CONTINUE HANDLER FOR dup_object_hdlr`,
      `      SET already_exists = 1;`,
      `  CREATE TABLE table1(col1 INT);`,
      `  IF already_exists > 0`,
      `  THEN`,
      `      DELETE FROM table1;`,
      `  END IF;`,
      `END;`,
      ``,
      `CREATE PROCEDURE "TestDelimiters"."Delimited Procedure" (INOUT "Delimited Parameter" INTEGER) `,
      `LANGUAGE SQL BEGIN SET "Delimited Parameter" = 13; END;`,
    ].join(`\n`);

    const doc = new Document(lines);

    console.log(doc.statements);

    const t = doc.statements.length;

    const aliasDef = doc.statements[0];
    expect(aliasDef.isBlockOpener()).toBeFalsy();

    const functionDef = doc.statements[1];
    expect(functionDef.isBlockOpener()).toBeTruthy();

    const functionEnd = doc.statements[3];
    expect(functionEnd.isBlockEnder()).toBeTruthy();

    const beginBlock = doc.statements[4];
    expect(beginBlock.isBlockOpener()).toBeTruthy();
  });

  test('Statement groups', () => {
    const compoundStatement = [
      `BEGIN`,
      `  DECLARE already_exists SMALLINT DEFAULT 0;`,
      `  DECLARE dup_object_hdlr CONDITION FOR SQLSTATE '42710';`,
      `  DECLARE CONTINUE HANDLER FOR dup_object_hdlr`,
      `      SET already_exists = 1;`,
      `  CREATE TABLE table1(col1 INT);`,
      `  IF already_exists > 0`,
      `  THEN`,
      `      DELETE FROM table1;`,
      `  END IF;`,
      `END`,
    ].join(`\r\n`);

    const lines = [
      `CREATE ALIAS "TestDelimiters"."Delimited Alias" FOR "TestDelimiters"."Delimited Table";`,
      ``,
      `CREATE FUNCTION "TestDelimiters"."Delimited Function" ("Delimited Parameter" INTEGER) `,
      `RETURNS INTEGER LANGUAGE SQL BEGIN RETURN "Delimited Parameter"; END;`,
      compoundStatement + `;`,
      ``,
      `CREATE PROCEDURE "TestDelimiters"."Delimited Procedure" (INOUT "Delimited Parameter" INTEGER) `,
      `LANGUAGE SQL BEGIN SET "Delimited Parameter" = 13; END;`,
    ].join(`\r\n`);

    const doc = new Document(lines);

    const groups = doc.getStatementGroups();

    expect(groups.length).toBe(4);

    const aliasStatement = groups[0];
    const aliasSubstring = lines.substring(aliasStatement.range.start, aliasStatement.range.end);
    expect(aliasSubstring).toBe(`CREATE ALIAS "TestDelimiters"."Delimited Alias" FOR "TestDelimiters"."Delimited Table"`);

    const beginStatement = groups[2];
    const compoundSubstring = lines.substring(beginStatement.range.start, beginStatement.range.end);
    expect(compoundSubstring).toBe(compoundStatement);
  });
});