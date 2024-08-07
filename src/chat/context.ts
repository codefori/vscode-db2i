import { JobManager } from "../config";
import * as vscode from "vscode";
import Statement from "../database/statement";

export function canTalkToDb() {
  return JobManager.getSelection() !== undefined;
}

export function getDefaultSchema(): string {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0]
    ? currentJob.job.options.libraries[0]
    : `QGPL`;
};

export type TableRefs = { [key: string]: TableColumn[] };

export async function getTableMetaData(schema: string, tableName: string): Promise<TableColumn[]> {
  const objectFindStatement = [
    `SELECT `,
    `  column.TABLE_NAME,`,
    `  column.COLUMN_NAME,`,
    `  key.CONSTRAINT_NAME,`,
    `  column.DATA_TYPE, `,
    `  column.CHARACTER_MAXIMUM_LENGTH,`,
    `  column.NUMERIC_SCALE, `,
    `  column.NUMERIC_PRECISION,`,
    `  column.IS_NULLABLE, `,
    // `  column.HAS_DEFAULT, `,
    // `  column.COLUMN_DEFAULT, `,
    `  column.COLUMN_TEXT, `,
    `  column.IS_IDENTITY`,
    `FROM QSYS2.SYSCOLUMNS2 as column`,
    `LEFT JOIN QSYS2.syskeycst as key`,
    `  on `,
    `    column.table_schema = key.table_schema and`,
    `    column.table_name = key.table_name and`,
    `    column.column_name = key.column_name`,
    `WHERE column.TABLE_SCHEMA = '${Statement.delimName(schema, true)}'`,
    `AND column.TABLE_NAME = '${Statement.delimName(tableName, true)}'`,
    `ORDER BY column.ORDINAL_POSITION`,
  ].join(` `);

  return await JobManager.runSQL(objectFindStatement);
}

export async function parsePromptForRefs(stream: vscode.ChatResponseStream, prompt: string[]): Promise<TableRefs> {
  const tables: TableRefs = {};
  for (const word of prompt) {
    const [schema, table] = word.split(`.`);
    if (schema && table) {
      stream.progress(`looking up information for ${schema}.${table}`)
      const data = await getTableMetaData(schema, table);
      tables[table] = tables[table] || [];
      tables[table].push(...data);
    }
  }
  return tables;
}

export async function findPossibleTables(stream: vscode.ChatResponseStream, schema: string, words: string[]) {

  let tables: TableRefs = {}

  // parse all SCHEMA.TABLE references first
  tables = await parsePromptForRefs(stream, words.filter(word => word.includes('.')));

  const justWords = words.map(word => word.replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, ""));

  // Remove plurals from words
  justWords.push(...justWords.filter(word => word.endsWith('s')).map(word => word.slice(0, -1)));

  // filter prompt for possible refs to tables
  const validWords = justWords
    .filter(word => word.length > 2 && !word.endsWith('s') && !word.includes(`'`))
    .map(word => `'${Statement.delimName(word, true)}'`);

  const objectFindStatement = [
    `SELECT `,
    `  column.TABLE_NAME,`,
    `  column.COLUMN_NAME,`,
    `  key.CONSTRAINT_NAME,`,
    `  column.DATA_TYPE, `,
    `  column.CHARACTER_MAXIMUM_LENGTH,`,
    `  column.NUMERIC_SCALE, `,
    `  column.NUMERIC_PRECISION,`,
    `  column.IS_NULLABLE, `,
    // `  column.HAS_DEFAULT, `,
    // `  column.COLUMN_DEFAULT, `,
    `  column.COLUMN_TEXT, `,
    `  column.IS_IDENTITY`,
    `FROM QSYS2.SYSCOLUMNS2 as column`,
    `LEFT JOIN QSYS2.syskeycst as key`,
    `  on `,
    `    column.table_schema = key.table_schema and`,
    `    column.table_name = key.table_name and`,
    `    column.column_name = key.column_name`,
    `WHERE column.TABLE_SCHEMA = '${schema}'`,
    ...[
      words.length > 0
        ? `AND column.TABLE_NAME in (${validWords.join(`, `)})`
        : ``,
    ],
    `ORDER BY column.ORDINAL_POSITION`,
  ].join(` `);

  // TODO
  const result: TableColumn[] = await JobManager.runSQL(objectFindStatement);

  result.forEach(row => {
    if (!tables[row.TABLE_NAME]) tables[row.TABLE_NAME] = [];
    tables[row.TABLE_NAME].push(row);
  });
  return tables;
}

export function refsToMarkdown(refs: TableRefs) {
  const condensedResult = Object.keys(refs).length > 5;

  let markdown: string[] = [];

  for (const tableName in refs) {
    if (tableName.startsWith(`SYS`)) continue;

    markdown.push(`# ${tableName}`, ``);

    if (condensedResult) {
      markdown.push(`| Column | Type | Text |`);
      markdown.push(`| - | - | - |`);
    } else {
      markdown.push(
        `| Column | Type | Nullable | Identity | Text | Constraint |`
      );
      markdown.push(`| - | - | - | - | - | - |`);
    }
    for (const column of refs[tableName]) {
      if (condensedResult) {
        markdown.push(
          `| ${column.COLUMN_NAME} | ${column.DATA_TYPE} | ${column.COLUMN_TEXT} |`
        );
      } else {
        markdown.push(
          `| ${column.COLUMN_NAME} | ${column.DATA_TYPE} | ${column.IS_NULLABLE} | ${column.IS_IDENTITY} | ${column.COLUMN_TEXT} | ${column.CONSTRAINT_NAME} |`
        );
      }
    }

    markdown.push(``);
  }

  return markdown.join(`\n`);
}

export async function getSystemStatus(): Promise<string> {
  const sqlStatment = `SELECT * FROM TABLE(QSYS2.SYSTEM_STATUS(RESET_STATISTICS=>'YES',DETAILED_INFO=>'ALL')) X`;
  const result = await JobManager.runSQL(sqlStatment, undefined);
  return JSON.stringify(result);
}