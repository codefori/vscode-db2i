import { CancellationToken, ProgressLocation, WebviewPanel, WebviewView, WebviewViewProvider, WebviewViewResolveContext, commands, env, window } from "vscode";

import { QueryResult } from "@ibm/mapepire-js";
import { Query } from "@ibm/mapepire-js/dist/src/query";
import { openResultSetPanel, setCancelButtonVisibility } from ".";
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
  postDataTableCellResponse,
  registerDataTable,
  renderDataTable,
  requestDataTableOpenInEditor,
  resetDataTableRows,
  setDataTableQueryModification,
  updateDataTableColumns,
  updateDataTableRows,
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
  title?: string;
}

/** Toolbar actions of a data table listing */
export interface DataTableExtras<T> {
  sql?: string;
  reload?: () => Promise<T[]>;
}

export type ResultSetHost = `view` | `panel`;

interface ContextFlags {
  canClear: boolean;
  canRetrieveMoreRows: boolean;
  canRefresh: boolean;
  canCopySql: boolean;
  canMoveToEditor: boolean;
}

const NO_FLAGS: ContextFlags = { canClear: false, canRetrieveMoreRows: false, canRefresh: false, canCopySql: false, canMoveToEditor: false };

/** Editor tabs have their own keys, driven by the active tab */
const CONTEXT_KEYS: Record<ResultSetHost, Record<keyof ContextFlags, string>> = {
  view: {
    canClear: `vscode-db2i:canClear`,
    canRetrieveMoreRows: `vscode-db2i:canRetrieveMoreRows`,
    canRefresh: `vscode-db2i:canRefresh`,
    canCopySql: `vscode-db2i:canCopySql`,
    canMoveToEditor: `vscode-db2i:canMoveToEditor`,
  },
  panel: {
    canClear: `vscode-db2i:panelCanClear`,
    canRetrieveMoreRows: `vscode-db2i:panelCanRetrieveMoreRows`,
    canRefresh: `vscode-db2i:panelCanRefresh`,
    canCopySql: `vscode-db2i:panelCanCopySql`,
    canMoveToEditor: `vscode-db2i:panelCanMoveToEditor`,
  },
};

/** State of the shown result set, carried as is when it moves into an editor tab */
interface ResultSetSession {
  options: ScrollerOptions;
  /** Statement run before sort/search wrapping (with RRN when updatable) */
  baseSelect: string;
  updatable?: UpdatableInfo;
  serverQuery: boolean;
  sort?: { columnId: string; direction: "asc" | "desc" };
  search: string;
  dtOptions: DataTableOptions<any[]>;
  columnMetaData?: any[];
  isDone: boolean;
  executionTimeMs?: number;
  jobId?: string;
}

