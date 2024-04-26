import * as vscode from 'vscode';
import { JobManager } from '../../config';
import { ChartDetail, generateChart } from './chart';
import { chartJsTypes, ChartJsType, generateChartHTMLEmbedded } from './chartJs';
import { getStatementDetail } from './statement';
import { getInstance } from '../../base';

import chartjs from 'chart.js/dist/chart.umd.js';
import { JobStatus } from '../../connection/sqlJob';

import Showdown from 'showdown';

const converter = new Showdown.Converter();

export const exportNotebookAsHtml = vscode.commands.registerCommand(`vscode-db2i.notebook.exportAsHtml`, async (event: { notebookEditor: { notebookUri: vscode.Uri } }) => {
  if (event && event.notebookEditor) {
    const uri = event.notebookEditor.notebookUri;
    const doc = await vscode.workspace.openNotebookDocument(uri);
    if (doc) {
      const cells = doc.getCells();

      const selected = JobManager.getSelection();
      const connection = getInstance().getConnection();

      if (cells.length > 0) {
        if (selected) {
          const saveAt = vscode.window.showSaveDialog({
            filters: {
              'HTML': ['html']
            },
            title: `Save HTML`
          });

          if (saveAt) {

            vscode.window.withProgress({
              cancellable: true,
              location: vscode.ProgressLocation.Window,
              title: `Exporting notebook to HTML`,
            }, async (progress, token) => {

              token.onCancellationRequested(() => {
                if (selected && selected.job.getStatus() === JobStatus.Busy) {
                  selected.job.requestCancel();
                }
              });

              let requiresChartJs = false;
              let scripts: string[] = [];
              let cellsHTML: string[] = [];

              let executionId = 0;
              for (const cell of cells) {
                if (token.isCancellationRequested) return;
                executionId += 1;

                progress.report({ message: `Exporting ${cell.document.languageId.toUpperCase()} cell ${executionId} of ${cells.length}..` });

                const cellContents: string[] = [];

                switch (cell.document.languageId) {
                  case `markdown`:
                    const markdown = cell.document.getText();
                    cellContents.push(converter.makeHtml(markdown));
                    break;
            
                  case `sql`:
                    try {
                      if (selected) {
                        const eol = cell.document.eol === vscode.EndOfLine.CRLF ? `\r\n` : `\n`;
                
                        let content = cell.document.getText().trim();
                        let chartDetail: ChartDetail | undefined;
  
                        ({ chartDetail, content } = getStatementDetail(content, eol));

                        cellContents.push(`<pre>${content}</pre>`);
  
                        // Execute the query
                        const query = selected.job.query(content);
                        const results = await query.run();
  
                        const table = results.data;
  
                        if (table.length > 0) {
  
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
                            if (chartJsTypes.includes(chartDetail.type as ChartJsType)) {
                              const possibleChart = generateChart(executionId, chartDetail, columns, table, generateChartHTMLEmbedded);
                              if (possibleChart) {
                                scripts.push(possibleChart.script);
                                cellContents.push(possibleChart.html);
                                fallbackToTable = false;
                                requiresChartJs = true;
                              }
                            }
                          }
  
                          if (fallbackToTable) {
                            cellContents.push([
                              `<table style="width: 100%; margin-left: auto; margin-right: auto;">`,
                              `<thead>`,
                              `<tr>`,
                              columns.map(c => `<th>${c}</th>`).join(``),
                              `</tr>`,
                              `</thead>`,
                              `<tbody>`,
                              table.map(row => {
                                return [
                                  `<tr>`,
                                  keys.map(key => `<td>${row[key]}</td>`).join(``),
                                  `</tr>`
                                ].join(``);
                              }).join(``),
                              `</tbody>`,
                              `</table>`
                            ].join(``));
                          }
                        } else {
                          // items.push(vscode.NotebookCellOutputItem.stderr(`No rows returned from statement.`));
                        }
                
                      } else {
                        // items.push(vscode.NotebookCellOutputItem.stderr(`No job selected in SQL Job Manager.`));
                      }
                    } catch (e) {
                      // items.push(vscode.NotebookCellOutputItem.stderr(e.message));
                    }
                    break;
  
                  case `cl`:
                    const commandText = cell.document.getText();
                    cellContents.push(`<pre>${commandText}</pre>`);
              
                    try {
                      const command = await connection.runCommand({
                        command: commandText,
                        environment: `ile`
                      });
  
                      if (command.stdout) {
                        cellContents.push([
                          `<pre>`,
                          command.stdout,
                          `</pre>`
                        ].join(`\n`));
                      }
  
                      if (command.stderr) {
                        cellContents.push([
                          `<pre>`,
                          command.stderr,
                          `</pre>`
                        ].join(`\n`));
                      }
                    } catch (e) {
                      // items.push(
                      //   vscode.NotebookCellOutputItem.stderr(`Failed to run command. Are you connected?`),
                      //   vscode.NotebookCellOutputItem.stderr(e.message)
                      // );
                    }
                    break;
  
                  case `shellscript`:
                    const shellText = cell.document.getText();

                    cellContents.push(`<pre>${shellText}</pre>`);

                    try {
                      const command = await connection.runCommand({
                        command: shellText,
                        environment: `pase`
                      });
  
                      if (command.stdout) {
                        cellContents.push([
                          `<pre>`,
                          command.stdout,
                          `</pre>`
                        ].join(`\n`));
                      }
  
                      if (command.stderr) {
                        cellContents.push([
                          `<pre>`,
                          command.stderr,
                          `</pre>`
                        ].join(`\n`));

                      }
                    } catch (e) {
                      // items.push(
                      //   vscode.NotebookCellOutputItem.stderr(`Failed to runCommand. Are you connected?`),
                      //   //@ts-ignore
                      //   vscode.NotebookCellOutputItem.stderr(e.message)
                      // );
                    }
                    break;
                }

                cellsHTML.push(asCell(cellContents.join(`<br />`)));
                cellsHTML.push(asCell(`<hr />`));
              }

              if (cells.length > 0) {
                progress.report({ message: `Saving HTML..` });

                const document = /*html*/`
                  <head>
                    <style>
                      body {
                        font-family: Verdana, sans-serif;
                      }
                      hr {
                        height: 0;
                        border: 0;
                        border-top: 1px solid #e8e8e8;
                      }
                      .notebookCell {
                        padding-top: 1em;
                        padding-bottom: 1em;
                      }
                      @media print {
                        .notebookCell {
                          break-inside: avoid;
                        }
                      }
                    </style>
                    ${requiresChartJs ? `<script>${chartjs}</script>` : ``}
                    <script>
                      ${scripts.join(`\n\n`)}
                    </script>
                    
                  </head>
                  <body>
                    <table style="margin-left: auto; margin-right: auto; width: 60%;">
                      <tbody style="width: 100%;">
                        ${cellsHTML.join(``)}
                      </tbody>
                    </table>
                  </body>
                `;

                if (saveAt) {
                  const uri = await saveAt;
                  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(document));
                }
              }
            });
          }
        } else {
          vscode.window.showErrorMessage(`No job selected in SQL Job Manager.`);
        }
      }
    }
  }
});

function asCell(content: string) {
  return `<tr><td class="notebookCell" style="padding-top: 0.2em; padding-bottom: 0.2em;">${content}</td></tr>`;
}