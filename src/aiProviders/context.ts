import { ContextItem } from "@continuedev/core";
import * as vscode from "vscode";
import { JobManager } from "../config";
import Schemas, { AllSQLTypes, SQLType } from "../database/schemas";
import Statement from "../database/statement";
import { DB2_SYSTEM_PROMPT } from "./prompts";

export function canTalkToDb() {
  return JobManager.getSelection() !== undefined;
}

export function getCurrentSchema(): string {
  const currentJob = JobManager.getSelection();
  return currentJob && currentJob.job.options.libraries[0]
    ? currentJob.job.options.libraries[0]
    : `QGPL`;
}

export type TableRefs = { [key: string]: TableColumn[] };
interface MarkdownRef {
  TABLE_NAME: string;
  COLUMN_INFO?: string;
  SCHMEA?: string;
}

interface ContextDefinition {
  id: string;
  type: SQLType;
  content: any;
}

/**
 * Builds a semantic representation of a database schema by fetching all objects
 * associated with the schema, cleaning them, and filtering out unnecessary properties.
 *
 * @param schema - The name of the database schema to process.
 * @returns A promise that resolves to an array of filtered objects representing the schema.
 */
export async function buildSchemaDefinition(schema: string): Promise<Partial<BasicSQLObject>[] | undefined> {
  /**
   * Cleans an object by removing properties with undefined, null, or empty string values.
   * If the value is an object (but not an array), it cleans that object as well.
   * This function is meant for properties other than the top-level `schema` and `system`.
   *
   * @param obj - The object to clean.
   * @returns A new object with only non-empty properties.
   */
  const allInfo: BasicSQLObject[] = await Schemas.getObjects(
    schema,
    AllSQLTypes
  );
  function cleanObject(obj: any): any {
    const cleaned: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // Skip undefined, null or empty string values.
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          continue;
        }

        // If the property is a plain object (and not an array), clean it recursively.
        if (typeof value === "object" && !Array.isArray(value)) {
          const nested = cleanObject(value);
          if (Object.keys(nested).length > 0) {
            cleaned[key] = nested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned;
  }

  /**
   * Filters a single BasicSQLObject by:
   * - Removing the top-level `schema` and `system` properties.
   * - Removing any property (or nested property) that is undefined, null, or an empty string.
   *
   * @param obj - The BasicSQLObject to filter.
   * @returns A new object with filtered properties.
   */
  function filterBasicSQLObject(obj: BasicSQLObject): Partial<BasicSQLObject> {
    // Remove the top-level `schema` and `system` properties.
    const { schema, system, ...rest } = obj;

    // Clean the remaining properties.
    return cleanObject(rest);
  }

  /**
   * Processes an array of BasicSQLObject items.
   *
   * @param data - The array of BasicSQLObject items.
   * @returns A new array of filtered objects.
   */
  function filterBasicSQLObjects(
    data: BasicSQLObject[]
  ): Partial<BasicSQLObject>[] {
    return data.map(filterBasicSQLObject);
  }

  const compressedData = filterBasicSQLObjects(allInfo);
  return compressedData;
}

/**
 * Generates the SQL table definitions for the given schema and input words.
 *
 * This function parses the input words to identify potential table references,
 * filters them based on the schema's available tables, and generates the SQL
 * definitions for the identified tables.
 *
 * @param {string} schema - The schema name to search for tables.
 * @param {string[]} input - An array of words that may contain table references.
 * @returns {Promise<{[key: string]: string | undefined}>} A promise that resolves to an object
 * where the keys are table names and the values are their corresponding SQL definitions.
 */
export async function generateTableDefinition(schema: string, input: string[]) {
  let tables: ContextDefinition[] = [];
  // Parse all SCHEMA.TABLE references first
  const schemaTableRefs = input.filter((word) => word.includes("."));
  const justWords = input.map((word) =>
    word.replace(/[,\/#!?$%\^&\*;:{}=\-_`~()]/g, "")
  );

  // Remove plurals from words
  justWords.push(
    ...justWords
      .filter((word) => word.endsWith("s"))
      .map((word) => word.slice(0, -1))
  );

  // Filter prompt for possible refs to tables
  const validWords = justWords
    .filter(
      (word) => word.length > 2 && !word.endsWith("s") && !word.includes(`'`)
    )
    .map((word) => `${Statement.delimName(word, true)}`);

  const allTables: BasicSQLObject[] = await Schemas.getObjects(schema, [
    `tables`,
  ]);

  const filteredTables = Array.from(
    new Set(
      validWords.filter((word) => allTables.some((table) => table.name == word))
    )
  );

  await Promise.all(
    filteredTables.map(async (token) => {
      try {
        const content = await Schemas.generateSQL(schema, token, `TABLE`);
        if (content) {
          tables.push({
            id: token,
            type: `tables`,
            content: content,
          });
        }
      } catch (e) {
        // ignore
      }
    })
  );

  // check for QSYS2
  // for (const item of schemaTableRefs) {
  //   const [curSchema, table] = item.split(`.`);
  //   if (curSchema.toUpperCase() === `QSYS2`) {
  //     try {
  //       const content = await Schemas.getObjects
  //     } catch (e) {
  //       continue
  //     }
  //   }
  // }

  return tables;
}

// depreciated
export async function findPossibleTables(
  stream: vscode.ChatResponseStream,
  schema: string,
  words: string[]
) {
  let tables: TableRefs = {};

  // Parse all SCHEMA.TABLE references first
  const schemaTableRefs = words.filter((word) => word.includes("."));
  const justWords = words.map((word) =>
    word.replace(/[,\/#!?$%\^&\*;:{}=\-_`~()]/g, "")
  );

  // Remove plurals from words
  justWords.push(
    ...justWords
      .filter((word) => word.endsWith("s"))
      .map((word) => word.slice(0, -1))
  );

  // Filter prompt for possible refs to tables
  const validWords = justWords
    .filter(
      (word) => word.length > 2 && !word.endsWith("s") && !word.includes(`'`)
    )
    .map((word) => `'${Statement.delimName(word, true)}'`);

  const objectFindStatement = [
    `SELECT `,
    `  column.TABLE_SCHEMA,`,
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
    ...[
      schemaTableRefs.length > 0
        ? `AND (column.TABLE_NAME in (${validWords.join(
            `, `
          )}) OR (${schemaTableRefs
            .map((ref) => {
              const [schema, table] = ref.split(".");
              const cleanedTable = table.replace(
                /[,\/#!?$%\^&\*;:{}=\-_`~()]/g,
                ""
              );
              return `(column.TABLE_SCHEMA = '${Statement.delimName(
                schema,
                true
              )}' AND column.TABLE_NAME = '${Statement.delimName(
                cleanedTable,
                true
              )}')`;
            })
            .join(" OR ")}))`
        : `AND column.TABLE_NAME in (${validWords.join(`, `)})`,
    ],
    `ORDER BY column.ORDINAL_POSITION`,
  ].join(` `);
  // TODO
  const result: TableColumn[] = await JobManager.runSQL(objectFindStatement);

  result.forEach((row) => {
    const tableName = row.TABLE_NAME.toLowerCase();
    if (!tables[tableName]) tables[tableName] = [];
    tables[tableName].push(row);
  });
  return tables;
}

/**
 * Converts a given set of table references to a Markdown string.
 *
 * Experimental feature for @db2i chat participant
 *
 * @param refs - An object containing table references, where each key is a table name
 * and the value is an array of column definitions for that table.
 *
 * @returns A string formatted in Markdown representing the table references.
 *
 * The function generates a Markdown representation of the table references. If the number
 * of tables is greater than 5, a condensed format is used, otherwise a detailed format is used.
 *
 * The condensed format includes columns: Column, Type, and Text.
 * The detailed format includes columns: Column, Type, Nullable, Identity, Text, and Constraint.
 *
 * Tables with names starting with 'SYS' are skipped.
 */
export function refsToMarkdown(refs: TableRefs): MarkdownRef[] {
  const condensedResult = Object.keys(refs).length > 5;

  let markdownRefs: MarkdownRef[] = [];
  for (const tableName in refs) {
    if (tableName.startsWith(`SYS`)) continue;

    const curRef: MarkdownRef = {
      TABLE_NAME: tableName,
      SCHMEA: refs[tableName][0].TABLE_SCHEMA,
      COLUMN_INFO: refs[tableName]
        .map((column) => {
          const lengthPrecision = column.CHARACTER_MAXIMUM_LENGTH
            ? `(${column.CHARACTER_MAXIMUM_LENGTH}${
                column.NUMERIC_PRECISION ? `:${column.NUMERIC_PRECISION}` : ``
              })`
            : ``;
          return `${column.COLUMN_NAME}${
            column.COLUMN_TEXT ? ` - ${column.COLUMN_TEXT}` : ``
          } ${column.DATA_TYPE}${lengthPrecision} is_identity: ${
            column.IS_IDENTITY
          } is_nullable: ${column.IS_NULLABLE}`;
        })
        .join(`\n`),
    };
    markdownRefs.push(curRef);
  }

  return markdownRefs;
}

export function createContinueContextItems(refs: MarkdownRef[]) {
  const contextItems: ContextItem[] = [];
  const job = JobManager.getSelection();
  if (refs.length === 0) {
    contextItems.push({
      name: `SYSTEM PROMPT`,
      description: `system prompt context`,
      content: DB2_SYSTEM_PROMPT + `\n\nNo references found`,
    });
  } else {
    for (const tableRef of refs) {
      let prompt = `Table: ${tableRef.TABLE_NAME} (Schema: ${tableRef.SCHMEA}) Column Information:\n`;
      prompt += `Format: column_name (column_text) type(length:precision) is_identity is_nullable\n`;
      prompt += `${tableRef.COLUMN_INFO}`;
      contextItems.push({
        name: `${job.name}-${tableRef.SCHMEA}-${tableRef.TABLE_NAME}`,
        description: `Column information for ${tableRef.TABLE_NAME}`,
        content: DB2_SYSTEM_PROMPT + prompt,
      });
    }
  }

  return contextItems;
}

export async function getSystemStatus(): Promise<string> {
  const sqlStatment = `SELECT * FROM TABLE(QSYS2.SYSTEM_STATUS(RESET_STATISTICS=>'YES',DETAILED_INFO=>'ALL')) X`;
  const result = await JobManager.runSQL(sqlStatment, undefined);
  return JSON.stringify(result);
}
