
import vscode from "vscode"
import { JobManager } from "../config";
import Statement from "./statement";
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export default class Callable {
  /**
   * @param schema Not user input
   * @param name Not user input
   * @returns 
   */
  static getParms(schema: string, name: string): Promise<SQLParm[]> {
    return JobManager.runSQL<SQLParm>([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = '${schema}' AND SPECIFIC_NAME = (select SPECIFIC_NAME from qsys2.sysroutines where ROUTINE_SCHEMA = '${schema}' and ROUTINE_NAME = '${name}') and ROW_TYPE = 'P'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}