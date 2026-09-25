import * as vscode from "vscode";
import { JobManager } from "../../../config";
import { DataTableColumn, DataTableHandlers, DataTableOptions } from "../../html/dataTable";
import { showDataTable, showDataTableError, showDataTableLoading } from "../../results";
import { formatTimestamp, listFooter, LoadStats, prettyColumnTitle } from "../../schemaBrowser/indexCreation";

/** A row from `QSYS2.SQL_ERROR_LOG` */
interface SqlErrorLogEntry {
  [column: string]: any;
  STATEMENT_TEXT?: string;
  STMTTEXT?: string;
}

export const SQL_ERROR_LOG_ACTIONS = {
  openStatement: `sqlErrorLogOpenStatement`,
};

const SQL_ERROR_LOG_STATEMENT = `select * from QSYS2.SQL_ERROR_LOG order by LOGGED_TIME desc`;

function statementText(entry: SqlErrorLogEntry): string | undefined {
  return (entry.STATEMENT_TEXT ?? entry.STMTTEXT)?.trim() || undefined;
}

const STATEMENT_COLUMNS = new Set([`STATEMENT_TEXT`, `STMTTEXT`]);

const TIMESTAMP_COLUMNS = new Set([`LOGGED_TIME`, `INITIAL_LOGGED_TIME`]);

function formatColumnValue(entry: SqlErrorLogEntry, column: string): string | number {
  const value = entry[column];
  if (value === null || value === undefined) return ``;

  // On one line, so a long statement doesn't stretch its row
  if (STATEMENT_COLUMNS.has(column)) return String(value).replace(/\s+/g, ` `).trim();
  if (TIMESTAMP_COLUMNS.has(column)) return formatTimestamp(String(value));
  return typeof value === `number` ? value : String(value);
}

const LEADING_COLUMNS = [`LOGGED_TIME`, `LOGGED_SQLCODE`, `LOGGED_SQLSTATE`, `NUMBER_OCCURRENCES`, `MATCHES`, `STATEMENT_TEXT`, `STMTTEXT`, `PROGRAM_LIBRARY`, `PROGRAM_NAME`, `JOB_NAME`, `USER_NAME`];

const HIDDEN_COLUMNS = new Set([`INITIAL_STACK`]);

function sqlErrorLogColumns(entries: SqlErrorLogEntry[]): DataTableColumn<SqlErrorLogEntry>[] {
  const first = entries[0];
  if (!first) return [];

  const available = Object.keys(first).filter(column => !HIDDEN_COLUMNS.has(column));
  const ordered = [
    ...LEADING_COLUMNS.filter(column => available.includes(column)),
    ...available.filter(column => !LEADING_COLUMNS.includes(column)),
  ];

  return ordered.map(column => ({
    id: column,
    title: prettyColumnTitle(column),
    value: (entry: SqlErrorLogEntry) => formatColumnValue(entry, column),
    align: typeof first[column] === `number` ? `right` : `left`,
  }));
}

async function openStatement(entry: SqlErrorLogEntry): Promise<void> {
  const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content: statementText(entry) });
  await vscode.window.showTextDocument(textDoc);
}

/** SELF entries of every job; a double click opens the statement */
export async function showSqlErrorLog(): Promise<void> {
  const sql = SQL_ERROR_LOG_STATEMENT;
  const stats: LoadStats = { executionTimeMs: 0 };
  const load = async () => {
    const startTime = performance.now();
    const entries = await JobManager.runSQL<SqlErrorLogEntry>(sql);
    stats.executionTimeMs = performance.now() - startTime;
    stats.jobId = JobManager.getSelection()?.job.id;
    return entries;
  };
  let entries: SqlErrorLogEntry[];

  try {
    await showDataTableLoading(`Fetching the SQL error log...`);
    entries = await load();
  } catch (e: any) {
    showDataTableError(e.message);
    return;
  }

  const options: DataTableOptions<SqlErrorLogEntry> = {
    title: `SQL error log`,
    subtitle: (shown, total) => listFooter({ one: `logged error`, many: `logged errors` }, shown, total, stats),
    columns: sqlErrorLogColumns(entries),
    rows: entries,
    searchPlaceholder: `Search logged errors…`,
    emptyMessage: `No logged errors match the search.`,
    noRowsMessage: `No errors were logged by SELF.`,
    actions: [
      { id: SQL_ERROR_LOG_ACTIONS.openStatement, primary: true, when: entry => statementText(entry) !== undefined },
    ],
  };

  const handlers: DataTableHandlers<SqlErrorLogEntry> = {
    onAction: async (actionId, entry) => {
      if (actionId === SQL_ERROR_LOG_ACTIONS.openStatement) {
        await openStatement(entry);
      }
    },
  };

  showDataTable(options, handlers, { sql, reload: load, columns: sqlErrorLogColumns })
    .catch(e => vscode.window.showErrorMessage(`Could not show the SQL error log: ${e?.message ?? e}`));
}
