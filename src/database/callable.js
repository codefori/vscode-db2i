
const vscode = require(`vscode`);
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

module.exports = class Callable {
  static getParms(schema, name) {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSPARMS`,
      `WHERE SPECIFIC_SCHEMA = '${schema.toUpperCase()}' AND SPECIFIC_NAME = (select SPECIFIC_NAME from qsys2.sysroutines where ROUTINE_SCHEMA = '${schema.toUpperCase()}' and ROUTINE_NAME = '${name.toUpperCase()}')`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}