interface DataTableSession {
  title: string;
  options: DataTableOptions<any>;
  handlers: DataTableHandlers<any>;
  extras: DataTableExtras<any>;
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

/** SQL sent for the session's sort/search state */
function buildQueryText(session: ResultSetSession): { sql: string; params: SqlParameter[] } {
  const baseParams = session.options.parameters ?? [];
  if (!session.sort && !session.search) {
    return { sql: session.baseSelect, params: baseParams };
  }

  const params: SqlParameter[] = [...baseParams];
  let sql = `SELECT * FROM (${session.baseSelect}) AS "DTQ"`;

  if (session.search && session.columnMetaData) {
    const searchable = session.columnMetaData.filter((c: any) => !SEARCH_EXCLUDED_TYPES.has(String(c.type).toUpperCase()));
    if (searchable.length > 0) {
      const likeText = `%${escapeLikeText(session.search)}%`;
      // Cast to CCSID 37
      const clauses = searchable.map((c: any) => {
        params.push(likeText);
        return `UPPER(CAST(${quoteIdent(c.name)} AS VARCHAR(1024) CCSID 37)) LIKE UPPER(CAST(? AS VARCHAR(1024) CCSID 37)) ESCAPE '\\'`;
      });
      sql += ` WHERE ${clauses.join(` OR `)}`;
    }
  }

  if (session.sort) {
    const index = session.dtOptions.columns.findIndex(c => c.id === session.sort!.columnId);
    if (index >= 0) {
      sql += ` ORDER BY ${index + 1} ${session.sort.direction === `desc` ? `DESC` : `ASC`}`;
    }
  }

  return { sql, params };
}

function describeModification(session: ResultSetSession, sql: string): string | undefined {
  if (!session.sort && !session.search) return undefined;

  const lines: string[] = [];
  if (session.search) {
    lines.push(`Filtered: rows with "${session.search}" in any column`);
  }
  if (session.sort) {
    lines.push(`Sorted: by ${session.sort.columnId} ${session.sort.direction === `desc` ? `descending` : `ascending`}`);
  }
  lines.push(``, `Statement run:`, sql);
  return lines.join(`\n`);
}

export class ResultSetPanelProvider implements WebviewViewProvider {
  _view: WebviewView | WebviewPanel | undefined;
  loadingState: boolean = false;
  currentQuery: Query<any> | undefined;
  lastScrollerOptions: ScrollerOptions | undefined;
  /** Only the active provider drives the context keys */
  active = true;
  private flags: ContextFlags = { ...NO_FLAGS };
  /** Routes the webview's messages while it shows a data table instead of the idle placeholder */
  private messageRouter: ((message: any) => Promise<boolean> | void) | undefined;
  private tableRegistration: { dispose(): void } | undefined;
  private session: ResultSetSession | undefined;
  private tableSession: DataTableSession | undefined;
  private fetchingEpoch: number | undefined;
  /** Bumped on every restart so a superseded in-flight fetch can drop its stale result */
  private queryEpoch = 0;

  constructor(readonly host: ResultSetHost = `view`) { }

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
    if (this.tableSession) {
      await this.reloadDataTable(this.tableSession);
    } else if (this.lastScrollerOptions) {
      // Close the current query if it exists
      if (this.currentQuery) {
        await this.currentQuery.close();
        this.currentQuery = undefined;
      }
      // Re-run the query with the same options
      await this.setScrolling(this.lastScrollerOptions);
    }
  }

  async copySql() {
    const sql = this.tableSession?.extras.sql ?? this.session?.options.basicSelect;
    if (sql) {
      await env.clipboard.writeText(sql);
      window.setStatusBarMessage(`SQL statement copied to clipboard`, 3000);
    }
  }

  moveToEditor() {
    if (this._view && this.host === `view`) {
      requestDataTableOpenInEditor(msg => this._view?.webview.postMessage(msg));
    }
  }

