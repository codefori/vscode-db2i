import { commands, CompletionItemKind, Diagnostic, DiagnosticSeverity, languages, ProgressLocation, Range, TextDocument, Uri, window, workspace } from "vscode";
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

interface StatementRange {
  validate: boolean;
  groupId: number;
  start: number;
  end: number;
};

const diagnosticTypeMap: { [key: string]: DiagnosticSeverity } = {
  'error': DiagnosticSeverity.Error,
  'warning': DiagnosticSeverity.Warning,
}

let currentTimeout: NodeJS.Timeout;
let sqlDiagnosticCollection = languages.createDiagnosticCollection(`db2i-sql`);

export function checkOnOpen() {
  return (Configuration.get<boolean>(`syntax.checkOnOpen`) || false);
}

export function checkOnChange() {
  return (Configuration.get<boolean>(`syntax.checkOnEdit`) || false);
}

export function getCheckerTimeout() {
  return (Configuration.get<number>(`syntax.checkInterval`) || 1500);
}

function shouldShowWarnings() {
  return Configuration.get<boolean>(`syntax.showWarnings`) || false;
}

const CHECKER_AVAILABLE_CONTEXT = `vscode-db2i.syntax.checkerAvailable`;
const CHECKER_RUNNING_CONTEXT = `vscode-db2i.syntax.checkerRunning`;

export function setCheckerAvailableContext() {
  const available = SQLStatementChecker.get() !== undefined;
  commands.executeCommand(`setContext`, CHECKER_AVAILABLE_CONTEXT, available);
}

let checkerRunning = false;
export function setCheckerRunningContext(isRunning: boolean) {
  checkerRunning = isRunning;
  commands.executeCommand(`setContext`, CHECKER_RUNNING_CONTEXT, isRunning);
}

export const CHECK_DOCUMENT_COMMAND = `vscode-db2i.syntax.checkDocument`;
export const checkDocumentDefintion = commands.registerCommand(CHECK_DOCUMENT_COMMAND, async (uri?: Uri) => {
  const document = uri ? (await workspace.openTextDocument(uri)) : window.activeTextEditor?.document;

  if (document) {
    await validateSqlDocument(document);
  }
});

export const problemProvider = [
  workspace.onDidOpenTextDocument(e => {
    const isSql = e.languageId === `sql`;
    if (isSql && checkOnOpen()) {
      validateSqlDocument(e);
    }
  }),

  workspace.onDidChangeTextDocument(e => {
    const isSql = e.document.languageId === `sql`;
    if (isSql && checkOnChange() && e.contentChanges.length > 0) {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }

      currentTimeout = setTimeout(() => {
        validateSqlDocument(e.document, e.document.offsetAt(e.contentChanges[0].range.start));
      }, getCheckerTimeout());
    }
  })
];
interface SqlDiagnostic extends Diagnostic {
  groupId: number;
}

async function validateSqlDocument(document: TextDocument, specificStatement?: number) {
  const checker = SQLStatementChecker.get();
  if (remoteAssistIsEnabled() && checker && !checkerRunning) {
    setCheckerRunningContext(true);
    const content = document.getText();
    const sqlDocument = new Document(content);

    const allGroups = sqlDocument.getStatementGroups();
    let statementRanges: StatementRange[] = [];

    for (let i = 0; i < allGroups.length; i++) {
      const group = allGroups[i];
      if (specificStatement) {
        // If specificStatement is outside this group, continue
        if (
          specificStatement < group.range.start || 
          (specificStatement > (allGroups[i + 1] ? allGroups[i + 1].range.start : group.range.end))
        ) {
          continue;
        }
      }

      const range = getStatementRangeFromGroup(group, i);

      if (range) {
        statementRanges.push(range);
      }

      // We also add the surrounding ranges, as we need to check the end of the statement
      if (specificStatement) {
        for (let j = i - 1; j <= i + 1; j++) {
          if (allGroups[j]) {
            const nextRange = getStatementRangeFromGroup(allGroups[j], j);
            if (nextRange) {
              statementRanges.push(nextRange);
            }
          }
        }

        break;
      }
    }


    if (statementRanges.length > 0) {
      const validStatements = statementRanges.filter(r => r.validate);
      const invalidStatements = statementRanges.filter(r => !r.validate);
      const sqlStatementContents = validStatements.map(range => content.substring(range.start, range.end));

      if (validStatements.length > 0) {
        const se = performance.now();
        const syntaxChecked = await window.withProgress({ location: ProgressLocation.Window, title: `$(sync-spin) Checking SQL Syntax` }, () => { return checker.checkMultipleStatements(sqlStatementContents) });
        const ee = performance.now();

        if (syntaxChecked) {
          if (syntaxChecked.length > 0) {
            let currentErrors: SqlDiagnostic[] = specificStatement ? languages.getDiagnostics(document.uri) as SqlDiagnostic[] : [];

            // Remove old CL errors.
            for (const invalidStatement of invalidStatements) {
              const existingError = currentErrors.findIndex(e => e.groupId === invalidStatement.groupId);
              if (existingError >= 0) {
                currentErrors.splice(existingError, 1);
              }
            }

            for (let i = 0; i < validStatements.length; i++) {
              const currentRange = validStatements[i];
              const groupError = syntaxChecked[i];
              let existingError: number = currentErrors.findIndex(e => e.groupId === currentRange.groupId);

              if (groupError.type === `none`) {
                if (existingError !== -1) {
                  currentErrors.splice(existingError, 1);
                }

              } else if (shouldShowError(groupError)) {
                const selectedWord = document.getWordRangeAtPosition(document.positionAt(currentRange.start + groupError.offset))
                  || new Range(
                    document.positionAt(currentRange.start + groupError.offset - 1),
                    document.positionAt(currentRange.start + groupError.offset)
                  );


                const newDiag: SqlDiagnostic = {
                  message: `${groupError.text} - ${groupError.sqlstate}`,
                  code: groupError.sqlid,
                  range: selectedWord,
                  severity: diagnosticTypeMap[groupError.type],
                  groupId: currentRange.groupId
                };

                if (existingError >= 0) {
                  currentErrors[existingError] = newDiag;
                } else {
                  currentErrors.push(newDiag);
                }

              }
            }

            sqlDiagnosticCollection.set(document.uri, currentErrors);
          }
        }
      }
    }
  }

  setCheckerRunningContext(false);
}

function shouldShowError(error: SqlSyntaxError) {
  return error.type === `error` || (error.type === `warning` && shouldShowWarnings());
}

function getStatementRangeFromGroup(currentGroup: StatementGroup, groupId: number): StatementRange | undefined {
  let statementRange: StatementRange;
  const firstStatement = currentGroup.statements[0];
  if (firstStatement) {
    statementRange = { groupId, start: firstStatement.range.start, end: currentGroup.range.end, validate: true };

    const label = firstStatement.getLabel();
    if (label) {
      if (label.toUpperCase() === `CL`) {
        statementRange.validate = false;
      } else {
        statementRange.start = firstStatement.tokens[2].range.start;
      }
    }
  }

  return statementRange;
}
