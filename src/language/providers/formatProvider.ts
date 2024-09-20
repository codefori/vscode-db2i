import { Position, Range, TextEdit, languages } from "vscode";
import Statement from "../../database/statement";
import { formatSql, CaseOptions } from "../sql/formatter";
import Configuration from "../../configuration";

export const formatProvider = languages.registerDocumentFormattingEditProvider({language: `sql`}, {
  async provideDocumentFormattingEdits(document, options, token) {
    const identifierCase: CaseOptions = <CaseOptions>(Configuration.get(`sqlFormat.identifierCase`) || `preserve`);
    const keywordCase: CaseOptions = <CaseOptions>(Configuration.get(`sqlFormat.keywordCase`) || `lower`);
    const formatted = formatSql(
      document.getText(), 
      {
        indentWidth: options.tabSize,
        identifierCase: identifierCase,
        keywordCase: keywordCase,
        spaceBetweenStatements: true
      }
    );

    return [new TextEdit(
      new Range(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
      formatted
    )];
  }
})