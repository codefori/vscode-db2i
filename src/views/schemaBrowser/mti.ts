import * as vscode from "vscode";
import { FrontendTables } from "@halcyontech/vscode-ibmi-types/ui/frontendTables";
import { getBase } from "../../base";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { generatePage } from "../webviewToolkit";
import { getMTIStatement } from "./statements";

type FastTableColumn<T> = FrontendTables.FastTableColumn<T>;

/**
 * A row from `select * from table(qsys2.mti_info(...))`. The table function has grown columns
 * across IBM i releases (and this repo has already hit one that is missing on older ones - see
 * `isSparse` below), so the shape isn't pinned down further than the fields the logic below
 * actually reads. The table view renders whatever columns the connected system returns; see
 * `openMTIWebview`.
 */
interface MTIInfo {
  [column: string]: any;
  MTI_NAME: string;
  MTI_SIZE?: number;
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  KEY_DEFINITION: string;
  STATE?: string;
  SPARSE?: string;
  SPARSE_DEFINITION?: string;
}

const CREATE_INDEX = `Create Index`;
const SHOW_STATEMENT = `Show Statement`;

const SPARSE_WARNING = `This MTI is sparse, but MTI_INFO did not report its condition. The statement below creates an index over every row of the table, not the sparse subset the MTI covers.`;

function qualifiedTable(mti: MTIInfo): string {
  return `${Statement.delimName(mti.TABLE_SCHEMA)}.${Statement.delimName(mti.TABLE_NAME)}`;
}

/** MTI_INFO reports YES or NO, and the column is missing on releases that do not return it */
function isSparse(mti: MTIInfo): boolean {
  return mti.SPARSE?.trim().toUpperCase() === `YES`;
}

/** The condition a sparse MTI is built over, which becomes the WHERE clause of the index */
function sparseCondition(mti: MTIInfo): string | undefined {
  const condition = mti.SPARSE_DEFINITION?.trim();
  return isSparse(mti) && condition ? condition : undefined;
}

/** A sparse MTI whose condition is unknown can only be recreated as a full index */
function sparseWarning(mti: MTIInfo): string | undefined {
  return isSparse(mti) && !sparseCondition(mti) ? SPARSE_WARNING : undefined;
}

/** The key definition is already valid index key syntax, so it is used as-is */
export function buildCreateIndexStatement(mti: MTIInfo, indexName: string): string {
  const name = Statement.delimName(indexName, true);
  const condition = sparseCondition(mti);

  return [
    `CREATE INDEX ${Statement.delimName(mti.TABLE_SCHEMA)}.${name}`,
    `   ON ${qualifiedTable(mti)} (${mti.KEY_DEFINITION.trim()})`,
    ...(condition ? [`   WHERE ${condition}`] : []),
  ].join(`\n`);
}

const MAX_NAME_LENGTH = 128;

/** Every candidate ends with `_MTIxxxxx` whit zero padded five digit number */
const SUFFIX_LENGTH = 9;

function candidateName(prefix: string, suffix: number): string {
  return `${prefix}_MTI${String(suffix).padStart(5, `0`)}`;
}

async function suggestIndexName(mti: MTIInfo): Promise<string> {
  // Truncated so that the suffix fits, since a longer name is not a valid SQL name
  const prefix = Statement.noQuotes(mti.TABLE_NAME).slice(0, MAX_NAME_LENGTH - SUFFIX_LENGTH);
  let taken: string[] = [];

  try {
    const existing = await JobManager.runSQL<{ INDEX_NAME: string }>(
      `select INDEX_NAME from QSYS2.SYSINDEXES where INDEX_SCHEMA = ? and INDEX_NAME like ?`,
      { parameters: [mti.TABLE_SCHEMA, `${prefix}%`] }
    );
    taken = existing.map(row => row.INDEX_NAME);
  } catch (e) {
    // Only a suggestion, so fall back to the first candidate
  }

  let suffix = 1;
  while (taken.includes(candidateName(prefix, suffix))) {
    suffix += 1;
  }

  return candidateName(prefix, suffix);
}

const SUBMITTED_JOB_NAME = `C4ICRTIDX`;

/**
 * Creating an index over a large table can run for a long time, so it is submitted instead of
 * being run in the SQL job, where it would block the extension until it ends.
 */
