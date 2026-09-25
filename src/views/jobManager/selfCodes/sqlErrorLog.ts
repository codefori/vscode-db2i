import * as vscode from "vscode";
import { getInstance } from "../../../base";
import { JobManager } from "../../../config";
import Statement from "../../../database/statement";
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

type SelfLogScope =
  | { kind: `job`, job: string }
  | { kind: `user`, user: string }
  | { kind: `all` };

function scopeTarget(scope: SelfLogScope): string {
  switch (scope.kind) {
    case `job`: return scope.job;
    case `user`: return `user ${scope.user}`;
    case `all`: return `all jobs`;
  }
}

function sqlErrorLogStatement(scope: SelfLogScope): string {
  const literal = (value: string) => `'${Statement.escapeString(value)}'`;
  const condition = scope.kind === `job` ? `where JOB_NAME = ${literal(scope.job)}`
    : scope.kind === `user` ? `where USER_NAME = ${literal(scope.user)}`
    : ``;

  return [`select * from QSYS2.SQL_ERROR_LOG`, condition, `order by LOGGED_TIME desc`].filter(part => part).join(` `);
}

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

const TITLE = `View Other SELF Logs`;

const QUALIFIED_JOB_NAME = /^\d{6}\/[^\/\s]{1,10}\/[^\/\s]{1,10}$/;

type ScopeChoice = vscode.QuickPickItem & { scope?: SelfLogScope[`kind`], job?: string };

async function pickScope(): Promise<SelfLogScope | undefined> {
  const selected = JobManager.getSelection();
  // As the SQL Job Manager lists them, with the current job first so that it starts highlighted
  const sqlJobs = JobManager.getRunningJobs()
    .filter(info => info.job.id)
    .sort((a, b) => Number(b === selected) - Number(a === selected))
    .map((info): ScopeChoice => ({
      job: info.job.id,
      label: `$(${info === selected ? `layers-active` : `layers`}) ${info.name}`,
      description: info === selected ? `${info.job.id} · current` : info.job.id,
    }));
  const choices: ScopeChoice[] = [
    ...(sqlJobs.length ? [{ label: `SQL Jobs`, kind: vscode.QuickPickItemKind.Separator }, ...sqlJobs] : []),
    { label: `Other`, kind: vscode.QuickPickItemKind.Separator },
    { scope: `job`, label: `$(briefcase) Job`, description: `SELF logs of any job, by its qualified name` },
    { scope: `user`, label: `$(account) User`, description: `SELF logs of every job run by a user` },
    { scope: `all`, label: `$(globe) All Jobs`, description: `SELF logs of every job` },
  ];
  const choice = await vscode.window.showQuickPick(choices, { title: TITLE, placeHolder: `Which SELF logs to view` });

  if (choice?.job) return { kind: `job`, job: choice.job };

  switch (choice?.scope) {
    case `job`: {
      const job = await vscode.window.showInputBox({
        title: TITLE,
        prompt: `Qualified job name`,
        placeHolder: JobManager.getSelection()?.job.id ?? `123456/QUSER/QZDASOINIT`,
        validateInput: value => QUALIFIED_JOB_NAME.test(value.trim()) ? undefined : `Enter the job as number/user/name`,
      });
      return job ? { kind: `job`, job: job.trim().toUpperCase() } : undefined;
    }
    case `user`: {
      const user = await vscode.window.showInputBox({
        title: TITLE,
        prompt: `User profile`,
        value: getInstance()?.getConnection()?.currentUser?.toUpperCase(),
        validateInput: value => /^[^\s]{1,10}$/.test(value.trim()) ? undefined : `Enter a user profile of up to 10 characters`,
      });
      return user ? { kind: `user`, user: user.trim().toUpperCase() } : undefined;
    }
    case `all`: return { kind: `all` };
    default: return undefined;
  }
}

/** A double click on an entry opens its statement */
export async function viewOtherSelfLogs(): Promise<void> {
  const scope = await pickScope();
  if (!scope) return;

  const target = scopeTarget(scope);
  const sql = sqlErrorLogStatement(scope);
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
    await showDataTableLoading(`Fetching the SQL error log for ${target}...`);
    entries = await load();
  } catch (e: any) {
    showDataTableError(e.message);
    return;
  }

  const options: DataTableOptions<SqlErrorLogEntry> = {
    title: `SQL Error Log for ${target}`,
    subtitle: (shown, total) => listFooter({ one: `logged error`, many: `logged errors` }, shown, total, stats),
    columns: sqlErrorLogColumns(entries),
    rows: entries,
    searchPlaceholder: `Search logged errors…`,
    emptyMessage: `No logged errors match the search.`,
    noRowsMessage: `No errors were logged by SELF for ${target}.`,
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
