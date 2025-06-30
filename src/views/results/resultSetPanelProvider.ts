import { window, CancellationToken, WebviewPanel, WebviewView, WebviewViewProvider, WebviewViewResolveContext, commands } from "vscode";

import { setCancelButtonVisibility } from ".";
import { JobManager } from "../../config";
import { updateStatusBar } from "../jobManager/statusBar";
import Configuration from "../../configuration";
import * as html from "./html";
import { Query } from "@ibm/mapepire-js/dist/src/query";
import { ObjectRef } from "../../language/sql/types";
import Table from "../../database/table";
import Statement from "../../database/statement";
import { TableColumn } from "../../types";

export type SqlParameter = string|number;

export interface ScrollerOptions {
  basicSelect: string;
  parameters?: SqlParameter[];
  isCL?: boolean;
  queryId?: string;
  withCancel?: boolean;
  ref?: ObjectRef;
}

export class ResultSetPanelProvider implements WebviewViewProvider {
  _view: WebviewView | WebviewPanel;
  loadingState: boolean;
  currentQuery: Query<any>;
  constructor() {
    this._view = undefined;
    this.loadingState = false;
  }

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
      this._view.webview.postMessage({
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
              const result = await JobManager.runSQL(message.update, { parameters: message.bindings });
              postCellResponse(message.id, true);
            } catch (e) {
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
            if (this.currentQuery) {
              // If we get a request for a new query, then we need to close the old one
              if (this.currentQuery.getId() !== message.queryId) {
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
                let queryResults = undefined;
                let startTime = 0;
                let endTime = 0;
                let executionTime: number|undefined;

                if (this.currentQuery.getState() == "RUN_MORE_DATA_AVAILABLE") {
                  queryResults = await this.currentQuery.fetchMore();
                }
                else {
                  startTime = performance.now();
                  queryResults = await this.currentQuery.execute();
                  endTime = performance.now();
                  executionTime = (endTime - startTime)
                }
                const jobId = this.currentQuery.getHostJob().id;

                this._view.webview.postMessage({
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
              }

            } catch (e) {
              this.setError(e.message);
              this._view.webview.postMessage({
                command: `rows`,
                rows: [],
                queryId: ``,
                isDone: true
              });
            }

            setCancelButtonVisibility(false);
            updateStatusBar();
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

    if (!this.loadingState) {
      this._view.webview.html = html.getLoadingHTML();
      this.loadingState = true;
    }

    html.setLoadingText(this._view.webview, content);
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
    this.loadingState = false;
    await this.focus();

    let updatable: html.UpdatableInfo | undefined;

    if (options.ref) {
      const schema = options.ref.object.schema || options.ref.object.system;
      if (schema) {
        const goodSchema = Statement.delimName(schema, true);
        const goodName = Statement.delimName(options.ref.object.name, true);

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
                currentColumns = [{ name: `RRN`, jsType: `number`, useInWhere: true }, ...currentColumns];
              }

              updatable = {
                table: schema + `.` + options.ref.object.name,
                columns: currentColumns
              };
            }
          }
        } catch (e) {
          window.showErrorMessage(`Table may not be updatable. This sometimes happens if you're Db2 for i PTF levels are not up to date: ${e.message}`);
        }
      }
    }

    this._view.webview.html = html.generateScroller(options.basicSelect, options.parameters, options.isCL, options.withCancel, updatable);

    this._view.webview.postMessage({
      command: `fetch`,
      queryId: options.queryId
    });
  }

  setError(error) {
    this.loadingState = false;
    // TODO: pretty error
    this._view.webview.html = `<p>${error}</p>`;
  }
}

function delay(t: number, v?: number) {
  return new Promise(resolve => setTimeout(resolve, t, v));
}
