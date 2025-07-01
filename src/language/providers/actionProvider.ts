import { CodeAction, CodeActionKind, languages, TextDocument, Uri, WorkspaceEdit } from "vscode";
import { remoteAssistIsEnabled } from "./logic/available";
import { getSqlDocument } from "./logic/parse";

class SqlCodeAction extends CodeAction {
  constructor(title: string, kind: CodeActionKind, public file: {document: TextDocument, statementOffset: number, bindCount: number}) {
    super(title, kind);
  }
}

const invalidBindingLabels = [`bind`, `cl`];

export const actionProvider = languages.registerCodeActionsProvider({ language: `sql` }, {
  provideCodeActions(document, range, context, token) {
    if (range.isEmpty) {
      const offset = document.offsetAt(range.start);

      const enabled = remoteAssistIsEnabled();
      if (!enabled) return;

      const sqlDoc = getSqlDocument(document);
      if (!sqlDoc) return;

      const currentStatement = sqlDoc.getStatementByOffset(offset);
      const label = currentStatement.getLabel()?.toLowerCase() || ``;

      if (currentStatement && !invalidBindingLabels.includes(label)) {
        const markers = currentStatement.getEmbeddedStatementAreas().filter(a => a.type === `marker`);
        const codeActions: SqlCodeAction[] = [];

        if (markers.length > 0) {
          const action = new SqlCodeAction(`Generate bind statement`, CodeActionKind.QuickFix, {
            document,
            statementOffset: currentStatement.range.end,
            bindCount: markers.length
          });

          codeActions.push(action);

          return codeActions;
        }
      }

      return [];
    }
  },
  resolveCodeAction(codeAction: SqlCodeAction, token) {
    if (!(codeAction instanceof SqlCodeAction)) return codeAction;
    codeAction.edit = new WorkspaceEdit();
    const document = codeAction.file.document;

    const endOfStatementPos = document.positionAt(codeAction.file.statementOffset);
    const lineOfStatement = document.lineAt(endOfStatementPos.line);

    let statement = `bind: ${new Array(codeAction.file.bindCount).fill(`v`).join(`, `)}`;

    codeAction.edit.insert(document.uri, lineOfStatement.range.end, `\n${statement};`);
    return codeAction;
  }
});