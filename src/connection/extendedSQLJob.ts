import { SQLJob } from "@ibm/mapepire-js";
import { QueryResult } from "@ibm/mapepire-js/dist/src/types";
import { getInstance } from "../base";
import { osDetail } from "../config";
import { SelfValue } from "../views/jobManager/selfCodes/nodes";
import { JobLogEntry } from "./types";

export type ExtendedSQLJob = SQLJob & {
  selfState: SelfValue;
  selfExcludes: number[];
  currentSchemaStore?: string;
  resetCurrentSchemaCache(): void
  getSelfCode(): SelfValue
  getSelfExcludes(): number[]
  getCurrentSchema(): Promise<string>
  getNaming(): undefined | "sql" | "system"
  setSelfState(code: SelfValue, excludes?: number[]): Promise<void>
  getJobLog(): Promise<QueryResult<JobLogEntry>>
  requestCancel(): Promise<boolean>
}

export function extendSQLJob(job: SQLJob) {
  const wrappedJob = job as ExtendedSQLJob;
  wrappedJob.selfState = "*NONE";
  wrappedJob.selfExcludes = [];

  wrappedJob.resetCurrentSchemaCache = () => delete wrappedJob.currentSchemaStore;
  wrappedJob.getSelfCode = () => wrappedJob.selfState;
  wrappedJob.getSelfExcludes = () => wrappedJob.selfExcludes;

  wrappedJob.getCurrentSchema = async () => {
    if (wrappedJob.getNaming() === `sql`) {
      if (wrappedJob.currentSchemaStore) {
        return wrappedJob.currentSchemaStore;
      }

      const result = await wrappedJob.execute<{ '00001': string }>(`values (current schema)`);
      if (result.success && result.data.length > 0) {
        wrappedJob.currentSchemaStore = result.data[0]['00001'];
        return wrappedJob.currentSchemaStore;
      }
    }

    return wrappedJob.options?.libraries?.[0] || `QGPL`;
  }

  wrappedJob.getNaming = () => wrappedJob.options.naming;

  wrappedJob.setSelfState = async (code: SelfValue, excludes?: number[]) => {
    if (excludes !== undefined) {
      wrappedJob.selfExcludes = excludes;
    }

    let sqlValue: string = code;
    if (
      code !== `*NONE` &&
      osDetail &&
      Number(osDetail.getVersion()) >= 7.6 &&
      wrappedJob.selfExcludes.length > 0
    ) {
      const excludeList = wrappedJob.selfExcludes.slice(0, 32).join(`,`);
      sqlValue = `${code} EXCLUDING ${excludeList}`;
    }

    await wrappedJob.query<any>(`SET SYSIBMADM.SELFCODES = '${sqlValue}'`).execute();
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