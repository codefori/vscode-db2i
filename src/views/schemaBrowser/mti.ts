import * as vscode from "vscode";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { DataTableColumn, DataTableHandlers, DataTableOptions } from "../html/dataTable";
import { showDataTable } from "../results";
import { createIndex, formatBytes, formatTimestamp, IndexCreation, listFooter, LoadStats, prettyColumnTitle, qualifiedTable, showCreateIndexStatement } from "./indexCreation";
import { getMTIStatement } from "./statements";

/** A row from `select * from table(qsys2.mti_info(...))`. Columns vary across IBM i releases (see `isSparse`), so only the fields actually used here are typed. */
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

export const MTI_ACTIONS = {
  createIndex: `mtiCreateIndex`,
  showStatement: `mtiShowStatement`,
};

const SPARSE_WARNING = `This MTI is sparse, but MTI_INFO did not report its condition. The statement below creates an index over every row of the table, not the sparse subset the MTI covers.`;

function indexTarget(mti: MTIInfo) {
  return { schema: mti.TABLE_SCHEMA, table: mti.TABLE_NAME };
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

export function buildCreateIndexStatement(mti: MTIInfo, indexName: string): string {
  const name = Statement.delimName(indexName, true);
  const condition = sparseCondition(mti);

  return [
    `CREATE INDEX ${Statement.delimName(mti.TABLE_SCHEMA)}.${name}`,
    `   ON ${qualifiedTable(indexTarget(mti))} (${mti.KEY_DEFINITION.trim()})`,
    ...(condition ? [`   WHERE ${condition}`] : []),
  ].join(`\n`);
}

function indexCreation(mti: MTIInfo): IndexCreation {
  return {
    target: indexTarget(mti),
    nameTag: `MTI`,
    buildStatement: indexName => buildCreateIndexStatement(mti, indexName),
    warning: sparseWarning(mti),
  };
}

/** MTI_INFO reports the state as VALID, POPULATING, etc */
function prettyState(state: string): string {
  const trimmed = state.trim();
  return trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
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

/** Internal SQE job identifiers, and native library/file names already shown via TABLE_SCHEMA/TABLE_NAME */
const HIDDEN_COLUMNS = new Set([`JOB_NAME`, `JOB_USER`, `JOB_NUMBER`, `LIBRARY_NAME`, `FILE_NAME`]);

/**
 * Fetch the MTIs for a schema (or a single table within it) and, if any are found, open a table
 * listing them with "Create Index..." and "Show Statement" actions on every row.
 *
 * @param onIndexCreated called once a "Create Index..." job is submitted, to refresh the caller's tree
 * @returns whether any MTI was found
 */
export async function pickMTIAction(schema: string, table?: string, onIndexCreated?: () => void): Promise<boolean> {
  const specificTable = table && table !== `*ALL` ? table : undefined;
  const target = schema === `*ALL`
    ? `all libraries`
    : specificTable
      ? `${Statement.delimName(schema)}.${Statement.delimName(specificTable)}`
      : Statement.delimName(schema);
  const sql = getMTIStatement(schema, table);
  const stats: LoadStats = { executionTimeMs: 0 };
  const load = async () => {
    const startTime = performance.now();
    const mtis = await JobManager.runSQL<MTIInfo>(sql);
    stats.executionTimeMs = performance.now() - startTime;
    stats.jobId = JobManager.getSelection()?.job.id;
    return mtis.filter(mti => mti.TABLE_SCHEMA && mti.TABLE_NAME && mti.KEY_DEFINITION);
  };
  let usable: MTIInfo[];

  try {
    usable = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Fetching MTIs for ${target}` },
      load
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
    return false;
  }

  if (usable.length === 0) {
    vscode.window.showInformationMessage(`No MTIs found for ${target}.`);
    return false;
  }

  openMTIWebview(target, usable, sql, load, stats, onIndexCreated);
  return true;
}

/** Show the MTI list in the "Db2 for i" result panel */
function openMTIWebview(target: string, mtis: MTIInfo[], sql: string, reload: () => Promise<MTIInfo[]>, stats: LoadStats, onIndexCreated?: () => void) {
  // Every row shares the same columns, so the first one is enough to know them all
  const columns: DataTableColumn<MTIInfo>[] = Object.keys(mtis[0])
    .filter(column => !HIDDEN_COLUMNS.has(column))
    .map(column => ({
      id: column,
      title: prettyColumnTitle(column),
      value: (mti: MTIInfo) => formatColumnValue(mti, column),
      align: [`MTI_SIZE`, `KEYS`].includes(column) ? `right` : `left`,
    }));

  const options: DataTableOptions<MTIInfo> = {
    title: `MTIs for ${target}`,
    subtitle: (shown, total) => listFooter({ one: `MTI`, many: `MTIs` }, shown, total, stats),
    columns,
    rows: mtis,
    searchPlaceholder: `Search MTIs…`,
    emptyMessage: `No MTIs match the search.`,
    actions: [
      { id: MTI_ACTIONS.createIndex },
      { id: MTI_ACTIONS.showStatement },
    ],
  };

  const handlers: DataTableHandlers<MTIInfo> = {
    onAction: async (actionId, mti) => {
      if (actionId === MTI_ACTIONS.createIndex) {
        if (await createIndex(indexCreation(mti))) {
          onIndexCreated?.();
        }
      } else if (actionId === MTI_ACTIONS.showStatement) {
        await showCreateIndexStatement(indexCreation(mti));
      }
    },
  };

  showDataTable(options, handlers, { sql, reload })
    .catch(e => vscode.window.showErrorMessage(`Could not show the MTI list: ${e?.message ?? e}`));
}
