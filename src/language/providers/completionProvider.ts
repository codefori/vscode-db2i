import { CompletionItem, CompletionItemKind, languages } from "vscode";
import Document from "../sql/document";
import Database from "../../database/schemas";
import Table from "../../database/table";
import { ObjectRef } from "../sql/types";

const completionTypes = {
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

async function getTableItems(schema: string, name: string) {
  const items = await Table.getItems(schema, name);
  return items.map((i) =>
    createCompletionItem(i.COLUMN_NAME, CompletionItemKind.Field)
  );
}

async function getObjectCompletions(
  curSchema: string,
  sqlTypes: { [index: string]: any }
) {
  const list = [];
  for (let key in sqlTypes) {
    let value = sqlTypes[key];
    const data = await Database.getObjects(curSchema, value.type);
    data.forEach((table) => {
      const item = createCompletionItem(
        table.name,
        value.icon,
        `Type: ${value.label}`,
        `Schema: ${table.schema}`,
        value.order
      );
      list.push(item);
    });
  }

  return list;
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

function getCompletionItemsForOtherTriggers(objectRefs) {
  let list: CompletionItem[] = [];
  objectRefs.forEach((ref) => {
    if (ref.alias) {
      list.push(createCompletionItem(ref.alias, CompletionItemKind.File));
    } else if (ref.object.name) {
      list.push(createCompletionItem(ref.object.name, CompletionItemKind.File));
    }
  });
  return list;
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
      const objectRefs = currentStatement.getObjectReferences();
      const s = currentStatement.getTokenByOffset(offset);

      if (trigger === "." || s.type === `dot`) {
        const defs = sqlDoc.getDefinitions();
        return getCompletionItemsForTriggerDot(
          objectRefs,
          currentStatement,
          offset
        );
      } else {
        return getCompletionItemsForOtherTriggers(objectRefs);
      }
    },
  },
  `.`
);
