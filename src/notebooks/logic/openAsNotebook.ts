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

      notebookFromStatements(statements)

    } catch (e) {
      window.showWarningMessage(`Failed to parse SQL file: ${e.message}`);
    }
  }
});

export function notebookFromStatements(statements?: string[]) {
  if (statements) {
    workspace.openNotebookDocument(
      `db2i-notebook`,
      {cells: statements.map(s => {
        if (s.startsWith(`--`)) {
          return new NotebookCellData(NotebookCellKind.Markup, s.substring(2).trim(), `md`)
        } else {
          return new NotebookCellData(NotebookCellKind.Code, s, `sql`)
        }
      })}
    )
    .then(doc => {
      window.showNotebookDocument(doc);
    });
  }
};