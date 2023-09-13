import { CompletionItem, CompletionItemKind, languages } from "vscode";
import { JobManager } from "../../config";
import {
  default as Database,
  SQLType,
  default as Schemas,
} from "../../database/schemas";
import Statement from "../../database/statement";
import Table from "../../database/table";
import Document from "../sql/document";
import * as LanguageStatement from "../sql/statement";
import { ObjectRef, StatementType } from "../sql/types";
import CompletionItemCache, { changedCache } from "./completionItemCache";

const completionItemCache = new CompletionItemCache();
let DEFAULT_SCHEMA = undefined;

export interface CompletionType {
  order: string;
  label: string;
  type: SQLType;
  icon: CompletionItemKind;
}

const completionTypes: { [index: string]: CompletionType } = {
  tables: {
    order: `a`,
    label: `table`,
    type: `tables`,
    icon: CompletionItemKind.File,
  },
  views: {
    order: `b`,
    label: `view`,
    type: `views`,
    icon: CompletionItemKind.Interface,
  },
  aliases: {
    order: `c`,
    label: `alias`,
    type: `aliases`,
    icon: CompletionItemKind.Reference,
  },
};

function createCompletionItem(
  name: string,
  kind: CompletionItemKind,
  detail?: string,
  documentation?: string,
  sortText?: string
): CompletionItem {
  const item = new CompletionItem(name, kind);
  item.detail = detail;
  item.documentation = documentation;
  item.sortText = sortText;
  return item;
}

function getColumnAtributes(column: TableColumn): string {
  const lines: string[] = [
    `Column: ${column.COLUMN_NAME}`,
    `Type: ${column.DATA_TYPE}`,
    `HAS_DEFAULT: ${column.HAS_DEFAULT}`,
    `IS_IDENTITY: ${column.IS_IDENTITY}`,
    `IS_NULLABLE: ${column.IS_NULLABLE}`,
  ];
  return lines.join(`\n `);
}

async function getTableItems(
  schema: string,
  name: string
): Promise<CompletionItem[]> {
  const databaseObj = (schema + name).toUpperCase();
  const tableUpdate: boolean = changedCache.delete(databaseObj);
  if (!completionItemCache.has(databaseObj) || tableUpdate) {
    schema = Statement.noQuotes(Statement.delimName(schema, true));
    name = Statement.noQuotes(Statement.delimName(name, true));
    const items = await Table.getItems(schema, name);

    if (!items?.length ? true : false) {
      completionItemCache.set(databaseObj, []);
      return [];
    }

    const completionItems = items.map((i) =>
      createCompletionItem(
        Statement.prettyName(i.COLUMN_NAME),
        CompletionItemKind.Field,
        getColumnAtributes(i),
        `Schema: ${schema}\nTable: ${name}\n`
      )
    );
    completionItemCache.set(databaseObj, completionItems);
  }
  return completionItemCache.get(databaseObj);
}

async function getObjectCompletions(
  curSchema: string,
  sqlTypes: { [index: string]: CompletionType }
) {
  const schemaUpdate: boolean = changedCache.delete(curSchema.toUpperCase());
  if (!completionItemCache.has(curSchema) || schemaUpdate) {
    const promises = Object.entries(sqlTypes).map(async ([_, value]) => {
      curSchema = Statement.noQuotes(Statement.delimName(curSchema, true));
      const data = await Database.getObjects(curSchema, value.type);
      return data.map((table) =>
        createCompletionItem(
          Statement.prettyName(table.name),
          value.icon,
          `Type: ${value.label}`,
          `Schema: ${table.schema}`,
          value.order
        )
      );
    });

    const results = await Promise.allSettled(promises);
    const list = results
      .filter((result) => result.status == "fulfilled")
      .map((result) => (result as PromiseFulfilledResult<any>).value)
      .flat();
    completionItemCache.set(curSchema, list);
  }
  return completionItemCache.get(curSchema);
}

async function getCompletionItemsForSchema(
  schema: string
): Promise<CompletionItem[]> {
  const data = await Database.getObjects(schema, "procedures");
  return data.map((item) =>
    createCompletionItem(
      item.name,
      CompletionItemKind.Method,
      `Type: Procedure`,
      `Schema: ${item.schema}`
    )
  );
}

async function getProcedures(
  refs: ObjectRef[],
  defaultSchema?: string
): Promise<CompletionItem[]> {
  // Handle the case where refs is empty and defaultSchema is provided
  if (refs.length === 0 && defaultSchema) {
    const sanitizedSchema = Statement.noQuotes(
      Statement.delimName(defaultSchema, true)
    );
    return getCompletionItemsForSchema(sanitizedSchema);
  }

  // Handle the general case
  const promises = refs.map(async (ref) => {
    const sanitizedSchema = Statement.noQuotes(
      Statement.delimName(ref.object.schema, true)
    );
    return getCompletionItemsForSchema(sanitizedSchema);
  });

  const results = await Promise.allSettled(promises);
  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap(
      (result) => (result as PromiseFulfilledResult<CompletionItem[]>).value
    );
}

