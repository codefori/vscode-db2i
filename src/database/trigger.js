
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class View {
  constructor(schema, viewName) {
    this.schema = schema.toUpperCase();
    this.name = viewName.toUpperCase();
  }

  async getInfo() {
    const content = instance.getContent();

    const [info] = await content.runSQL([
      `SELECT * FROM QSYS2.SYSTRIGGERS`,
      `WHERE TRIGGER_SCHEMA = '${this.schema}' AND TRIGGER_NAME = '${this.name}'`
    ].join(` `));

    return info;
  }
}