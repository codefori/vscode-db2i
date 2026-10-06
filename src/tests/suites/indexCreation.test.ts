import { describe, expect, test, vi } from 'vitest'
import { formatTimestamp } from '../../views/schemaBrowser/indexCreation';

// Only the pure formatting helpers are under test; the job manager needs a connection no test has
vi.mock('../../config', () => ({ JobManager: {} }));

describe(`formatTimestamp`, () => {
  test(`Space separated, as returned by the server`, () => {
    expect(formatTimestamp(`2026-10-02 09:45:55.901612`)).toBe(`2026-10-02 09:45`);
  });

  test(`Db2 native format`, () => {
    expect(formatTimestamp(`2026-10-01-17.56.05.190652`)).toBe(`2026-10-01 17:56`);
  });

  test(`ISO format`, () => {
    expect(formatTimestamp(`2026-10-02T09:45:55`)).toBe(`2026-10-02 09:45`);
  });

  test(`Without fractional seconds`, () => {
    expect(formatTimestamp(`2026-10-02 09:45:55`)).toBe(`2026-10-02 09:45`);
  });

  test(`Seconds are truncated, not rounded`, () => {
    expect(formatTimestamp(`2026-10-02 09:45:59.999999`)).toBe(`2026-10-02 09:45`);
  });

  // The value has no time zone of its own: the hour shown must be the hour returned, whatever the local offset
  test(`Does not shift around midnight`, () => {
    expect(formatTimestamp(`2026-10-02 00:30:00.000000`)).toBe(`2026-10-02 00:30`);
    expect(formatTimestamp(`2026-12-31 23:59:59.999999`)).toBe(`2026-12-31 23:59`);
  });

  test(`Does not shift across daylight saving time`, () => {
    expect(formatTimestamp(`2026-01-15 09:45:00.000000`)).toBe(`2026-01-15 09:45`);
    expect(formatTimestamp(`2026-07-15 09:45:00.000000`)).toBe(`2026-07-15 09:45`);
  });

  test(`Unparseable values are returned as-is`, () => {
    expect(formatTimestamp(``)).toBe(``);
    expect(formatTimestamp(`not a timestamp`)).toBe(`not a timestamp`);
    expect(formatTimestamp(`2026-10-02`)).toBe(`2026-10-02`);
  });
});
