import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  languages,
} from "vscode";
import Document from "./sql/document";
import Database from "../database/schemas";
import Table from "../database/table";
import { SQLJob } from "../connection/sqlJob";
import View from "../database/view";


export function languageInit() {
  let functionality = [];

  functionality.push(
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

          let list: CompletionItem[] = [];

          if (trigger === `.`) {
            let sqlTypes = [`tables`, `aliases`];
            for (const type of sqlTypes) {
              const currentRef = currentStatement.getReferenceByOffset(offset);
              const curSchema = currentRef.object.schema;
              const data = await Database.getObjects(curSchema, type);
              data.forEach((table) => {
                list.push(
                  new CompletionItem(table.name, CompletionItemKind.Reference)
                );
              });
            }

            // add Columns to Completion items if referencing a table alias
            for (const ref of objectRefs) {
              if (ref.object.name) {
                const items = await Table.getItems(
                  ref.object.schema,
                  ref.object.name
                );
                const completionItems = items.map(
                  (i) =>
                    new CompletionItem(
                      i.COLUMN_NAME,
                      CompletionItemKind.Reference
                    )
                );
                list.push(...completionItems);
              }
            }

            // console.log(currentRef);
          } else {
            objectRefs.forEach((ref) => {
              if (ref.alias) {
                list.push(
                  new CompletionItem(ref.alias, CompletionItemKind.File)
                );
              } else if (ref.object.name) {
                list.push(
                  new CompletionItem(ref.object.name, CompletionItemKind.File)
                );
              }
            });
          }

          return list;
        },
      },
      `.`
    )
  );

  return functionality;
}
