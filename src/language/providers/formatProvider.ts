import { Position, Range, TextEdit, languages } from "vscode";
import Statement from "../../database/statement";
import { formatSql, IdentifierCase, KeywordCase } from "../sql/formatter";
import Configuration from "../../configuration";

export const formatProvider = languages.registerDocumentFormattingEditProvider({language: `sql`}, {
  async provideDocumentFormattingEdits(document, options, token) {
    const identifierCase: IdentifierCase = <IdentifierCase>(Configuration.get(`sqlFormat.identifierCase`) || `preserve`);
    const keywordCase: KeywordCase = <KeywordCase>(Configuration.get(`sqlFormat.keywordCase`) || `lower`);
    const formatted = formatSql(
      document.getText(), 
      {
        useTabs: !options.insertSpaces,
        tabWidth: options.tabSize,
        identifierCase: identifierCase,
        keywordCase: keywordCase,
        addSemiColon:  true
      }
    );

    return [new TextEdit(
      new Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
      formatted
    )];
  }
})