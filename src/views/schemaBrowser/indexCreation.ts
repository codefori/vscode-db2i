import * as vscode from "vscode";
import { JobManager } from "../../config";
import Statement from "../../database/statement";

/** Index creation shared by the MTI and Index Advisor lists */

export interface IndexTarget {
  schema: string;
  table: string;
}

export function qualifiedTable(target: IndexTarget): string {
  return `${Statement.delimName(target.schema)}.${Statement.delimName(target.table)}`;
}

const MAX_NAME_LENGTH = 128;

/** Every candidate ends with `_<tag>xxxxx` whit zero padded five digit number */
function candidateName(prefix: string, tag: string, suffix: number): string {
  return `${prefix}_${tag}${String(suffix).padStart(5, `0`)}`;
}

export async function suggestIndexName(target: IndexTarget, tag: string): Promise<string> {
  // Truncated so that the suffix fits, since a longer name is not a valid SQL name
  const suffixLength = candidateName(``, tag, 0).length;
  const prefix = Statement.noQuotes(target.table).slice(0, MAX_NAME_LENGTH - suffixLength);
  let taken: string[] = [];

  try {
    const existing = await JobManager.runSQL<{ INDEX_NAME: string }>(
      `select INDEX_NAME from QSYS2.SYSINDEXES where INDEX_SCHEMA = ? and INDEX_NAME like ?`,
      { parameters: [target.schema, `${prefix}%`] }
    );
    taken = existing.map(row => row.INDEX_NAME);
  } catch (e) {
    // Only a suggestion, so fall back to the first candidate
  }

  let suffix = 1;
  while (taken.includes(candidateName(prefix, tag, suffix))) {
    suffix += 1;
  }

  // Delimited when needed, so createIndex doesn't fold it to a different (possibly taken) name
  const name = candidateName(prefix, tag, suffix);
  return Statement.delimName(name, true) === name ? name : `"${name}"`;
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

export interface IndexCreation {
  target: IndexTarget;
  nameTag: string;
  buildStatement: (indexName: string) => string;
  warning?: string;
}

/** @returns whether a job was submitted to create the index */
export async function createIndex(creation: IndexCreation): Promise<boolean> {
  const table = qualifiedTable(creation.target);
  const indexName = await vscode.window.showInputBox({
    title: `Create index on ${table}`,
    prompt: `Name for the new index`,
    value: await suggestIndexName(creation.target, creation.nameTag),
    validateInput: (value) => {
      const name = value.trim();
      if (name.length === 0) return `Index name cannot be blank`;
      if (Statement.noQuotes(name).length > MAX_NAME_LENGTH) return `Index name cannot be longer than ${MAX_NAME_LENGTH} characters`;
      return undefined;
    }
  });

  if (!indexName) return false;

  const name = indexName.trim();
  const statement = creation.buildStatement(name);
  const confirmation = await vscode.window.showWarningMessage(
    `Submit a job to create an index over ${table}?`,
    { modal: true, detail: [creation.warning, statement].filter(part => part).join(`\n\n`) },
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
  vscode.window.showInformationMessage(`Job ${SUBMITTED_JOB_NAME} submitted to create index ${name} over ${table}. The index only appears once that job has ended.`);
  return true;
}

export async function showCreateIndexStatement(creation: IndexCreation): Promise<void> {
  const statement = `${creation.buildStatement(await suggestIndexName(creation.target, creation.nameTag))};`;
  const content = creation.warning ? `-- ${creation.warning}\n${statement}` : statement;
  const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content });
  await vscode.window.showTextDocument(textDoc);
}

export function formatBytes(bytes: number): string {
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
const ACRONYMS = new Set([`MTI`, `SQL`, `ID`, `NLSS`]);

/** e.g. `TABLE_PARTITION` -> `Table Partition`, `MTI_SIZE` -> `MTI Size` */
export function prettyColumnTitle(column: string): string {
  return column.split(`_`)
    .map(word => ACRONYMS.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase())
    .join(` `);
}

/** Renders like `TO_CHAR(column, 'yyyy-mm-dd HH24:mi')`; falls back to the raw value if it isn't parseable */
export function formatTimestamp(raw: string): string {
  // Db2 renders TIMESTAMP as `yyyy-mm-dd-HH.mm.ss.ffffff`; normalize to something Date can parse
  const isoLike = raw.replace(/^(\d{4}-\d{2}-\d{2})-(\d{2})\.(\d{2})\.(\d{2})/, `$1T$2:$3:$4`);
  const date = new Date(isoLike);

  if (isNaN(date.getTime())) return raw;

  // UTC getters, since the raw value carries no time zone of its own
  const pad = (n: number) => String(n).padStart(2, `0`);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export interface LoadStats {
  executionTimeMs: number;
  jobId?: string;
}

/** Same wording as a query result set's footer */
export function listFooter(noun: { one: string, many: string }, shown: number, total: number, stats: LoadStats): string {
  const matching = shown === total ? `` : ` ${shown} match the search.`;
  const job = stats.jobId ? ` ${stats.jobId}` : ``;
  return `Loaded ${total} ${total === 1 ? noun.one : noun.many} in ${Math.round(stats.executionTimeMs)}ms.${matching} End of data.${job}`;
}
