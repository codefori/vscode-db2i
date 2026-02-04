import { assert, expect, test } from 'vitest'
import SQLTokeniser from '../tokens'
import Document from '../document';
import { FormatOptions, formatSql } from '../formatter';

const optionsUpper: FormatOptions = {
  indentWidth: 4,
  keywordCase: 'upper',
  identifierCase: 'upper',
  newLineLists: true,
  spaceBetweenStatements: true
}

const optionsLower: FormatOptions = {
  indentWidth: 4,
  keywordCase: 'lower',
  identifierCase: 'lower',
  newLineLists: true,
  spaceBetweenStatements: true
}

const optionsNoNewLine: FormatOptions = {
  indentWidth: 4,
  keywordCase: 'lower',
  identifierCase: 'lower',
  newLineLists: false,
  spaceBetweenStatements: true
}


// Edit an assertion and save to see HMR in action
test('Clause new line - upper', () => {
  const sql = `select * from sample`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    *`,
    `FROM`,
    `    SAMPLE;`,
  ].join(`\n`));
});

test('Clause new line - lower', () => {
  const sql = `select * from sample`;
  const formatted = formatSql(sql, optionsLower);
  expect(formatted).toBe([
    `select`,
    `    *`,
    `from`,
    `    sample;`,
  ].join(`\n`));
});

test('Two clause statements', () => {
  const sql = `select * from sample;\nselect * from sample;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    *`,
    `FROM`,
    `    SAMPLE;`,
    `SELECT`,
    `    *`,
    `FROM`,
    `    SAMPLE;`,
  ].join(`\n`));
});

test('Simple multi clause', () => {
  const sql = `select * from sample limit 1`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    *`,
    `FROM`,
    `    SAMPLE`,
    `LIMIT`,
    `    1;`,
  ].join(`\n`));
});

test('Brackets', () => {
  const sql = `SELECT * FROM SAMPLE(RESET_STATISTICS => 'NO', JOB_NAME_FILTER => '*ALL', DETAILED_INFO => 'NONE') WHERE UPPER(JOB_NAME) LIKE '%QNAVMNSRV%' ORDER BY JOB_NAME_SHORT, JOB_NUMBER;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    *`,
    `FROM`,
    `    SAMPLE(`,
    `        RESET_STATISTICS => 'NO',`,
    `        JOB_NAME_FILTER => '*ALL',`,
    `        DETAILED_INFO => 'NONE'`,
    `    )`,
    `WHERE`,
    `    UPPER(JOB_NAME) LIKE '%QNAVMNSRV%'`,
    `ORDER BY`,
    `    JOB_NAME_SHORT,`,
    `    JOB_NUMBER;`,
  ].join(`\n`));
});

test('Select with columns', () => {
  const sql = `SELECT ONE, TWO, THREE FROM SAMPLE2`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    ONE,`,
    `    TWO,`,
    `    THREE`,
    `FROM`,
    `    SAMPLE2;`
  ].join(`\n`));
});

test('Nested Select', () => {
  const sql = `SELECT * FROM SAMPLE ( SELECT ONE, TWO, THREE FROM SAMPLE2 ) WHERE UPPER(JOB_NAME) LIKE '%QNAVMNSRV%' ORDER BY JOB_NAME_SHORT, JOB_NUMBER;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    *`,
    `FROM`,
    `    SAMPLE (`,
    `        SELECT`,
    `            ONE,`,
    `            TWO,`,
    `            THREE`,
    `        FROM`,
    `            SAMPLE2`,
    `    )`,
    `WHERE`,
    `    UPPER(JOB_NAME) LIKE '%QNAVMNSRV%'`,
    `ORDER BY`,
    `    JOB_NAME_SHORT,`,
    `    JOB_NUMBER;`
  ].join(`\n`));
});

test('Alter Table to Add Materialized Query (from ACS)', () => {
  const sql = `ALTER TABLE table1 ADD MATERIALIZED QUERY (SELECT int_col, varchar_col FROM table3) DATA INITIALLY IMMEDIATE REFRESH DEFERRED MAINTAINED BY USER ENABLE QUERY OPTIMIZATION;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `ALTER`,
    `    TABLE TABLE1 ADD MATERIALIZED QUERY (`,
    `        SELECT`,
    `            INT_COL,`,
    `            VARCHAR_COL`,
    `        FROM`,
    `            TABLE3`,
    `    ) DATA INITIALLY IMMEDIATE REFRESH DEFERRED MAINTAINED BY USER ENABLE QUERY OPTIMIZATION;`,
  ].join(`\n`));
});

test(`CREATE FUNCTION: with single parameter`, () => {
  const sql = [
    `CREATE FUNCTION "TestDelimiters"."Delimited Function" ("Delimited Parameter" INTEGER) `,
    `RETURNS INTEGER LANGUAGE SQL BEGIN RETURN "Delimited Parameter"; END;`,
  ].join(`\n`);

  const formatted = formatSql(sql, optionsLower);

  expect(formatted).toBe([
    `create function "TestDelimiters"."Delimited Function"(`,
    `    "Delimited Parameter" integer`,
    `) returns integer language sql begin`,
    ``,
    `    return "Delimited Parameter";`,
    ``,
    `end;`
  ].join(`\n`));
});

