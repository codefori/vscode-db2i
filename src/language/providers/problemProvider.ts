import { CompletionItemKind, DiagnosticSeverity, languages, Range, workspace } from "vscode";
import {
  SQLType,
} from "../../database/schemas";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { env } from "process";

export interface CompletionType {
  order: string;
  label: string;
  type: SQLType;
  icon: CompletionItemKind;
}

function isEnabled() {
  return (env.DB2I_DISABLE_CA !== `true`);
}

let currentTimeout: NodeJS.Timeout;
let sqlDiagnosticCollection = languages.createDiagnosticCollection(`db2i-sql`);

export const problemProvider = workspace.onDidChangeTextDocument(e => {
  const isSql = e.document.languageId === `sql`;
  if (isEnabled() && isSql) {
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
        const currentStatement = sqlDoc.getStatementByOffset(offset);

        if (currentStatement) {
          const statementContents = document.getText(new Range(
            document.positionAt(currentStatement.range.start),
            document.positionAt(currentStatement.range.end)
          ));

          const result = await Statement.validateSQL(statementContents);
          if (result) {
            sqlDiagnosticCollection.set(document.uri, [{
              message: `${result.text} - ${result.sqlstate}`,
              code: result.sqlid,
              range: new Range(
                document.positionAt(currentStatement.range.start+result.offset-1),
                document.positionAt(currentStatement.range.start+result.offset)
              ),
              severity: DiagnosticSeverity.Error,
            }]);
          } else {
            sqlDiagnosticCollection.set(document.uri, []);
          }
        }
      }
    }, 1500);
  }
});