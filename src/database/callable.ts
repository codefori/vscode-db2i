
import { JobManager } from "../config";
import { SQLParm } from "../types";

export type CallableType = "PROCEDURE"|"FUNCTION";
export interface CallableRoutine {
  schema: string;
  name: string;
  specificNames: string[];
  type: string;
}

export interface CallableSignature {
  specificName: string;
  parms: SQLParm[];
  returns: SQLParm[];
}

export default class Callable {
  static async getType(schema: string, name: string, forType: CallableType): Promise<CallableRoutine|undefined> {
    const statement = `select routine_type, specific_name from qsys2.sysroutines where ROUTINE_SCHEMA = ? and ROUTINE_NAME = ? and routine_type = ?`;
   
    const result = await JobManager.runSQL<{SPECIFIC_NAME: string, ROUTINE_TYPE: CallableType}>(
      statement,
      {parameters: [schema, name, forType]}
    );

    let routine: CallableRoutine = {
      schema,
      name,
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
        `WHERE SPECIFIC_SCHEMA = ? AND ROW_TYPE in ('P', 'R') AND SPECIFIC_NAME in (${specificNames.map(() => `?`).join(`, `)})`,
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
        parms: results.filter(row => row.SPECIFIC_NAME === name && row.ROW_TYPE === `P`),
        returns: results.filter(row => row.SPECIFIC_NAME === name && row.ROW_TYPE === `R`)
      }
    });

    return groupedResults;
  }
}