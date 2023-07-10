import { CompletionItem, CompletionItemKind, ExtensionContext, languages } from "vscode";
import Document from "./sql/document";
import Database from "../database/schemas";

export function languageInit() {
  let functionality = [];

  functionality.push(
    languages.registerCompletionItemProvider(
      `sql`,
      {
        provideCompletionItems(document, position, token, context) {
          const trigger = context.triggerCharacter;
          const content = document.getText();
          const offset = document.offsetAt(position);

          const sqlDoc = new Document(content);

          const currentStatement = sqlDoc.getStatementByOffset(offset);
          const objectRefs = currentStatement.getObjectReferences();

          let list: CompletionItem[] = [];

          if (trigger === `.`) {
            const currentRef = currentStatement.getReferenceByOffset(offset);
            console.log(currentRef);

          } else {

            objectRefs.forEach(ref => {
              if (ref.alias) {
                list.push(new CompletionItem(ref.alias, CompletionItemKind.File));
              } else
              if (ref.object.name) {
                list.push(new CompletionItem(ref.object.name, CompletionItemKind.File));
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