import * as vscode from 'vscode';

//@ts-ignore
import * as mdTable from 'json-to-markdown-table';

import { getInstance } from '../base';
import { CommandResult } from '@halcyontech/vscode-ibmi-types';
import { JobManager } from '../config';
import { ChartDetail, ChartType, chartTypes, generateChart } from './logic/charts';
import { JobStatus } from '../connection/sqlJob';

export class IBMiController {
  readonly controllerId = `db2i-notebook-controller-id`;
  readonly notebookType = `db2i-notebook`;
  readonly label = `IBM i Notebook`;
  readonly supportedLanguages = [`sql`, `cl`, `shellscript`];

  private readonly _controller: vscode.NotebookController;
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

  private _execute(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): void {
    for (let cell of cells) {
      this._doExecution(cell);
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
      if (selected && selected.job.getStatus() === JobStatus.Busy) {
        selected.job.requestCancel();
      }
    });

    if (connection) {
      switch (cell.document.languageId) {
        case `sql`:
          try {
            if (selected) {
              let content = cell.document.getText().trim();

              let chartDetail: ChartDetail = {};

              // Strip out starting comments
              if (content.startsWith(`--`)) {
                const eol = cell.document.eol === vscode.EndOfLine.CRLF ? `\r\n` : `\n`;
                const lines = content.split(eol);
                const firstNonCommentLine = lines.findIndex(line => !line.startsWith(`--`));

                const startingComments = lines.slice(0, firstNonCommentLine).map(line => line.substring(2).trim());
                content = lines.slice(firstNonCommentLine).join(eol);

                // Remove trailing semicolon. The Service Component doesn't like it.
                if (content.endsWith(`;`)) {
                  content = content.substring(0, content.length - 1);
                }

                let settings = {};

                for (let comment of startingComments) {
                  const sep = comment.indexOf(`:`);
                  const key = comment.substring(0, sep).trim();
                  const value = comment.substring(sep + 1).trim();
                  settings[key] = value;
                }

                // Chart settings defined by comments
                if (settings[`chart`] && chartTypes.includes(settings[`chart`])) {
                  chartDetail.type = settings[`chart`];
                }

                if (settings[`title`]) {
                  chartDetail.title = settings[`title`];
                }
              }

              // Perhaps the chart type is defined by the statement prefix
              const chartType: ChartType|undefined = chartTypes.find(type => content.startsWith(`${type}:`));
              if (chartType) {
                chartDetail.type = chartType;
                content = content.substring(chartType.length + 1);
              }

              // Execute the query
              const query = selected.job.query(content);
              const results = await query.run();

              const table = results.data;
              const keys = Object.keys(table[0]);

              // Add `-` for blanks.
              table.forEach(row => {
                keys.forEach(key => {
                  //@ts-ignore
                  if (!row[key]) { row[key] = `-`; }
                });
              });

              const columns = results.metadata.columns.map(c => c.label);

              let fallbackToTable = true;

              if (chartDetail.type) {
                const possibleChart = generateChart(execution.executionOrder, chartDetail, columns, table);
                if (possibleChart) {
                  items.push(vscode.NotebookCellOutputItem.text(possibleChart, `text/html`));
                  fallbackToTable = false;
                }
              }

              if (fallbackToTable) {
                items.push(vscode.NotebookCellOutputItem.text(mdTable(table, columns), `text/markdown`));
              }
              
            } else {
              vscode.NotebookCellOutputItem.stderr(`No job selected in SQL Job Manager.`);
            }
          } catch (e) {
            //@ts-ignore
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