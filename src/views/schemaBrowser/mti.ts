import * as vscode from "vscode";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { getMTIStatement } from "./statements";

/** A row from QSYS2.MTI_INFO, limited to the columns used here */
interface MTIInfo {
  MTI_NAME: string;
  MTI_SIZE?: number;
  REFERENCE_COUNT?: number;
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  TABLE_PARTITION?: string;
  KEYS?: number;
  KEY_DEFINITION: string;
  STATE?: string;
  SPARSE?: string;
  SPARSE_DEFINITION?: string;
}

const CREATE_INDEX = `Create Index...`;
const SHOW_STATEMENT = `Show CREATE INDEX Statement`;

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

/** @returns whether a job was submitted, meaning the tree is worth refreshing once it ends */
export async function pickMTIAction(schema: string, table?: string): Promise<boolean> {
  const target = table ? `${Statement.delimName(schema)}.${Statement.delimName(table)}` : Statement.delimName(schema);
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

  const chosenMTI = await vscode.window.showQuickPick(
    usable.map(mti => new MTIQuickPickItem(mti, table === undefined)),
    {
      title: `MTIs for ${target}`,
      placeHolder: `Select an MTI`,
      matchOnDescription: true,
      matchOnDetail: true
    }
  );

  if (!chosenMTI) return false;

  const chosenAction = await vscode.window.showQuickPick(
    [
      { label: CREATE_INDEX, detail: `Create a permanent index matching this MTI`, iconPath: new vscode.ThemeIcon(`add`) },
      { label: SHOW_STATEMENT, detail: `Open the generated statement in a new SQL editor`, iconPath: new vscode.ThemeIcon(`go-to-file`) }
    ],
    { title: chosenMTI.label, placeHolder: `Select an action` }
  );

  switch (chosenAction?.label) {
    case CREATE_INDEX:
      return createIndex(chosenMTI.mti);

    case SHOW_STATEMENT: {
      const warning = sparseWarning(chosenMTI.mti);
      const statement = `${buildCreateIndexStatement(chosenMTI.mti, await suggestIndexName(chosenMTI.mti))};`;
      const content = warning ? `-- ${warning}\n${statement}` : statement;
      const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content });
      await vscode.window.showTextDocument(textDoc);
      return false;
    }

    default:
      return false;
  }
}

/**
 * QuickPick item that represents a single MTI
 */
class MTIQuickPickItem implements vscode.QuickPickItem {
  readonly label: string;
  readonly description?: string;
  readonly detail?: string;
  readonly iconPath = new vscode.ThemeIcon(`list-tree`);

  /** @param withTable Only useful when MTIs from multiple tables are listed together */
  constructor(readonly mti: MTIInfo, withTable: boolean) {
    this.label = mti.KEY_DEFINITION.trim();

    const description: string[] = [];
    if (withTable) description.push(qualifiedTable(mti));
    if (mti.KEYS !== undefined) description.push(`${mti.KEYS} ${mti.KEYS === 1 ? `key` : `keys`}`);
    if (isSparse(mti)) description.push(`Sparse`);
    if (mti.STATE) description.push(prettyState(mti.STATE));
    this.description = description.join(` · `);

    const detail: string[] = [mti.MTI_NAME];
    if (mti.MTI_SIZE !== undefined) detail.push(formatBytes(mti.MTI_SIZE));
    if (mti.REFERENCE_COUNT !== undefined) detail.push(`${mti.REFERENCE_COUNT} ${mti.REFERENCE_COUNT === 1 ? `reference` : `references`}`);
    if (mti.TABLE_PARTITION) detail.push(`partition ${mti.TABLE_PARTITION}`);
    this.detail = detail.filter(part => part).join(` · `);
  }
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