function buildSubmitCommand(statement: string): string {
  const sql = statement.split(`\n`).map(line => line.trim()).join(` `).replace(/'/g, `''`);

  return `SBMJOB CMD(QSYS/RUNSQL SQL('${sql}') COMMIT(*NONE)) JOB(${SUBMITTED_JOB_NAME}) JOBQ(QSYS/QUSRNOMAX) LOG(4 0 *MSG)`;
}

/** @returns whether a job was submitted to create the index */
async function createIndex(mti: MTIInfo): Promise<boolean> {
  const indexName = await vscode.window.showInputBox({
    title: `Create index on ${qualifiedTable(mti)}`,
    prompt: `Name for the new index`,
    value: await suggestIndexName(mti),
    validateInput: (value) => {
      const name = value.trim();
      if (name.length === 0) return `Index name cannot be blank`;
      if (Statement.noQuotes(name).length > MAX_NAME_LENGTH) return `Index name cannot be longer than ${MAX_NAME_LENGTH} characters`;
      return undefined;
    }
  });

  if (!indexName) return false;

  const name = indexName.trim();
  const statement = buildCreateIndexStatement(mti, name);
  const warning = sparseWarning(mti);
  const confirmation = await vscode.window.showWarningMessage(
    `Submit a job to create an index over ${qualifiedTable(mti)}?`,
    { modal: true, detail: [warning, statement].filter(part => part).join(`\n\n`) },
    `Submit`
  );

  if (confirmation !== `Submit`) return false;

  try {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Submitting job to create index ${name}...` },
      () => JobManager.runSQL(buildSubmitCommand(statement), { isClCommand: true })
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
    return false;
  }

  vscode.commands.executeCommand(`vscode-db2i.queryHistory.prepend`, statement);
  vscode.window.showInformationMessage(`Job ${SUBMITTED_JOB_NAME} submitted to create index ${name} over ${qualifiedTable(mti)}. The index only appears once that job has ended.`);
  return true;
}

/** MTI_INFO reports the state as VALID, POPULATING, etc */
function prettyState(state: string): string {
  const trimmed = state.trim();
  return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
}

function formatBytes(bytes: number): string {
  const units = [`bytes`, `KB`, `MB`, `GB`, `TB`];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

/** Column names kept as-is (as opposed to title-cased) when turned into a header title */
const ACRONYMS = new Set([`MTI`, `SQL`, `ID`]);

/** e.g. `TABLE_PARTITION` -> `Table Partition`, `MTI_SIZE` -> `MTI Size` */
function prettyColumnTitle(column: string): string {
  return column.split(`_`)
    .map(word => ACRONYMS.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase())
    .join(` `);
}

/**
 * Same rendering as `TO_CHAR(column, 'yyyy-mm-dd HH24:mi')`, the format the vscode-ibmi-fs
 * views (WRKSPLF, WRKJOB, DSPOBJ, ...) apply to every timestamp column. That formatting happens
 * in the SQL there; here the column is untouched over the wire (this view selects `*`, since it
 * doesn't know the column list ahead of time - see the comment on MTIInfo), so it's done once
 * the raw value is in hand instead. Falls back to the raw value if it isn't parseable.
 */
function formatTimestamp(raw: string): string {
  // Db2 renders TIMESTAMP as `yyyy-mm-dd-HH.mm.ss.ffffff`; normalize to something Date can parse
  const isoLike = raw.replace(/^(\d{4}-\d{2}-\d{2})-(\d{2})\.(\d{2})\.(\d{2})/, `$1T$2:$3:$4`);
  const date = new Date(isoLike);

  if (isNaN(date.getTime())) return raw;

  // UTC getters: the raw value carries no time zone of its own, so reading it back with the
  // client's local time zone would silently shift it.
  const pad = (n: number) => String(n).padStart(2, `0`);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** A few columns are worth a friendlier rendering; every other one is shown as returned */
function formatColumnValue(mti: MTIInfo, column: string): string {
  const value = mti[column];
  if (value === null || value === undefined) return ``;

  switch (column) {
    case `MTI_SIZE`: return formatBytes(Number(value));
    case `SPARSE`: return isSparse(mti) ? `Yes` : `No`;
    case `STATE`: return prettyState(String(value));
    case `CREATE_TIME`:
    case `LAST_BUILD_START_TIME`:
    case `LAST_BUILD_END_TIME`:
      return formatTimestamp(String(value));
    default: return String(value);
  }
}

/**
 * Columns not worth a spot in the table: internal SQE job identifiers, and the native
 * (non-SQL) library/file names duplicating TABLE_SCHEMA/TABLE_NAME already shown.
 */
const HIDDEN_COLUMNS = new Set([`JOB_NAME`, `JOB_USER`, `JOB_NUMBER`, `LIBRARY_NAME`, `FILE_NAME`]);

/** Explicit id so the search handler can target the right table; see FastTableUpdateOptions.tableId. */
const MTI_TABLE_ID = `db2i-mtis`;

/**
 * Fetch the MTIs for a schema (or a single table within it) and, if any are found, open a
 * table listing them with a "Create Index..." and a "Show Statement" button on every row -
 * replacing what used to be two sequential QuickPicks (pick an MTI, then pick an action).
 *
 * @param schema a library name, or `*ALL` for every library (as accepted by MTI_INFO's
 * TABLE_SCHEMA parameter, the same way `table` already defaults to `*ALL` below)
 * @param onIndexCreated called once a "Create Index..." job is submitted from the table, so the
 * caller can refresh whatever tree triggered this (the index itself only appears once that job,
 * submitted asynchronously, has ended).
 * @returns whether the table was opened, i.e. whether any MTI was found
 */
export async function pickMTIAction(schema: string, table?: string, onIndexCreated?: () => void): Promise<boolean> {
  const target = schema === `*ALL`
    ? `all libraries`
    : table
      ? `${Statement.delimName(schema)}.${Statement.delimName(table)}`
      : Statement.delimName(schema);
  let mtis: MTIInfo[];

  try {
    mtis = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Fetching MTIs for ${target}` },
      () => JobManager.runSQL<MTIInfo>(getMTIStatement(schema, table))
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
    return false;
  }

  const usable = mtis.filter(mti => mti.TABLE_SCHEMA && mti.TABLE_NAME && mti.KEY_DEFINITION);

  if (usable.length === 0) {
    vscode.window.showInformationMessage(`No MTIs found for ${target}.`);
    return false;
  }

  openMTIWebview(target, usable, onIndexCreated);
  return true;
}

