import vscode, { SnippetString, ViewColumn } from "vscode";

import * as csv from "csv/sync";

import { JobManager } from "../../config";
import { JobInfo } from "../../connection/manager";
import { Query, QueryState } from "../../connection/query";
import { changedCache } from "../../language/providers/completionItemCache";
import Document from "../../language/sql/document";
import Statement from "../../language/sql/statement";
import { ParsedEmbeddedStatement, StatementGroup, StatementType } from "../../language/sql/types";
import { updateStatusBar } from "../jobManager/statusBar";
import * as html from "./html";
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
        let data = [];

        let queryObject = Query.byId(message.queryId);
        try {
          if (queryObject === undefined) {
            // We will need to revisit this if we ever allow multiple result tabs like ACS does
            Query.cleanup();

            let query = await JobManager.getPagingStatement(message.query, { isClCommand: message.isCL, autoClose: true, isTerseResults: true });
            queryObject = query;
          }

          let queryResults = queryObject.getState() == QueryState.RUN_MORE_DATA_AVAILABLE ? await queryObject.fetchMore() : await queryObject.run();
          console.log( queryResults.metadata ? queryResults.metadata.columns.map(x=>x.name) : undefined);
          data = queryResults.data;
          this._view.webview.postMessage({
            command: `rows`,
            rows: queryResults.data,
            columnList: queryResults.metadata ? queryResults.metadata.columns.map(x=>x.name) : undefined, // Query.fetchMore() doesn't return the metadata
            queryId: queryObject.getId(),
            update_count: queryResults.update_count,
            isDone: queryResults.is_done
          });

        } catch (e) {
          this.setError(e.message);
          this._view.webview.postMessage({
            command: `rows`,
            rows: [],
            queryId: ``,
            isDone: true
          });
        }

        updateStatusBar();
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

  async setLoadingText(content: string) {
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
      command: `fetch`,
      queryId: ``
    });
  }
  setError(error) {
    // TODO: pretty error
    this._view.webview.html = `<p>${error}</p>`;
  }
}

class SelfCodePanelProvider {
  _view: vscode.WebviewView;
  loadingState: boolean;
  selfCodeCache: number = 0;
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

  async setTableData(data: any[]) {
    await this.focus();

    const rows = Object.values(data).map(obj => Object.values(obj));
    const cols = Object.keys(data[0]);
  
    const rawhtml = html.generateDynamicTable();
  
    this._view.webview.html = rawhtml;
    this._view.webview.postMessage({
      command: 'setTableData',
      rows: rows,
      columnList: cols
    });
  }

  setError(error) {
    // TODO: pretty error
    this._view.webview.html = `<p>${error}</p>`;
  }
}

export type StatementQualifier = "statement"|"json"|"csv"|"cl"|"sql";

export interface StatementInfo {
  content: string,
  qualifier: StatementQualifier,
  open?: boolean,
  viewColumn?: ViewColumn,
  viewFocus?: boolean,
  history?: boolean
}

export interface ParsedStatementInfo extends StatementInfo {
  statement: Statement;
  group: StatementGroup;
  embeddedInfo: ParsedEmbeddedStatement;
}

