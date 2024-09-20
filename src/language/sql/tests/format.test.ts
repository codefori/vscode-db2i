import { assert, expect, test } from 'vitest'
import SQLTokeniser from '../tokens'
import Document from '../document';
import { FormatOptions, formatSql } from '../formatter';

const optionsUpper: FormatOptions = {
  indentWidth: 4,
  keywordCase: 'upper',
  identifierCase: 'upper',
  newLineLists: true
}

const optionsLower: FormatOptions = {
  indentWidth: 4,
  keywordCase: 'lower',
  identifierCase: 'lower',
  newLineLists: true
}


// Edit an assertion and save to see HMR in action
test('Clause new line - upper', () => {
  const sql = `select * from sample`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(`SELECT
    *
FROM
    SAMPLE;`);
});

test('Clause new line - lower', () => {
  const sql = `select * from sample`;
  const formatted = formatSql(sql, optionsLower);
  expect(formatted).toBe(`select
    *
from
    sample;`);
});

test('Two clause statements', () => {
  const sql = `select * from sample;\nselect * from sample;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(`SELECT
    *
FROM
    SAMPLE;
SELECT
    *
FROM
    SAMPLE;`);
});

test('Simple multi clause', () => {
  const sql = `select * from sample limit 1`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(
`SELECT
    *
FROM
    SAMPLE
LIMIT
    1;`);
});

test('Brackets', () => {
  const sql = `SELECT * FROM SAMPLE(RESET_STATISTICS => 'NO', JOB_NAME_FILTER => '*ALL', DETAILED_INFO => 'NONE') WHERE UPPER(JOB_NAME) LIKE '%QNAVMNSRV%' ORDER BY JOB_NAME_SHORT, JOB_NUMBER;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(`SELECT
    *
FROM
    SAMPLE(
        RESET_STATISTICS => 'NO',
        JOB_NAME_FILTER => '*ALL',
        DETAILED_INFO => 'NONE'
    )
WHERE
    UPPER(JOB_NAME) LIKE '%QNAVMNSRV%'
ORDER BY
    JOB_NAME_SHORT,
    JOB_NUMBER;`);
});

test('Select with columns', () => {
  const sql = `SELECT ONE, TWO, THREE FROM SAMPLE2`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(`SELECT
    ONE,
    TWO,
    THREE
FROM
    SAMPLE2;`);
});

test('Nested Select', () => {
  const sql = `SELECT * FROM SAMPLE ( SELECT ONE, TWO, THREE FROM SAMPLE2 ) WHERE UPPER(JOB_NAME) LIKE '%QNAVMNSRV%' ORDER BY JOB_NAME_SHORT, JOB_NUMBER;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(`SELECT
    *
FROM
    SAMPLE (
        SELECT
            ONE,
            TWO,
            THREE
        FROM
            SAMPLE2
    )
WHERE
    UPPER(JOB_NAME) LIKE '%QNAVMNSRV%'
ORDER BY
    JOB_NAME_SHORT,
    JOB_NUMBER;`);
});

test('Alter Table to Add Materialized Query (from ACS)', () => {
  const sql = `ALTER TABLE table1 ADD MATERIALIZED QUERY (SELECT int_col, varchar_col FROM table3) DATA INITIALLY IMMEDIATE REFRESH DEFERRED MAINTAINED BY USER ENABLE QUERY OPTIMIZATION;`;
  const formatted = formatSql(sql, optionsUpper);
  expect(formatted).toBe(`ALTER
    TABLE TABLE1 ADD MATERIALIZED QUERY (
        SELECT
            INT_COL,
            VARCHAR_COL
        FROM
            TABLE3
    ) DATA INITIALLY IMMEDIATE REFRESH DEFERRED MAINTAINED BY USER ENABLE QUERY OPTIMIZATION;`);
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
    `    return "Delimited Parameter";`,
    `end;`
  ].join(`\n`));
})

test('Active jobs (from Nav)', () => {
  const sql = `SELECT * FROM TABLE ( QSYS2.ACTIVE_JOB_INFO( RESET_STATISTICS => 'NO', SUBSYSTEM_LIST_FILTER => '', JOB_NAME_FILTER => '*ALL', CURRENT_USER_LIST_FILTER => '', DETAILED_INFO => 'NONE' ) ) ORDER BY SUBSYSTEM,  RUN_PRIORITY,  JOB_NAME_SHORT,  JOB_NUMBER LIMIT 100 OFFSET 0`;
  const formatted = formatSql(sql, optionsUpper);
  // console.log('*************');
  // console.log(formatted);
  // console.log('*************');
});