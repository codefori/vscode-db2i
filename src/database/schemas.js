const vscode = require(`vscode`);

const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

const Statement = require(`./statement`);

const typeMap = {
  'tables': [`T`, `P`],
  'views': [`V`],
  'aliases': [`A`]
};

module.exports = class Database {
  /**
   * @param {"tables"|"views"|"aliases"|"constraints"|"functions"|"variables"|"indexes"|"procedures"|"sequences"|"packages"|"triggers"|"types"|string} type 
   * @param {{filter?: string, offset?: number, limit?: number}} details
   */
  static async getObjects(schema, type, details = {}) {
    const content = instance.getContent();

    schema = schema.toUpperCase();

    let objects;

    switch (type) {
    case `tables`:
    case `views`:
    case `aliases`:
      objects = await content.runSQL([
        `select TABLE_NAME as NAME, TABLE_TEXT as TEXT, BASE_TABLE_SCHEMA as BASE_SCHEMA, BASE_TABLE_NAME as BASE_OBJ from QSYS2.SYSTABLES`,
        `where TABLE_SCHEMA = '${schema}' and TABLE_TYPE in (${typeMap[type].map(item => `'${item}'`).join(`, `)}) ${details.filter ? `and TABLE_NAME like '%${details.filter}%'`: ``}`,
        `order by TABLE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `constraints`:
      objects = await content.runSQL([
        `select CONSTRAINT_NAME as NAME, CONSTRAINT_TEXT as TEXT, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ from QSYS2.SYSCST`,
        `where CONSTRAINT_SCHEMA = '${schema}' ${details.filter ? `and CONSTRAINT_NAME like '%${details.filter}%'`: ``}`,
        `order by CONSTRAINT_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `functions`:
      objects = await content.runSQL([
        `select ROUTINE_NAME as NAME, ROUTINE_TEXT as TEXT from QSYS2.SYSFUNCS`,
        `where ROUTINE_SCHEMA = '${schema}' ${details.filter ? `and ROUTINE_NAME like '%${details.filter}%'`: ``}`,
        `order by ROUTINE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `variables`:
      objects = await content.runSQL([
        `select VARIABLE_NAME as NAME, VARIABLE_TEXT as TEXT from QSYS2.SYSVARIABLES`,
        `where VARIABLE_SCHEMA = '${schema}' ${details.filter ? `and VARIABLE_NAME like '%${details.filter}%'`: ``}`,
        `order by VARIABLE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `indexes`:
      objects = await content.runSQL([
        `select INDEX_NAME as NAME, INDEX_TEXT as TEXT, TABLE_SCHEMA as BASE_SCHEMA, TABLE_NAME as BASE_OBJ from QSYS2.SYSINDEXES`,
        `where INDEX_SCHEMA = '${schema}' ${details.filter ? `and INDEX_NAME like '%${details.filter}%'`: ``}`,
        `order by INDEX_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `procedures`:
      objects = await content.runSQL([
        `select ROUTINE_NAME as NAME, ROUTINE_TEXT as TEXT from QSYS2.SYSPROCS`,
        `where ROUTINE_SCHEMA = '${schema}' ${details.filter ? `and ROUTINE_NAME like '%${details.filter}%'`: ``}`,
        `order by ROUTINE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `sequences`:
      objects = await content.runSQL([
        `select SEQUENCE_NAME as NAME, SEQUENCE_TEXT as TEXT from QSYS2.SYSSEQUENCES`,
        `where SEQUENCE_SCHEMA = '${schema}' ${details.filter ? `and SEQUENCE_NAME like '%${details.filter}%'`: ``}`,
        `order by SEQUENCE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `packages`:
      objects = await content.runSQL([
        `select PACKAGE_NAME as NAME, PACKAGE_TEXT as TEXT, PROGRAM_SCHEMA as BASE_SCHEMA, PROGRAM_NAME as BASE_OBJ from QSYS2.SQLPACKAGE`,
        `where PACKAGE_SCHEMA = '${schema}' ${details.filter ? `and PACKAGE_NAME like '%${details.filter}%'`: ``}`,
        `order by PACKAGE_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `triggers`:
      objects = await content.runSQL([
        `select TRIGGER_NAME as NAME, TRIGGER_TEXT as TEXT, EVENT_OBJECT_SCHEMA as BASE_SCHEMA, EVENT_OBJECT_TABLE as BASE_OBJ from QSYS2.SYSTRIGGERS`,
        `where TRIGGER_SCHEMA = '${schema}' ${details.filter ? `and TRIGGER_NAME like '%${details.filter}%'`: ``}`,
        `order by TRIGGER_NAME asc`,
        `${details.limit ? `limit ${details.limit}` : ``} ${details.offset ? `offset ${details.offset}` : ``}`
      ].join(` `));
      break;

    case `types`:
      objects = await content.runSQL([
        `select USER_DEFINED_TYPE_NAME as NAME, TYPE_TEXT as TEXT from QSYS2.SYSTYPES`,
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
      basedOn: {
        schema: table.BASE_SCHEMA,
        name: table.BASE_OBJ
      }
    }));
  }

  /**
   * 
   * @param {string} schema 
   * @param {string} object 
   * @param {"tables"|"views"|"aliases"|"constraints"|"functions"|"variables"|"indexes"|"procedures"|"sequences"|"packages"|"triggers"|"types"|string} type 
   * @returns {Promise<string>}
   */
  static async generateSQL(schema, object, type) {
    const content = instance.getContent();

    schema = schema.toUpperCase();

    // TODO: fix?
    const lines = await content.runSQL([
      `CALL QSYS2.GENERATE_SQL('${object}', '${schema}', '${type}', CREATE_OR_REPLACE_OPTION => '1', PRIVILEGES_OPTION => '0')`
    ].join(` `));

    const generatedStatement = lines.map(line => line.SRCDTA).join(`\n`);
    const formatted = Statement.format(generatedStatement);

    return formatted;
  }
}