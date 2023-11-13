import { Position, Range, TextEdit, languages } from "vscode";
import Statement from "../../database/statement";

export const formatProvider = languages.registerDocumentFormattingEditProvider({language: `sql`}, {
  async provideDocumentFormattingEdits(document, options, token) {
    const formatted = Statement.format(
      document.getText(), 
      {
        useTabs: !options.insertSpaces,
        tabWidth: options.tabSize,
      }
    );

    return [new TextEdit(
      new Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
      formatted
    )];
  }
})