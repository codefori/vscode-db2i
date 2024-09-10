import { commands, env, Uri, UriHandler, window, workspace } from "vscode";
import querystring from "querystring";
import Document from "./language/sql/document";
import { ServerComponent } from "./connection/serverComponent";
import { remoteAssistIsEnabled } from "./language/providers/available";

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

            if (run) {
              if (remoteAssistIsEnabled()) {
                commands.executeCommand(`vscode-db2i.runEditorStatement`, {
                  content,
                  qualifier: `statement`,
                  open: true,
                });
              } else {
                window.showErrorMessage(`You must be connected to a system to run a statement.`);
              }
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
      const uri = `vscode://halcyontechltd.vscode-db2i/sql?content=${encodeURIComponent(sqlDocument.content)}`;

      env.clipboard.writeText(uri);
      window.showInformationMessage(`Statement URI copied to clipboard.`);
    }
  }
});