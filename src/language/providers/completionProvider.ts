import { CompletionItem, CompletionItemKind, languages } from "vscode";
import Database, { SQLType } from "../../database/schemas";
import Table from "../../database/table";
import Document from "../sql/document";
import { ObjectRef } from "../sql/types";
import { changedCache } from "./completionItemCache";
import CompletionItemCache from "./completionItemCache";
import Statement from "../../database/statement";
import * as LanguageStatement from "../sql/statement"

const completionItemCache = new CompletionItemCache();

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
    `Field: ${column.COLUMN_NAME}`,
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
      return;
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
    curRefIdentifier = objectRefs.find(ref => ref.alias && ref.object.name && ref.alias.toUpperCase() === curSchema.toUpperCase());
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

async function getCompletionItemsForRefs(objectRefs: ObjectRef[]) {
  const promises = objectRefs.map((ref) =>
    ref.object.name && ref.object.schema
      ? getTableItems(ref.object.schema, ref.object.name)
      : Promise.resolve([])
  );

  const results = await Promise.allSettled(promises);
  return results
    .filter((result) => result.status == "fulfilled")
    .map((result) => (result as PromiseFulfilledResult<any>).value)
    .flat();
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

      const s = currentStatement
        ? currentStatement.getTokenByOffset(offset)
        : null;

      // if s is undefined, assume ctrl+ space trigger
      if (s === undefined) {
        return getCompletionItemsForRefs(objectRefs);
      }

      if (trigger === "." || s.type === `dot`) {
        return getCompletionItemsForTriggerDot(
          objectRefs,
          currentStatement,
          offset
        );
      }
      return;
    },
  },
  `.`
);
