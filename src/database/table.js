
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class Table {
  constructor(schema, tableName) {
    this.schema = schema.toUpperCase();
    this.tableName = tableName.toUpperCase();
  }

  async getColumnInfo() {
    const content = instance.getContent();

    const sql = [
      `SELECT `,
      `  column.COLUMN_NAME,`,
      `  key.CONSTRAINT_NAME,`,
      `  column.DATA_TYPE, `,
      `  column.LENGTH, `,
      `  column.NUMERIC_SCALE, `,
      `  column.IS_NULLABLE, `,
      `  column.HAS_DEFAULT, `,
      `  column.COLUMN_DEFAULT, `,
      `  column.COLUMN_TEXT, `,
      `  column.IS_IDENTITY`,
      `FROM QSYS2.SYSCOLUMNS2 as column`,
      `LEFT JOIN QSYS2.syskeycst as key`,
      `  on `,
      `    column.table_schema = key.table_schema and`,
      `    column.table_name = key.table_name and`,
      `    column.column_name = key.column_name`,
      `WHERE column.TABLE_SCHEMA = '${this.schema}' AND column.TABLE_NAME = '${this.tableName}'`,
      `ORDER BY column.ORDINAL_POSITION`,
    ].join(` `);

    const rows = await content.runSQL(sql);

  }

  async getInfo() {
    const content = instance.getContent();

    const [info] = await content.runSQL([
      `SELECT * FROM QSYS2.SYSTABLES`,
      `WHERE TABLE_SCHEMA = '${this.schema}' AND TABLE_NAME = '${this.tableName}'`
    ].join(` `));

    return info;
  }

  getColumns() {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS2`,
      `WHERE TABLE_SCHEMA = '${this.schema}' AND TABLE_NAME = '${this.tableName}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }

  getConstraints() {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSCST`,
      `WHERE TABLE_SCHEMA = '${this.schema}' AND TABLE_NAME = '${this.tableName}'`,
      `order by CONSTRAINT_NAME asc`
    ].join(` `));
  }

  getConstraintColumns() {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSCSTCOL`,
      `WHERE TABLE_SCHEMA = '${this.schema}' AND TABLE_NAME = '${this.tableName}'`
    ].join(` `));
  }

  getForeignKeys() {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT a.CONSTRAINT_NAME AS NAME, d.COLUMN_NAME as KEY_COLUMN, d.TABLE_SCHEMA as PARENT_SCHEMA, d.TABLE_NAME as PARENT_TABLE, c.DELETE_RULE as DELETE_RULE, c.UPDATE_RULE as UPDATE_RULE`,
      `FROM QSYS2.SYSCST as A `,
      `inner join QSYS2.SYSCSTCOL as B`,
      `    on`,
      `        a.CONSTRAINT_NAME = b.CONSTRAINT_NAME and a.CONSTRAINT_SCHEMA = b.CONSTRAINT_SCHEMA`,
      `inner join qsys2.SYSREFCST as C`,
      `    on`,
      `        C.CONSTRAINT_SCHEMA = a.CONSTRAINT_SCHEMA and C.CONSTRAINT_NAME = a.CONSTRAINT_NAME`,
      `inner join qsys2.SYSCSTCOL as D`,
      `    on`,
      `        D.CONSTRAINT_SCHEMA = a.CONSTRAINT_SCHEMA and D.CONSTRAINT_NAME = c.UNIQUE_CONSTRAINT_NAME`,
      `WHERE `,
      `    a.CONSTRAINT_TYPE in ('FOREIGN KEY') AND `,
      `    a.TABLE_NAME = '${this.tableName}' AND `,
      `    a.CONSTRAINT_SCHEMA = '${this.schema}'`
    ].join(` `));
  }

  /**
   * list comes from getConstraints().filter(c => c.CONSTRAINT_TYPE === 'CHECK')
   * @param {{CONSTRAINT_SCHEMA: string, CONSTRAINT_NAME: string, ENABLED: string, CONSTRAINT_TEXT: string}[]} list 
   */
  async getCheckConstraintsInfo(list) {
    if (list.length === 0) return [];

    const content = instance.getContent();

    const sql = [
      `SELECT CONSTRAINT_NAME, CHECK_CLAUSE FROM QSYS2.SYSCHKCST`,
      `WHERE ${list.map(cst => `(CONSTRAINT_SCHEMA = '${cst.CONSTRAINT_SCHEMA}' AND CONSTRAINT_NAME = '${cst.CONSTRAINT_NAME}')`).join(` and `)}`
    ].join(` `);
    
    const rows = await content.runSQL(sql);

    return rows.map(row => {
      const {CONSTRAINT_NAME, CHECK_CLAUSE} = row;
      const existingInfo = list.find(cst => cst.CONSTRAINT_NAME === CONSTRAINT_NAME);

      return {
        name: CONSTRAINT_NAME,
        checkClause: CHECK_CLAUSE,
        enabled: existingInfo.ENABLED,
        text: existingInfo.CONSTRAINT_TEXT
      };
    });
  }
}