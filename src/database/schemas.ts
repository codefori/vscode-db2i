
import { getInstance } from "../base";

import Statement from "./statement";
import { JobManager } from "../config";

export type SQLType = "schemas"|"tables"|"views"|"aliases"|"constraints"|"functions"|"variables"|"indexes"|"procedures"|"sequences"|"packages"|"triggers"|"types";
type PageData = {filter?: string, offset?: number, limit?: number};

const typeMap = {
  'tables': [`T`, `P`],
  'views': [`V`],
  'aliases': [`A`]
};

export const AllSQLTypes: SQLType[] = ["schemas", "tables", "views", "aliases", "constraints", "functions", "variables", "indexes", "procedures", "sequences", "packages", "triggers", "types"];

export default class Database {
  /**
   * @param schema Not user input
   */
  static async getObjects(schema: string, types: SQLType[], details: PageData = {}): Promise<BasicSQLObject[]> {
    let selects: string[] = [];
    let query : string;

    for (const type of types) {
      switch (type) {
        case `schemas`:
          selects.push([
            `select '${type}' as OBJ_TYPE, SCHEMA_NAME as NAME, SCHEMA_TEXT as TEXT, SYSTEM_SCHEMA_NAME as SYS_NAME `,
            `from QSYS2.SYSSCHEMAS`,
            details.filter ? `where SCHEMA_NAME = '${details.filter}' or SYSTEM_SCHEMA_NAME = '${details.filter}'` : ``,
            `order by QSYS2.DELIMIT_NAME(SCHEMA_NAME) asc`
          ].join(` `));
            break;
            
      case `tables`:
      case `views`:
      case `aliases`:
        selects.push([
          `select '${type}' as OBJ_TYPE, TABLE_NAME as NAME, TABLE_TEXT as TEXT, BASE_TABLE_SCHEMA as BASE_SCHEMA, BASE_TABLE_NAME as BASE_OBJ, SYSTEM_TABLE_NAME as SYS_NAME, SYSTEM_TABLE_SCHEMA as SYS_SCHEMA `,
          `from QSYS2.SYSTABLES`,
          `where TABLE_SCHEMA = '${schema}' and TABLE_TYPE in (${typeMap[type].map(item => `'${item}'`).join(`, `)}) ${details.filter ? `and TABLE_NAME like '%${details.filter}%'`: ``}`,
          `order by TABLE_NAME asc`
        ].join(` `));
        break;
  
      case `constraints`:
        selects.push([
          `select '${type}' as OBJ_TYPE, CONSTRAINT_NAME as NAME, CONSTRAINT_TEXT as TEXT, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ, SYSTEM_TABLE_NAME as SYS_NAME, SYSTEM_TABLE_SCHEMA as SYS_SCHEMA `,
          `from QSYS2.SYSCST`,
          `where CONSTRAINT_SCHEMA = '${schema}' ${details.filter ? `and CONSTRAINT_NAME like '%${details.filter}%'`: ``}`,
          `order by CONSTRAINT_NAME asc`
        ].join(` `));
        break;
  
      case `functions`:
        selects.push([
          `select '${type}' as OBJ_TYPE, ROUTINE_NAME as NAME, SPECIFIC_NAME as SPECNAME, coalesce(ROUTINE_TEXT, LONG_COMMENT) as TEXT `,
          `from QSYS2.SYSFUNCS`,
          `where ROUTINE_SCHEMA = '${schema}' ${details.filter ? `and ROUTINE_NAME like '%${details.filter}%'`: ``} and FUNCTION_ORIGIN in ('E','U')`,
          `order by ROUTINE_NAME asc`
        ].join(` `));
        break;
  
      case `variables`:
        selects.push([
          `select '${type}' as OBJ_TYPE, VARIABLE_NAME as NAME, VARIABLE_TEXT as TEXT, SYSTEM_VAR_NAME as SYS_NAME, SYSTEM_VAR_SCHEMA as SYS_SCHEMA `,
          `from QSYS2.SYSVARIABLES`,
          `where VARIABLE_SCHEMA = '${schema}' ${details.filter ? `and VARIABLE_NAME like '%${details.filter}%'`: ``}`,
          `order by VARIABLE_NAME asc`
        ].join(` `));
        break;
  
      case `indexes`:
        selects.push([
          `select '${type}' as OBJ_TYPE, INDEX_NAME as NAME, INDEX_TEXT as TEXT, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ, SYSTEM_INDEX_NAME as SYS_NAME, SYSTEM_INDEX_SCHEMA as SYS_SCHEMA `,
          `from QSYS2.SYSINDEXES`,
          `where INDEX_SCHEMA = '${schema}' ${details.filter ? `and INDEX_NAME like '%${details.filter}%'`: ``}`,
          `order by INDEX_NAME asc`
        ].join(` `));
        break;
  
      case `procedures`:
        selects.push([
          `select '${type}' as OBJ_TYPE, ROUTINE_NAME as NAME, SPECIFIC_NAME as SPECNAME, ROUTINE_TEXT as TEXT `,
          `from QSYS2.SYSPROCS`,
          `where ROUTINE_SCHEMA = '${schema}' ${details.filter ? `and ROUTINE_NAME like '%${details.filter}%'`: ``}`,
          `order by ROUTINE_NAME asc`
        ].join(` `));
        break;
  
      case `sequences`:
        selects.push([
          `select '${type}' as OBJ_TYPE, SEQUENCE_NAME as NAME, SEQUENCE_TEXT as TEXT, SYSTEM_SEQ_NAME as SYS_NAME, SYSTEM_SEQ_SCHEMA as SYS_SCHEMA `,
          `from QSYS2.SYSSEQUENCES`,
          `where SEQUENCE_SCHEMA = '${schema}' ${details.filter ? `and SEQUENCE_NAME like '%${details.filter}%'`: ``}`,
          `order by SEQUENCE_NAME asc`
        ].join(` `));
        break;
  
      case `packages`:
        selects.push([
          `select '${type}' as OBJ_TYPE, PACKAGE_NAME as NAME, PACKAGE_TEXT as TEXT, PROGRAM_SCHEMA as BASE_SCHEMA, PROGRAM_NAME as BASE_OBJ `,
          `from QSYS2.SQLPACKAGE`,
          `where PACKAGE_SCHEMA = '${schema}' ${details.filter ? `and PACKAGE_NAME like '%${details.filter}%'`: ``}`,
          `order by PACKAGE_NAME asc`
        ].join(` `));
        break;
  
      case `triggers`:
        selects.push([
          `select '${type}' as OBJ_TYPE, TRIGGER_NAME as NAME, TRIGGER_TEXT as TEXT, EVENT_OBJECT_SCHEMA as BASE_SCHEMA, EVENT_OBJECT_TABLE as BASE_OBJ `,
          `from QSYS2.SYSTRIGGERS`,
          `where TRIGGER_SCHEMA = '${schema}' ${details.filter ? `and TRIGGER_NAME like '%${details.filter}%'`: ``}`,
          `order by TRIGGER_NAME asc`
        ].join(` `));
        break;
  
      case `types`:
        selects.push([
          `select '${type}' as OBJ_TYPE, USER_DEFINED_TYPE_NAME as NAME, TYPE_TEXT as TEXT, SYSTEM_TYPE_NAME as SYS_NAME, SYSTEM_TYPE_SCHEMA as SYS_SCHEMA `,
          `from QSYS2.SYSTYPES`,
          `where USER_DEFINED_TYPE_SCHEMA = '${schema}' ${details.filter ? `and USER_DEFINED_TYPE_NAME like '%${details.filter}%'`: ``}`,
          `order by USER_DEFINED_TYPE_NAME asc`
        ].join(` `));
        break;
      }
    }

    query = selects.join(` UNION ALL `);

    let objects : any[] = await JobManager.runSQL([
      query,
      `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
    ].join(` `));

    return objects.map(object => ({
      type: object.OBJ_TYPE,
      schema,
      name: object.NAME,
      specificName: object.SPECNAME,
      text: object.TEXT,
      system: {
        schema: object.SYS_SCHEMA,
        name: object.SYS_NAME,
      },
      basedOn: {
        schema: object.BASE_SCHEMA,
        name: object.BASE_OBJ
      }
    }));
  }

  /**
   * @param schema Not user input
   * @param object Not user input
   */
  static async generateSQL(schema: string, object: string, internalType: string): Promise<string> {
    const lines = await JobManager.runSQL<{SRCDTA: string}>([
      `CALL QSYS2.GENERATE_SQL(?, ?, ?, CREATE_OR_REPLACE_OPTION => '1', PRIVILEGES_OPTION => '0')`
    ].join(` `), { parameters : [object, schema, internalType] });

    const generatedStatement = lines.map(line => line.SRCDTA).join(`\n`);
    const formatted = Statement.format(generatedStatement);

    return formatted;
  }
  
  static async deleteObject(schema: string, name:string, type: string): Promise<void> {
    const query = `DROP ${(this.isRoutineType(type) ? 'SPECIFIC ' : '') + type} IF EXISTS ${schema}.${name}`;
    await getInstance().getContent().runSQL(query);
  }
  
  static async renameObject(schema: string, oldName: string, newName: string, type: string): Promise<void> {
    const query = `RENAME ${type === 'view' ? 'table' : type} ${schema}.${oldName} TO ${newName}`;
    await getInstance().getContent().runSQL(query);
  }

  static isRoutineType(type: string): boolean {
    return type === `function` || type === `procedure`;
  }
}