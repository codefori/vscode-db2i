import { assert, expect, test } from 'vitest'
import SQLTokeniser from '../tokens'
import Document from '../document';

// Edit an assertion and save to see HMR in action

test('One statement, no end', () => {
  const document = new Document(`select * from sample`);

  expect(document.statements.length).toBe(1);
  expect(document.statements[0].tokens.length).toBe(4);
});

test('One statement, with end', () => {
  const document = new Document(`select * from sample;`);

  expect(document.statements.length).toBe(1);
  expect(document.statements[0].tokens.length).toBe(4);
});

test('Two statements, one end', () => {
  const document = new Document([
    `select * from sample;`,
    `select a from b.b`
  ].join(`\n`));

  expect(document.statements.length).toBe(2);
  expect(document.statements[0].tokens.length).toBe(4);
  expect(document.statements[1].tokens.length).toBe(7);
});

test('Two statements, both end', () => {
  const document = new Document([
    `select * from sample;`,
    `select a from b.b;`
  ].join(`\n`));

  expect(document.statements.length).toBe(2);
  expect(document.statements[0].tokens.length).toBe(4);
  expect(document.statements[1].tokens.length).toBe(7);
});

test('Two statements, both end, with comments', () => {
  const document = new Document([
    `select * from sample; --Yep`,
    `select a from b.b; -- Nope`
  ].join(`\n`));

  expect(document.statements.length).toBe(2);
  expect(document.statements[0].tokens.length).toBe(4);
  expect(document.statements[1].tokens.length).toBe(7);
});