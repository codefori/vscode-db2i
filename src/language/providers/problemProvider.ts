import { commands, CompletionItemKind, Diagnostic, DiagnosticSeverity, languages, Range, Uri, window, workspace } from "vscode";
import {
  SQLType,
} from "../../database/schemas";
import Statement from "../../database/statement";
import Document from "../sql/document";
import { remoteAssistIsEnabled } from "./logic/available";
import Configuration from "../../configuration";
import { SQLStatementChecker, SqlSyntaxError } from "../../connection/syntaxChecker";
import { StatementGroup, StatementType } from "../sql/types";

export interface CompletionType {
  order: string;
  label: string;
  type: SQLType;
  icon: CompletionItemKind;
}

type StatementRange = [number, number];

const diagnosticTypeMap: { [key: string]: DiagnosticSeverity } = {
  'error': DiagnosticSeverity.Error,
  'warning': DiagnosticSeverity.Warning,
}

let currentTimeout: NodeJS.Timeout;
let sqlDiagnosticCollection = languages.createDiagnosticCollection(`db2i-sql`);

export function getCheckerAutomatically() {
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

      const allGroups = sqlDocument.getStatementGroups();
      let statementRanges: StatementRange[] = [];

      for (const group of allGroups) {
        const range = getStatementRangeFromGroup(group);
        if (range) {
          statementRanges.push(range);
        }
      }

      const sqlStatementContents = statementRanges.map(range => content.substring(range[0], range[1]));
      const syntaxChecked = await checker.checkMultipleStatements(sqlStatementContents);

      if (syntaxChecked) {
        if (syntaxChecked.length > 0) {
          let errors: Diagnostic[] = [];
          for (let i = 0; i < statementRanges.length; i++) {
            const currentRange = statementRanges[i];
            const groupError = syntaxChecked[i];

            if (shouldShowError(groupError)) {

              const selectedWord
                = document.getWordRangeAtPosition(document.positionAt(currentRange[0] + groupError.offset))
                || new Range(
                  document.positionAt(currentRange[0] + groupError.offset - 1),
                  document.positionAt(currentRange[0] + groupError.offset)
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
        }
      }
    }
  }
});

export const problemProvider = workspace.onDidChangeTextDocument(e => {
  const isSql = e.document.languageId === `sql`;
  const checker = SQLStatementChecker.get();
  if (isSql && remoteAssistIsEnabled() && getCheckerAutomatically() && checker) {
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
        const currentGroup = sqlDoc.getGroupByOffset(offset);

        if (currentGroup) {
          const statementRange = getStatementRangeFromGroup(currentGroup);

          if (statementRange) {
            const statementContents = content.substring(statementRange[0], statementRange[1]);

            const result = await checker.call(statementContents);
            if (result && shouldShowError(result)) {
              const selectedWord
                = document.getWordRangeAtPosition(document.positionAt(statementRange[0] + result.offset))
                || new Range(
                  document.positionAt(statementRange[0] + result.offset - 1),
                  document.positionAt(statementRange[0] + result.offset)
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
      }
    }, getCheckerTimeout());
  }
});

function getStatementRangeFromGroup(currentGroup: StatementGroup): StatementRange|undefined {
  let statementRange: StatementRange|undefined;
  const firstStatement = currentGroup.statements[0];
  if (firstStatement && firstStatement.type !== StatementType.Unknown) {
    statementRange = [currentGroup.range.start, currentGroup.range.end];

    if (firstStatement.getLabel()) {
      statementRange = [firstStatement.tokens[2].range.start, currentGroup.range.end];
    }
  }

  return statementRange;
}
