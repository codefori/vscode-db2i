import { expect, test, vi } from 'vitest';

vi.mock('../../config', () => ({ JobManager: {} }));

import { serializeSqlToolError, serializeSqlToolResult } from '../../aiProviders/copilot/sqlTool';

test('returns a successful no-result-set response for DDL statements', () => {
  expect(JSON.parse(serializeSqlToolResult({ has_results: false, update_count: 0, data: undefined }))).toEqual({
    success: true,
    hasResultSet: false,
    updateCount: 0,
    rows: [],
  });
});

test('returns the affected row count for DML statements', () => {
  expect(JSON.parse(serializeSqlToolResult({ has_results: false, update_count: 3, data: [] }))).toEqual({
    success: true,
    hasResultSet: false,
    updateCount: 3,
    rows: [],
  });
});

test('returns rows for statements with a result set', () => {
  expect(JSON.parse(serializeSqlToolResult({ has_results: true, update_count: -1, data: [{ CURRENT_DATE: '2026-11-01' }] }))).toEqual({
    success: true,
    hasResultSet: true,
    updateCount: -1,
    rows: [{ CURRENT_DATE: '2026-11-01' }],
  });
});

test('returns an unsuccessful response with the error message when the statement fails', () => {
  expect(JSON.parse(serializeSqlToolError(new Error('[SQL0204] MYTABLE in MYLIB type *FILE not found.')))).toEqual({
    success: false,
    error: '[SQL0204] MYTABLE in MYLIB type *FILE not found.',
  });
});
