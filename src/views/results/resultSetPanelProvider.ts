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
import {
  BasicColumn,
  DataTableColumn,
  DataTableHandlers,
  DataTableOptions,
  UpdatableInfo,
  appendDataTableRows,
  handleDataTableMessage,
  moveDataTableToEditor,
  postDataTableCellResponse,
  renderDataTable,
  resetDataTableRows,
  updateDataTableColumns,
} from "../html/dataTable";
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

/** SQL column heading display mode, from the `resultsets.columnHeadings` setting */
function resultColumnTitle(column: any, columnHeadings: string): string {
  switch (columnHeadings) {
    case `Name`: return column.name;
    case `Both`: return column.name === column.label ? column.name : `${column.name}\n${column.label}`;
    default: return column.label;
  }
}

function resultColumnTooltip(column: any, columnHeadings: string): string {
  let title: string;
  switch (column.type) {
    case `CHAR`: case `VARCHAR`: case `CLOB`: case `BINARY`: case `VARBINARY`: case `BLOB`:
    case `GRAPHIC`: case `VARGRAPHIC`: case `DBCLOB`: case `NCHAR`: case `NVARCHAR`: case `NCLOB`:
    case `FLOAT`: case `DECFLOAT`: case `DATALINK`:
      title = `${column.type}(${column.precision})`;
      break;
    case `DECIMAL`: case `NUMERIC`:
      title = `${column.type}(${column.precision}, ${column.scale})`;
      break;
    default:
      title = column.type;
  }
  title += `\n`;
  switch (columnHeadings) {
    case `Name`: title += column.label; break;
    case `Both`: break;
    default: title += column.name;
  }
  return title;
}

/** Builds the data table's columns from a query's SQL column metadata (rows are plain `row[i]` arrays — `isTerseResults: true`) */
function buildResultColumns(columnMetaData: any[], columnHeadings: string): DataTableColumn<any[]>[] {
  return columnMetaData.map((column, i) => ({
    id: column.name,
    title: resultColumnTitle(column, columnHeadings),
    value: (row: any[]) => row[i],
    headerTooltip: resultColumnTooltip(column, columnHeadings),
  }));
}

/** Types a "search all columns" `CAST(... AS VARCHAR(...))` can't meaningfully apply to */
const SEARCH_EXCLUDED_TYPES = new Set([
  `BLOB`, `CLOB`, `DBCLOB`, `NCLOB`, `VARBIN`, `BINARY`, `GRAPHIC`, `VARGRAPHIC`, `ROWID`, `DATALINK`,
]);

/** Double-quotes an identifier for interpolation into generated SQL, escaping embedded `"` (unlike `Statement.delimName`, which doesn't) */
function quoteIdent(id: string): string {
  return `"${id.replace(/"/g, `""`)}"`;
}

/** Escapes `\`, `%` and `_` in user-typed search text so it can't act as a LIKE wildcard once bound */
function escapeLikeText(text: string): string {
  return text.replace(/\\/g, `\\\\`).replace(/%/g, `\\%`).replace(/_/g, `\\_`);
}

