import * as vscode from 'vscode';

//@ts-ignore
import * as mdTable from 'json-to-markdown-table';

import { getInstance } from '../base';
import { JobManager } from '../config';
import { ChartJsType, chartJsTypes, generateChartHTMLCell } from './logic/chartJs';
import { ChartDetail, generateChart } from './logic/chart';
import { getStatementDetail } from './logic/statement';

export class IBMiController {
  readonly controllerId = `db2i-notebook-controller-id`;
  readonly notebookType = `db2i-notebook`;
  readonly label = `IBM i Notebook`;
  readonly supportedLanguages = [`sql`, `cl`, `shellscript`];

  private readonly _controller: vscode.NotebookController;
  private globalCancel = false;
  private _executionOrder = 0;

  constructor() {
    this._controller = vscode.notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label
    );

    this._controller.supportedLanguages = this.supportedLanguages;
    this._controller.supportsExecutionOrder = true;
    this._controller.executeHandler = this._execute.bind(this);
  }

  public dispose() {
    this._controller.dispose();
  }



  private async _execute(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ) {
    this.globalCancel = false;

    for (let cell of cells) {
      if (!this.globalCancel) {
        await this._doExecution(cell);
      }
    }
  }

  private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
    const instance = getInstance();
    const connection = instance?.getConnection();
    const items: vscode.NotebookCellOutputItem[] = [];

    const execution = this._controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this._executionOrder;
    execution.start(Date.now()); // Keep track of elapsed time to execute cell.

    const selected = JobManager.getSelection();

    execution.token.onCancellationRequested(() => {
      this.globalCancel = true;
      if (selected && selected.job.getStatus() === "busy") {
        selected.job.requestCancel();
      }
    });

    if (connection) {
      switch (cell.document.languageId) {
        case `sql`:
          try {
            if (selected) {
              const eol = cell.document.eol === vscode.EndOfLine.CRLF ? `\r\n` : `\n`;
              
              let content = cell.document.getText().trim();
              let chartDetail: ChartDetail | undefined;

              ({ chartDetail, content } = getStatementDetail(content, eol));

              // Execute the query
              const query = selected.job.query(content);
              const results = await query.execute(1000);

              const table = results.data;
              const columnNames = results.metadata.columns.map(c => c.name);

              if (table === undefined && results.success && !results.has_results) {
                items.push(vscode.NotebookCellOutputItem.text(`Statement executed successfully. ${results.update_count ? `${results.update_count} rows affected.` : ``}`, `text/markdown`));
                break;
              }

              if (table.length > 0) {
                // Add `-` for blanks.
                table.forEach(row => {
                  columnNames.forEach(key => {
                    //@ts-ignore
                    if (!row[key]) { row[key] = `-`; }
                  });
                });

                let fallbackToTable = true;

                if (chartDetail.type) {
                  if (chartJsTypes.includes(chartDetail.type as ChartJsType)) {
                    const possibleChart = generateChart(execution.executionOrder, chartDetail, columnNames, table, generateChartHTMLCell);
                    if (possibleChart) {
                      items.push(vscode.NotebookCellOutputItem.text(possibleChart, `text/html`));
                      fallbackToTable = false;
                    }
                  }
                }

                if (fallbackToTable) {
                  items.push(vscode.NotebookCellOutputItem.text(mdTable(table, columnNames), `text/markdown`));
                }
              } else {
                items.push(vscode.NotebookCellOutputItem.stderr(`No rows returned from statement.`));
              }
              
            } else {
              items.push(vscode.NotebookCellOutputItem.stderr(`No job selected in SQL Job Manager.`));
            }
          } catch (e) {
            items.push(vscode.NotebookCellOutputItem.stderr(e.message));
          }
          break;

        case `cl`:
          try {
            const command = await connection.runCommand({
              command: cell.document.getText(),
              environment: `ile`
            });

            if (command.stdout) {
              items.push(vscode.NotebookCellOutputItem.text([
                `\`\`\``,
                command.stdout,
                `\`\`\``
              ].join(`\n`), `text/markdown`));
            }

            if (command.stderr) {
              items.push(vscode.NotebookCellOutputItem.text([
                `\`\`\``,
                command.stderr,
                `\`\`\``
              ].join(`\n`), `text/markdown`));
            }
          } catch (e) {
            items.push(
              vscode.NotebookCellOutputItem.stderr(`Failed to run command. Are you connected?`),
              vscode.NotebookCellOutputItem.stderr(e.message)
            );
          }
          break;

        case `shellscript`:
          try {
            const command = await connection.runCommand({
              command: cell.document.getText(),
              environment: `pase`
            });

            if (command.stdout) {
              items.push(vscode.NotebookCellOutputItem.text([
                `\`\`\``,
                command.stdout,
                `\`\`\``
              ].join(`\n`), `text/markdown`));
            }

            if (command.stderr) {
              items.push(vscode.NotebookCellOutputItem.text([
                `\`\`\``,
                command.stderr,
                `\`\`\``
              ].join(`\n`), `text/markdown`));
            }
          } catch (e) {
            items.push(
              vscode.NotebookCellOutputItem.stderr(`Failed to runCommand. Are you connected?`),
              //@ts-ignore
              vscode.NotebookCellOutputItem.stderr(e.message)
            );
          }
          break;
      }

    } else {
      items.push(
        vscode.NotebookCellOutputItem.stderr(`Failed to execute. Are you connected?`)
      )
    }

    execution.replaceOutput([
      new vscode.NotebookCellOutput(items)
    ]);

    execution.end(true, Date.now());
  }


}