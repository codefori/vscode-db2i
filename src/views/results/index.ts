import vscode from "vscode"

import * as csv from "csv/sync";

import Configuration from "../../configuration"
import * as html from "./html";
import { getInstance } from "../../base";
import { JobManager } from "../../config";
import { Query, QueryState } from "../../connection/query";

function delay(t: number, v?: number) {
  return new Promise(resolve => setTimeout(resolve, t, v));
}

class ResultSetPanelProvider {
  _view: vscode.WebviewView;
  loadingState: boolean;
  constructor() {
    this._view = undefined;
    this.loadingState = false;
  }

  resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
    };

    webviewView.webview.html = html.getLoadingHTML();
    this._view.webview.onDidReceiveMessage(async (message) => {
      if (message.query) {
        const instance = await getInstance();
        const content = instance.getContent();
        const config = instance.getConfig();
        let data = [];

        let queryObject = Query.byId(message.queryId);
        try {
          if (undefined === queryObject) {
            let query = await JobManager.getPagingStatement(message.query, { isClCommand: message.isCL });
            queryObject = query;
          }
          let queryResults = queryObject.getState() == QueryState.RUN_MORE_DATA_AVAILABLE ? await queryObject.fetchMore() : await queryObject.run();
          data = queryResults.data;
          this._view.webview.postMessage({
            command: `rows`,
            rows: queryResults.data,
            queryId: queryObject.getId(),
            isDone: queryResults.is_done
          });

        } catch (e) {
          this.setError(e.message);
          this._view.webview.postMessage({
            command: `rows`,
            rows: [],
            queryId: queryObject.getId(),
            isDone: true
          });
        }
      }
    });
  }

  async ensureActivation() {
    let currentLoop = 0;
    while (!this._view && currentLoop < 15) {
      await this.focus();
      await delay(100);
      currentLoop += 1;
    }
  }

  async focus() {
    if (!this._view) {
      // Weird one. Kind of a hack. _view.show doesn't work yet because it's not initialized.
      // But, we can call a VS Code API to focus on the tab, which then
      // 1. calls resolveWebviewView
      // 2. sets this._view
      await vscode.commands.executeCommand(`vscode-db2i.resultset.focus`);
    } else {
      this._view.show(true);
    }
  }

  async setLoadingText(content) {
    await this.focus();

    if (!this.loadingState) {
      this._view.webview.html = html.getLoadingHTML();
      this.loadingState = true;
    }

    html.setLoadingText(this._view.webview, content);
  }

  async setScrolling(basicSelect, isCL = false) {
    await this.focus();

    this._view.webview.html = html.generateScroller(basicSelect, isCL);

    this._view.webview.postMessage({
      command: `fetch`
    });
  }

  setError(error) {
    // TODO: pretty error
    this._view.webview.html = `<p>${error}</p>`;
  }
}

