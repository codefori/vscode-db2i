
import vscode from "vscode"
const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export default class View {
  static getColumns(schema: string, name: string): Promise<TableColumn[]> {
    const content = instance.getContent();
    
    return content.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${schema.toUpperCase()}' AND TABLE_NAME = '${name.toUpperCase()}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}