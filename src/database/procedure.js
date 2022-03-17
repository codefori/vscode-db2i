
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class Procedure {
  constructor(schema, procName) {
    this.schema = schema.toUpperCase();
    this.procName = procName.toUpperCase();

    /** @type {string} */
    this.specificName = null;
  }

  async getInfo() {
    const content = instance.getContent();

    const [info] = await content.runSQL([
      `SELECT * FROM QSYS2.SYSPROCS`,
      `WHERE SPECIFIC_SCHEMA = '${this.schema}' AND ROUTINE_NAME = '${this.procName}'`
    ].join(` `));

    if (info.SPECIFIC_NAME) {
      this.specificName = info.SPECIFIC_NAME;
    }

    return info;
  }

  getParms() {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = '${this.schema}' AND SPECIFIC_NAME = '${this.specificName}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}