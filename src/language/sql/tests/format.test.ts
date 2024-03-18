import { assert, expect, test } from 'vitest'
import SQLTokeniser from '../tokens'
import Document from '../document';
import { formatSql } from '../formatter';

// Edit an assertion and save to see HMR in action

test('Clause new line', () => {
  const document = new Document(`select * from sample`);

  const formatted = formatSql(document);

  expect(formatted).toBe(`select * \nfrom sample`);
});