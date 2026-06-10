import { CancellationToken, WebviewPanel, WebviewView, WebviewViewProvider, WebviewViewResolveContext, commands, window } from "vscode";

import { QueryResult } from "@ibm/mapepire-js";
import { Query } from "@ibm/mapepire-js/dist/src/query";
import { setCancelButtonVisibility } from ".";
import { JobManager } from "../../config";
import Configuration from "../../configuration";
import Statement from "../../database/statement";
import Table from "../../database/table";
import { ObjectRef } from "../../language/sql/types";
import { TableColumn } from "../../types";
import { updateStatusBar } from "../jobManager/statusBar";
import { statementDone } from "./editorUi";
import * as html from "./html";

export type SqlParameter = string | number;

export interface ScrollerOptions {
  uiId?: string;
  basicSelect: string;
  parameters?: SqlParameter[];
  isCL?: boolean;
  queryId?: string;
  withCancel?: boolean;
  ref?: ObjectRef;
}

export class ResultSetPanelProvider implements WebviewViewProvider {
  _view: WebviewView | WebviewPanel | undefined;
  loadingState: boolean = false;
  currentQuery: Query<any> | undefined;
  lastScrollerOptions: ScrollerOptions | undefined;

  endQuery() {
    if (this.currentQuery) {
      const hostJob = this.currentQuery.getHostJob();
      if (hostJob && hostJob.getStatus() === "busy") {
        // We are assuming the job is the same here.
        commands.executeCommand(`vscode-db2i.statement.cancel`, hostJob.id);
      }
      this.currentQuery.close();
    }
  }

  retrieveMoreRows(allRows?: boolean) {
    if (this._view) {
      const queryId = this.currentQuery?.getId();
      this._view.webview.postMessage({
        command: `fetch`,
        queryId: queryId,
        allRows: allRows === true
      });
    }
  }

  async refresh() {
    if (this.lastScrollerOptions) {
      // Close the current query if it exists
      if (this.currentQuery) {
        await this.currentQuery.close();
        this.currentQuery = undefined;
      }
      // Re-run the query with the same options
      await this.setScrolling(this.lastScrollerOptions);
    }
  }

  resolveWebviewView(webviewView: WebviewView | WebviewPanel, context?: WebviewViewResolveContext, _token?: CancellationToken) {
    this._view = webviewView;

    this._view.onDidDispose(() => {
      this._view = undefined;
      this.endQuery();
    });

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
    };

    webviewView.webview.html = html.getLoadingHTML();

    const postCellResponse = (id: number, success: boolean) => {
      this._view?.webview.postMessage({
        command: `cellResponse`,
        id,
        success
      });
    }

    this._view.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case `cancel`:
          this.endQuery();
          break;

        case `update`:
          if (message.id && message.update && message.bindings) {
            console.log(message);
            try {
              await JobManager.runSQL(message.update, { parameters: message.bindings });
              const substatement = message.bindings
                ? `bind: ${(message.bindings as string[])
                  .map(binding => typeof binding === 'string' ? `'${binding}'` : String(binding))
                  .join(', ')}`
                : undefined;
              commands.executeCommand(`vscode-db2i.queryHistory.prepend`, message.update, substatement);
              postCellResponse(message.id, true);
            } catch (e: any) {
              // this.setError(e.message);
              // if (this.currentQuery) {
              //   this.currentQuery.close();
              // }
              postCellResponse(message.id, false);
              window.showWarningMessage(e.message);
            }
          }
          break;

