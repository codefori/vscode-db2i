import { commands, CompletionItemKind, Diagnostic, DiagnosticSeverity, languages, Range, TextDocument, Uri, window, workspace } from "vscode";
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

export function setCheckerAvailableContext() {
  const available = SQLStatementChecker.get() !== undefined;
  commands.executeCommand(`setContext`, CHECKER_AVAILABLE_CONTEXT, available);
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

async function validateSqlDocument(document: TextDocument, specificStatement?: number) {
  const checker = SQLStatementChecker.get();
  if (remoteAssistIsEnabled() && checker) {
    const content = document.getText();
    const sqlDocument = new Document(content);

    const allGroups = sqlDocument.getStatementGroups();
    let statementRanges: StatementRange[] = [];

    for (const group of allGroups) {
      const range = getStatementRangeFromGroup(group);
      if (range) {
        if (specificStatement) {
          // If specificStatement is outline this range, continue
          if (specificStatement <= range[0] || specificStatement >= range[1]) {
            continue;
          }
        }

        statementRanges.push(range);
      }
    }

    const sqlStatementContents = statementRanges.map(range => content.substring(range[0], range[1]));
    const se = performance.now();
    const syntaxChecked = await checker.checkMultipleStatements(sqlStatementContents);
    const ee = performance.now();

    console.log(`Syntax check took: ${ee - se}ms`);

    if (syntaxChecked) {
      if (syntaxChecked.length > 0) {
        let errors: Diagnostic[] = [];
        for (let i = 0; i < statementRanges.length; i++) {
          const currentRange = statementRanges[i];
          const groupError = syntaxChecked[i];

          if (shouldShowError(groupError)) {

            const selectedWord = document.getWordRangeAtPosition(document.positionAt(currentRange[0] + groupError.offset))
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

function shouldShowError(error: SqlSyntaxError) {
  return error.type === `error` || (error.type === `warning` && shouldShowWarnings());
}

function getStatementRangeFromGroup(currentGroup: StatementGroup): StatementRange | undefined {
  let statementRange: StatementRange | undefined;
  const firstStatement = currentGroup.statements[0];
  if (firstStatement) {
    statementRange = [currentGroup.range.start, currentGroup.range.end];

    const label = firstStatement.getLabel();
    if (label) { 
      if (label.toUpperCase() === `CL`) {
        statementRange = undefined;
      } else {
        statementRange = [firstStatement.tokens[2].range.start, currentGroup.range.end];
      }
    }
  }

  return statementRange;
}
