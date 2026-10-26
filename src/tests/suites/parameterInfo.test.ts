import { expect, test } from 'vitest';
import { describeParameters, inlineParameters } from '../../views/results/parameterInfo';

test('Values replace the markers as literals', () => {
  expect(inlineParameters(`select * from sample.employee where empno = ? and lastname = ? and bonus > ? and job = ?`, [`000010`, `O'CONNELL`, 500, null as any]))
    .toBe(`select * from sample.employee where empno = '000010' and lastname = 'O''CONNELL' and bonus > 500 and job = null`);
});

test('Values are inlined into a sorted and filtered statement', () => {
  const sql = `SELECT * FROM (select * from sample.employee where workdept = ?) AS "DTQ" WHERE UPPER(CAST("LASTNAME" AS VARCHAR(1024) CCSID 37)) LIKE UPPER(CAST('%A\\%%' AS VARCHAR(1024) CCSID 37)) ESCAPE '\\' ORDER BY 1 DESC`;
  expect(inlineParameters(sql, [`A00`])).toBe(sql.replace(`?`, `'A00'`));
});

test('A statement without values is left as is', () => {
  expect(inlineParameters(`select * from x where a = ?`)).toBe(`select * from x where a = ?`);
});

test('No parameters gives no description', () => {
  expect(describeParameters([])).toBeUndefined();
});

test('Positional and named parameters are listed like the bind prompt', () => {
  expect(describeParameters([`A`, 10, null, `B`], [undefined, `ID`, undefined, `id`])).toBe([
    `Parameters:`,
    `  Parameter marker 1 = 'A'`,
    `  :ID = 10`,
    `  Parameter marker 2 = NULL`,
  ].join(`\n`));
});

test('Without names every parameter is positional', () => {
  expect(describeParameters([`X`, 2])).toBe([
    `Parameters:`,
    `  Parameter marker 1 = 'X'`,
    `  Parameter marker 2 = 2`,
  ].join(`\n`));
});