        default:
          if (message.query) {
            let canClear = false;
            let canRetrieveMoreRows = false;
            let canRefresh = false;
            if (this.currentQuery) {
              // If we get a request for a new query, then we need to close the old one
              if (this.currentQuery.getId() === undefined || this.currentQuery.getId() !== message.queryId) {
                // This is a new query, so we need to clean up the old one
                await this.currentQuery.close();
                this.currentQuery = undefined;
              }
            }

            try {
              if (this.currentQuery === undefined) {
                this.currentQuery = await JobManager.getPagingStatement(message.query, { parameters: message.parameters, isClCommand: message.isCL, isTerseResults: true });
              }

              if (this.currentQuery.getState() !== "RUN_DONE") {
                setCancelButtonVisibility(true);
                let queryResults: QueryResult<any> | undefined = undefined;
                let startTime = 0;
                let endTime = 0;
                let executionTime: number | undefined;

                let rowsToFetch = Configuration.get<number>('resultsets.rowsToFetch') || 100;
                if (this.currentQuery.getState() == "RUN_MORE_DATA_AVAILABLE") {
                  // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
                  // int. This is the largest number available without overflow (Integer.MAX_VALUE)
                  rowsToFetch = message.allRows === true ? 2147483647 : rowsToFetch;
                  queryResults = await this.currentQuery.fetchMore(rowsToFetch);
                }
                else {
                  startTime = performance.now();
                  queryResults = await this.currentQuery.execute(rowsToFetch);
                  endTime = performance.now();
                  executionTime = (endTime - startTime);

                  if (message.uiId) {
                    statementDone(message.uiId, { paramsOut: queryResults.output_parms });
                  }
                }
                const jobId = this.currentQuery.getHostJob().id;

                this._view?.webview.postMessage({
                  command: `rows`,
                  jobId,
                  rows: queryResults.data,
                  columnMetaData: queryResults.metadata ? queryResults.metadata.columns : undefined, // Query.fetchMore() doesn't return the metadata
                  columnHeadings: Configuration.get(`resultsets.columnHeadings`) || 'Name',
                  queryId: this.currentQuery.getId(),
                  update_count: queryResults.update_count,
                  isDone: queryResults.is_done,
                  executionTime
                });

                canClear = true;
                canRetrieveMoreRows = !queryResults.is_done;
                canRefresh = true;
              }

            } catch (e: any) {
              this.setError(e.message);
              this._view?.webview.postMessage({
                command: `rows`,
                rows: [],
                queryId: ``,
                isDone: true
              });
            }

            setCancelButtonVisibility(false);
            updateStatusBar();
            commands.executeCommand(`setContext`, `vscode-db2i:canClear`, canClear);
            commands.executeCommand(`setContext`, `vscode-db2i:canRetrieveMoreRows`, canRetrieveMoreRows);
            commands.executeCommand(`setContext`, `vscode-db2i:canRefresh`, canRefresh);
          }
          break;
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

