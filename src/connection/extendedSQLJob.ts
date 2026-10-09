import { SQLJob } from "@ibm/mapepire-js";
import { Query } from "@ibm/mapepire-js/dist/src/query";
import { QueryOptions, QueryResult } from "@ibm/mapepire-js/dist/src/types";
import { getInstance } from "../base";
import { SelfValue } from "../views/jobManager/selfCodes/nodes";
import { JobLogEntry } from "./types";

export type ExtendedSQLJob = SQLJob & {
  selfState: SelfValue;
  currentSchemaStore?: string;
  resetCurrentSchemaCache(): void
  getSelfCode(): SelfValue
  getCurrentSchema(): Promise<string>
  getSearchSchemas(): Promise<string[]>
  getNaming(): undefined | "sql" | "system"
  setSelfState(code: SelfValue): Promise<void>
  getJobLog(): Promise<QueryResult<JobLogEntry>>
  requestCancel(): Promise<boolean>
}

const CHANGES_CURRENT_SCHEMA = /\bSET\s+(CURRENT\s+)?SCHEMA\b/i;

export function extendSQLJob(job: SQLJob) {
  const wrappedJob = job as ExtendedSQLJob;
  wrappedJob.selfState = "*NONE";

  wrappedJob.resetCurrentSchemaCache = () => delete wrappedJob.currentSchemaStore;
  wrappedJob.getSelfCode = () => wrappedJob.selfState;

  const baseQuery = wrappedJob.query;
  wrappedJob.query = <T>(sql: string, opts?: QueryOptions) => {
    const statement: Query<T> = baseQuery.call(wrappedJob, sql, opts);

    if (CHANGES_CURRENT_SCHEMA.test(sql)) {
      const baseExecute = statement.execute.bind(statement);
      statement.execute = async (rowsToFetch?: number) => {
        try {
          return await baseExecute(rowsToFetch);
        } finally {
          wrappedJob.resetCurrentSchemaCache();
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

    return wrappedJob.options?.libraries?.[0] || `QGPL`;
  }

  wrappedJob.getSearchSchemas = async () => {
    const currentSchema = await wrappedJob.getCurrentSchema();
    const libraries = wrappedJob.options?.libraries;

    if (wrappedJob.currentSchemaStore === `*LIBL` && libraries?.length) {
      return libraries;
    }

    return [currentSchema];
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