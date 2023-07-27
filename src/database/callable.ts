
import vscode from "vscode"
import { JobManager } from "../config";
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export default class Callable {
  /**
   * @param schema Not user input
   * @param specificName Not user input
   * @returns 
   */
  static getParms(schema: string, specificName: string): Promise<SQLParm[]> {
    return JobManager.runSQL<SQLParm>([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = '${schema}' AND SPECIFIC_NAME = '${specificName}' and ROW_TYPE = 'P'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}