export function initialise(context: vscode.ExtensionContext) {
  let resultSetProvider = new ResultSetPanelProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(`vscode-db2i.resultset`, resultSetProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.commands.registerCommand(`vscode-db2i.runEditorStatement`,
      async (options: StatementInfo) => {
        // Options here can be a vscode.Uri when called from editor context.
        // But that isn't valid here.
        const optionsIsValid = (options && options.content !== undefined);

        const instance = getInstance();
        const config = instance.getConfig();
        const content = instance.getContent();
        const editor = vscode.window.activeTextEditor;

        if (optionsIsValid || (editor && editor.document.languageId === `sql`)) {
          await resultSetProvider.ensureActivation();

          /** @type {StatementInfo} */
          const statement = (optionsIsValid ? options : parseStatement(editor));

          if (statement.open) {
            const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content: statement.content });
            await vscode.window.showTextDocument(textDoc);
          }

          if (statement.content.trim().length > 0) {
            try {
              if (statement.type === `cl`) {
                resultSetProvider.setScrolling(statement.content, true);
              } else {
                if (statement.type === `statement`) {
                  // If it's a basic statement, we can let it scroll!
                  resultSetProvider.setScrolling(statement.content);

                } else {
                  // Otherwise... it's a bit complicated.
                  const data = await JobManager.runSQL(statement.content);

                  if (data.length > 0) {
                    switch (statement.type) {

                    case `csv`:
                    case `json`:
                    case `sql`:
                      let content = ``;
                      switch (statement.type) {
                      case `csv`: content = csv.stringify(data, {
                        header: true,
                        quoted_string: true,
                      }); break;
                      case `json`: content = JSON.stringify(data, null, 2); break;

                      case `sql`:
                        const keys = Object.keys(data[0]);

                        const insertStatement = [
                          `insert into TABLE (`,
                          `  ${keys.join(`, `)}`,
                          `) values `,
                          data.map(
                            row => `  (${keys.map(key => {
                              if (row[key] === null) return `null`;
                              if (typeof row[key] === `string`) return `'${String(row[key]).replace(/'/g, `''`)}'`;
                              return row[key];
                            }).join(`, `)})`
                          ).join(`,\n`),
                        ];
                        content = insertStatement.join(`\n`);
                        break;
                      }

                      const textDoc = await vscode.workspace.openTextDocument({ language: statement.type, content });
                      await vscode.window.showTextDocument(textDoc);
                      break;
                    }

                  } else {
                    vscode.window.showInformationMessage(`Query executed with no data returned.`);
                  }
                }
              }

              if (statement.type === `statement`) {
                vscode.commands.executeCommand(`vscode-db2i.queryHistory.prepend`, statement.content);
              }

            } catch (e) {
              let errorText;
              if (typeof e === `string`) {
                errorText = e.length > 0 ? e : `An error occurred when executing the statement.`;
              } else {
                errorText = e.message || `Error running SQL statement.`;
              }

              if (statement.type === `statement` && statement.history !== false) {
                resultSetProvider.setError(errorText);
              } else {
                vscode.window.showErrorMessage(errorText);
              }
            }
          }
        }
      }),
  )
}

export function parseStatement(editor: vscode.TextEditor): StatementInfo {
  const document = editor.document;
  const eol = (document.eol === vscode.EndOfLine.LF ? `\n` : `\r\n`);

  let text = document.getText(editor.selection).trim();
  let content;

  let type: StatementType = `statement`;

  if (text.length > 0) {
    content = text;
  } else {
    const cursor = editor.document.offsetAt(editor.selection.active);
    text = document.getText();

    let statements = [];

    let inQuote = false;
    let start = 0, end = 0;

    for (const c of text) {
      switch (c) {
      case `'`:
        inQuote = !inQuote;
        break;

      case `;`:
        if (!inQuote) {
          statements.push({
            start,
            end,
            text: text.substring(start, end)
          });

          start = end + 1;
        }
        break;
      }
      end++;
    }

    //Add ending
    statements.push({
      start,
      end,
      text: text.substring(start, end)
    });

    let statementData = statements.find(range => cursor >= range.start && cursor <= range.end);
    content = statementData.text.trim();

    editor.selection = new vscode.Selection(editor.document.positionAt(statementData.start), editor.document.positionAt(statementData.end));

    // Remove blank lines and comment lines
    let lines = content.split(eol).filter(line => line.trim().length > 0 && !line.trimStart().startsWith(`--`));

    lines.forEach((line, startIndex) => {
      if (type !== `statement`) return;

      [`cl`, `json`, `csv`, `sql`].forEach(mode => {
        if (line.trim().toLowerCase().startsWith(mode + `:`)) {
          lines = lines.slice(startIndex);
          lines[0] = lines[0].substring(mode.length + 1).trim();

          content = lines.join(` `);

          //@ts-ignore We know the type.
          type = mode;
        }
      });
    });
  }

  return {
    type: type,
    content
  };
}