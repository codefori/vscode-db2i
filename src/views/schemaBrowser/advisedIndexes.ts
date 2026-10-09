import { ColumnMetaData } from "@ibm/mapepire-js";
import * as vscode from "vscode";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { DataTableColumn } from "../html/dataTable";
import { showListing } from "../results";
import { coversAdvice, hasSameKeys, RawAdvice } from "./adviceCoverage";
import { createIndex, formatTimestamp, IndexCreation, IndexTarget, isNumericType, prettyColumnTitle, qualifiedTable, showCreateIndexStatement } from "./indexCreation";
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

type AdviceKind = Pick<AdvisedIndex, `INDEX_TYPE` | `NLSS_TABLE_SCHEMA` | `NLSS_TABLE_NAME`>;

/** A row from `QSYS2.SYSIXADV`, which the condensed advice of `qsys2.condidxa` is built from */
type RawAdvisedIndex = RawAdvice & AdviceKind & { PARTITION_NAME?: string | null };

/** Together with its table, the columns that tell one Index Advisor entry from the others */
const ENTRY_COLUMNS = [`PARTITION_NAME`, `INDEX_TYPE`, `NLSS_TABLE_SCHEMA`, `NLSS_TABLE_NAME`, `KEY_COLUMNS_ADVISED`, `LEADING_COLUMN_KEYS`] as const;

export const ADVISED_INDEX_ACTIONS = {
  createIndex: `advisedCreateIndex`,
  showStatement: `advisedShowStatement`,
  remove: `advisedRemove`,
};

function indexTarget(advice: AdvisedIndex): IndexTarget {
  return { schema: advice.TABLE_SCHEMA, table: advice.TABLE_NAME };
}

function isEncodedVector(advice: AdviceKind): boolean {
  return advice.INDEX_TYPE?.trim().toUpperCase().startsWith(`E`) === true;
}

