
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

describe(`Definition tests`, () => {
  test(`Definiton tests: Alias, function, procedure`, () => {
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
  
    const defs = doc.getDefinitions();
  
    expect(defs.length).toBe(3);

    const aliasDef = defs[0];
    expect(aliasDef.type).toBe(`ALIAS`);
    expect(aliasDef.object.schema).toBe(`"TestDelimiters"`);
    expect(aliasDef.object.name).toBe(`"Delimited Alias"`);
    expect(aliasDef.children.length).toBe(0);
  });

  test(`Definition tests: procedure with children`, () => {
    const lines = [
      `-- SELECT * FROM`,
      `-- TABLE(QSYS2.PARSE_STATEMENT('SELECT ORDNO,ORDSTS FROM PRODLIB.ORDHDR'))`,
      `-- AS A`,
      ``,
      `CREATE OR REPLACE PROCEDURE ILEDITOR.TELLMEWHATICANDOBETTER(IN QUERY VARCHAR(16000))`,
      `DYNAMIC RESULT SETS 1 `,
      `BEGIN`,
      `  DECLARE tableCount integer;`,
      `  DECLARE columnClauseCount integer;`,
      `  DECLARE hadTables Char(1);`,
      ``,
      `  DECLARE currentSchema varchar(128);`,
      `  DECLARE currentObject varchar(128);`,
      ``,
      `  DECLARE ResultSet CURSOR FOR`,
      `    SELECT * from session.suggestions;`,
      ``,
      `  OPEN ResultSet;`,
      `  SET RESULT SETS CURSOR ResultSet;`,
      `END;`,
    ].join(`\r\n`);

    const doc = new Document(lines);
  
    const defs = doc.getDefinitions();
  
    expect(defs.length).toBe(1);

    const procDef = defs[0];
    expect(procDef.type).toBe(`PROCEDURE`);
    expect(procDef.object.schema).toBe(`ILEDITOR`);
    expect(procDef.object.name).toBe(`TELLMEWHATICANDOBETTER`);
    expect(procDef.children.length).toBe(6);

    const children = procDef.children;

    const tableCount = children[0];
    expect(tableCount.object.name).toBe(`tableCount`);
    expect(tableCount.type).toBe(`integer`);

    const hadTables = children[2];
    expect(hadTables.object.name).toBe(`hadTables`);
    expect(hadTables.type).toBe(`Char(1)`);

    const ResultSet = children[5];
    expect(ResultSet.object.name).toBe(`ResultSet`);
    expect(ResultSet.type).toBe(`CURSOR`);
  });
});