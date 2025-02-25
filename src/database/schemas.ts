
import path from "path";
import { getInstance } from "../base";
import { JobManager } from "../config";

export type SQLType = "schemas" | "tables" | "views" | "aliases" | "constraints" | "functions" | "variables" | "indexes" | "procedures" | "sequences" | "packages" | "triggers" | "types" | "logicals";
export type PageData = { filter?: string, offset?: number, limit?: number };

const typeMap = {
  'tables': [`T`, `P`, `M`],
  'views': [`V`],
  'aliases': [`A`],
  'logicals': [`L`],
};

export const AllSQLTypes: SQLType[] = ["tables", "views", "aliases", "constraints", "functions", "variables", "indexes", "procedures", "sequences", "packages", "triggers", "types", "logicals"];

export const SQL_ESCAPE_CHAR = `\\`;

type BasicColumnType = string|number;
interface PartStatementInfo {clause: string, parameters: BasicColumnType[]};

function getFilterClause(againstColumn: string, filter: string, noAnd?: boolean): PartStatementInfo {
  if (!filter) {
    return {clause: ``, parameters: []};
  }

  let clause = `${noAnd ? '' : 'AND'} UPPER(${againstColumn})`;
  let parameters: BasicColumnType[] = [];

  if (filter.endsWith(`*`)) {
    clause += ` LIKE ? CONCAT '%'`;
    parameters.push(filter.slice(0, -1).toUpperCase());
  } else {
    clause += ` LIKE '%' CONCAT ? CONCAT '%'`;
    parameters.push(filter.toUpperCase());
  }

  if (filter.indexOf('\\') >= 0) {
    clause += ` ESCAPE '\\'`;
  }

  return {
    clause,
    parameters
  };
}

const BASE_RESOLVE_SELECT = [
  `select `,
  `OBJLONGNAME as name, `,
  `OBJLONGSCHEMA as schema, `,
  `case `,
  `  when objtype = '*LIB' then 'SCHEMA'`,
  `  else SQL_OBJECT_TYPE`,
  `end as sqlType`,
].join(` `);

export default class Schemas {
  /**
   * Resolves to the following SQL types: SCHEMA, TABLE, VIEW, ALIAS, INDEX, FUNCTION and PROCEDURE
   */
  static async resolveObjects(sqlObjects: {name: string, schema?: string}[]): Promise<ResolvedSqlObject[]> {
    let statements: string[] = [];
    let parameters: BasicColumnType[] = [];

    // First, we use OBJECT_STATISTICS to resolve the object based on the library list.
    // But, if the object is qualified with a schema, we need to use that schema to get the correct object.
    for (const obj of sqlObjects) {
      if (obj.schema) {
        statements.push(
          `${BASE_RESOLVE_SELECT} from table(qsys2.object_statistics(?, '*ALL', object_name => ?)) where SQL_OBJECT_TYPE IS NOT NULL`
        );
        parameters.push(obj.schema, obj.name);
      } else {
        statements.push(
          `${BASE_RESOLVE_SELECT} from table(qsys2.object_statistics('*LIBL', '*ALL', object_name => ?)) where SQL_OBJECT_TYPE IS NOT NULL`
        );
        parameters.push(obj.name);
      }
    }

    // We have to do a little bit more logic for routines, because they are not included properly in OBJECT_STATISTICS.
    // So we do a join against the library list view and SYSROUTINES (which has a list of all routines in a given schema)
    // to get the correct schema and name.
    const unqualified = sqlObjects.filter(obj => !obj.schema).map(obj => obj.name);
    const qualified = sqlObjects.filter(obj => obj.schema);
    const qualifiedClause = qualified.map(obj => `(s.routine_name = ? AND s.routine_schema = ?)`).join(` OR `);

    let baseStatement = [
      `select s.routine_name as name, l.schema_name as schema, s.ROUTINE_TYPE as sqlType`,
      `from qsys2.library_list_info as l`,
      `right join qsys2.sysroutines as s on l.schema_name = s.routine_schema`,
      `where `,
      `  l.schema_name is not null and`,
      `  s.routine_name in (${sqlObjects.map(() => `?`).join(`, `)})`,
    ].join(` `);
    parameters.push(...unqualified);

    if (qualified.length > 0) {
      baseStatement += ` and (${qualifiedClause})`;
      parameters.push(...qualified.flatMap(obj => [obj.name, obj.schema]));
    }

    statements.push(baseStatement);

    if (statements.length === 0) {
      return [];
    }

    const query = `${statements.join(" UNION ALL ")}`;
    const objects: any[] = await JobManager.runSQL(query, { parameters });
    
    const resolvedObjects: ResolvedSqlObject[] = objects.map(object => ({
      name: object.NAME,
      schema: object.SCHEMA,
      sqlType: object.SQLTYPE
    }));

    return resolvedObjects;
  }