export class ResultSetPanelProvider implements WebviewViewProvider {
  _view: WebviewView | WebviewPanel | undefined;
  loadingState: boolean = false;
  currentQuery: Query<any> | undefined;
  lastScrollerOptions: ScrollerOptions | undefined;
  /** Routes the webview's messages while it shows a data table instead of the idle placeholder */
  private messageRouter: ((message: any) => Promise<boolean> | void) | undefined;
  /** Raw SQL column metadata of the query shown, so a heading-setting change can rebuild titles */
  private lastColumnMetaData: any[] | undefined;
  private lastDataTableOptions: DataTableOptions<any[]> | undefined;
  /** Bumped on every restart so a superseded in-flight fetch can drop its stale result */
  private queryEpoch = 0;

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
      this._view.webview.postMessage({
        command: `requestFetch`,
        allRows: allRows === true,
        queryId: this.currentQuery?.getId(),
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
      if (this._view) {
        // Forces a real reload: setScrolling's html can be identical to what's already
        // shown, and VS Code no-ops an unchanged webview.html assignment.
        this._view.webview.html = html.getLoadingHTML();
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

    this._view.webview.onDidReceiveMessage(async (message) => {
      await this.messageRouter?.(message);
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
    this.messageRouter = undefined;
    this.lastColumnMetaData = undefined;
    this.lastDataTableOptions = undefined;

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
    if (this._view && this.lastColumnMetaData && this.lastDataTableOptions) {
      const columns = buildResultColumns(this.lastColumnMetaData, Configuration.get<string>(`resultsets.columnHeadings`) || 'Name');
      updateDataTableColumns(msg => this._view?.webview.postMessage(msg), this.lastDataTableOptions, columns);
    }
  }

  async setScrolling(options: ScrollerOptions) {
    this.messageRouter = undefined;
    this.queryEpoch++;
    this.lastScrollerOptions = { ...options };
    this.lastColumnMetaData = undefined;
    this.lastDataTableOptions = undefined;

    this.loadingState = false;
    await this.focus();

    let updatable: UpdatableInfo | undefined;

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
              let currentColumns: BasicColumn[] | undefined;

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

    // Always wrap this pristine text, never an already-wrapped one, so restarts don't nest.
    const baseSelect = options.basicSelect;
    // Excludes CL (not a SELECT) and explain-with-run (its `queryId` ties it to an existing engine run).
    const serverQuery = !options.isCL && options.queryId === undefined;
    let sortState: { columnId: string; direction: "asc" | "desc" } | undefined;
    let searchQuery = ``;

    const dtOptions: DataTableOptions<any[]> = {
      title: baseSelect.replace(/\s+/g, ` `).trim(),
      columns: [],
      rows: [],
      search: serverQuery,
      streaming: true,
      serverQuery,
      cancellable: options.withCancel === true,
      updatable,
      resizable: true,
      collapsedInitialWidth: Configuration.get<boolean>(`collapsedResultSet`) ? `200px` : undefined,
      loadingText: options.isCL ? `Running CL command...` : `Running statement...`,
    };

    const post = (msg: any) => this._view?.webview.postMessage(msg);
    let columnsSent = false;

    /** Builds the SQL actually sent for the current sort/search state, wrapping `baseSelect` only when needed */
    const buildQueryText = (): { sql: string; params: SqlParameter[] } => {
      if (!sortState && !searchQuery) {
        return { sql: baseSelect, params: options.parameters ?? [] };
      }

      const params: SqlParameter[] = [...(options.parameters ?? [])];
      let sql = `SELECT * FROM (${baseSelect}) AS "DTQ"`;

      if (searchQuery && this.lastColumnMetaData) {
        const searchable = this.lastColumnMetaData.filter((c: any) => !SEARCH_EXCLUDED_TYPES.has(String(c.type).toUpperCase()));
        if (searchable.length > 0) {
          const likeText = `%${escapeLikeText(searchQuery)}%`;
          // Cast to CCSID 37
          const clauses = searchable.map((c: any) => {
            params.push(likeText);
            return `UPPER(CAST(${quoteIdent(c.name)} AS VARCHAR(1024) CCSID 37)) LIKE UPPER(CAST(? AS VARCHAR(1024) CCSID 37)) ESCAPE '\\'`;
          });
          sql += ` WHERE ${clauses.join(` OR `)}`;
        }
      }

      if (sortState) {
        const index = dtOptions.columns.findIndex(c => c.id === sortState!.columnId);
        if (index >= 0) {
          sql += ` ORDER BY ${index + 1} ${sortState.direction === `desc` ? `DESC` : `ASC`}`;
        }
      }

      return { sql, params };
    };

    /** Restart the stream from page 1 with the current sort/search state applied */
    const restartQuery = () => {
      this.queryEpoch++;
      this.currentQuery?.close();
      this.currentQuery = undefined;
      resetDataTableRows(post, dtOptions);
      post({ command: `requestFetch`, allRows: false });
    };

    const handlers: DataTableHandlers<any[]> = {
      onFetchMore: async ({ allRows, queryId }) => {
        const myEpoch = this.queryEpoch;

        if (this.currentQuery) {
          // If we get a request for a new query, then we need to close the old one
          if (this.currentQuery.getId() === undefined || this.currentQuery.getId() !== queryId) {
            // This is a new query, so we need to clean up the old one
            await this.currentQuery.close();
            this.currentQuery = undefined;
          }
        }

        // Default to current state, not false — a stale/no-op fetch (query already RUN_DONE)
        // must not disable Refresh/Clear on an already-loaded result set.
        const hasRows = dtOptions.rows.length > 0;
        let canClear = hasRows;
        let canRetrieveMoreRows = false;
        let canRefresh = hasRows;

        try {
          if (this.currentQuery === undefined) {
            const { sql, params } = buildQueryText();
            this.currentQuery = await JobManager.getPagingStatement(sql, { parameters: params, isClCommand: options.isCL, isTerseResults: true });
          }

          if (this.currentQuery.getState() !== "RUN_DONE") {
            setCancelButtonVisibility(true);
            let queryResults: QueryResult<any> | undefined = undefined;
            let executionTime: number | undefined;

            let rowsToFetch = Configuration.get<number>('resultsets.rowsToFetch') || 100;
            if (this.currentQuery.getState() == "RUN_MORE_DATA_AVAILABLE") {
              // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
              // int. This is the largest number available without overflow (Integer.MAX_VALUE)
              rowsToFetch = allRows === true ? 2147483647 : rowsToFetch;
              queryResults = await this.currentQuery.fetchMore(rowsToFetch);
            }
            else {
              const startTime = performance.now();
              queryResults = await this.currentQuery.execute(rowsToFetch);
              executionTime = performance.now() - startTime;

              if (options.uiId) {
                statementDone(options.uiId, { paramsOut: queryResults.output_parms });
              }
            }

            // A restart may have superseded this fetch while it was in flight — drop it.
            if (myEpoch !== this.queryEpoch) return;

            const jobId = this.currentQuery.getHostJob().id;

            let columns: DataTableColumn<any[]>[] | undefined;
            if (!columnsSent && queryResults.metadata) {
              columns = buildResultColumns(queryResults.metadata.columns, Configuration.get<string>(`resultsets.columnHeadings`) || 'Name');
              columnsSent = true;
              this.lastColumnMetaData = queryResults.metadata.columns;
              this.lastDataTableOptions = dtOptions;
            }

            appendDataTableRows(post, dtOptions, queryResults.data ?? [], {
              isDone: queryResults.is_done,
              queryId: this.currentQuery.getId(),
              columns,
              executionTimeMs: executionTime,
              jobId,
              updateCount: queryResults.update_count,
            });

            canClear = true;
            canRetrieveMoreRows = !queryResults.is_done;
            canRefresh = true;
          }

        } catch (e: any) {
          if (myEpoch === this.queryEpoch) this.setError(e.message);
        }

        setCancelButtonVisibility(false);
        updateStatusBar();
        if (myEpoch === this.queryEpoch) {
          commands.executeCommand(`setContext`, `vscode-db2i:canClear`, canClear);
          commands.executeCommand(`setContext`, `vscode-db2i:canRetrieveMoreRows`, canRetrieveMoreRows);
          commands.executeCommand(`setContext`, `vscode-db2i:canRefresh`, canRefresh);
        }
      },

      onCellUpdate: async ({ id, statement, bindings }) => {
        try {
          await JobManager.runSQL(statement, { parameters: bindings });
          const substatement = bindings.length
            ? `bind: ${bindings.map(binding => typeof binding === 'string' ? `'${binding}'` : String(binding)).join(', ')}`
            : undefined;
          commands.executeCommand(`vscode-db2i.queryHistory.prepend`, statement, substatement);
          postDataTableCellResponse(post, id, true);
        } catch (e: any) {
          postDataTableCellResponse(post, id, false);
          window.showWarningMessage(e.message);
        }
      },

      onCancel: () => { this.endQuery(); },

      onSortChange: async ({ columnId, direction }) => {
        if (!serverQuery || !this.lastColumnMetaData) return;
        sortState = { columnId, direction };
        restartQuery();
      },

      onSearchChange: async ({ query }) => {
        if (!serverQuery || !this.lastColumnMetaData) return;
        searchQuery = query.trim();
        restartQuery();
      },
    };

    this.messageRouter = message => handleDataTableMessage(message, dtOptions, handlers, post);

    if (this._view) {
      this._view.webview.html = renderDataTable(dtOptions);
      this._view.webview.postMessage({ command: `requestFetch`, allRows: false, queryId: options.queryId });
    }
  }

  /**
   * Show a data table listing (MTIs, locks, …) in this view instead of a result set. The
   * table's "move to editor" button reopens it as an editor tab and empties this view.
   *
   * @param viewType webview type used for the editor tab the table can be moved into
   */
  async showDataTable<T>(viewType: string, options: DataTableOptions<T>, handlers: DataTableHandlers<T> = {}): Promise<void> {
    const tableHandlers: DataTableHandlers<T> = {
      ...handlers,
      onOpenInEditor: state => {
        moveDataTableToEditor(viewType, options, handlers, state);
        this.clear();
      }
    };

    this.messageRouter = message =>
      handleDataTableMessage(message, options, tableHandlers, msg => this._view?.webview.postMessage(msg));

    // Whatever result set was shown here is gone as soon as the table is rendered
    this.endQuery();
    this.currentQuery = undefined;
    this.queryEpoch++;
    this.resetContext();
    this.loadingState = false;
    this.lastColumnMetaData = undefined;
    this.lastDataTableOptions = undefined;

    await this.ensureActivation();

    if (this._view) {
      this._view.webview.html = renderDataTable({ ...options, openInEditor: true });
    }
  }

  setError(error: string) {
    this.messageRouter = undefined;
    this.loadingState = false;
    this.lastColumnMetaData = undefined;
    this.lastDataTableOptions = undefined;
    // TODO: pretty error
    if (this._view) {
      this._view.webview.html = `<p>${error}</p>`;
    }
  }

  clear() {
    this.messageRouter = undefined;
    this.lastColumnMetaData = undefined;
    this.lastDataTableOptions = undefined;
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
