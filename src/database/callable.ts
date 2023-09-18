
import vscode from "vscode"
import { JobManager } from "../config";
import { QueryOptions } from "../connection/types";
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export default class Callable {
  /**
   * @param schema Not user input
   * @param specificName Not user input
   * @returns 
   */
  static getParms(schema: string, specificName: string): Promise<SQLParm[]> {
    const rowType = `P`; // Parameter
    const options : QueryOptions = { parameters : [schema, specificName, rowType] };
    return JobManager.runSQL<SQLParm>([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = ? AND SPECIFIC_NAME = ? and ROW_TYPE = ?`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `),
    options);
  }

  static getResultColumns(schema: string, specificName: string): Promise<SQLParm[]> {
    const rowType = `R`; // Row
    const options : QueryOptions = { parameters : [schema, specificName, rowType] };
    return JobManager.runSQL<SQLParm>([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = ? AND SPECIFIC_NAME = ? and ROW_TYPE = ?`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `),
    options);
  }
}