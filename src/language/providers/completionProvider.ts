import { CompletionItem, CompletionItemKind, languages } from "vscode";
import Database, { SQLType } from "../../database/schemas";
import Table from "../../database/table";
import Document from "../sql/document";
import { ObjectRef } from "../sql/types";
import { updateCache } from "./completionItemCache";
import CompletionItemCache from "./completionItemCache";

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
  return `Field: ${column.COLUMN_NAME}\n Type: ${column.DATA_TYPE}\n HAS_DEFAULT: ${column.HAS_DEFAULT}\n IS_IDENTITY: ${column.IS_IDENTITY}\n IS_NULLABLE: ${column.IS_NULLABLE}`;
}

async function getTableItems(
  schema: string,
  name: string
): Promise<CompletionItem[]> {
  if (!completionItemCache.has(schema + name)) {
    const items = await Table.getItems(schema, name);
    const completionItems = items.map((i) =>
      createCompletionItem(
        i.COLUMN_NAME,
        CompletionItemKind.Field,
        getColumnAtributes(i),
        `Schema: ${schema}\nTable: ${name}\n`
      )
    );
    completionItemCache.set(schema + name, completionItems);
  }
  return completionItemCache.get(schema + name);
}

async function getObjectCompletions(
  curSchema: string,
  sqlTypes: { [index: string]: CompletionType }
) {
  const schemaUpdate: boolean = updateCache.delete(curSchema);
  if (!completionItemCache.has(curSchema) || schemaUpdate) {
    const promises = Object.entries(sqlTypes).map(async ([_, value]) => {
      const data = await Database.getObjects(curSchema, value.type);
      return data.map((table) =>
        createCompletionItem(
          table.name,
          value.icon,
          `Type: ${value.label}`,
          `Schema: ${table.schema}`,
          value.order
        )
      );
    });

    const results = await Promise.all(promises);
    const list = results.flat();
    completionItemCache.set(curSchema, list);
  }
  return completionItemCache.get(curSchema);
}

async function getCompletionItemsForTriggerDot(
  objectRefs,
  currentStatement,
  offset
): Promise<CompletionItem[]> {
  let list: CompletionItem[] = [];
  const curRef = currentStatement.getReferenceByOffset(offset);
  const curSchema = curRef.object.schema;

  let curRefIdentifier: ObjectRef;
  let isAlias: boolean = false;
  for (const ref of objectRefs) {
    if (curSchema === ref.object.schema || curSchema === ref.alias) {
      curRefIdentifier = ref;
      // check if ref is an alias
      if (curRefIdentifier.alias && curRefIdentifier.object.name) {
        isAlias = true;
      }
    }
  }

  // grab completion items (column names) if alias and name are defined
  if (isAlias) {
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

async function getCompletionItemsForOtherTriggers(objectRefs) {
  const promises = objectRefs.map((ref) =>
    ref.object.name && ref.object.schema
      ? getTableItems(ref.object.schema, ref.object.name)
      : Promise.resolve([])
  );

  const completionItemsArray = await Promise.all(promises);

  return completionItemsArray.flat();
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
        return getCompletionItemsForOtherTriggers(objectRefs);
      }

      if (trigger === "." || s.type === `dot`) {
        const defs = sqlDoc.getDefinitions();
        return getCompletionItemsForTriggerDot(
          objectRefs,
          currentStatement,
          offset
        );
      }
      return getCompletionItemsForOtherTriggers(objectRefs);
    },
  },
  `.`
);
