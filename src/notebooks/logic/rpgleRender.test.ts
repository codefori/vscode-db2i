import { expect, test } from 'vitest'
import { renderRpgleResults, RpgleResultRow } from './rpgleRender'

test('Renders source lines with no results', () => {
  const html = renderRpgleResults('dcl-s x char(10);', []);

  expect(html).toContain('class="rpgle-results"');
  expect(html).toContain('class="line-num">1</span>');
  expect(html).toContain('dcl-s x char(10);');
  expect(html).not.toContain('has-result');
});

test('Renders evaluation result on correct line', () => {
  const source = `dcl-s x char(4);\nx = 'hi';`;
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 2, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'X = hi', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
  ];

  const html = renderRpgleResults(source, data);

  expect(html).toContain('has-result');
  expect(html).toContain('class="result evaluation"');
  expect(html).toContain('→ X = hi');
});

test('Renders test success with checkmark', () => {
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 1, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'two plus two', LOOP_COUNT: 1, RESULT_TYPE: 'TEST-SUCCESS' },
  ];

  const html = renderRpgleResults('replEquals(...);', data);

  expect(html).toContain('class="result test-success"');
  expect(html).toContain('✓');
});

test('Renders test failure with cross', () => {
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 1, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'expected 4 got 5', LOOP_COUNT: 1, RESULT_TYPE: 'TEST-FAILURE' },
  ];

  const html = renderRpgleResults('replEquals(...);', data);

  expect(html).toContain('class="result test-failure"');
  expect(html).toContain('✗');
});

test('Shows loop count when greater than 1', () => {
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 1, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'X = hi', LOOP_COUNT: 5, RESULT_TYPE: 'EVALUATION' },
  ];

  const html = renderRpgleResults('x = something;', data);

  expect(html).toContain('class="loop-count"');
  expect(html).toContain('(×5)');
});

test('Hides loop count element when 1', () => {
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 1, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'X = hi', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
  ];

  const html = renderRpgleResults('x = something;', data);

  // The CSS class definition is always present, but no element with that class should be rendered
  expect(html).not.toContain('class="loop-count"');
  expect(html).not.toContain('(×1)');
});

test('Escapes HTML in source and results', () => {
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 1, RESULT_NUMBER: 1, RESULT_DESCRIPTION: '<script>alert("xss")</script>', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
  ];

  const html = renderRpgleResults('if x < 10;', data);

  expect(html).toContain('&lt;');
  expect(html).not.toContain('<script>');
  expect(html).toContain('if x &lt; 10;');
});

test('Multiple results on same line', () => {
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 1, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'A = 1', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
    { LINE_NUMBER: 1, RESULT_NUMBER: 2, RESULT_DESCRIPTION: 'B = 2', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
  ];

  const html = renderRpgleResults('something;', data);

  expect(html).toContain('A = 1');
  expect(html).toContain('B = 2');
});

test('Multi-line source with sparse results', () => {
  const source = `dcl-s a char(4);\n\na = 'hi';\n\nreplPrint(a);`;
  const data: RpgleResultRow[] = [
    { LINE_NUMBER: 3, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'A = hi', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
    { LINE_NUMBER: 5, RESULT_NUMBER: 1, RESULT_DESCRIPTION: 'hi', LOOP_COUNT: 1, RESULT_TYPE: 'EVALUATION' },
  ];

  const html = renderRpgleResults(source, data);

  // Lines 1, 2, 4 should NOT have results
  expect(html).toContain('class="line-num">1</span>');
  expect(html).toContain('class="line-num">3</span>');
  expect(html).toContain('class="line-num">5</span>');

  // Count has-result divs
  const resultDivs = html.match(/has-result/g);
  expect(resultDivs?.length).toBe(2);
});

test('Includes CSS styles', () => {
  const html = renderRpgleResults('dcl-s x int;', []);

  expect(html).toContain('<style>');
  expect(html).toContain('--vscode-editor-font-family');
  expect(html).toContain('--vscode-testing-iconPassed');
});