/**
 * Open the table listing `mtis`, with one column per column MTI_INFO returned (whatever that is
 * on the connected system) plus a "Create Index..." and a "Show Statement" button on every row.
 */
function openMTIWebview(target: string, mtis: MTIInfo[], onIndexCreated?: () => void) {
  const panel = vscode.window.createWebviewPanel(
    `db2iMtis`,
    `MTIs for ${target}`,
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  // The whole set is fetched once; a search only re-filters it in memory, so there is no need
  // to re-query MTI_INFO (and no pagination: schemas rarely carry enough MTIs to need it).
  let searchTerm = ``;

  // Every row of a single result set carries the same columns, so the first row is enough to
  // know them all - this is what makes the table show whatever MTI_INFO actually returned,
  // rather than a fixed guess at its shape (which differs across IBM i releases).
  const dataColumns: FastTableColumn<MTIInfo>[] = Object.keys(mtis[0])
    .filter(column => !HIDDEN_COLUMNS.has(column))
    .map(column => ({
      title: prettyColumnTitle(column),
      width: `1fr`,
      getValue: (mti: MTIInfo) => formatColumnValue(mti, column)
    }));

  const columns: FastTableColumn<MTIInfo>[] = [
    ...dataColumns,
    {
      title: `Actions`,
      width: `2fr`,
      getValue: (mti: MTIInfo) => {
        // Encode the MTI row as a URL parameter so the action handler below can recover it
        const arg = encodeURIComponent(JSON.stringify(mti));
        return `<vscode-button appearance="primary" href="action:createIndex?entry=${arg}">${CREATE_INDEX}</vscode-button>
                <vscode-button appearance="secondary" href="action:showStatement?entry=${arg}">${SHOW_STATEMENT}</vscode-button>`;
      }
    }
  ];

  const matches = (mti: MTIInfo, term: string) => {
    if (!term) return true;
    const haystack = `${qualifiedTable(mti)} ${mti.KEY_DEFINITION} ${mti.MTI_NAME}`.toUpperCase();
    return haystack.includes(term.toUpperCase());
  };

  const filtered = () => mtis.filter(mti => matches(mti, searchTerm));
  const subtitle = (shown: number) => `${shown} of ${mtis.length} MTI${mtis.length === 1 ? `` : `s`}`;

  const generateTableHtml = () => getBase().frontendTables.generateFastTable({
    title: `MTIs for ${target}`,
    subtitle: subtitle(mtis.length),
    columns,
    data: mtis,
    stickyHeader: true,
    emptyMessage: `No MTIs found.`,
    enableSearch: true,
    searchPlaceholder: `Search MTIs...`,
    tableId: MTI_TABLE_ID
  });

  panel.webview.html = generatePage(generateTableHtml());

  panel.webview.onDidReceiveMessage(async (message) => {
    // The search box re-filters the rows already fetched; see the comment on `searchTerm` above.
    if (message.command === `search`) {
      searchTerm = message.searchTerm ?? ``;
      const rows = filtered();

      await panel.webview.postMessage(getBase().frontendTables.generateFastTableUpdate({
        columns,
        data: rows,
        totalItems: rows.length,
        currentPage: 1,
        subtitle: subtitle(rows.length),
        tableId: MTI_TABLE_ID
      }));
      return;
    }

    // The message contains the href attribute from the clicked action button
    const href = message.href;
    if (!href) {
      return;
    }

    const uri = vscode.Uri.parse(href);
    const params = new URLSearchParams(uri.query);
    const entryJson = params.get(`entry`);
    if (!entryJson) {
      return;
    }

    const mti: MTIInfo = JSON.parse(decodeURIComponent(entryJson));

    switch (uri.path) {
      case `createIndex`:
        if (await createIndex(mti)) {
          onIndexCreated?.();
        }
        break;

      case `showStatement`: {
        const warning = sparseWarning(mti);
        const statement = `${buildCreateIndexStatement(mti, await suggestIndexName(mti))};`;
        const content = warning ? `-- ${warning}\n${statement}` : statement;
        const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content });
        await vscode.window.showTextDocument(textDoc);
        break;
      }
    }
  });
}
