import { commands, env, Selection, Uri, UriHandler, window, workspace } from "vscode";
import querystring from "querystring";
import Document from "./language/sql/document";
import { ServerComponent } from "./connection/serverComponent";
import { remoteAssistIsEnabled } from "./language/providers/logic/available";

export class Db2iUriHandler implements UriHandler {
  handleUri(uri: Uri) {
    const path = uri.path;

    switch (path) {
      case '/sql':
        const queryData = querystring.parse(uri.query);
        const content = String(queryData.content).trim();

        if (content) {
          const asLower = content.toLowerCase();
          const isValid = asLower.startsWith(`select `) || asLower.startsWith(`with `);

          if (isValid) {
            const run = queryData.run === `true`;

            if (run && remoteAssistIsEnabled()) {
              commands.executeCommand(`vscode-db2i.runEditorStatement`, {
                content,
                qualifier: `statement`,
                open: true,
              });
            } else {
              workspace.openTextDocument({ language: `sql`, content }).then(textDoc => {
                window.showTextDocument(textDoc);
              });
            }
          } else {
            window.showErrorMessage(`Only SELECT or WITH statements are supported.`);
          }
        }

        break;
    }
  }
}

export const getStatementUri = commands.registerCommand(`vscode-db2i.getStatementUri`, async () => {
  const editor = window.activeTextEditor;

  if (editor) {
    const content = editor.document.getText();

    const sqlDocument = new Document(content);
    const cursor = editor.document.offsetAt(editor.selection.active);

    const currentStmt = sqlDocument.getGroupByOffset(cursor);

    if (currentStmt) {
      const stmtContent = content.substring(currentStmt.range.start, currentStmt.range.end);
      editor.selection = new Selection(editor.document.positionAt(currentStmt.range.start), editor.document.positionAt(currentStmt.range.end));
      const uri = `vscode://halcyontechltd.vscode-db2i/sql?content=${encodeURIComponent(stmtContent)}`;

      env.clipboard.writeText(uri);
      window.showInformationMessage(`Statement URI copied to clipboard.`);
    }
  }
});