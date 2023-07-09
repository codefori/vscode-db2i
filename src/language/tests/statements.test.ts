import { assert, describe, expect, test } from 'vitest'
import SQLTokeniser from '../tokens'
import Document from '../document';

describe(`Basic statements`, () => {
  test('One statement, no end', () => {
    const document = new Document(`select * from sample`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(4);
  });
  
  test('One statement, with end', () => {
    const document = new Document(`select * from sample;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(4);
  });
  
  test('Two statements, one end', () => {
    const document = new Document([
      `select * from sample;`,
      `select a from b.b`
    ].join(`\n`));
  
    expect(document.statements.length).toBe(2);
    expect(document.statements[0].tokens.length).toBe(4);
    expect(document.statements[1].tokens.length).toBe(6);
  });
  
  test('Two statements, both end', () => {
    const document = new Document([
      `select * from sample;`,
      `select a from b.b;`
    ].join(`\n`));
  
    expect(document.statements.length).toBe(2);
    expect(document.statements[0].tokens.length).toBe(4);
    expect(document.statements[1].tokens.length).toBe(6);
  });
  
  test('Two statements, both end, with comments', () => {
    const document = new Document([
      `select * from sample; --Yep`,
      `select a from b.b; -- Nope`
    ].join(`\n`));
  
    expect(document.statements.length).toBe(2);
    expect(document.statements[0].tokens.length).toBe(4);
    expect(document.statements[1].tokens.length).toBe(6);
  });
  
  test('Two statements, both end, with comments, trimmed', () => {
    const document = new Document([
      ``,
      `select * from sample; --Yep`,
      ``,
      ``,
      `select a from b.b; -- Nope`,
      ``,
      ``
    ].join(`\n`));
  
    expect(document.statements.length).toBe(2);
    expect(document.statements[0].tokens.length).toBe(4);
    expect(document.statements[1].tokens.length).toBe(6);
  });
});

describe(`Object references`, () => {
  test('SELECT: Simple unqualified object', () => {
    const document = new Document(`select * from sample;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(4);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(1);

    const obj = refs[0];
    expect(obj.object.name).toBe(`sample`);
    expect(obj.object.schema).toBeUndefined();
    expect(obj.alias).toBeUndefined();
  });

  test('SELECT: Simple qualified object', () => {
    const document = new Document(`select * from myschema.sample;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(6);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(1);

    const obj = refs[0];
    expect(obj.object.name).toBe(`sample`);
    expect(obj.object.schema).toBe(`myschema`);
    expect(obj.alias).toBeUndefined();
  });

  test('SELECT: Simple qualified object with alias', () => {
    const document = new Document(`select * from myschema.sample as a;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(8);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(1);

    const obj = refs[0];
    expect(obj.object.name).toBe(`sample`);
    expect(obj.object.schema).toBe(`myschema`);
    expect(obj.alias).toBe(`a`)
  });

  test('SELECT: Simple unqualified object with alias (no AS)', () => {
    const document = new Document(`select * from sample a;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(5);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(1);

    const obj = refs[0];
    expect(obj.object.name).toBe(`sample`);
    expect(obj.object.schema).toBeUndefined();
    expect(obj.alias).toBe(`a`)
  });

  test('SELECT: Simple qualified object with alias (no AS)', () => {
    const document = new Document(`select * from myschema.sample a;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(7);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(1);

    const obj = refs[0];
    expect(obj.object.name).toBe(`sample`);
    expect(obj.object.schema).toBe(`myschema`);
    expect(obj.alias).toBe(`a`)
  });

  test('SELECT: Simple qualified object with alias (system naming)', () => {
    const document = new Document(`select * from myschema/sample as a;`);
  
    expect(document.statements.length).toBe(1);
    expect(document.statements[0].tokens.length).toBe(8);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(1);

    const obj = refs[0];
    expect(obj.object.name).toBe(`sample`);
    expect(obj.object.schema).toBe(`myschema`);
    expect(obj.alias).toBe(`a`)
  });

  test(`SELECT JOIN: inner join`, () => {
    const query = [
      `SELECT EMPNO, LASTNAME, PROJNO`,
      `FROM CORPDATA.EMPLOYEE INNER JOIN CORPDATA.PROJECT`,
      `      ON EMPNO = RESPEMP`,
      `WHERE LASTNAME > 'S';`,
    ].join(`\n`);

    const document = new Document(query);

    expect(document.statements.length).toBe(1);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(2);

    const emp = refs[0];
    expect(emp.object.name).toBe(`EMPLOYEE`);
    expect(emp.object.schema).toBe(`CORPDATA`);
    expect(emp.alias).toBeUndefined();

    const proj = refs[1];
    expect(proj.object.name).toBe(`PROJECT`);
    expect(proj.object.schema).toBe(`CORPDATA`);
    expect(proj.alias).toBeUndefined();
  });

  test(`SELECT JOIN: left outer join`, () => {
    const query = [
      `SELECT EMPNO, LASTNAME, PROJNO`,
      `FROM CORPDATA.EMPLOYEE LEFT OUTER JOIN CORPDATA.PROJECT`,
      `      ON EMPNO = RESPEMP`,
      `WHERE LASTNAME > 'S'`,
    ].join(`\n`);

    const document = new Document(query);

    expect(document.statements.length).toBe(1);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(2);

    const emp = refs[0];
    expect(emp.object.name).toBe(`EMPLOYEE`);
    expect(emp.object.schema).toBe(`CORPDATA`);
    expect(emp.alias).toBeUndefined();

    const proj = refs[1];
    expect(proj.object.name).toBe(`PROJECT`);
    expect(proj.object.schema).toBe(`CORPDATA`);
    expect(proj.alias).toBeUndefined();
  });

  test(`SELECT JOIN: right outer join`, () => {
    const query = [
      `SELECT EMPNO, LASTNAME, PROJNO`,
      `FROM CORPDATA.PROJECT RIGHT OUTER JOIN CORPDATA.EMPLOYEE`,
      `      ON EMPNO = RESPEMP`,
      `WHERE LASTNAME > 'S';`,
    ].join(`\n`);

    const document = new Document(query);

    expect(document.statements.length).toBe(1);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(2);

    const proj = refs[0];
    expect(proj.object.name).toBe(`PROJECT`);
    expect(proj.object.schema).toBe(`CORPDATA`);
    expect(proj.alias).toBeUndefined();

    const emp = refs[1];
    expect(emp.object.name).toBe(`EMPLOYEE`);
    expect(emp.object.schema).toBe(`CORPDATA`);
    expect(emp.alias).toBeUndefined();
  });

  test(`SELECT JOIN: exception join`, () => {
    const query = [
      `SELECT EMPNO, LASTNAME, PROJNO`,
      `FROM CORPDATA.EMPLOYEE EXCEPTION JOIN PROJECT`,
      `      ON EMPNO = RESPEMP`,
      `WHERE LASTNAME > 'S'`,
    ].join(`\n`);

    const document = new Document(query);

    expect(document.statements.length).toBe(1);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(2);

    const emp = refs[0];
    expect(emp.object.name).toBe(`EMPLOYEE`);
    expect(emp.object.schema).toBe(`CORPDATA`);
    expect(emp.alias).toBeUndefined();

    const proj = refs[1];
    expect(proj.object.name).toBe(`PROJECT`);
    expect(proj.object.schema).toBeUndefined();
    expect(proj.alias).toBeUndefined();
  });

  test(`SELECT JOIN: cross join`, () => {
    const query = [
      `SELECT * FROM A CROSS JOIN B`,
    ].join(`\n`);

    const document = new Document(query);

    expect(document.statements.length).toBe(1);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(2);

    const A = refs[0];
    expect(A.object.name).toBe(`A`);
    expect(A.object.schema).toBeUndefined;
    expect(A.alias).toBeUndefined();

    const B = refs[1];
    expect(B.object.name).toBe(`B`);
    expect(B.object.schema).toBeUndefined();
    expect(B.alias).toBeUndefined();
  });

  test(`SELECT JOIN: full outer join`, () => {
    const query = [
      `SELECT EMPNO, LASTNAME, PROJNO`,
      `FROM EMPLOYEE as A FULL OUTER JOIN PROJECT b`,
      `      ON EMPNO = RESPEMP`,
      `WHERE LASTNAME > 'S'`,
    ].join(`\n`);

    const document = new Document(query);

    expect(document.statements.length).toBe(1);

    const statement = document.statements[0];

    const refs = statement.getObjectReferences();
    expect(refs.length).toBe(2);

    const emp = refs[0];
    expect(emp.object.name).toBe(`EMPLOYEE`);
    expect(emp.object.schema).toBeUndefined;
    expect(emp.alias).toBe(`A`);

    const proj = refs[1];
    expect(proj.object.name).toBe(`PROJECT`);
    expect(proj.object.schema).toBeUndefined;
    expect(proj.alias).toBe(`b`);
  });

  test(`INSERT: simple inserts`, () => {
    const content = [
      `insert into talks (user, content) values ('LINUX', 'Hello world, my talk birdtalk'), ('LINUX', 'This is another thing I did #hi');`,
      `insert into "myschema".hashtags (tag, base_talk) values('#hi', 2);`,
    ].join(`\r\n`);

    const document = new Document(content);

    expect(document.statements.length).toBe(2);

    const talksStatement = document.statements[0];
    const hashtagsStatement = document.statements[1];

    const refsA = talksStatement.getObjectReferences();
    expect(refsA.length).toBe(1);
    expect(refsA[0].object.name).toBe(`talks`);
    expect(refsA[0].object.schema).toBeUndefined();


    const refsB = hashtagsStatement.getObjectReferences();
    expect(refsB.length).toBe(1);
    expect(refsB[0].object.name).toBe(`hashtags`);
    expect(refsB[0].object.schema).toBe(`"myschema"`);
  });

  test(`DELETE: simple delete`, () => {
    const content = [
      `delete from talks where id > 2;`
    ].join(`\r\n`);

    const document = new Document(content);

    expect(document.statements.length).toBe(1);

    const talksStatement = document.statements[0];

    const refsA = talksStatement.getObjectReferences();
    expect(refsA.length).toBe(1);
    expect(refsA[0].object.name).toBe(`talks`);
    expect(refsA[0].object.schema).toBeUndefined();
  });

  test(`CALL: simple unqualified`, () => {
    const content = [
      `call create_Sql_sample('MYNEWSCHEMA');`
    ].join(`\r\n`);

    const document = new Document(content);

    expect(document.statements.length).toBe(1);

    const talksStatement = document.statements[0];

    const refsA = talksStatement.getObjectReferences();
    expect(refsA.length).toBe(1);
    expect(refsA[0].object.name).toBe(`create_Sql_sample`);
    expect(refsA[0].object.schema).toBeUndefined();
  });

  test(`CALL: simple qualified`, () => {
    const content = [
      `call "QSYS".create_Sql_sample('MYNEWSCHEMA');`
    ].join(`\r\n`);

    const document = new Document(content);

    expect(document.statements.length).toBe(1);

    const talksStatement = document.statements[0];

    const refsA = talksStatement.getObjectReferences();
    expect(refsA.length).toBe(1);
    expect(refsA[0].object.name).toBe(`create_Sql_sample`);
    expect(refsA[0].object.schema).toBe(`"QSYS"`);
  });
});