
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

const Table = require(`../database/table`);

exports.data = {
  routines: [],
  /** @type {{[path: string]: object[]}} */
  tables: {},
}

exports.refresh = async () => {
  const config = instance.getConfig();

  const schemas = config.databaseBrowserList;

  this.data.routines = await this.getRoutines(schemas);
}

/**
 * @param {string[]} schemas 
 */
exports.getRoutines = async (schemas) => {
  const content = instance.getContent();

  const schemaList = schemas.map(schema => schema.toUpperCase());

  [`QSYS2`, `QSYS`].forEach(schema => {
    if (!schemaList.includes(schema)) schemaList.push(schema);
  });
  
  const routineStatement = [
    `select SPECIFIC_SCHEMA, SPECIFIC_NAME, ROUTINE_SCHEMA as PRETTY_SCHEMA, ROUTINE_NAME as PRETTY_NAME, MAX_DYNAMIC_RESULT_SETS as RESULT_SETS, ROUTINE_TYPE, EXTERNAL_NAME, LONG_COMMENT`,
    `from QSYS2.SYSROUTINES where ROUTINE_SCHEMA in (${schemaList.map(s => `'${s.toUpperCase()}'`).join(`, `)})`,
  ].join(` `);

  const routines = await content.runSQL(routineStatement);

  const parmStatement = [
    `select SPECIFIC_SCHEMA, SPECIFIC_NAME, ORDINAL_POSITION, PARAMETER_MODE, PARAMETER_NAME, DATA_TYPE, IS_NULLABLE, DEFAULT`,
    `from QSYS2.SYSPARMS where SPECIFIC_SCHEMA in (${schemaList.map(s => `'${s.toUpperCase()}'`).join(`, `)})`,
  ].join(` `);

  const parms = await content.runSQL(parmStatement);

  return routines.map(proc => {
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
}

exports.getTable = async (schema, name) => {
  schema = schema.toUpperCase();
  name = name.toUpperCase();

  const key = `${schema}.${name}`;

  if (this.data.tables[key]) {
    return this.data.tables[key];
  }

  const table = new Table(schema, name);
  
  this.data.tables[key] = await table.getColumns();

  return this.data.tables[key];
}