import vscode from "vscode"
import { getInstance } from "../base";

const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

import Statement from "./statement";
import { JobManager } from "../config";

const internalTypes: {[typeString: string]: string} = {
  "tables": "TABLE",
  "views": "VIEW",
  "aliaes": "ALIAS",
  "constraints": "CONSTRAINT",
  "functions": "FUNCTION",
  "variables": "VARIABLE",
  "indexes": "INDEXES",
  "procedures": "PROCEDURE",
  "sequences": "SEQUENCE",
  "packages": "PACKAGE",
  "triggers": "TRIGGERS",
  "types": "TYPE"
};

type SQLType = "tables"|"views"|"aliases"|"constraints"|"functions"|"variables"|"indexes"|"procedures"|"sequences"|"packages"|"triggers"|"types";
type PageData = {filter?: string, offset?: number, limit?: number};

const typeMap = {
  'tables': [`T`, `P`],
  'views': [`V`],
  'aliases': [`A`]
};

export default class Database {
  static async getObjects(schema: string, type: SQLType, details: PageData = {}): Promise<BasicSQLObject[]> {
    // The database doesn't store the object name with the quotes.
    schema = Statement.noQuotes(Statement.delimName(schema));

    let objects;

    switch (type) {
    case `tables`:
    case `views`:
    case `aliases`:
      objects = await JobManager.runSQL([
        `select TABLE_NAME as NAME, TABLE_TEXT as TEXT, BASE_TABLE_SCHEMA as BASE_SCHEMA, BASE_TABLE_NAME as BASE_OBJ, SYSTEM_TABLE_NAME as SYS_NAME, SYSTEM_TABLE_SCHEMA as SYS_SCHEMA from QSYS2.SYSTABLES`,
        `where TABLE_SCHEMA = '${schema}' and TABLE_TYPE in (${typeMap[type].map(item => `'${item}'`).join(`, `)}) ${details.filter ? `and TABLE_NAME like '%${details.filter}%'`: ``}`,
        `order by TABLE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `constraints`:
      objects = await JobManager.runSQL([
        `select CONSTRAINT_NAME as NAME, CONSTRAINT_TEXT as TEXT, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ, SYSTEM_TABLE_NAME as SYS_NAME, SYSTEM_TABLE_SCHEMA as SYS_SCHEMA from QSYS2.SYSCST`,
        `where CONSTRAINT_SCHEMA = '${schema}' ${details.filter ? `and CONSTRAINT_NAME like '%${details.filter}%'`: ``}`,
        `order by CONSTRAINT_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `functions`:
      objects = await JobManager.runSQL([
        `select ROUTINE_NAME as NAME, coalesce(ROUTINE_TEXT, LONG_COMMENT) as TEXT from QSYS2.SYSFUNCS`,
        `where ROUTINE_SCHEMA = '${schema}' ${details.filter ? `and ROUTINE_NAME like '%${details.filter}%'`: ``} and FUNCTION_ORIGIN in ('E','U')`,
        `order by ROUTINE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `variables`:
      objects = await JobManager.runSQL([
        `select VARIABLE_NAME as NAME, VARIABLE_TEXT as TEXT, SYSTEM_VAR_NAME as SYS_NAME, SYSTEM_VAR_SCHEMA as SYS_SCHEMA from QSYS2.SYSVARIABLES`,
        `where VARIABLE_SCHEMA = '${schema}' ${details.filter ? `and VARIABLE_NAME like '%${details.filter}%'`: ``}`,
        `order by VARIABLE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `indexes`:
      objects = await JobManager.runSQL([
        `select INDEX_NAME as NAME, INDEX_TEXT as TEXT, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ, SYSTEM_INDEX_NAME as SYS_NAME, SYSTEM_INDEX_SCHEMA as SYS_SCHEMA from QSYS2.SYSINDEXES`,
        `where INDEX_SCHEMA = '${schema}' ${details.filter ? `and INDEX_NAME like '%${details.filter}%'`: ``}`,
        `order by INDEX_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `procedures`:
      objects = await JobManager.runSQL([
        `select ROUTINE_NAME as NAME, ROUTINE_TEXT as TEXT from QSYS2.SYSPROCS`,
        `where ROUTINE_SCHEMA = '${schema}' ${details.filter ? `and ROUTINE_NAME like '%${details.filter}%'`: ``}`,
        `order by ROUTINE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `sequences`:
      objects = await JobManager.runSQL([
        `select SEQUENCE_NAME as NAME, SEQUENCE_TEXT as TEXT, SYSTEM_SEQ_NAME as SYS_NAME, SYSTEM_SEQ_SCHEMA as SYS_SCHEMA from QSYS2.SYSSEQUENCES`,
        `where SEQUENCE_SCHEMA = '${schema}' ${details.filter ? `and SEQUENCE_NAME like '%${details.filter}%'`: ``}`,
        `order by SEQUENCE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `packages`:
      objects = await JobManager.runSQL([
        `select PACKAGE_NAME as NAME, PACKAGE_TEXT as TEXT, PROGRAM_SCHEMA as BASE_SCHEMA, PROGRAM_NAME as BASE_OBJ from QSYS2.SQLPACKAGE`,
        `where PACKAGE_SCHEMA = '${schema}' ${details.filter ? `and PACKAGE_NAME like '%${details.filter}%'`: ``}`,
        `order by PACKAGE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `triggers`:
      objects = await JobManager.runSQL([
        `select TRIGGER_NAME as NAME, TRIGGER_TEXT as TEXT, EVENT_OBJECT_SCHEMA as BASE_SCHEMA, EVENT_OBJECT_TABLE as BASE_OBJ from QSYS2.SYSTRIGGERS`,
        `where TRIGGER_SCHEMA = '${schema}' ${details.filter ? `and TRIGGER_NAME like '%${details.filter}%'`: ``}`,
        `order by TRIGGER_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `types`:
      objects = await JobManager.runSQL([
        `select USER_DEFINED_TYPE_NAME as NAME, TYPE_TEXT as TEXT, SYSTEM_TYPE_NAME as SYS_NAME, SYSTEM_TYPE_SCHEMA as SYS_SCHEMA from QSYS2.SYSTYPES`,
        `where USER_DEFINED_TYPE_SCHEMA = '${schema}' ${details.filter ? `and USER_DEFINED_TYPE_NAME like '%${details.filter}%'`: ``}`,
        `order by USER_DEFINED_TYPE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;
    }

    return objects.map(table => ({
      type,
      schema,
      name: table.NAME,
      text: table.TEXT,
      system: {
        schema: table.SYS_SCHEMA,
        name: table.SYS_NAME,
      },
      basedOn: {
        schema: table.BASE_SCHEMA,
        name: table.BASE_OBJ
      }
    }));
  }

  static async generateSQL(schema: string, object: string, type: SQLType): Promise<string> {
    schema = Statement.noQuotes(Statement.delimName(schema));
    object = Statement.noQuotes(Statement.delimName(object));

    // Remove plural and convert to uppercase. Needs work
    let validType: string = internalTypes[type];

    const lines = await JobManager.runSQL<{SRCDTA: string}>([
      `CALL QSYS2.GENERATE_SQL('${object}', '${schema}', '${validType}', CREATE_OR_REPLACE_OPTION => '1', PRIVILEGES_OPTION => '0')`
    ].join(` `));

    const generatedStatement = lines.map(line => line.SRCDTA).join(`\n`);
    const formatted = Statement.format(generatedStatement);

    return formatted;
  }
  
  static async deleteObject(schema: string, name:string, type: string): Promise<void> {
    const query = `DROP ${type} IF EXISTS ${schema}.${name}`;
    await getInstance().getContent().runSQL(query);
  }
  
  static async renameObject(schema: string, oldName: string, newName: string, type: string): Promise<void> {
    const query = `RENAME ${type === 'view' ? 'table' : type} ${schema}.${oldName} TO ${newName}`;
    await getInstance().getContent().runSQL(query);
  }
}