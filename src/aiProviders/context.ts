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
  type: string;
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

// hello my.world how/are you? -> [hello, my, ., world, how, /, are, you]
function splitUpUserInput(input: string): string[] {
  input = input.replace(/[,!?$%\^&\*;:{}=\-`~()]/g, "")

  let parts: string[] = [];

  // Split the input string by spaces, dots and forward slash

  let cPart = ``;
  let char: string;

  const addPart = () => {
    if (cPart) {
      parts.push(cPart);
      cPart = ``;
    }
  }

  for (let i = 0; i < input.length; i++) {
    char = input[i];

    switch (char) {
      case ` `:
        addPart();
        break;

      case `/`:
      case `.`:
        addPart();
        parts.push(char);
        break;

      default:
        if ([`/`, `.`].includes(cPart)) {
          addPart();
        }

        cPart += char;
        break;
    }
  }
  
  addPart();

  return parts;
}

/**
 * Generates the SQL object definitions for the given input string.
 *
 * This function parses the input words to identify potential SQL object references,
 * and generates the SQL definitions for the identified objects based on the library list.
 *
 * @param {string} input - A string that may contain table references.
 */
export async function getSqlContextItems(input: string): Promise<{items: ContextDefinition[], refs: ResolvedSqlObject[]}> {
  // Parse all SCHEMA.TABLE references first
  const tokens = splitUpUserInput(input);

  // Remove plurals from words
  tokens.push(
    ...tokens
      .filter((word) => word.endsWith("s"))
      .map((word) => word.slice(0, -1))
  );

  let possibleRefs: {name: string, schema?: string}[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token[i+1] && [`.`, `/`].includes(token[i+1]) && tokens[i + 2]) {
      const nextToken = tokens[i + 2];

      possibleRefs.push({
        name: Statement.delimName(nextToken, true),
        schema: Statement.delimName(token, true),
      });

      i += 2; // Skip the next token as it's already processed

    } else {
      possibleRefs.push({
        name: Statement.delimName(token, true),
      });
    }
  }

  const allObjects = await Schemas.resolveObjects(possibleRefs);

  const contextItems = await getContentItemsForRefs(allObjects);

  return {
    items: contextItems,
    refs: allObjects,
  };
}

export async function getContentItemsForRefs(allObjects: ResolvedSqlObject[]): Promise<ContextDefinition[]> {
  const items: (ContextDefinition|undefined)[] = await Promise.all(
    allObjects.map(async (o) => {
      try {
        if (o.sqlType === `SCHEMA`) {
          // TODO: maybe we want to include info about a schema here?
          return undefined;

        } else {
          const content = await Schemas.generateSQL(o.schema, o.name, o.sqlType);

          return {
            id: o.name,
            type: o.sqlType,
            content: content,
          };
        }

      } catch (e) {
        return undefined;
      }
    })
  );

  return items.filter((item) => item !== undefined);
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
