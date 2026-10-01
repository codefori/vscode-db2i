import { expect, test } from 'vitest'
import { coversAdvice, hasSameKeys, splitKeys } from './adviceCoverage';

test('Split advised keys', () => {
  expect(splitKeys(`CITY, COUNTRY`)).toEqual([`CITY`, `COUNTRY`]);
  expect(splitKeys(`  CITY ,COUNTRY   DESC `)).toEqual([`CITY`, `COUNTRY DESC`]);
  expect(splitKeys(`A, "B,1" DESC`)).toEqual([`A`, `"B,1" DESC`]);
  expect(splitKeys(null)).toEqual([]);
  expect(splitKeys(``)).toEqual([]);
});

test('Same keys in the same order', () => {
  expect(coversAdvice(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `CITY, COUNTRY` })).toBe(true);
  expect(coversAdvice(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `CITY, COUNTRY`, LEADING_COLUMN_KEYS: `` })).toBe(true);
});

test('First keys of the condensed advice', () => {
  expect(coversAdvice(`CITY, COUNTRY, ZIP`, { KEY_COLUMNS_ADVISED: `CITY` })).toBe(true);
  expect(coversAdvice(`CITY, COUNTRY, ZIP`, { KEY_COLUMNS_ADVISED: `CITY, COUNTRY` })).toBe(true);
  expect(coversAdvice(`CITY, COUNTRY, ZIP`, { KEY_COLUMNS_ADVISED: `COUNTRY` })).toBe(false);
  expect(coversAdvice(`CITY`, { KEY_COLUMNS_ADVISED: `CITY, COUNTRY` })).toBe(false);
});

test('Order only matters past the order independent keys', () => {
  expect(coversAdvice(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `COUNTRY, CITY` })).toBe(false);
  expect(coversAdvice(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `COUNTRY, CITY`, LEADING_COLUMN_KEYS: `COUNTRY, CITY` })).toBe(true);
  expect(coversAdvice(`CITY, COUNTRY, ZIP`, { KEY_COLUMNS_ADVISED: `COUNTRY, CITY, ZIP`, LEADING_COLUMN_KEYS: `COUNTRY, CITY` })).toBe(true);
  expect(coversAdvice(`CITY, ZIP, COUNTRY`, { KEY_COLUMNS_ADVISED: `COUNTRY, CITY`, LEADING_COLUMN_KEYS: `COUNTRY, CITY` })).toBe(false);
  expect(coversAdvice(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `COUNTRY, CITY`, LEADING_COLUMN_KEYS: `COUNTRY` })).toBe(false);
});

test('Descending keys', () => {
  expect(coversAdvice(`CITY, ZIP DESC`, { KEY_COLUMNS_ADVISED: `CITY, ZIP DESC`, LEADING_COLUMN_KEYS: `CITY` })).toBe(true);
  expect(coversAdvice(`CITY, ZIP DESC`, { KEY_COLUMNS_ADVISED: `CITY, ZIP`, LEADING_COLUMN_KEYS: `CITY` })).toBe(false);
});

test('Same keys rather than only the first ones', () => {
  expect(hasSameKeys(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `COUNTRY, CITY`, LEADING_COLUMN_KEYS: `COUNTRY, CITY` })).toBe(true);
  expect(hasSameKeys(`CITY, COUNTRY`, { KEY_COLUMNS_ADVISED: `CITY` })).toBe(false);
});
