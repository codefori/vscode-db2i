import path from "path";
import { commands, Uri, workspace, NotebookCellData, NotebookCellKind, window } from "vscode";
import Document from "../../language/sql/document";

export const notebookFromSqlUri = commands.registerCommand(`vscode-db2i.notebook.fromSqlUri`, async (sqlUri?: Uri) => {
  if (sqlUri) {
    const fsPath = sqlUri.fsPath;
    const pathDetail = path.parse(fsPath);

    const sqlDoc = await workspace.openTextDocument(sqlUri);
    const content = sqlDoc.getText();

    try {
      const sqlDocument = new Document(content);
      const statements = sqlDocument.getStatementGroups().map(g => content.substring(g.range.start, g.range.end));

      workspace.openNotebookDocument(
        `db2i-notebook`,
        {cells: statements.map(s => {return new NotebookCellData(NotebookCellKind.Code, s, `sql`)})}
      )
      .then(doc => {
        window.showNotebookDocument(doc);
      });

    } catch (e) {
      window.showWarningMessage(`Failed to parse SQL file: ${e.message}`);
    }
  }
});

export const notebookFromStatements = commands.registerCommand(`vscode-db2i.notebook.fromStatements`, (statements?: string[]) => {
  if (statements) {
    const uri = Uri.parse(`untitled:` + `notebook.inb`);

    workspace.openNotebookDocument(
      uri.toString(),
      {cells: statements.map(s => {return new NotebookCellData(NotebookCellKind.Code, s, `sql`)})}
    )
    .then(doc => {
      window.showNotebookDocument(doc);
    });
  }
});