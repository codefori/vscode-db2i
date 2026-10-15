import { SQLJob } from "@ibm/mapepire-js";
import { Query } from "@ibm/mapepire-js/dist/src/query";
import { QueryOptions, QueryResult } from "@ibm/mapepire-js/dist/src/types";
import { getInstance } from "../base";
import Statement from "../database/statement";
import { SelfValue } from "../views/jobManager/selfCodes/nodes";
import { JobLogEntry } from "./types";

export type ExtendedSQLJob = SQLJob & {
  selfState: SelfValue;
  currentSchemaStore?: string;
  libraryListStore?: LibraryListEntry[];
  currentPathStore?: string[];
  resetCurrentSchemaCache(): void
  resetLibraryListCache(): void
  resetCurrentPathCache(): void
  getSelfCode(): SelfValue
  getCurrentSchema(): Promise<string>
  getSearchSchemas(): Promise<string[]>
  getCurrentPath(): Promise<string[] | undefined>
  getLibraryList(): Promise<string[]>
  setLibraryList(libraries: string[]): Promise<void>
  getNaming(): undefined | "sql" | "system"
  setSelfState(code: SelfValue): Promise<void>
  getJobLog(): Promise<QueryResult<JobLogEntry>>
  requestCancel(): Promise<boolean>
}

interface LibraryListEntry {
  schema: string;
  system: string;
}

const CHANGES_CURRENT_SCHEMA = /\bSET\s+(CURRENT\s+)?SCHEMA\b/i;
const CHANGES_CURRENT_PATH = /\bSET\s+((CURRENT\s+)?(FUNCTION\s+)?PATH|CURRENT_PATH)\b/i;
// CL commands and calls (QCMDEXC or any program/procedure) can change the job library list
const MAY_CHANGE_LIBRARY_LIST = /\b(CALL|QCMDEXC)\b/i;

