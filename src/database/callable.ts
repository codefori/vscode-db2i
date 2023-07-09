
import vscode from "vscode"
import { JobManager } from "../config";
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export default class Callable {
  static getParms(schema: string, name: string): Promise<SQLParm[]> {
    return JobManager.runSQL<SQLParm>([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = '${schema.toUpperCase()}' AND SPECIFIC_NAME = (select SPECIFIC_NAME from qsys2.sysroutines where ROUTINE_SCHEMA = '${schema.toUpperCase()}' and ROUTINE_NAME = '${name.toUpperCase()}')`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}