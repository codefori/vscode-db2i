import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { IBMiController } from './Controller';
import { notebookFromSqlUri } from './logic/openAsNotebook';

interface RawNotebookCell {
  language: string;
  value: string;
  kind: vscode.NotebookCellKind;
}

let newNotebookCount = 1;

export function notebookInit() {
  const openBlankNotebook = vscode.commands.registerCommand(`vscode-db2i.openNotebook`, () => {
    vscode.workspace.openNotebookDocument(
      `db2i-notebook`,
      {cells: []}
    )
    .then(doc => {
      vscode.window.showNotebookDocument(doc);
    });
  });

  return [
    vscode.workspace.registerNotebookSerializer(`db2i-notebook`, new IBMiSerializer()),
    new IBMiController(),
    notebookFromSqlUri,
    openBlankNotebook
  ];
}

export class IBMiSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    let contents = new TextDecoder().decode(content);

    let raw: RawNotebookCell[];
    try {
      raw = <RawNotebookCell[]>JSON.parse(contents);
    } catch {
      raw = [];
    }

    const cells = raw.map(
      // TODO: read in stored output
      item => new vscode.NotebookCellData(item.kind, item.value, item.language)
    );

    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    let contents: RawNotebookCell[] = [];

    // TODO: also store output?
    for (const cell of data.cells) {
      contents.push({
        kind: cell.kind,
        language: cell.languageId,
        value: cell.value
      });
    }

    return new TextEncoder().encode(JSON.stringify(contents));
  }
}