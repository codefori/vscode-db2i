import { expect, test } from 'vitest';
import { UpdatableInfo } from '../../views/html/dataTable';
import { inlineParameters } from '../../views/results/parameterInfo';
import { buildDeleteStatement } from '../../views/results/rowChanges';

const byRrn: UpdatableInfo = {
  table: `SAMPLE.EMPLOYEE`,
  columns: [
    { name: `RRN`, jsType: `number`, isNullable: false, useInWhere: true, insertable: false },
    { name: `EMPNO`, jsType: `asString`, isNullable: false, useInWhere: false },
    { name: `SALARY`, jsType: `number`, isNullable: true, useInWhere: false },
  ],
};

const byIdentity: UpdatableInfo = {
  table: `SAMPLE.ORDERS`,
  columns: [
    { name: `ID`, jsType: `number`, isNullable: false, useInWhere: true, insertable: false },
    { name: `ITEM`, jsType: `asString`, isNullable: true, useInWhere: false },
  ],
};

test('A row is deleted by its RRN', () => {
  expect(buildDeleteStatement(byRrn, [`RRN`, `EMPNO`, `SALARY`], [7, `000010`, 5000])).toEqual({
    statement: `DELETE FROM SAMPLE.EMPLOYEE t WHERE RRN(t) = ?`,
    bindings: [7],
  });
});

test('A row is deleted by its identity column, wherever it is in the result', () => {
  expect(buildDeleteStatement(byIdentity, [`ITEM`, `ID`], [`Pen`, `42`])).toEqual({
    statement: `DELETE FROM SAMPLE.ORDERS t WHERE ID = ?`,
    bindings: [42],
  });
});

test('A null key matches with IS NULL', () => {
  const nullableKey: UpdatableInfo = { table: `S.T`, columns: [{ name: `CODE`, jsType: `asString`, isNullable: true, useInWhere: true }] };
  expect(buildDeleteStatement(nullableKey, [`CODE`], [null])).toEqual({ statement: `DELETE FROM S.T t WHERE CODE IS NULL`, bindings: [] });
});

const byPrimaryKey: UpdatableInfo = {
  table: `SAMPLE.EMPPROJACT`,
  columns: [
    { name: `EMPNO`, jsType: `asString`, isNullable: false, useInWhere: true },
    { name: `PROJNO`, jsType: `asString`, isNullable: false, useInWhere: true },
    { name: `EMPTIME`, jsType: `number`, isNullable: true, useInWhere: false },
  ],
};

test('A row is deleted by every column of its primary key', () => {
  expect(buildDeleteStatement(byPrimaryKey, [`EMPNO`, `PROJNO`, `EMPTIME`], [`000010`, `MA2100`, 0.5])).toEqual({
    statement: `DELETE FROM SAMPLE.EMPPROJACT t WHERE EMPNO = ? AND PROJNO = ?`,
    bindings: [`000010`, `MA2100`],
  });
});

test('A row missing one column of its key cannot be deleted, as other rows could match', () => {
  expect(buildDeleteStatement(byPrimaryKey, [`EMPNO`, `EMPTIME`], [`000010`, 0.5])).toBeUndefined();
});

test('A row without its key column in the result cannot be deleted', () => {
  expect(buildDeleteStatement(byIdentity, [`ITEM`], [`Pen`])).toBeUndefined();
});

test('The confirmation shows the statement with its values', () => {
  const sql = buildDeleteStatement(byIdentity, [`ID`, `ITEM`], [42, `Pen`])!;
  expect(inlineParameters(sql.statement, sql.bindings)).toBe(`DELETE FROM SAMPLE.ORDERS t WHERE ID = 42`);
});
