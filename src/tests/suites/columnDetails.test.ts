import { expect, test } from 'vitest';
import { resultColumnDetails } from '../../views/results/columnDetails';

test('Column details follow ACS', () => {
  expect(resultColumnDetails({ name: `ACTNO`, label: `ACTNO`, type: `SMALLINT`, precision: 5, scale: 0, nullable: 0, table: `ACT`, autoIncrement: false })).toEqual([
    [`Name`, `ACTNO`],
    [`Type`, `SMALLINT`],
    [`Precision`, `5`],
    [`Scale`, `0`],
    [`Nullable`, `No`],
    [`Label`, `ACTNO`],
    [`Table`, `ACT`],
  ]);
});

test('Details missing from older servers are left out', () => {
  expect(resultColumnDetails({ name: `TOTAL`, label: `Total amount`, type: `DECIMAL`, precision: 9, scale: 2 })).toEqual([
    [`Name`, `TOTAL`],
    [`Type`, `DECIMAL`],
    [`Precision`, `9`],
    [`Scale`, `2`],
    [`Label`, `Total amount`],
  ]);
});

test('Unknown nullability is left out and identity columns are flagged', () => {
  const details = resultColumnDetails({ name: `ID`, label: `ID`, type: `INTEGER`, precision: 10, scale: 0, nullable: 2, table: ``, autoIncrement: true });
  expect(details.map(([label]) => label)).toEqual([`Name`, `Type`, `Precision`, `Scale`, `Label`, `Auto increment`]);
});
