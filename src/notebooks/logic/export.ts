import * as vscode from 'vscode';

export const exportNotebookAsHtml = vscode.commands.registerCommand(`vscode-db2i.notebook.exportAsHtml`, async (event: { notebookEditor: { notebookUri: vscode.Uri } }) => {
  if (event && event.notebookEditor) {
    const uri = event.notebookEditor.notebookUri;
    const doc = await vscode.workspace.openNotebookDocument(uri);
    if (doc) {
      const cells = doc.getCells();
      console.log(cells);
    }
  }
});