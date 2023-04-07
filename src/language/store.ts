
import vscode from "vscode"
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

interface DataCache {
  routines: {[schema: string]: Routine[]};
  columns: {[schema: string]: TableColumn[]};
  objects: {[schema: string]: SQLObjectBasic[]};
}

export let data: DataCache = {
  routines: {},
  columns: {},
  objects: {}
}

export function refresh () {
  data.routines = {};
  data.columns = {};
  data.objects = {};
}

export function hasConnection () {
  return instance.getConnection() !== undefined;
}

export async function routinesAvailable (schema: string) {  
  schema = schema.toUpperCase();
  if (data.routines[schema]) {
    return data.routines[schema];
  }

  // No waiting for the content to load
  getRoutines(schema);

  return null;
}

export async function getRoutines (schema: string): Promise<Routine[]> {
  const content = instance.getContent();

  schema = schema.toUpperCase();

  if (data.routines[schema]) {
    return data.routines[schema];
  }
  
  const routineStatement = [
    `select SPECIFIC_SCHEMA, SPECIFIC_NAME, ROUTINE_SCHEMA as PRETTY_SCHEMA, ROUTINE_NAME as PRETTY_NAME, MAX_DYNAMIC_RESULT_SETS as RESULT_SETS, ROUTINE_TYPE, EXTERNAL_NAME, LONG_COMMENT`,
    `from QSYS2.SYSROUTINES where ROUTINE_SCHEMA = '${schema}'`,
  ].join(` `);

  const routines = await content.runSQL(routineStatement);

  const parmStatement = [
    `select SPECIFIC_SCHEMA, SPECIFIC_NAME, ORDINAL_POSITION, PARAMETER_MODE, PARAMETER_NAME, DATA_TYPE, IS_NULLABLE, DEFAULT`,
    `from QSYS2.SYSPARMS where SPECIFIC_SCHEMA = '${schema}'`,
  ].join(` `);

  const parms = await content.runSQL(parmStatement);

  data.routines[schema] = routines.map(proc => {
    return {
      schema: proc.PRETTY_SCHEMA,
      name: proc.PRETTY_NAME,
      type: proc.ROUTINE_TYPE,
      externalName: proc.EXTERNAL_NAME,
      resultSets: proc.RESULT_SETS > 0,
      comment: proc.LONG_COMMENT,
      parameters: parms
        .filter(parm => parm.SPECIFIC_SCHEMA === proc.SPECIFIC_SCHEMA && parm.SPECIFIC_NAME === proc.SPECIFIC_NAME)
        .map(parm => {
          return {
            order: parm.ORDINAL_POSITION,
            mode: parm.PARAMETER_MODE,
            name: parm.PARAMETER_NAME,
            type: parm.DATA_TYPE,
            nullable: parm.IS_NULLABLE === `YES`,
            default: parm.DEFAULT
          }
        })
        .sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0))
    };
  });

  return data.routines[schema];
}

export async function getColumns (schema: string, name: string): Promise<TableColumn[]> {
  const content = instance.getContent();

  schema = schema.toUpperCase();
  name = name.toUpperCase();

  const key = `${schema}.${name}`;

  if (data.columns[key]) {
    return data.columns[key];
  }

  const columns = await content.runSQL([
    `SELECT * FROM QSYS2.SYSCOLUMNS2`,
    `WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${name}'`,
    `ORDER BY ORDINAL_POSITION`
  ].join(` `));
  
  data.columns[key] = columns;

  return data.columns[key];
}

export async function getObjects (schema: string): Promise<SQLObjectBasic[]> {
  const content = instance.getContent();

  schema = schema.toUpperCase();

  if (data.objects[schema]) {
    return data.objects[schema];
  }

  const objects = await content.runSQL([
    `SELECT TABLE_NAME, TABLE_TYPE, TABLE_TEXT FROM QSYS2.SYSTABLES`,
    `WHERE TABLE_SCHEMA = '${schema}' and TABLE_TYPE in ('T', 'P', 'V')`,
  ].join(` `));

  data.objects[schema] = objects;

  return data.objects[schema];
}