async function getCompletionItemsForTriggerDot(
  objectRefs: ObjectRef[],
  currentStatement: LanguageStatement.default, // Statement from ../../database/statement
  offset: number
): Promise<CompletionItem[]> {
  let list: CompletionItem[] = [];
  const curRef = currentStatement.getReferenceByOffset(offset);
  if (curRef === undefined) {
    return;
  }

  //select * from sample.data as a, sample.
  const curSchema = curRef.object.schema;
  const isOnlySchema = curRef.object.name === undefined;

  let curRefIdentifier: ObjectRef;

  if (isOnlySchema) {
    // We need to check if this is an alias reference
    curRefIdentifier = objectRefs.find(
      (ref) =>
        ref.alias &&
        ref.object.name &&
        ref.alias.toUpperCase() === curSchema.toUpperCase()
    );
  }

  // grab completion items (column names) if alias and name are defined
  if (curRefIdentifier) {
    const completionItems = await getTableItems(
      curRefIdentifier.object.schema,
      curRefIdentifier.object.name
    );
    list.push(...completionItems);
  } else {
    const objectCompletions = await getObjectCompletions(
      curSchema,
      completionTypes
    );
    list.push(...objectCompletions);
  }
  return list;
}

async function getCachedSchemas() {
  if (completionItemCache.has(`SCHEMAS-FOR-SYSTEM`)) {
    return completionItemCache.get(`SCHEMAS-FOR-SYSTEM`);
  }

  const allSchemas: BasicSQLObject[] = await Schemas.getObjects(
    undefined,
    `schemas`
  );
  const completionItems: CompletionItem[] = allSchemas.map((schema) =>
    createCompletionItem(
      Statement.prettyName(schema.name),
      CompletionItemKind.Module,
      `Type: Schema`,
      `Text: ${schema.text}`
    )
  );

  completionItemCache.set(`SCHEMAS-FOR-SYSTEM`, completionItems);
  return completionItems;
}

function createCompletionItemForAlias(ref: ObjectRef) {
  return createCompletionItem(
    ref.alias,
    CompletionItemKind.Reference,
    "Type: Alias",
    [
      ref.object.schema ? `Schema: ${ref.object.schema}` : undefined,
      ref.object.name ? `Object: ${ref.object.name}` : undefined,
    ]
      .filter(Boolean)
      .join(`\n`)
  );
}

async function getObjectCompletionsForRefs(objectRefs: ObjectRef[]) {
  const objectCompletionPromises = objectRefs.map((ref) =>
    getObjectCompletions(ref.object.schema, completionTypes)
  );

  const results = await Promise.allSettled(objectCompletionPromises);

  return results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => (result as PromiseFulfilledResult<any>).value);
}

async function getCompletionItemsForRefs(
  objectRefs: ObjectRef[],
  currentStament: LanguageStatement.default
) {
  if (!objectRefs?.length) {
    return await getCachedSchemas();
  }

  const tableItemPromises = objectRefs.map((ref) =>
    ref.object.name && ref.object.schema
      ? getTableItems(ref.object.schema, ref.object.name)
      : Promise.resolve([])
  );

  const results = await Promise.allSettled(tableItemPromises);

  let completionItems = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => (result as PromiseFulfilledResult<any>).value);

  const aliasItems = objectRefs
    .filter((ref) => ref.alias)
    .map((ref) => createCompletionItemForAlias(ref));

  completionItems.push(...aliasItems);

  if (completionItems.includes(undefined) || completionItems.length === 0) {
    return await getObjectCompletionsForRefs(objectRefs);
  }

  return completionItems;
}

async function getCompletionItems(
  trigger: string,
  objectRefs: ObjectRef[],
  currentStatement: LanguageStatement.default,
  offset?: number
) {
  if (currentStatement.type === StatementType.Call) {
    return getProcedures(objectRefs, DEFAULT_SCHEMA);
  }

  const s = currentStatement ? currentStatement.getTokenByOffset(offset) : null;

  if (trigger === "." || (s && s.type === `dot`)) {
    return getCompletionItemsForTriggerDot(
      objectRefs,
      currentStatement,
      offset
    );
  }

  return getCompletionItemsForRefs(objectRefs, currentStatement);
}

export const completionProvider = languages.registerCompletionItemProvider(
  `sql`,
  {
    async provideCompletionItems(document, position, token, context) {
      const trigger = context.triggerCharacter;
      const content = document.getText();
      const offset = document.offsetAt(position);

      const sqlDoc = new Document(content);
      const currentStatement = sqlDoc.getStatementByOffset(offset);
      const objectRefs = currentStatement
        ? currentStatement.getObjectReferences()
        : [];

      const currentJob = JobManager.getSelection();
      if (currentJob) {
        if (objectRefs.length === 0) {
          DEFAULT_SCHEMA = currentJob.job.options.libraries[0] || `QGPL`;
        }
        for (let ref of objectRefs) {
          // If we have a reference to an object, but there is no schema
          // then let's default to the current job schema
          if (!ref.object.schema) {
            ref.object.schema = currentJob.job.options.libraries[0] || `QGPL`;
          }
        }
      }

      return getCompletionItems(trigger, objectRefs, currentStatement, offset);
    },
  },
  `.`
);
