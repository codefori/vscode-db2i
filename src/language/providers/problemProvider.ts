import { commands, CompletionItemKind, Diagnostic, DiagnosticSeverity, languages, ProgressLocation, Range, Uri, window, workspace } from "vscode";
import {
  SQLType,
} from "../../database/schemas";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { remoteAssistIsEnabled } from "./logic/available";
import Configuration from "../../configuration";
import { SQLStatementChecker, SqlSyntaxError } from "../../connection/syntaxChecker";

export interface CompletionType {
  order: string;
  label: string;
  type: SQLType;
  icon: CompletionItemKind;
}

const diagnosticTypeMap: { [key: string]: DiagnosticSeverity } = {
  'error': DiagnosticSeverity.Error,
  'warning': DiagnosticSeverity.Warning,
}

let currentTimeout: NodeJS.Timeout;
let sqlDiagnosticCollection = languages.createDiagnosticCollection(`db2i-sql`);

export function getCheckerEnabled() {
  return (Configuration.get<boolean>(`syntax.checkAutomatically`) || false);
}

export function getCheckerTimeout() {
  return (Configuration.get<number>(`syntax.checkInterval`) || 1500);
}

function shouldShowWarnings() {
  return Configuration.get<boolean>(`syntax.showWarnings`) || false;
}

const CHECKER_AVAILABLE_CONTEXT = `vscode-db2i.syntax.checkerAvailable`;

function shouldShowError(error: SqlSyntaxError) {
  return error.type === `error` || (error.type === `warning` && shouldShowWarnings());
}

export function setCheckerAvailableContext() {
  const available = SQLStatementChecker.get() !== undefined;
  commands.executeCommand(`setContext`, CHECKER_AVAILABLE_CONTEXT, available);
}

export const CHECK_DOCUMENT_COMMAND = `vscode-db2i.syntax.checkDocument`;
export const checkDocumentDefintion = commands.registerCommand(CHECK_DOCUMENT_COMMAND, async (uri?: Uri) => {
  const checker = SQLStatementChecker.get();
  if (checker) {
    const document = uri ? (await workspace.openTextDocument(uri)) : window.activeTextEditor?.document;

    if (document) {
      const content = document.getText();
      const sqlDocument = new Document(content);

      window.withProgress({ location: ProgressLocation.Window, title: `Checking SQL Syntax...` }, async () => {
        const groups = sqlDocument.getStatementGroups();

        const sqlStatementContents = groups.map(group => content.substring(group.range.start, group.range.end));
        const syntaxChecked = await checker.checkMultipleStatements(sqlStatementContents);

        if (syntaxChecked) {
          if (syntaxChecked.length > 0) {
            let errors: Diagnostic[] = [];
            for (let i = 0; i < groups.length; i++) {
              const groupError = syntaxChecked[i];

              if (shouldShowError(groupError)) {

                const selectedWord
                  = document.getWordRangeAtPosition(document.positionAt(groups[i].range.start + groupError.offset))
                  || new Range(
                    document.positionAt(groups[i].range.start + groupError.offset - 1),
                    document.positionAt(groups[i].range.start + groupError.offset)
                  );

                errors.push({
                  message: `${groupError.text} - ${groupError.sqlstate}`,
                  code: groupError.sqlid,
                  range: selectedWord,
                  severity: diagnosticTypeMap[groupError.type],
                });
              }
            }

            sqlDiagnosticCollection.set(document.uri, errors);

            if (errors.length === 0) {
              window.showInformationMessage(`SQL Syntax Checker found no errors.`);
            }
          }
        }
      });
    }
  }
});

export const problemProvider = workspace.onDidChangeTextDocument(e => {
  const isSql = e.document.languageId === `sql`;
  const checker = SQLStatementChecker.get();
  if (isSql && remoteAssistIsEnabled() && getCheckerEnabled() && checker) {
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

          const result = await checker.call(statementContents);
          if (result && shouldShowError(result)) {
            const selectedWord
              = document.getWordRangeAtPosition(document.positionAt(currentStatement.range.start + result.offset))
              || new Range(
                document.positionAt(currentStatement.range.start + result.offset - 1),
                document.positionAt(currentStatement.range.start + result.offset)
              );

            sqlDiagnosticCollection.set(document.uri, [{
              message: `${result.text} - ${result.sqlstate}`,
              code: result.sqlid,
              range: selectedWord,
              severity: diagnosticTypeMap[result.type],
            }]);
          } else {
            sqlDiagnosticCollection.set(document.uri, []);
          }
        }
      }
    }, getCheckerTimeout());
  }
});