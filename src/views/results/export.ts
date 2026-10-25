import { env, window, workspace } from "vscode";
import Configuration from "../../configuration";

export type ExportFormat = `csv` | `json` | `md` | `sql`;

export const EXPORT_FORMATS: Record<ExportFormat, { label: string; language: string }> = {
  csv: { label: `CSV`, language: `csv` },
  json: { label: `JSON`, language: `json` },
  md: { label: `Markdown`, language: `markdown` },
  sql: { label: `SQL`, language: `sql` },
};

/** Rows are arrays in column order, so duplicate column names keep their own values */
export interface ExportTable {
  columns: string[];
  rows: unknown[][];
}

const CSV_DELIMITERS: Record<string, string> = { Comma: `,`, Semicolon: `;`, Tab: `\t` };

const INSERT_LIMIT = 1000;

export function isExportFormat(value: string): value is ExportFormat {
  return Object.hasOwn(EXPORT_FORMATS, value);
}

export function formatResults(format: ExportFormat, table: ExportTable, csvDelimiter = `,`): string {
  switch (format) {
    case `csv`: return toCsv(table, csvDelimiter);
    case `json`: return toJson(table);
    case `md`: return toMarkdown(table);
    case `sql`: return toSqlInserts(table);
  }
}

function formatWithSettings(format: ExportFormat, table: ExportTable): string {
  const delimiter = CSV_DELIMITERS[Configuration.get<string>(`codegen.csvColumnDelimiter`) || `Comma`] ?? `,`;
  return formatResults(format, table, delimiter);
}

/** Opens the rows in a new untitled editor */
export async function openResultsAs(format: ExportFormat, table: ExportTable) {
  const document = await workspace.openTextDocument({ language: EXPORT_FORMATS[format].language, content: formatWithSettings(format, table) });
  await window.showTextDocument(document);
}

export async function copyResultsAs(format: ExportFormat, table: ExportTable) {
  await env.clipboard.writeText(formatWithSettings(format, table));
  const rows = table.rows.length;
  window.showInformationMessage(`Copied ${rows} row${rows === 1 ? `` : `s`} to the clipboard as ${EXPORT_FORMATS[format].label}.`);
}

const isNull = (value: unknown) => value === null || value === undefined;

function toCsv({ columns, rows }: ExportTable, delimiter: string): string {
  const quote = (value: unknown) => `"${String(value).replace(/"/g, `""`)}"`;
  const lines = [columns.map(quote).join(delimiter)];
  for (const row of rows) {
    lines.push(columns.map((_, i) => isNull(row[i]) ? `` : quote(row[i])).join(delimiter));
  }
  return lines.join(`\n`);
}

function toJson({ columns, rows }: ExportTable): string {
  const objects = rows.map(row => Object.fromEntries(columns.map((column, i) => [column, row[i] ?? null])));
  return JSON.stringify(objects, null, 2);
}

function toMarkdown({ columns, rows }: ExportTable): string {
  const cell = (value: unknown) => isNull(value) ? `NULL` : String(value).replace(/\|/g, `\\|`).replace(/\n/g, ` `);
  const cells = rows.map(row => columns.map((_, i) => cell(row[i])));
  const widths = columns.map((column, i) => cells.reduce((width, row) => Math.max(width, row[i].length), column.length));
  const line = (values: string[]) => `| ${values.map((value, i) => value.padEnd(widths[i])).join(` | `)} |`;

  return [line(columns), line(widths.map(width => `-`.repeat(width))), ...cells.map(line)].join(`\n`);
}

function toSqlInserts({ columns, rows }: ExportTable): string {
  const literal = (value: unknown) => {
    if (isNull(value)) return `null`;
    if (typeof value === `string`) return `'${value.replace(/'/g, `''`)}'`;
    return String(value);
  };

  const statements = Math.ceil(rows.length / INSERT_LIMIT);
  let content = `-- Generated ${statements} insert statement${statements === 1 ? `` : `s`}\n\n`;

  for (let start = 0; start < rows.length; start += INSERT_LIMIT) {
    const values = rows.slice(start, start + INSERT_LIMIT).map(row => `  (${columns.map((_, i) => literal(row[i])).join(`, `)})`);
    content += [
      `insert into TABLE (`,
      `  ${columns.join(`, `)}`,
      `) values `,
      values.join(`,\n`),
    ].join(`\n`) + `;\n`;
  }

  return content;
}