export function extendSQLJob(job: SQLJob) {
  const wrappedJob = job as ExtendedSQLJob;
  wrappedJob.selfState = "*NONE";

  wrappedJob.resetCurrentSchemaCache = () => delete wrappedJob.currentSchemaStore;
  wrappedJob.resetLibraryListCache = () => delete wrappedJob.libraryListStore;
  wrappedJob.resetCurrentPathCache = () => delete wrappedJob.currentPathStore;
  wrappedJob.getSelfCode = () => wrappedJob.selfState;

  const baseQuery = wrappedJob.query;
  wrappedJob.query = <T>(sql: string, opts?: QueryOptions) => {
    const statement: Query<T> = baseQuery.call(wrappedJob, sql, opts);

    const changesSchema = CHANGES_CURRENT_SCHEMA.test(sql);
    const changesLibraryList = opts?.isClCommand === true || MAY_CHANGE_LIBRARY_LIST.test(sql);
    const changesPath = CHANGES_CURRENT_PATH.test(sql);

    if (changesSchema || changesLibraryList || changesPath) {
      const baseExecute = statement.execute.bind(statement);
      statement.execute = async (rowsToFetch?: number) => {
        try {
          return await baseExecute(rowsToFetch);
        } finally {
          if (changesSchema) wrappedJob.resetCurrentSchemaCache();
          if (changesLibraryList) wrappedJob.resetLibraryListCache();
          if (changesPath) wrappedJob.resetCurrentPathCache();
        }
      }
    }

    return statement;
  }

  wrappedJob.getCurrentSchema = async () => {
    if (!wrappedJob.currentSchemaStore) {
      try {
        const result = await wrappedJob.execute<{ '00001': string }>(`values (current schema)`);
        if (result.success && result.data.length > 0) {
          wrappedJob.currentSchemaStore = result.data[0]['00001']?.trim();
        }
      } catch (e) {}
    }

    // *LIBL: system naming with no schema set
    if (wrappedJob.currentSchemaStore && wrappedJob.currentSchemaStore !== `*LIBL`) {
      return wrappedJob.currentSchemaStore;
    }

    const libraryList = await getLibraryListEntries();
    return libraryList[0]?.schema || wrappedJob.options?.libraries?.[0] || `QGPL`;
  }

  // User portion of the job library list, as it is right now on the job (the current library is ignored)
  const getLibraryListEntries = async (): Promise<LibraryListEntry[]> => {
    if (!wrappedJob.libraryListStore) {
      try {
        const result = await wrappedJob.execute<{ SCHEMA_NAME: string | null, SYSTEM_SCHEMA_NAME: string }>(
          `select SCHEMA_NAME, SYSTEM_SCHEMA_NAME from QSYS2.LIBRARY_LIST_INFO where TYPE = 'USER' order by ORDINAL_POSITION`
        );
        if (result.success) {
          wrappedJob.libraryListStore = result.data.map(row => ({
            schema: (row.SCHEMA_NAME || row.SYSTEM_SCHEMA_NAME).trim(),
            system: row.SYSTEM_SCHEMA_NAME.trim()
          }));
        }
      } catch (e) {}
    }

    return wrappedJob.libraryListStore
      || wrappedJob.options?.libraries?.map(lib => ({ schema: lib, system: lib }))
      || [];
  }

  wrappedJob.getLibraryList = async () => (await getLibraryListEntries()).map(entry => entry.system);

  wrappedJob.setLibraryList = async (libraries: string[]) => {
    const libl = libraries.map(lib => lib.toUpperCase()).filter((lib, i, all) => all.indexOf(lib) === i);

    // The current library is left as it is
    const result = await wrappedJob.execute<{ SUMMARY: string }>(
      `CHGLIBL LIBL(${libl.length ? libl.join(` `) : `*NONE`})`,
      { isClCommand: true }
    );

    if (!result.success) {
      throw new Error(result.data?.[0]?.SUMMARY || `CHGLIBL failed.`);
    }

    // So a restarted job (e.g. after editing its properties) keeps the same library list
    wrappedJob.options.libraries = libl;
  }

  wrappedJob.getSearchSchemas = async () => {
    const currentSchema = await wrappedJob.getCurrentSchema();

    if (wrappedJob.currentSchemaStore === `*LIBL`) {
      const libraryList = await getLibraryListEntries();
      if (libraryList.length) {
        return libraryList.map(entry => entry.schema);
      }
    }

    return [currentSchema];
  }

  // Schemas used to resolve unqualified routines, global variables and types.
  // undefined when the path is *LIBL (the default with system naming), so the library list is used instead
  wrappedJob.getCurrentPath = async () => {
    if (!wrappedJob.currentPathStore) {
      try {
        const result = await wrappedJob.execute<{ '00001': string }>(`values (current path)`);
        if (result.success && result.data.length > 0) {
          // e.g. "QSYS","QSYS2","SYSPROC","SYSIBMADM","USER" or *LIBL
          const path = result.data[0]['00001'] || ``;
          wrappedJob.currentPathStore = Array.from(path.matchAll(/"((?:[^"]|"")*)"|([^\s,]+)/g))
            .map(match => match[1] !== undefined ? Statement.delimName(match[1].replace(/""/g, `"`)) : match[2]);
        }
      } catch (e) {}
    }

    const path = wrappedJob.currentPathStore;
    if (!path || path.length === 0 || path.includes(`*LIBL`)) {
      return undefined;
    }

    return path;
  }

  wrappedJob.getNaming = () => wrappedJob.options.naming;

  wrappedJob.setSelfState = async (code: SelfValue) => {
    await wrappedJob.query<any>(`SET SYSIBMADM.SELFCODES = '${code}'`).execute();
    wrappedJob.selfState = code;
  }

  wrappedJob.getJobLog = async () => wrappedJob.query<JobLogEntry>(`select * from table(qsys2.joblog_info('*')) a`).execute();
  wrappedJob.requestCancel = async () => {
    const connection = getInstance().getConnection();

    // Note that this statement is run via the base extension since it has to be done on a job other than the one whose SQL is getting canceled
    await connection.runSQL(`CALL QSYS2.CANCEL_SQL('${wrappedJob.id}')`);

    const [row] = await connection.runSQL(`select V_SQL_STMT_STATUS as STATUS from table(qsys2.get_job_info('${wrappedJob.id}'))`) as { STATUS: string | null }[];
    return !(row && row.STATUS === `ACTIVE`);
  }
  return wrappedJob;
}