  resolveWebviewView(webviewView: WebviewView | WebviewPanel, context?: WebviewViewResolveContext, _token?: CancellationToken) {
    this._view = webviewView;

    this._view.onDidDispose(() => {
      this._view = undefined;
      this.setRouter(undefined);
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
    this.setRouter(undefined);
    this.setFlags({ canCopySql: false, canMoveToEditor: false });

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
    const session = this.session;
    if (this._view && session?.columnMetaData) {
      const columns = buildResultColumns(session.columnMetaData, Configuration.get<string>(`resultsets.columnHeadings`) || 'Name');
      updateDataTableColumns(msg => this._view?.webview.postMessage(msg), session.dtOptions, columns);
    }
  }

  async setScrolling(options: ScrollerOptions) {
    this.setRouter(undefined);
    this.queryEpoch++;
    this.lastScrollerOptions = { ...options };

    this.loadingState = false;
    await this.focus();

    let basicSelect = options.basicSelect;
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
                const selectClauseStart = basicSelect.toLowerCase().indexOf(`select `);
                const fromClauseStart = basicSelect.toLowerCase().indexOf(`from`);
                let possibleColumnList: string | undefined;

                possibleColumnList = `${cName}.*`;
                if (fromClauseStart > 0) {
                  possibleColumnList = basicSelect.substring(0, fromClauseStart);
                  if (selectClauseStart >= 0) {
                    possibleColumnList = possibleColumnList.substring(selectClauseStart + 7);

                    if (possibleColumnList.trim() === `*`) {
                      possibleColumnList = `${cName}.*`;
                    }
                  }
                }

                // We need to override the input statement if they want to do updatable
                const whereClauseStart = basicSelect.toLowerCase().indexOf(`where`);
                let fromWhereClause: string | undefined;

                if (whereClauseStart > 0) {
                  fromWhereClause = basicSelect.substring(whereClauseStart);
                }

                basicSelect = `select rrn(${cName}) as RRN, ${possibleColumnList} from ${schema}.${options.ref.object.name} as ${cName} ${fromWhereClause || ``}`;
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

    this.startSession({
      options: this.lastScrollerOptions,
      baseSelect: basicSelect,
      updatable,
      // Excludes CL (not a SELECT) and explain-with-run (its `queryId` ties it to an existing engine run).
      serverQuery: !options.isCL && options.queryId === undefined,
      search: ``,
      dtOptions: { columns: [], rows: [] },
      isDone: false,
    });
  }

  /** Shows a result set moved from another provider, continuing its open query without re-running it */
  adoptResultSet(session: ResultSetSession, query: Query<any> | undefined) {
    this.lastScrollerOptions = { ...session.options };
    this.loadingState = false;
    this.startSession(session, query);
  }

  private startSession(from: ResultSetSession, carriedQuery?: Query<any>) {
    const carried = carriedQuery !== undefined;
    const carriedRows = carried ? from.dtOptions.rows : [];
    const inEditor = this.host === `panel`;

    const session: ResultSetSession = {
      ...from,
      dtOptions: {
        title: from.options.basicSelect.replace(/\s+/g, ` `).trim(),
        columns: carried ? from.dtOptions.columns : [],
        rows: [],
        search: from.serverQuery,
        initialQuery: from.search,
        emptyMessage: `No rows match the search.`,
        sort: from.sort,
        streaming: true,
        serverQuery: from.serverQuery,
        cancellable: from.options.withCancel === true || inEditor,
        updatable: from.updatable,
        resizable: true,
        collapsedInitialWidth: Configuration.get<boolean>(`collapsedResultSet`) ? `200px` : undefined,
        loadingText: from.options.isCL ? `Running CL command...` : `Running statement...`,
      },
    };
    const dtOptions = session.dtOptions;
    const options = session.options;

    this.currentQuery = carriedQuery;
    if (carried) this.queryEpoch++;

    const post = (msg: any) => this._view?.webview.postMessage(msg);
    let columnsSent = dtOptions.columns.length > 0;

    /** Restart the stream from page 1 with the current sort/search state applied */
    const restartQuery = () => {
      this.queryEpoch++;
      this.currentQuery?.close();
      this.currentQuery = undefined;
      session.isDone = false;
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

        this.fetchingEpoch = myEpoch;
        try {
          let query = this.currentQuery;
          if (query === undefined) {
            const { sql, params } = buildQueryText(session);
            const prepared = await JobManager.getPagingStatement(sql, { parameters: params, isClCommand: options.isCL, isTerseResults: true });
            // Superseded by a restart while preparing
            if (myEpoch !== this.queryEpoch) {
              prepared.close();
              return;
            }
            query = this.currentQuery = prepared;
            if (session.serverQuery) {
              setDataTableQueryModification(post, describeModification(session, sql));
            }
          }

          if (query.getState() !== "RUN_DONE") {
            setCancelButtonVisibility(true);
            let queryResults: QueryResult<any> | undefined = undefined;
            let executionTime: number | undefined;

            let rowsToFetch = Configuration.get<number>('resultsets.rowsToFetch') || 100;
            if (query.getState() == "RUN_MORE_DATA_AVAILABLE") {
              // 2147483647 is NOT arbitrary. On the server side, this is processed as a Java
              // int. This is the largest number available without overflow (Integer.MAX_VALUE)
              rowsToFetch = allRows === true ? 2147483647 : rowsToFetch;
              queryResults = await query.fetchMore(rowsToFetch);
            }
            else {
              const startTime = performance.now();
              queryResults = await query.execute(rowsToFetch);
              executionTime = performance.now() - startTime;
              session.executionTimeMs = executionTime;

              if (options.uiId) {
                statementDone(options.uiId, { paramsOut: queryResults.output_parms });
              }
            }

            // A restart may have superseded this fetch while it was in flight — drop it.
            if (myEpoch !== this.queryEpoch) return;

            const jobId = query.getHostJob().id;

            let columns: DataTableColumn<any[]>[] | undefined;
            if (!columnsSent && queryResults.metadata) {
              columns = buildResultColumns(queryResults.metadata.columns, Configuration.get<string>(`resultsets.columnHeadings`) || 'Name');
              columnsSent = true;
              session.columnMetaData = queryResults.metadata.columns;
            }

            appendDataTableRows(post, dtOptions, queryResults.data ?? [], {
              isDone: queryResults.is_done,
              queryId: query.getId(),
              columns,
              executionTimeMs: executionTime,
              jobId,
              updateCount: queryResults.update_count,
            });
            session.isDone = queryResults.is_done;
            session.jobId = jobId;

            canClear = true;
            canRetrieveMoreRows = !queryResults.is_done;
            canRefresh = true;
          }

        } catch (e: any) {
          if (myEpoch === this.queryEpoch) this.setError(e.message);
        } finally {
          if (this.fetchingEpoch === myEpoch) this.fetchingEpoch = undefined;
          // Also on a superseded fetch's early return, unless a newer fetch now owns the button
          if (this.fetchingEpoch === undefined) setCancelButtonVisibility(false);
          updateStatusBar();
        }

        if (myEpoch === this.queryEpoch && this.session === session) {
          this.setFlags({
            canClear,
            canRetrieveMoreRows,
            canRefresh,
            canCopySql: true,
            canMoveToEditor: this.host === `view` && dtOptions.rows.length > 0,
          });
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
        if (!session.serverQuery || !session.columnMetaData) return;
        session.sort = { columnId, direction };
        restartQuery();
      },

      onSearchChange: async ({ query }) => {
        if (!session.serverQuery || !session.columnMetaData) return;
        session.search = query.trim();
        restartQuery();
      },

      onOpenInEditor: () => this.moveResultSetToEditor(session),
    };

    this.setRouter(message => handleDataTableMessage(message, dtOptions, handlers, post));
    this.session = session;

    if (this._view) {
      this._view.webview.html = renderDataTable(dtOptions);

      if (carried) {
        appendDataTableRows(post, dtOptions, carriedRows, {
          isDone: session.isDone,
          queryId: carriedQuery?.getId(),
          executionTimeMs: session.executionTimeMs,
          jobId: session.jobId,
        });
        if (session.serverQuery) {
          setDataTableQueryModification(post, describeModification(session, buildQueryText(session).sql));
        }
        this.setFlags({
          canClear: true,
          canRetrieveMoreRows: !session.isDone,
          canRefresh: true,
          canCopySql: true,
          canMoveToEditor: false,
        });
      } else {
        this._view.webview.postMessage({ command: `requestFetch`, allRows: false, queryId: options.queryId });
      }
    }
  }

  private moveResultSetToEditor(session: ResultSetSession) {
    if (this.session !== session || this.host !== `view`) return;

    if (this.fetchingEpoch === this.queryEpoch) {
      window.showInformationMessage(`Rows are still being fetched. Try again once they are shown.`);
      return;
    }

    // The editor tab owns the query from now on
    const query = this.currentQuery;
    this.currentQuery = undefined;
    this.session = undefined;
    this.queryEpoch++;

    const target = openResultSetPanel(session.options.title || `SQL Results`);
    target.adoptResultSet(session, query);

    this.clear();
  }

  /**
   * Show a data table listing (MTIs, locks, …) instead of a result set. In the view, the
   * "Move into Editor" action reopens it as an editor tab and empties the view.
   */
  async showDataTable<T>(options: DataTableOptions<T>, handlers: DataTableHandlers<T> = {}, extras: DataTableExtras<T> = {}): Promise<void> {
    const title = options.title ?? `Results`;
    const tableSession: DataTableSession = { title, options, handlers, extras };

    const tableHandlers: DataTableHandlers<T> = {
      ...handlers,
      onOpenInEditor: state => {
        if (this.host !== `view` || this.tableSession !== tableSession) return;

        const target = openResultSetPanel(title);
        target.showDataTable({ ...options, initialQuery: state.query, sort: state.sort ?? options.sort }, handlers, extras);
        this.clear();
      }
    };

    // Whatever result set was shown here is gone as soon as the table is rendered
    this.endQuery();
    this.currentQuery = undefined;
    this.queryEpoch++;
    this.loadingState = false;
    this.lastScrollerOptions = undefined;

    const registration = registerDataTable(options, handlers);
    this.setRouter(
      message => handleDataTableMessage(message, options, tableHandlers, msg => this._view?.webview.postMessage(msg)),
      registration,
    );
    this.tableSession = tableSession;

    this.setFlags({
      canClear: true,
      canRetrieveMoreRows: false,
      canRefresh: extras.reload !== undefined,
      canCopySql: extras.sql !== undefined,
      canMoveToEditor: this.host === `view`,
    });

    if (this.host === `view`) {
      await this.ensureActivation();
    }

    if (this._view) {
      this._view.webview.html = renderDataTable(options, registration.id);
    }
  }

  private async reloadDataTable(tableSession: DataTableSession) {
    const reload = tableSession.extras.reload;
    if (!reload) return;

    try {
      const rows = await window.withProgress(
        { location: ProgressLocation.Window, title: `Refreshing ${tableSession.title}` },
        () => reload()
      );
      if (this.tableSession === tableSession) {
        updateDataTableRows(msg => this._view?.webview.postMessage(msg), tableSession.options, rows);
      }
    } catch (e: any) {
      window.showErrorMessage(e.message);
    }
  }

  setError(error: string) {
    this.setRouter(undefined);
    this.loadingState = false;
    this.setFlags({ canCopySql: false, canMoveToEditor: false });
    // TODO: pretty error
    if (this._view) {
      this._view.webview.html = `<p>${error}</p>`;
    }
  }

  clear() {
    this.setRouter(undefined);
    if (this._view) {
      this._view.webview.html = ``;
    }
    this.resetContext();
  }

  resetContext() {
    this.setFlags(NO_FLAGS);
  }

  applyContext() {
    if (!this.active) return;
    const keys = CONTEXT_KEYS[this.host];
    for (const flag of Object.keys(keys) as (keyof ContextFlags)[]) {
      commands.executeCommand(`setContext`, keys[flag], this.flags[flag]);
    }
  }

  private setFlags(flags: Partial<ContextFlags>) {
    Object.assign(this.flags, flags);
    this.applyContext();
  }

  private setRouter(router: ((message: any) => Promise<boolean> | void) | undefined, registration?: { dispose(): void }) {
    this.messageRouter = router;
    this.tableRegistration?.dispose();
    this.tableRegistration = registration;
    this.session = undefined;
    this.tableSession = undefined;
  }
}

function delay(t: number, v?: number) {
  return new Promise(resolve => setTimeout(resolve, t, v));
}
