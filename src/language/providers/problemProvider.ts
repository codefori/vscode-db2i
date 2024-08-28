import { CompletionItemKind, DiagnosticSeverity, languages, Range, workspace } from "vscode";
import {
  SQLType,
} from "../../database/schemas";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { env } from "process";
import { remoteAssistIsEnabled } from "./available";
import Configuration from "../../configuration";

export interface CompletionType {
  order: string;
  label: string;
  type: SQLType;
  icon: CompletionItemKind;
}

let currentTimeout: NodeJS.Timeout;
let sqlDiagnosticCollection = languages.createDiagnosticCollection(`db2i-sql`);

function getTimeout() {
  return (Configuration.get<number>(`syntaxCheckInterval`) || 1500);
}

export const problemProvider = workspace.onDidChangeTextDocument(e => {
  const isSql = e.document.languageId === `sql`;
  if (isSql && remoteAssistIsEnabled()) {
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }

    currentTimeout = setTimeout(async () => {
      const [change] = e.contentChanges;
      if (change) {
        const document = e.document;
        const position = e.contentChanges[0].range.start;
        const content = document.getText();
        const offset = document.offsetAt(position);

        const sqlDoc = new Document(content);
        const currentStatement = sqlDoc.getGroupByOffset(offset);

        if (currentStatement) {
          const statementContents = document.getText(new Range(
            document.positionAt(currentStatement.range.start),
            document.positionAt(currentStatement.range.end)
          ));

          const result = await Statement.validateSQL(statementContents);
          if (result) {

            const selectedWord 
              = document.getWordRangeAtPosition(document.positionAt(currentStatement.range.start+result.offset)) 
              || new Range(
                document.positionAt(currentStatement.range.start+result.offset-1),
                document.positionAt(currentStatement.range.start+result.offset)
              );

            sqlDiagnosticCollection.set(document.uri, [{
              message: `${result.text} - ${result.sqlstate}`,
              code: result.sqlid,
              range: selectedWord,
              severity: DiagnosticSeverity.Error,
            }]);
          } else {
            sqlDiagnosticCollection.set(document.uri, []);
          }
        }
      }
    }, getTimeout());
  }
});