
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class View {
  constructor(schema, viewName) {
    this.schema = schema.toUpperCase();
    this.viewName = viewName.toUpperCase();
  }

  async getInfo() {
    const content = instance.getContent();

    const [info] = await content.runSQL([
      `SELECT * FROM QSYS2.SYSVIEWS`,
      `WHERE TABLE_SCHEMA = '${this.schema}' AND TABLE_NAME = '${this.viewName}'`
    ].join(` `));

    return info;
  }

  getColumns() {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${this.schema}' AND TABLE_NAME = '${this.viewName}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}