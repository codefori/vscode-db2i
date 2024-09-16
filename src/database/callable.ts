
import vscode from "vscode"
import { JobManager } from "../config";
import { QueryOptions } from "@ibm/mapepire-js/dist/src/types";
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export type CallableType = "PROCEDURE"|"FUNCTION";
export interface CallableRoutine {
  specificNames: string[];
  type: string;
}

export interface CallableSignature {
  specificName: string;
  parms: SQLParm[];
}

export default class Callable {
  static async getType(schema: string, name: string, forType: CallableType): Promise<CallableRoutine|undefined> {
    const statement = `select routine_type, specific_name from qsys2.sysroutines where ROUTINE_SCHEMA = ? and ROUTINE_NAME = ? and routine_type = ?`;
   
    const result = await JobManager.runSQL<{SPECIFIC_NAME: string, ROUTINE_TYPE: CallableType}>(
      statement,
      {parameters: [schema, name, forType]}
    );

    let routine: CallableRoutine = {
      specificNames: [],
      type: forType
    }

    if (result.length > 0) {
      routine.specificNames = result.map(row => row.SPECIFIC_NAME);
      return routine;
    }

    return;
  }

  static async getSignaturesFor(schema: string, specificNames: string[]): Promise<CallableSignature[]> {
    const results = await JobManager.runSQL<SQLParm>(
      [
        `SELECT * FROM QSYS2.SYSPARMS`,
        `WHERE SPECIFIC_SCHEMA = ? AND ROW_TYPE = 'P' AND SPECIFIC_NAME in (${specificNames.map(n => `?`).join(`, `)})`,
        `ORDER BY ORDINAL_POSITION`
      ].join(` `),
      {
        parameters: [schema, ...specificNames]
      }
    );

    // find unique specific names
    const uniqueSpecificNames = Array.from(new Set(results.map(row => row.SPECIFIC_NAME)));

    // group results by specific name
    const groupedResults: CallableSignature[] = uniqueSpecificNames.map(name => {
      return {
        specificName: name,
        parms: results.filter(row => row.SPECIFIC_NAME === name)
      }
    });

    return groupedResults;
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

    return JobManager.runSQL<SQLParm>(
      [
        `SELECT * FROM QSYS2.SYSPARMS`,
        `WHERE SPECIFIC_SCHEMA = ? AND ROW_TYPE = ? AND ${specificNameClause}`,
        `ORDER BY ORDINAL_POSITION`
      ].join(` `),
      { parameters }
    );
  }
}