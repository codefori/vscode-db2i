import * as vscode from "vscode";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { DataTableColumn, DataTableHandlers, DataTableOptions } from "../html/dataTable";
import { showDataTable } from "../results";
import { createIndex, formatTimestamp, IndexCreation, IndexTarget, listFooter, LoadStats, prettyColumnTitle, qualifiedTable, showCreateIndexStatement } from "./indexCreation";
import { getAdvisedIndexesStatement } from "./statements";

/** A row from `qsys2.condidxa` */
interface AdvisedIndex {
  [column: string]: any;
  KEY_COLUMNS_ADVISED: string;
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  INDEX_TYPE?: string;
  NLSS_TABLE_SCHEMA?: string;
  NLSS_TABLE_NAME?: string;
}

export const ADVISED_INDEX_ACTIONS = {
  createIndex: `advisedCreateIndex`,
  showStatement: `advisedShowStatement`,
};

function indexTarget(advice: AdvisedIndex): IndexTarget {
  return { schema: advice.TABLE_SCHEMA, table: advice.TABLE_NAME };
}

function isEncodedVector(advice: AdvisedIndex): boolean {
  return advice.INDEX_TYPE?.trim().toUpperCase().startsWith(`E`) === true;
}

function sortSequence(advice: AdvisedIndex): string | undefined {
  const table = advice.NLSS_TABLE_NAME?.trim();
  if (!table || table === `*HEX` || table === `*N`) return undefined;

  const schema = advice.NLSS_TABLE_SCHEMA?.trim();
  return schema && schema !== `*N` ? `${schema}/${table}` : table;
}

function sortSequenceWarning(advice: AdvisedIndex): string | undefined {
  const sequence = sortSequence(advice);
  return sequence
    ? `This index was advised for queries running with sort sequence ${sequence}. The statement below creates it with the default sort sequence, which those queries may not use.`
    : undefined;
}

export function buildCreateIndexStatement(advice: AdvisedIndex, indexName: string): string {
  const name = Statement.delimName(indexName, true);

  return [
    `CREATE ${isEncodedVector(advice) ? `ENCODED VECTOR ` : ``}INDEX ${Statement.delimName(advice.TABLE_SCHEMA)}.${name}`,
    `   ON ${qualifiedTable(indexTarget(advice))} (${advice.KEY_COLUMNS_ADVISED.trim()})`,
  ].join(`\n`);
}

function indexCreation(advice: AdvisedIndex): IndexCreation {
  return {
    target: indexTarget(advice),
    nameTag: `IDX`,
    buildStatement: indexName => buildCreateIndexStatement(advice, indexName),
    warning: sortSequenceWarning(advice),
  };
}

const TIMESTAMP_COLUMNS = new Set([`LAST_ADVISED`, `LAST_MTI_USED`, `LAST_MTI_USED_FOR_STATS`]);

function formatColumnValue(advice: AdvisedIndex, column: string): string | number {
  const value = advice[column];
  if (value === null || value === undefined) return ``;

  if (TIMESTAMP_COLUMNS.has(column)) return formatTimestamp(String(value));
  return typeof value === `number` ? value : String(value);
}

const LEADING_COLUMNS = [`TABLE_NAME`, `KEY_COLUMNS_ADVISED`, `INDEX_TYPE`];

const HIDDEN_COLUMNS = new Set([`SYSTEM_TABLE_SCHEMA`, `SYSTEM_TABLE_NAME`]);

/** @returns whether any advised index was found */
export async function pickAdvisedIndexAction(schema: string, table?: string, onIndexCreated?: () => void): Promise<boolean> {
  const specificTable = table && table !== `*ALL` ? table : undefined;
  const target = schema === `*ALL`
    ? `all libraries`
    : specificTable
      ? `${Statement.delimName(schema)}.${Statement.delimName(specificTable)}`
      : Statement.delimName(schema);
  const sql = getAdvisedIndexesStatement(schema, table);
  const stats: LoadStats = { executionTimeMs: 0 };
  const load = async () => {
    const startTime = performance.now();
    const advised = await JobManager.runSQL<AdvisedIndex>(sql);
    stats.executionTimeMs = performance.now() - startTime;
    stats.jobId = JobManager.getSelection()?.job.id;
    return advised.filter(advice => advice.TABLE_SCHEMA && advice.TABLE_NAME && advice.KEY_COLUMNS_ADVISED);
  };
  let usable: AdvisedIndex[];

  try {
    usable = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: `Fetching advised indexes for ${target}` },
      load
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
    return false;
  }

  if (usable.length === 0) {
    vscode.window.showInformationMessage(`No advised indexes found for ${target}.`);
    return false;
  }

  openAdvisedIndexesWebview(target, usable, sql, load, stats, onIndexCreated);
  return true;
}

function openAdvisedIndexesWebview(target: string, advised: AdvisedIndex[], sql: string, reload: () => Promise<AdvisedIndex[]>, stats: LoadStats, onIndexCreated?: () => void) {
  const first = advised[0];
  const available = Object.keys(first).filter(column => !HIDDEN_COLUMNS.has(column));
  const ordered = [
    ...LEADING_COLUMNS.filter(column => available.includes(column)),
    ...available.filter(column => !LEADING_COLUMNS.includes(column)),
  ];

  const columns: DataTableColumn<AdvisedIndex>[] = ordered.map(column => ({
    id: column,
    title: prettyColumnTitle(column),
    value: (advice: AdvisedIndex) => formatColumnValue(advice, column),
    align: typeof first[column] === `number` ? `right` : `left`,
  }));

  const options: DataTableOptions<AdvisedIndex> = {
    title: `Advised indexes for ${target}`,
    subtitle: (shown, total) => listFooter({ one: `advised index`, many: `advised indexes` }, shown, total, stats),
    columns,
    rows: advised,
    searchPlaceholder: `Search advised indexes…`,
    emptyMessage: `No advised indexes match the search.`,
    actions: [
      { id: ADVISED_INDEX_ACTIONS.createIndex },
      { id: ADVISED_INDEX_ACTIONS.showStatement },
    ],
  };

  const handlers: DataTableHandlers<AdvisedIndex> = {
    onAction: async (actionId, advice) => {
      if (actionId === ADVISED_INDEX_ACTIONS.createIndex) {
        if (await createIndex(indexCreation(advice))) {
          onIndexCreated?.();
        }
      } else if (actionId === ADVISED_INDEX_ACTIONS.showStatement) {
        await showCreateIndexStatement(indexCreation(advice));
      }
    },
  };

  showDataTable(options, handlers, { sql, reload })
    .catch(e => vscode.window.showErrorMessage(`Could not show the advised indexes: ${e?.message ?? e}`));
}
