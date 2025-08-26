import { ParsedStatementInfo } from ".";
import crypto from "crypto";
import { ParameterResult } from "@ibm/mapepire-js";
import { DecorationOptions, ThemeColor, window, Range, MarkdownString, DecorationRangeBehavior } from "vscode";
import Configuration from "../../configuration";

let priorStatements: { [uniqueHash: string]: ParsedStatementInfo } = {};

const outputParameters = window.createTextEditorDecorationType({
  after: {
    color: new ThemeColor(`editorGhostText.foreground`),
    fontStyle: `italic`,
    margin: `0 0 0 1em`
  },
  rangeBehavior: DecorationRangeBehavior.ClosedClosed
});

export function registerRunStatement(stmt: ParsedStatementInfo) {
  const uniqueUiId = crypto.randomBytes(16).toString("hex");
  priorStatements[uniqueUiId] = stmt;
  return uniqueUiId;
}

export function statementDone(uniqueId: string, options: { paramsOut?: ParameterResult[] } = {}) {
  const existingStatement = priorStatements[uniqueId];
  const activeEditor = window.activeTextEditor;

  const shortValue = (v: any) => {
    if (typeof v === "string") {
      return v.length > 10 ? `${v.substring(0, 10)}...` : v;
    }
    return v || `-`;
  };

  if (existingStatement) {
    // Huge assumption here the statement is in the active editor

    // TODO: feature flag
    if (Configuration.get(`resultsets.outputDecorations`)) {
      if (activeEditor) {
        const document = activeEditor.document;
        const startPosition = document.positionAt(existingStatement.group.range.start);
        const endPosition = document.positionAt(existingStatement.group.range.end + 1);

        if (options.paramsOut && options.paramsOut.length > 0) {
          const markdownString = new MarkdownString();
          options.paramsOut.forEach((p, i) => {
            markdownString.appendMarkdown(`**Parameter ${i + 1}${p.name ? ` - ${p.name}` : ``}**:\n\n\`\`\`\n${p.value !== undefined ? p.value : `-`}\n\`\`\``);

            if (i !== options.paramsOut.length - 1) {
              markdownString.appendMarkdown(`\n\n---\n\n`);
            }
          });

          const values = `=> ` + options.paramsOut.map(p => shortValue(p.value)).join(", ");

          const decoration: DecorationOptions = {
            range: new Range(startPosition, endPosition),
            hoverMessage: markdownString,
            renderOptions: {
              after: {
                contentText: values,
              }
            }
          };

          activeEditor.setDecorations(outputParameters, [decoration]);
        }
      }
    }

    delete priorStatements[uniqueId];
  }
}