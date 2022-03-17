
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

exports.data = {
  /** @type {{[schema: string]: object[]}} */
  routines: {},
  /** @type {{[path: string]: object[]}} */
  columns: {},
  /** @type {{[schema: string]: object[]}} */
  objects: {}
}

exports.refresh = () => {
  this.data.routines = {};
  this.data.columns = {};
  this.data.objects = {};
}

exports.hasConnection = () => {
  return instance.getConnection() !== undefined;
}

exports.routinesAvailable = async (schema) => {  schema = schema.toUpperCase();
  if (this.data.routines[schema]) {
    return this.data.routines[schema];
  }

  // No waiting for the content to load
  this.getRoutines(schema);

  return null;
}

/**
 * @param {string} schema 
 */
exports.getRoutines = async (schema) => {
  const content = instance.getContent();

  schema = schema.toUpperCase();

  if (this.data.routines[schema]) {
    return this.data.routines[schema];
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

  this.data.routines[schema] = routines.map(proc => {
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

  return this.data.routines[schema];
}

exports.getColumns = async (schema, name) => {
  const content = instance.getContent();

  schema = schema.toUpperCase();
  name = name.toUpperCase();

  const key = `${schema}.${name}`;

  if (this.data.columns[key]) {
    return this.data.columns[key];
  }

  const columns = await content.runSQL([
    `SELECT * FROM QSYS2.SYSCOLUMNS2`,
    `WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${name}'`,
    `ORDER BY ORDINAL_POSITION`
  ].join(` `));
  
  this.data.columns[key] = columns;

  return this.data.columns[key];
}

exports.getObjects = async (schema) => {
  const content = instance.getContent();

  schema = schema.toUpperCase();

  if (this.data.objects[schema]) {
    return this.data.objects[schema];
  }

  const objects = await content.runSQL([
    `SELECT TABLE_NAME, TABLE_TYPE, TABLE_TEXT FROM QSYS2.SYSTABLES`,
    `WHERE TABLE_SCHEMA = '${schema}' and TABLE_TYPE in ('T', 'P', 'V')`,
  ].join(` `));

  this.data.objects[schema] = objects;

  return this.data.objects[schema];
}