    if (this._view && 'show' in this._view) {
      this._view.show(true);
    }

  }

  async focus() {
    if (!this._view) {
      // Weird one. Kind of a hack. _view.show doesn't work yet because it's not initialized.
      // But, we can call a VS Code API to focus on the tab, which then
      // 1. calls resolveWebviewView
      // 2. sets this._view
      await commands.executeCommand(`vscode-db2i.resultset.focus`);
    }
  }

  async setLoadingText(content: string, focus = true) {
    if (focus) {
      await this.focus();
    }

    if (this._view) {
      if (!this.loadingState) {
        this._view.webview.html = html.getLoadingHTML();
        this.loadingState = true;
      }

      html.setLoadingText(this._view.webview, content);
    }
  }

  /** Update the result table column headings based on the configuration setting */
  async updateHeader() {
    if (this._view) {
      this._view.webview.postMessage({
        command: `header`,
        columnHeadings: Configuration.get(`resultsets.columnHeadings`) || 'Name',
      });
    }
  }

  async setScrolling(options: ScrollerOptions) {
    this.lastScrollerOptions = { ...options };

    this.loadingState = false;
    await this.focus();

    let updatable: html.UpdatableInfo | undefined;

    if (options.ref) {
      const schema = options.ref.object.schema || options.ref.object.system;
      if (schema) {
        const goodSchema = Statement.delimName(schema, true);
        const goodName = Statement.delimName(options.ref.object.name || '', true);

        try {
          const isPartitioned = await Table.isPartitioned(goodSchema, goodName);
          if (!isPartitioned) {
            let tableInfo: TableColumn[] = [];

            if ([`SESSION`, `QTEMP`].includes(goodSchema)) {
              tableInfo = await Table.getSessionItems(goodName);
            } else {
              tableInfo = await Table.getItems(
                goodSchema,
                goodName
              );
            }

            const uneditableTypes = [`VARBIN`, `BINARY`, `ROWID`, `DATALINK`, `DBCLOB`, `BLOB`, `GRAPHIC`]

            if (tableInfo.length > 0) {
              let currentColumns: html.BasicColumn[] | undefined;

              currentColumns = tableInfo
                .filter((column) => !uneditableTypes.includes(column.DATA_TYPE))
                .map((column) => ({
                  name: column.COLUMN_NAME,
                  jsType: column.NUMERIC_PRECISION ? `number` : `asString`,
                  useInWhere: column.IS_IDENTITY === `YES`,
                  isNullable: column.IS_NULLABLE === `Y`,
                  maxInputLength: column.CHARACTER_MAXIMUM_LENGTH
                }));

              if (!currentColumns.some(c => c.useInWhere)) {
                const cName = options.ref.alias || `t`;

                // Support for using a custom column list
                const selectClauseStart = options.basicSelect.toLowerCase().indexOf(`select `);
                const fromClauseStart = options.basicSelect.toLowerCase().indexOf(`from`);
                let possibleColumnList: string | undefined;

                possibleColumnList = `${cName}.*`;
                if (fromClauseStart > 0) {
                  possibleColumnList = options.basicSelect.substring(0, fromClauseStart);
                  if (selectClauseStart >= 0) {
                    possibleColumnList = possibleColumnList.substring(selectClauseStart + 7);

                    if (possibleColumnList.trim() === `*`) {
                      possibleColumnList = `${cName}.*`;
                    }
                  }
                }

                // We need to override the input statement if they want to do updatable
                const whereClauseStart = options.basicSelect.toLowerCase().indexOf(`where`);
                let fromWhereClause: string | undefined;

                if (whereClauseStart > 0) {
                  fromWhereClause = options.basicSelect.substring(whereClauseStart);
                }

                options.basicSelect = `select rrn(${cName}) as RRN, ${possibleColumnList} from ${schema}.${options.ref.object.name} as ${cName} ${fromWhereClause || ``}`;
                currentColumns = [{ name: `RRN`, jsType: `number`, isNullable: false, useInWhere: true }, ...currentColumns];
              }

              updatable = {
                table: schema + `.` + options.ref.object.name,
                columns: currentColumns
              };
            }
          }
        } catch (e: any) {
          window.showErrorMessage(`Table may not be updatable. This sometimes happens if you're Db2 for i PTF levels are not up to date: ${e.message}`);
        }
      }
    }

    if (this._view) {
      this._view.webview.html = html.generateScroller(options.uiId || '', options.basicSelect, options.parameters, options.isCL, options.withCancel, updatable);

      this._view.webview.postMessage({
        command: `fetch`,
        queryId: options.queryId
      });
    }
  }

  setError(error: string) {
    this.loadingState = false;
    // TODO: pretty error
    if (this._view) {
      this._view.webview.html = `<p>${error}</p>`;
    }
  }

  clear() {
    if (this._view) {
      this._view.webview.html = ``;
    }
    this.resetContext();
  }

  resetContext() {
    commands.executeCommand(`setContext`, `vscode-db2i:canClear`, false);
    commands.executeCommand(`setContext`, `vscode-db2i:canRetrieveMoreRows`, false);
    commands.executeCommand(`setContext`, `vscode-db2i:canRefresh`, false);
  }
}

function delay(t: number, v?: number) {
  return new Promise(resolve => setTimeout(resolve, t, v));
}
