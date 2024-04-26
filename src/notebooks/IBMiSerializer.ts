import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { IBMiController } from './Controller';
import { notebookFromSqlUri } from './logic/openAsNotebook';
import { Cell, CodeCell, MarkdownCell, Notebook, Output } from './jupyter';
import { exportNotebookAsHtml } from './logic/export';

interface RawNotebookCell {
  language: string;
  value: string;
  kind: vscode.NotebookCellKind;
}

let newNotebookCount = 1;

export function notebookInit() {
  const openBlankNotebook = vscode.commands.registerCommand(`vscode-db2i.notebook.open`, () => {
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
    openBlankNotebook,
    exportNotebookAsHtml
  ];
}

export class IBMiSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    let contents = new TextDecoder().decode(content);

    let asNb: Notebook;
    try {
      asNb = <Notebook>JSON.parse(contents);
    } catch {
      asNb = undefined;
    }

    if (!asNb) {
      return new vscode.NotebookData([]);
    }

    const cells: vscode.NotebookCellData[] = asNb.cells.map((cell: Cell): vscode.NotebookCellData => {
      if (cell.cell_type === `markdown`) {
        return new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          (typeof cell.source === `string` ? cell.source : cell.source.join(`\n`)),
          `markdown`
        );
      } else {
        const language = cell.metadata && cell.metadata.tags && cell.metadata.tags[0] ? cell.metadata.tags[0] : `sql`;
        const newCell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          (typeof cell.source === `string` ? cell.source : cell.source.join(`\n`)),
          language
        );

        if ('outputs' in cell) {
          newCell.outputs = cell.outputs.map((output): vscode.NotebookCellOutput => {
            switch (output.output_type) {
              case `display_data`:
                const items = Object.keys(output.data).map(mime => {
                  if (typeof output.data[mime] === `string`) {
                    return new vscode.NotebookCellOutputItem(Buffer.from(output.data[mime] as string), mime);
                  } else {
                    return new vscode.NotebookCellOutputItem(Buffer.from((output.data[mime] as string[]).join(`\n`)), mime);
                  }
                });
    
                return new vscode.NotebookCellOutput(items);
            }

          });
        }
        
        return newCell;
      }
    });

    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    const newNotebook: Notebook = {
      cells: data.cells.map(nbCellToJupyterCell),
      metadata: {
        kernelspec: {
          display_name: `DB2 for IBM i`,
          name: `db2i`,
        },
        language_info: {
          name: `sql`,
          file_extension: `sql`
        },
      },
      nbformat: 4,
      nbformat_minor: 0
    }



    return new TextEncoder().encode(JSON.stringify(newNotebook));
  }
}

function nbCellToJupyterCell(cell: vscode.NotebookCellData): Cell {
  if (cell.kind === vscode.NotebookCellKind.Code) {
    const codeBase: CodeCell = {
      cell_type: `code`,
      execution_count: null,
      metadata: {tags: [cell.languageId]},
      outputs: cell.outputs.map((output): Output => {
        return {
          output_type: `display_data`,
          data: {
            [output.items[0].mime]: output.items[0].data.toString()
          },
          metadata: {}
        }
      }),
      source: cell.value,
    };

    return codeBase;

  } else {
    const mdBase: MarkdownCell = {
      cell_type: `markdown`,
      metadata: {},
      source: cell.value,
    };

    return mdBase;

  }
}