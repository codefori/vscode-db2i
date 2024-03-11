
import vscode from "vscode"
import { JobManager } from "../config";
import { QueryOptions } from "../connection/types";
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export type CallableType = "PROCEDURE"|"FUNCTION";

export default class Callable {
  static async getType(schema: string, name: string): Promise<CallableType|undefined> {
    const statement = `select routine_type from qsys2.sysroutines where ROUTINE_SCHEMA = ? and ROUTINE_NAME = ? and routine_type in ('PROCEDURE', 'FUNCTION') limit 1`;
   
    const result = await JobManager.runSQL<{ROUTINE_TYPE: CallableType}>(
      statement,
      {parameters: [schema, name]}
    );

    if (result.length === 1) {
      return result[0].ROUTINE_TYPE;
    }

    return;
  }

  /**
   * @param schema Not user input
   * @param specificName Not user input
   * @returns 
   */
  static getParms(schema: string, specificName: string, resolveName: boolean = false): Promise<SQLParm[]> {
    const rowType = `P`; // Parameter
    return Callable.getFromSysParms(schema, specificName, rowType, resolveName);
  }

  static getResultColumns(schema: string, specificName: string, resolveName: boolean = false) {
    const rowType = `R`; // Row
    return Callable.getFromSysParms(schema, specificName, rowType, resolveName);
  }

  static getFromSysParms(schema: string, name: string, rowType: "P"|"R", resolveName: boolean = false): Promise<SQLParm[]> {
    let parameters = [schema, rowType];

    let specificNameClause = undefined;

    if (resolveName) {
      specificNameClause = `SPECIFIC_NAME = (select specific_name from qsys2.sysroutines where specific_schema = ? and routine_name = ?)`;
      parameters.push(schema, name);
    } else {
      specificNameClause = `SPECIFIC_NAME = ?`;
      parameters.push(name);
    }

    const options : QueryOptions = { parameters };
    return JobManager.runSQL<SQLParm>(
      [
        `SELECT * FROM QSYS2.SYSPARMS`,
        `WHERE SPECIFIC_SCHEMA = ? AND ROW_TYPE = ? AND ${specificNameClause}`,
        `ORDER BY ORDINAL_POSITION`
      ].join(` `),
      options
    );
  }
}