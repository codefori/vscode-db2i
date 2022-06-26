
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class Table {
  /**
   * @param {string} schema 
   * @param {string} name 
   * @returns {Promise<TableColumn[]>}
   */
  static async getItems(schema, name) {
    const content = instance.getContent();

    const sql = [
      `SELECT `,
      `  column.COLUMN_NAME,`,
      `  key.CONSTRAINT_NAME,`,
      `  column.DATA_TYPE, `,
      `  column.CHARACTER_MAXIMUM_LENGTH,`,
      `  column.NUMERIC_SCALE, `,
      `  column.NUMERIC_PRECISION,`,
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
      `WHERE column.TABLE_SCHEMA = '${schema.toUpperCase()}' AND column.TABLE_NAME = '${name.toUpperCase()}'`,
      `ORDER BY column.ORDINAL_POSITION`,
    ].join(` `);

    return content.runSQL(sql);
  }
}