import { CompletionItem, CompletionItemKind, languages } from "vscode";
import Database from "../database/schemas";
import Table from "../database/table";
import Document from "./sql/document";
import { sqlSymbolProvider } from "./providers/definitionProvider";

function createCompletionItem(
  name: string,
  kind: CompletionItemKind,
  detail?: string,
  documentation?: string
): CompletionItem {
  const item = new CompletionItem(name, kind);
  item.detail = detail;
  item.documentation = documentation;
  return item;
}

async function getTableItems(schema: string, name: string) {
  const items = await Table.getItems(schema, name);
  return items.map((i) =>
    createCompletionItem(i.COLUMN_NAME, CompletionItemKind.Reference)
  );
}

async function getObjectCompletions(curSchema: string, sqlTypes) {
  const list = [];
  for (const type of sqlTypes) {
    const data = await Database.getObjects(curSchema, type);
    data.forEach((table) => {
      const item = createCompletionItem(
        table.name,
        CompletionItemKind.File,
        `Type: ${table.type}`,
        `Schema: ${table.schema}`
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
  if (objectRefs[0].alias) {
    console.log("using alias");
    for (const ref of objectRefs) {
      if (ref.object.name) {
        const completionItems = await getTableItems(
          ref.object.schema,
          ref.object.name
        );
        list.push(...completionItems);
      }
    }
  } else {
    const curRef = currentStatement.getReferenceByOffset(offset);
    const curSchema = curRef.object.schema;
    const sqlTypes = ["tables", "aliases", "views"];
    const objectCompletions = await getObjectCompletions(curSchema, sqlTypes);
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
import { completionProvider } from "./providers/completionProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    languages.registerDocumentSymbolProvider(`sql`, sqlSymbolProvider),
    languages.registerCompletionItemProvider(
      `sql`,
      {
        async provideCompletionItems(document, position, token, context) {
          const trigger = context.triggerCharacter;
          const content = document.getText();
          const offset = document.offsetAt(position);

          const sqlDoc = new Document(content);
          const currentStatement = sqlDoc.getStatementByOffset(offset);
          const objectRefs = currentStatement.getObjectReferences();

          if (trigger === ".") {
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
    ),
    completionProvider
  );
  
  return functionality;
}
