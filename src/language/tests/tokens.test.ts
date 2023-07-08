import { assert, expect, test } from 'vitest'
import SQLTokeniser from '../tokens'

// Edit an assertion and save to see HMR in action

test('Basic tokens', () => {
  const tokeniser = new SQLTokeniser();

  const tokens = tokeniser.tokenise(`select * from sample`);

  expect(tokens.length).toBe(4);
});

test('Function and block test', () => {
  const tokeniser = new SQLTokeniser();

  const tokens = tokeniser.tokenise(`select * from table(func()) x`);

  expect(tokens.length).toBe(10);
  expect(tokens[3].type).toBe(`function`);
});

test('Comment test', () => {
  const tokeniser = new SQLTokeniser();

  const tokens = tokeniser.tokenise(`select * from table(func()) x -- Hello world`);

  expect(tokens.length).toBe(10);
});

test('New line (\\n) and comments test', () => {
  const tokeniser = new SQLTokeniser();

  const tokens = tokeniser.tokenise([
    `select * --cool`,
    `from sample -- this table doesn't exist`
  ].join(`\n`));

  expect(tokens.length).toBe(5);
  expect (tokens[3].type === `newline`);
});

test('New line (\\r\\n) and comments test', () => {
  const tokeniser = new SQLTokeniser();

  const tokens = tokeniser.tokenise([
    `select * --cool`,
    `from sample-- this table doesn't exist`
  ].join(`\r\n`));

  expect(tokens.length).toBe(5);
  expect (tokens[3].type === `newline`);
});