test(`CREATE PROCEDURE: with complex body`, () => {
  const sql = [
    `create or replace procedure liama.sql_system(IN command char(512), in curlib varchar(10) default '*SAME', IN libl varchar(512) default '*SAME')`,
    `  program type sub`,
    `  result sets 1`,
    `begin`,
    `  declare startTime timestamp;`,
    `  declare endTime timestamp;`,
    ``,
    `  declare theJob varchar(28);`,
    `  declare spool_name varchar(10);`,
    `  declare spool_number int;`,
    `  declare chgcurlib varchar(1024);`,
    ``,
    `  declare c_result CURSOR FOR`,
    `    select SPOOLED_DATA from `,
    `    table(systools.spooled_file_data(theJob, spooled_file_name => spool_name, spooled_file_number => spool_number));`,
    ``,
    `  set chgcurlib = 'chglibl curlib(' concat curlib concat ') libl(' concat libl concat ')';`,
    ``,
    `  if (curlib <> '*SAME' or libl <> '*SAME') then`,
    `    call qsys2.qcmdexc(chgcurlib);`,
    `  end if;`,
    ``,
    `  set startTime = current_timestamp;`,
    ``,
    `  call qsys2.qcmdexc(command);`,
    ``,
    `  set endTime = current_timestamp;`,
    ``,
    `  select `,
    `    char(job_number) || '/' || job_user || '/' || job_name, `,
    `    spooled_file_name, `,
    `    spooled_file_number `,
    `  into theJob, spool_name, spool_number`,
    `  from table(qsys2.spooled_file_info(starting_timestamp => startTime, ending_timestamp => endTime)) x order by creation_timestamp desc limit 1;`,
    ``,
    `  open c_result;`,
    `end;`,
  ].join(`\n`);

  const formatted = formatSql(sql, optionsUpper);
});

test('Active jobs (from Nav)', () => {
  const sql = `SELECT * FROM TABLE ( QSYS2.ACTIVE_JOB_INFO( RESET_STATISTICS => 'NO', SUBSYSTEM_LIST_FILTER => '', JOB_NAME_FILTER => '*ALL', CURRENT_USER_LIST_FILTER => '', DETAILED_INFO => 'NONE' ) ) ORDER BY SUBSYSTEM,  RUN_PRIORITY,  JOB_NAME_SHORT,  JOB_NUMBER LIMIT 100 OFFSET 0`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `SELECT`,
    `    *`,
    `FROM`,
    `    TABLE (`,
    `        QSYS2.ACTIVE_JOB_INFO(`,
    `            RESET_STATISTICS => 'NO',`,
    `            SUBSYSTEM_LIST_FILTER => '',`,
    `            JOB_NAME_FILTER => '*ALL',`,
    `            CURRENT_USER_LIST_FILTER => '',`,
    `            DETAILED_INFO => 'NONE'`,
    `        )`,
    `    )`,
    `ORDER BY`,
    `    SUBSYSTEM,`,
    `    RUN_PRIORITY,`,
    `    JOB_NAME_SHORT,`,
    `    JOB_NUMBER`,
    `LIMIT`,
    `    100`,
    `OFFSET`,
    `    0;`,
  ].join(`\n`));
});

test('Select WITH', () => {
  const sql = `WITH A AS ( SELECT * FROM TABLE ( QSYS2.IFS_OBJECT_STATISTICS( START_PATH_NAME => '/QIBM/ProdData/HTTPA/admin/www/', SUBTREE_DIRECTORIES => 'NO', OBJECT_TYPE_LIST => '', OMIT_LIST => '', IGNORE_ERRORS => 'YES' ) ) ) SELECT * FROM A WHERE UPPER(PATH_NAME) LIKE '%HTML%' ORDER BY UPPER(PATH_NAME) ASC LIMIT 500 OFFSET 0`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe([
    `WITH`,
    `    A AS (`,
    `        SELECT`,
    `            *`,
    `        FROM`,
    `            TABLE (`,
    `                QSYS2.IFS_OBJECT_STATISTICS(`,
    `                    START_PATH_NAME => '/QIBM/PRODDATA/HTTPA/ADMIN/WWW/',`,
    `                    SUBTREE_DIRECTORIES => 'NO',`,
    `                    OBJECT_TYPE_LIST => '',`,
    `                    OMIT_LIST => '',`,
    `                    IGNORE_ERRORS => 'YES'`,
    `                )`,
    `            )`,
    `    )`,
    `SELECT`,
    `    *`,
    `FROM`,
    `    A`,
    `WHERE`,
    `    UPPER(PATH_NAME) LIKE '%HTML%'`,
    `ORDER BY`,
    `    UPPER(PATH_NAME) ASC`,
    `LIMIT`,
    `    500`,
    `OFFSET`,
    `    0;`,
  ].join(`\n`));
});

test('Create and Insert', () => {
  const sql = [
    `CREATE TABLE emp(name VARCHAR(100) CCSID 1208, id int);`,
    `INSERT INTO emp VALUES ('name', 1);`
  ].join(`\n`);
  const formatted = formatSql(sql, optionsUpper);
  // console.log("*******");
  // console.log(formatted);
  // console.log("*******");
  expect(formatted).toBe([
    `CREATE TABLE EMP (`,
    `    NAME VARCHAR(100) CCSID 1208,`,
    `    ID INT`,
    `);`,
    `INSERT INTO`,
    `    EMP`,
    `VALUES(`,
    `        'NAME',`,
    `        1`,
    `);`,
  ].join(`\n`));
});