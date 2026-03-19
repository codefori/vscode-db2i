export interface RpgleResultRow {
  LINE_NUMBER: number;
  RESULT_NUMBER: number;
  RESULT_DESCRIPTION: string;
  LOOP_COUNT: number;
  RESULT_TYPE: string;
}

interface LineResult {
  description: string;
  type: string;
  loopCount: number;
}

export function renderRpgleResults(cellSource: string, data: RpgleResultRow[]): string {
  const sourceLines = cellSource.split(/\r?\n/);

  // Group results by line number
  const resultsByLine = new Map<number, LineResult[]>();
  for (const row of data) {
    const lineNum = Number(row.LINE_NUMBER);
    if (!resultsByLine.has(lineNum)) {
      resultsByLine.set(lineNum, []);
    }
    resultsByLine.get(lineNum).push({
      description: row.RESULT_DESCRIPTION,
      type: (row.RESULT_TYPE || ``).trim(),
      loopCount: Number(row.LOOP_COUNT),
    });
  }

  const lines: string[] = [];
  lines.push(`<div class="rpgle-results">`);

  for (let i = 0; i < sourceLines.length; i++) {
    const lineNum = i + 1;
    const code = escapeHtml(sourceLines[i]);
    const lineResults = resultsByLine.get(lineNum);

    if (lineResults && lineResults.length > 0) {
      lines.push(`  <div class="rpgle-line has-result">`);
      lines.push(`    <span class="line-num">${lineNum}</span>`);
      lines.push(`    <span class="code">${code}</span>`);
      for (const r of lineResults) {
        const cssClass = resultTypeClass(r.type);
        const icon = resultTypeIcon(r.type);
        const loopSuffix = r.loopCount > 1 ? ` <span class="loop-count">(×${r.loopCount})</span>` : ``;
        lines.push(`    <span class="result ${cssClass}">${icon} ${escapeHtml(r.description)}${loopSuffix}</span>`);
      }
      lines.push(`  </div>`);
    } else {
      lines.push(`  <div class="rpgle-line">`);
      lines.push(`    <span class="line-num">${lineNum}</span>`);
      lines.push(`    <span class="code">${code}</span>`);
      lines.push(`  </div>`);
    }
  }

  lines.push(`</div>`);
  lines.push(`<style>${getRpgleStyles()}</style>`);

  return lines.join(`\n`);
}

function resultTypeClass(type: string): string {
  switch (type) {
    case `TEST-SUCCESS`: return `test-success`;
    case `TEST-FAILURE`: return `test-failure`;
    case `EVALUATION`: return `evaluation`;
    default: return `evaluation`;
  }
}

function resultTypeIcon(type: string): string {
  switch (type) {
    case `TEST-SUCCESS`: return `✓`;
    case `TEST-FAILURE`: return `✗`;
    default: return `→`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, `&amp;`)
    .replace(/</g, `&lt;`)
    .replace(/>/g, `&gt;`)
    .replace(/"/g, `&quot;`);
}

function getRpgleStyles(): string {
  return `
.rpgle-results {
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: var(--vscode-editor-font-size, 13px);
  line-height: 1.6;
  padding: 8px 0;
}
.rpgle-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  padding: 1px 8px;
}
.rpgle-line .line-num {
  width: 3em;
  text-align: right;
  color: var(--vscode-editorLineNumber-foreground, #858585);
  padding-right: 1em;
  user-select: none;
  flex-shrink: 0;
}
.rpgle-line .code {
  flex: 1;
  white-space: pre;
  color: var(--vscode-editor-foreground);
}
.rpgle-line .result {
  margin-left: 2em;
  white-space: pre;
}
.rpgle-line .result.evaluation {
  color: var(--vscode-descriptionForeground, #717171);
}
.rpgle-line .result.test-success {
  color: var(--vscode-testing-iconPassed, #73c991);
}
.rpgle-line .result.test-failure {
  color: var(--vscode-testing-iconFailed, #f14c4c);
}
.rpgle-line .loop-count {
  color: var(--vscode-descriptionForeground, #717171);
  font-size: 0.9em;
}
`;
}
