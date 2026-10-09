import { ColumnMetaData } from "@ibm/mapepire-js";
import Statement from "../../database/statement";
import { DataTableColumn } from "../html/dataTable";
import { showListing } from "../results";
import { createIndex, formatKilobytes, formatTimestamp, IndexCreation, prettyColumnTitle, qualifiedTable, showCreateIndexStatement } from "./indexCreation";
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
    case `MTI_SIZE`: return formatKilobytes(Number(value));
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

function isUsable(mti: MTIInfo): boolean {
  return Boolean(mti.TABLE_SCHEMA && mti.TABLE_NAME && mti.KEY_DEFINITION);
}

/**
 * List the MTIs for a schema (or a single table within it) in the "Db2 for i" result panel,
 * with "Create Index..." and "Show Statement" actions on every row.
 *
 * @param onIndexCreated called once an index is created or submitted, to refresh the caller's tree
 */
export function pickMTIAction(schema: string, table?: string, onIndexCreated?: () => void): Promise<void> {
  const specificTable = table && table !== `*ALL` ? table : undefined;
  const target = schema === `*ALL`
    ? `all libraries`
    : specificTable
      ? `${Statement.delimName(schema)}.${Statement.delimName(specificTable)}`
      : Statement.delimName(schema);

  return showListing<MTIInfo>(getMTIStatement(schema, table), {
    heading: `MTIs for ${target}`,
    columns: mtiColumns,
    loadingText: `Fetching MTIs for ${target}...`,
    searchPlaceholder: `Search MTIs…`,
    emptyMessage: `No MTIs match the search.`,
    noRowsMessage: `No MTIs found for ${target}.`,
    actions: [
      { id: MTI_ACTIONS.createIndex, when: isUsable },
      { id: MTI_ACTIONS.showStatement, when: isUsable },
    ],
    onAction: async (actionId, mti) => {
      if (actionId === MTI_ACTIONS.createIndex) {
        if (await createIndex(indexCreation(mti))) {
          onIndexCreated?.();
        }
      } else if (actionId === MTI_ACTIONS.showStatement) {
        await showCreateIndexStatement(indexCreation(mti));
      }
    },
  });
}

function mtiColumns(columnMetaData: ColumnMetaData[]): DataTableColumn<MTIInfo>[] {
  return columnMetaData
    .map(column => column.name)
    .filter(column => !HIDDEN_COLUMNS.has(column))
    .map(column => ({
      id: column,
      title: prettyColumnTitle(column),
      value: (mti: MTIInfo) => formatColumnValue(mti, column),
      align: [`MTI_SIZE`, `KEYS`].includes(column) ? `right` : `left`,
    }));
}
