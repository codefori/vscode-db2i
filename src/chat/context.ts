import { JobManager } from "../config";
import Statement from "../database/statement";

export function getDefaultSchema(): string {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0]
    ? currentJob.job.options.libraries[0]
    : `QGPL`;
};

export type TableRefs = { [key: string]: TableColumn[] };

export async function findPossibleTables(schema: string, words: string[]) {
  words = words.map((word) =>
    word.replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g, "")
  );

  // Add extra words for words with S at the end, to ignore possible plurals
  words.forEach((item) => {
    if (item.endsWith(`s`)) {
      words.push(item.slice(0, -1));
    }
  });

  const validWords = words
    .filter((item) => item.length > 2 && !item.includes(`'`))
    .map((item) => `'${Statement.delimName(item, true)}'`);

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

  const tables: TableRefs = {};

  for (const row of result) {
    if (!tables[row.TABLE_NAME]) {
      tables[row.TABLE_NAME] = [];
    }

    tables[row.TABLE_NAME].push(row);
  }

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