function sortSequence(advice: AdviceKind): string | undefined {
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

function sameKind(a: AdviceKind, b: AdviceKind): boolean {
  return isEncodedVector(a) === isEncodedVector(b) && sortSequence(a) === sortSequence(b);
}

/**
 * The raw advice a condensed one stands for. Advice for only the first of its keys is left
 * out when one of the `others` stands for it too.
 */
async function rawAdviceFor(advice: AdvisedIndex, others: AdvisedIndex[] = []): Promise<RawAdvisedIndex[]> {
  const raw = await JobManager.runSQL<RawAdvisedIndex>(
    `select ${ENTRY_COLUMNS.join(`, `)} from QSYS2.SYSIXADV where TABLE_SCHEMA = ? and TABLE_NAME = ?`,
    { parameters: [advice.TABLE_SCHEMA, advice.TABLE_NAME] }
  );
  const rivals = others.filter(other => other.TABLE_SCHEMA === advice.TABLE_SCHEMA && other.TABLE_NAME === advice.TABLE_NAME && sameKind(other, advice));

  return raw.filter(row => sameKind(row, advice)
    && coversAdvice(advice.KEY_COLUMNS_ADVISED, row)
    && (hasSameKeys(advice.KEY_COLUMNS_ADVISED, row) || !rivals.some(rival => coversAdvice(rival.KEY_COLUMNS_ADVISED, row))));
}

/** Removes the advice from the Index Advisor, on request or once its index exists, like ACS */
function removeAdviceStatement(advice: AdvisedIndex, raw: RawAdvisedIndex[]): string {
  const literal = (value: string) => `'${Statement.escapeString(value)}'`;
  // A column the row was not read with is left out, as opposed to one that is null
  const rows = raw.map(row => ENTRY_COLUMNS
    .filter(column => row[column] !== undefined)
    .map(column => row[column] === null ? `${column} IS NULL` : `${column} = ${literal(String(row[column]))}`)
    .join(` AND `));
  const conditions = [
    `TABLE_SCHEMA = ${literal(advice.TABLE_SCHEMA)}`,
    `TABLE_NAME = ${literal(advice.TABLE_NAME)}`,
    `(${[...new Set(rows)].map(row => `(${row})`).join(` OR `)})`,
  ];

  return `DELETE FROM QSYS2.SYSIXADV WHERE ${conditions.join(` AND `)}`;
}

const REMOVE = `Remove`;

function isUsable(advice: AdvisedIndex): boolean {
  return Boolean(advice.TABLE_SCHEMA && advice.TABLE_NAME && advice.KEY_COLUMNS_ADVISED);
}

/** Read again, since the list only holds the pages of advice fetched so far */
async function otherAdviceFor(advice: AdvisedIndex): Promise<AdvisedIndex[]> {
  const advised = await JobManager.runSQL<AdvisedIndex>(getAdvisedIndexesStatement(advice.TABLE_SCHEMA, advice.TABLE_NAME));
  const self = advised.findIndex(other => other.KEY_COLUMNS_ADVISED === advice.KEY_COLUMNS_ADVISED
    && other.PARTITION_NAME === advice.PARTITION_NAME
    && sameKind(other, advice));

  return advised.filter((other, index) => index !== self && isUsable(other));
}

/** @returns whether the advice was removed */
async function removeAdvice(advice: AdvisedIndex): Promise<boolean> {
  const choice = await vscode.window.showWarningMessage(
    `Remove this advised index over ${qualifiedTable(indexTarget(advice))} from the Index Advisor?`,
    { modal: true, detail: `Key columns: ${advice.KEY_COLUMNS_ADVISED.trim()}\n\nNo index is created. The advice comes back if this index is advised again.` },
    REMOVE
  );

  if (choice !== REMOVE) return false;

  try {
    const raw = await rawAdviceFor(advice, await otherAdviceFor(advice));
    if (raw.length === 0) {
      vscode.window.showWarningMessage(`No Index Advisor entries were found for this advice, so nothing was removed. Refresh the list to see its current content.`);
      return false;
    }

    await JobManager.runSQL(removeAdviceStatement(advice, raw));
  } catch (e: any) {
    vscode.window.showErrorMessage(e.message);
    return false;
  }

  return true;
}

async function indexCreation(advice: AdvisedIndex): Promise<IndexCreation> {
  let raw: RawAdvisedIndex[] = [];
  try {
    raw = await rawAdviceFor(advice);
  } catch (e) {
    // Falls back to the advice with these exact keys
  }

  return {
    target: indexTarget(advice),
    nameTag: `IDX`,
    buildStatement: indexName => buildCreateIndexStatement(advice, indexName),
    warning: sortSequenceWarning(advice),
    afterCreate: {
      statement: removeAdviceStatement(advice, raw.length > 0 ? raw : [advice]),
      description: `Once the index is created, this advice is removed from the Index Advisor.`,
    },
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

export function pickAdvisedIndexAction(schema: string, table?: string, onIndexCreated?: () => void): Promise<void> {
  const specificTable = table && table !== `*ALL` ? table : undefined;
  const target = schema === `*ALL`
    ? `all libraries`
    : specificTable
      ? `${Statement.delimName(schema)}.${Statement.delimName(specificTable)}`
      : Statement.delimName(schema);

  return showListing<AdvisedIndex>(getAdvisedIndexesStatement(schema, table), {
    heading: `Advised indexes for ${target}`,
    columns: advisedIndexColumns,
    loadingText: `Fetching advised indexes for ${target}...`,
    searchPlaceholder: `Search advised indexes…`,
    emptyMessage: `No advised indexes match the search.`,
    noRowsMessage: `No advised indexes found for ${target}.`,
    actions: [
      { id: ADVISED_INDEX_ACTIONS.createIndex, when: isUsable },
      { id: ADVISED_INDEX_ACTIONS.showStatement, when: isUsable },
      { id: ADVISED_INDEX_ACTIONS.remove, when: isUsable, destructive: true },
    ],
    onAction: async (actionId, advice, list) => {
      if (actionId === ADVISED_INDEX_ACTIONS.createIndex) {
        if (await createIndex(await indexCreation(advice))) {
          list.removeRow();
          onIndexCreated?.();
        }
      } else if (actionId === ADVISED_INDEX_ACTIONS.showStatement) {
        await showCreateIndexStatement(await indexCreation(advice));
      } else if (actionId === ADVISED_INDEX_ACTIONS.remove) {
        if (await removeAdvice(advice)) {
          list.removeRow();
        }
      }
    },
  });
}

function advisedIndexColumns(columnMetaData: ColumnMetaData[]): DataTableColumn<AdvisedIndex>[] {
  const available = columnMetaData.filter(column => !HIDDEN_COLUMNS.has(column.name));
  const ordered = [
    ...LEADING_COLUMNS.flatMap(name => available.filter(column => column.name === name)),
    ...available.filter(column => !LEADING_COLUMNS.includes(column.name)),
  ];

  return ordered.map(column => ({
    id: column.name,
    title: prettyColumnTitle(column.name),
    value: (advice: AdvisedIndex) => formatColumnValue(advice, column.name),
    align: isNumericType(column.type) ? `right` : `left`,
  }));
}
