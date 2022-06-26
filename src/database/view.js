
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class View {
  static getColumns(schema, name) {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${schema.toUpperCase()}' AND TABLE_NAME = '${name.toUpperCase()}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}