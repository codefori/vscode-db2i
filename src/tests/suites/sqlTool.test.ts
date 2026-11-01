import { expect, test, vi } from 'vitest';

vi.mock('../../config', () => ({ JobManager: {} }));

import { serializeSqlToolResult } from '../../aiProviders/copilot/sqlTool';

test('returns a successful no-result-set response for DDL statements', () => {
  expect(JSON.parse(serializeSqlToolResult(undefined))).toEqual({
    success: true,
    hasResultSet: false,
    rows: [],
  });
});

test('returns rows for statements with a result set', () => {
  expect(JSON.parse(serializeSqlToolResult([{ CURRENT_DATE: '2026-11-01' }]))).toEqual({
    success: true,
    hasResultSet: true,
    rows: [{ CURRENT_DATE: '2026-11-01' }],
  });
});