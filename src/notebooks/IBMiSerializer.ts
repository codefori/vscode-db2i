import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { IBMiController } from './Controller';

interface RawNotebookCell {
  language: string;
  value: string;
  kind: vscode.NotebookCellKind;
}

export function notebookInit() {
  const openNotebook = vscode.commands.registerCommand(`vscode-db2i.openNotebook`, (node) => {
    const uri = node ? node.resourceUri : vscode.Uri.parse(`untitled:` + `notebook.inb`);

    vscode.commands.executeCommand(`vscode.openWith`, uri, `db2i-notebook`);
  });

  return [
    vscode.workspace.registerNotebookSerializer(`db2i-notebook`, new IBMiSerializer()),
    new IBMiController(),
    openNotebook
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