export function initialise(context: vscode.ExtensionContext) {
  let resultSetProvider = new ResultSetPanelProvider();
  let selfCodeErrorProvider = new SelfCodePanelProvider();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(`vscode-db2i.selfCodeErrorPanel`, selfCodeErrorProvider, {
      webviewOptions : {retainContextWhenHidden: true}
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(`vscode-db2i.resultset`, resultSetProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.commands.registerCommand(`vscode-db2i.resultset.reset`, async () => {
      resultSetProvider.loadingState = false;
      resultSetProvider.setLoadingText(`View will be active when a statement is executed.`);
    }),

    vscode.commands.registerCommand(`vscode-db2i.runEditorStatement`,
      async (options?: StatementInfo) => {
        // Options here can be a vscode.Uri when called from editor context.
        // But that isn't valid here.
        const optionsIsValid = (options && options.content !== undefined);
        let editor = vscode.window.activeTextEditor;

        if (optionsIsValid || (editor && editor.document.languageId === `sql`)) {
          await resultSetProvider.ensureActivation();

          const statementDetail = parseStatement(editor, optionsIsValid ? options : undefined);

          if (statementDetail.open) {
            const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content: statementDetail.content });
            editor = await vscode.window.showTextDocument(textDoc, statementDetail.viewColumn, statementDetail.viewFocus);
          }

          if (editor) {
            const group = statementDetail.group;
            editor.selection = new vscode.Selection(editor.document.positionAt(group.range.start), editor.document.positionAt(group.range.end));

            if (group.statements.length === 1 && statementDetail.embeddedInfo && statementDetail.embeddedInfo.changed) {
              editor.insertSnippet(
                new SnippetString(statementDetail.embeddedInfo.content)
              )
              return;
            }
          }

          const statement = statementDetail.statement;

          if (statement.type === StatementType.Create || statement.type === StatementType.Alter) {
            const refs = statement.getObjectReferences();
            if (refs.length > 0) {            
              const ref = refs[0];
              const databaseObj =
                statement.type === StatementType.Create && ref.createType.toUpperCase() === `schema`
                  ? ref.object.schema || ``
                  : ref.object.schema + ref.object.name;
              changedCache.add((databaseObj || ``).toUpperCase());
            }
          }

          if (statementDetail.content.trim().length > 0) {
            try {
              if (statementDetail.qualifier === `cl`) {
                resultSetProvider.setScrolling(statementDetail.content, true);
              } else {
                if (statementDetail.qualifier === `statement`) {
                  // If it's a basic statement, we can let it scroll!
                  resultSetProvider.setScrolling(statementDetail.content);

                } else {
                  // Otherwise... it's a bit complicated.
                  const data = await JobManager.runSQL(statementDetail.content, undefined);

                  if (data.length > 0) {
                    switch (statementDetail.qualifier) {

                    case `csv`:
                    case `json`:
                    case `sql`:
                      let content = ``;
                      switch (statementDetail.qualifier) {
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

                      const textDoc = await vscode.workspace.openTextDocument({ language: statementDetail.qualifier, content });
                      await vscode.window.showTextDocument(textDoc);
                      break;
                    }

                  } else {
                    vscode.window.showInformationMessage(`Query executed with no data returned.`);
                  }
                }
              }

              const selected: JobInfo = await JobManager.getSelection();
              if (selected.job.options.selfcodes) {
                const content = `SELECT * FROM QSYS2.SQL_ERROR_LOG WHERE JOB_NAME = '${selected.job.id}'`;
                const data = await JobManager.runSQL(content, undefined);
                const hasErrors = data.length > 0;
                if(hasErrors) {
                  if (data.length !== selfCodeErrorProvider.selfCodeCache) {
                    await vscode.commands.executeCommand(`setContext`, `vscode-db2i:selfCodeCountChanged`, true);
                    await selfCodeErrorProvider.setTableData(data);
                    selfCodeErrorProvider.selfCodeCache = data.length;
                  }
                } else {
                  await vscode.commands.executeCommand(`setContext`, `vscode-db2i:selfCodeCountChanged`, false);
                }
              }
              
              if (statementDetail.qualifier === `statement` && statementDetail.history !== false) {
                vscode.commands.executeCommand(`vscode-db2i.queryHistory.prepend`, statementDetail.content);
              }

            } catch (e) {
              let errorText;
              if (typeof e === `string`) {
                errorText = e.length > 0 ? e : `An error occurred when executing the statement.`;
              } else {
                errorText = e.message || `Error running SQL statement.`;
              }

              if (statementDetail.qualifier === `statement` && statementDetail.history !== false) {
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

export function parseStatement(editor?: vscode.TextEditor, existingInfo?: StatementInfo): ParsedStatementInfo {
  let statementInfo: ParsedStatementInfo = {
    content: ``,
    qualifier: `statement`,
    group: undefined,
    statement: undefined,
    embeddedInfo: undefined
  };

  let sqlDocument: Document;
  
  if (existingInfo) {
    statementInfo = {
      ...existingInfo,
      group: undefined,
      statement: undefined,
      embeddedInfo: undefined
    };

    // Running from existing data
    sqlDocument = new Document(statementInfo.content);
    statementInfo.group = sqlDocument.getStatementGroups()[0];

  } else if (editor) {
    // Is being run from the editor

    const document = editor.document;
    const cursor = editor.document.offsetAt(editor.selection.active);

    sqlDocument = new Document(document.getText());
    statementInfo.group = sqlDocument.getGroupByOffset(cursor);

    if (statementInfo.group) {
      statementInfo.content = sqlDocument.content.substring(
        statementInfo.group.range.start, statementInfo.group.range.end
      );
    }

    if (statementInfo.content) {
      [`cl`, `json`, `csv`, `sql`].forEach(mode => {
        if (statementInfo.content.trim().toLowerCase().startsWith(mode + `:`)) {
          statementInfo.content = statementInfo.content.substring(mode.length + 1).trim();
  
          //@ts-ignore We know the type.
          statementInfo.qualifier = mode;
        }
      });
    }
  }

  statementInfo.statement = statementInfo.group.statements[0];

  if (statementInfo.qualifier !== `cl`) {
    statementInfo.embeddedInfo = sqlDocument.removeEmbeddedAreas(statementInfo.statement, true);
  }

  return statementInfo;
}