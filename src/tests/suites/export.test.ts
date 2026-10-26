import { expect, test } from 'vitest';
import { formatResults, isExportFormat } from '../../views/results/export';

const table = {
  columns: [`ID`, `NAME`, `ID`],
  rows: [
    [1, `Ann "A" | B`, 10],
    [2, null, 20],
  ],
};

test('Export format names', () => {
  expect(isExportFormat(`csv`)).toBe(true);
  expect(isExportFormat(`md`)).toBe(true);
  expect(isExportFormat(`rpg`)).toBe(false);
  expect(isExportFormat(`toString`)).toBe(false);
});

test('Export to CSV', () => {
  expect(formatResults(`csv`, table)).toBe([
    `"ID","NAME","ID"`,
    `"1","Ann ""A"" | B","10"`,
    `"2",,"20"`,
  ].join(`\n`));

  expect(formatResults(`csv`, table, { delimiter: `;` }).split(`\n`)[2]).toBe(`"2";;"20"`);
});

test('Export to CSV with a decimal separator', () => {
  const prices = {
    columns: [`ID`, `PRICE`, `CODE`, `BIG`],
    types: [`INTEGER`, `DECIMAL`, `VARCHAR`, `DECFLOAT`],
    rows: [[1, 12.5, `A.1`, `1234.5678`]],
  };

  expect(formatResults(`csv`, prices, { delimiter: `;`, decimalSeparator: `,` }).split(`\n`)[1]).toBe(`"1";"12,5";"A.1";"1234,5678"`);
  expect(formatResults(`csv`, prices).split(`\n`)[1]).toBe(`"1","12.5","A.1","1234.5678"`);
});

test('Export to JSON', () => {
  expect(JSON.parse(formatResults(`json`, { columns: [`ID`, `NAME`], rows: [[1, `Ann`], [2, undefined]] }))).toEqual([
    { ID: 1, NAME: `Ann` },
    { ID: 2, NAME: null },
  ]);
});

test('Export to Markdown', () => {
  expect(formatResults(`md`, table)).toBe([
    `| ID | NAME         | ID |`,
    `| -- | ------------ | -- |`,
    `| 1  | Ann "A" \\| B | 10 |`,
    `| 2  | NULL         | 20 |`,
  ].join(`\n`));
});

test('Export to SQL inserts', () => {
  expect(formatResults(`sql`, { columns: [`ID`, `NAME`], rows: [[1, `O'Neil`], [2, null]] })).toBe([
    `-- Generated 1 insert statement`,
    ``,
    `insert into TABLE (`,
    `  ID, NAME`,
    `) values `,
    `  (1, 'O''Neil'),`,
    `  (2, null);`,
    ``,
  ].join(`\n`));

  const rows = Array.from({ length: 2500 }, (_, i) => [i]);
  const content = formatResults(`sql`, { columns: [`ID`], rows });
  expect(content.startsWith(`-- Generated 3 insert statements`)).toBe(true);
  expect(content.match(/insert into/g)?.length).toBe(3);
});