  /**
   * @param schema Not user input
   */
  static async getObjects(schema: string, types: SQLType[], details: PageData = {}): Promise<BasicSQLObject[]> {
    const selects: string[] = [];
    let parameters: (string|number)[] = [];
    let filter: PartStatementInfo;

    // If there are multiple types, we build a union. It's important that the ordering of the columns in the selects are consistant:
    // OBJ_TYPE, TABLE_TYPE, NAME, TEXT, SYS_NAME, SYS_SCHEMA, SPECNAME, BASE_SCHEMA, BASE_OBJ

    for (const type of types) {
      switch (type) {
        case `schemas`:
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, SCHEMA_NAME as NAME, SCHEMA_TEXT as TEXT, SYSTEM_SCHEMA_NAME as SYS_NAME, '' as SYS_SCHEMA, '' as SPECNAME, '' as BASE_SCHEMA, '' as BASE_OBJ`,
            `from QSYS2.SYSSCHEMAS`,
            details.filter ? `where UPPER(SCHEMA_NAME) = ? or UPPER(SYSTEM_SCHEMA_NAME) = ?` : ``,
          ].join(` `));

          if (details.filter) {
            parameters.push(details.filter, details.filter);
          }
          break;

        case `tables`:
        case `views`:
        case `aliases`:
        case `logicals`:
          filter = getFilterClause(`TABLE_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, TABLE_TYPE as TABLE_TYPE, TABLE_NAME as NAME, TABLE_TEXT as TEXT, SYSTEM_TABLE_NAME as SYS_NAME, SYSTEM_TABLE_SCHEMA as SYS_SCHEMA, '' as SPECNAME, BASE_TABLE_SCHEMA as BASE_SCHEMA, BASE_TABLE_NAME as BASE_OBJ`,
            `from QSYS2.SYSTABLES`,
            `where TABLE_SCHEMA = ? and TABLE_TYPE in (${typeMap[type].map(item => `'${item}'`).join(`, `)}) ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `constraints`:
          filter = getFilterClause(`CONSTRAINT_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, CONSTRAINT_NAME as NAME, CONSTRAINT_TEXT as TEXT, SYSTEM_TABLE_NAME as SYS_NAME, SYSTEM_TABLE_SCHEMA as SYS_SCHEMA, '' as SPECNAME, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ`,
            `from QSYS2.SYSCST`,
            `where CONSTRAINT_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `functions`:
          filter = getFilterClause(`ROUTINE_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, ROUTINE_NAME as NAME, coalesce(ROUTINE_TEXT, LONG_COMMENT) as TEXT, '' as SYS_NAME, '' as SYS_SCHEMA, SPECIFIC_NAME as SPECNAME, '' as BASE_SCHEMA, '' as BASE_OBJ`,
            `from QSYS2.SYSFUNCS`,
            `where ROUTINE_SCHEMA = ? ${filter.clause} and FUNCTION_ORIGIN in ('E','U')`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `variables`:
          filter = getFilterClause(`VARIABLE_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, VARIABLE_NAME as NAME, VARIABLE_TEXT as TEXT, SYSTEM_VAR_NAME as SYS_NAME, SYSTEM_VAR_SCHEMA as SYS_SCHEMA, '' as SPECNAME, '' as BASE_SCHEMA, '' as BASE_OBJ`,
            `from QSYS2.SYSVARIABLES`,
            `where VARIABLE_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `indexes`:
          filter = getFilterClause(`INDEX_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, INDEX_NAME as NAME, INDEX_TEXT as TEXT, SYSTEM_INDEX_NAME as SYS_NAME, SYSTEM_INDEX_SCHEMA as SYS_SCHEMA, '' as SPECNAME, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ`,
            `from QSYS2.SYSINDEXES`,
            `where INDEX_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `procedures`:
          filter = getFilterClause(`ROUTINE_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, ROUTINE_NAME as NAME, ROUTINE_TEXT as TEXT, '' as SYS_NAME, '' as SYS_SCHEMA, SPECIFIC_NAME as SPECNAME, '' as BASE_SCHEMA, '' as BASE_OBJ`,
            `from QSYS2.SYSPROCS`,
            `where ROUTINE_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `sequences`:
          filter = getFilterClause(`SEQUENCE_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, SEQUENCE_NAME as NAME, SEQUENCE_TEXT as TEXT, SYSTEM_SEQ_NAME as SYS_NAME, SYSTEM_SEQ_SCHEMA as SYS_SCHEMA, '' as SPECNAME, '' as BASE_SCHEMA, '' as BASE_OBJ`,
            `from QSYS2.SYSSEQUENCES`,
            `where SEQUENCE_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        // case `packages`:
        //   selects.push([
        //     `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, PACKAGE_NAME as NAME, PACKAGE_TEXT as TEXT, PROGRAM_SCHEMA as BASE_SCHEMA, PROGRAM_NAME as BASE_OBJ, `,
        //     `  '' as SYS_SCHEMA, '' as SYS_NAME, '' as SPECNAME`,
        //     `from QSYS2.SQLPACKAGE`,
        //     `where PACKAGE_SCHEMA = '${schema}' ${details.filter ? `and PACKAGE_NAME like '%${filter.clause}%'`: ``}`,
        //   ].join(` `));
        //   break;

        case `triggers`:
          filter = getFilterClause(`TRIGGER_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, TRIGGER_NAME as NAME, TRIGGER_TEXT as TEXT, '' as SYS_NAME, '' as SYS_SCHEMA, '' as SPECNAME, EVENT_OBJECT_SCHEMA as BASE_SCHEMA, EVENT_OBJECT_TABLE as BASE_OBJ`,
            `from QSYS2.SYSTRIGGERS`,
            `where TRIGGER_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;

        case `types`:
          filter = getFilterClause(`USER_DEFINED_TYPE_NAME`, details.filter);
          selects.push([
            `select '${type}' as OBJ_TYPE, '' as TABLE_TYPE, USER_DEFINED_TYPE_NAME as NAME, TYPE_TEXT as TEXT, SYSTEM_TYPE_NAME as SYS_NAME, SYSTEM_TYPE_SCHEMA as SYS_SCHEMA, '' as SPECNAME, '' as BASE_SCHEMA, '' as BASE_OBJ`,
            `from QSYS2.SYSTYPES`,
            `where USER_DEFINED_TYPE_SCHEMA = ? ${filter.clause}`,
          ].join(` `));

          parameters.push(schema, ...filter.parameters);
          break;
      }
    }

    const query = `with results as (${selects.join(" UNION ALL ")}) select * from results Order by QSYS2.DELIMIT_NAME(NAME) asc`;

    const objects: any[] = await JobManager.runSQL(
      [
      query,
      `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `),
      {
        parameters
      }
    );

    return objects.map(object => ({
      type: object.OBJ_TYPE,
      tableType: object.TABLE_TYPE,
      schema,
      name: object.NAME || undefined,
      specificName: object.SPECNAME || undefined,
      text: object.TEXT || undefined,
      system: {
        schema: object.SYS_SCHEMA || undefined,
        name: object.SYS_NAME || undefined,
      },
      basedOn: {
        schema: object.BASE_SCHEMA || undefined,
        name: object.BASE_OBJ || undefined
      }
    }));
  }

  /**
   * @param schema Not user input
   * @param object Not user input
   */
  static async generateSQL(schema: string, object: string, internalType: string): Promise<string> {
    const instance = getInstance();
    const connection = instance.getConnection();

    const result = await connection.withTempDirectory<string>(async (tempDir) => {
      const tempFilePath = path.posix.join(tempDir, `generatedSql.sql`);
      await JobManager.runSQL<{ SRCDTA: string }>([
        `CALL QSYS2.GENERATE_SQL( DATABASE_OBJECT_NAME => ?, DATABASE_OBJECT_LIBRARY_NAME => ?, DATABASE_OBJECT_TYPE => ?
                                , CREATE_OR_REPLACE_OPTION => '1', PRIVILEGES_OPTION => '0'
                                , DATABASE_SOURCE_FILE_NAME => '*STMF'
                                , STATEMENT_FORMATTING_OPTION => '0'
                                , SOURCE_STREAM_FILE => '${tempFilePath}'
                                , SOURCE_STREAM_FILE_END_OF_LINE => 'LF'
                                , SOURCE_STREAM_FILE_CCSID => 1208 )`
      ].join(` `), { parameters: [object, schema, internalType] });

      // TODO: eventually .content -> .getContent(), it's not available yet
      const contents = (await connection.content.downloadStreamfileRaw(tempFilePath)).toString();
      return contents;
    })

    return result;
  }

  static async deleteObject(schema: string, name: string, type: string): Promise<void> {
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

  static clearAdvisedIndexes(schema: string, name?: string) {
    let query = `DELETE FROM QSYS2.SYSIXADV WHERE TABLE_SCHEMA = '${schema}'`;

    if (name) {
      query += `and TABLE_NAME = '${name}'`;
    }

    return getInstance().getContent().runSQL(query);
  }
}