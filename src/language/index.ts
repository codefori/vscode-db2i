import { CompletionItem, CompletionItemKind, ExtensionContext, languages } from "vscode";

export function languageInit() {
  let functionality = [];

  functionality.push(
    languages.registerCompletionItemProvider(
      `sql`,
      {
        provideCompletionItems(document, position, token, context) {
          let list: CompletionItem[] = [];

          const newItem = new CompletionItem(`Hello world`, CompletionItemKind.Keyword);
          newItem.detail = `This is a sample CompletionItem`;

          list.push(newItem);

          return list;
        },
      },
      `.`
    )
  );

  return functionality;
}