
import vscode from "vscode"
import { getInstance } from "../base";

const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

export default class Table {
  /**
   * @param {string} schema 
   * @param {string} name 
   * @returns {Promise<TableColumn[]>}
   */
  static async getItems(schema: string, name: string): Promise<TableColumn[]> {
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

  static getRelatedObjects(schema: string, name: string): void {
    const content = `SELECT SQL_NAME, SYSTEM_NAME, SCHEMA_NAME, LIBRARY_NAME, SQL_OBJECT_TYPE, 
              OBJECT_OWNER, LAST_ALTERED, OBJECT_TEXT, LONG_COMMENT 
              FROM TABLE(SYSTOOLS.RELATED_OBJECTS('${schema}', '${name}')) ORDER BY SQL_OBJECT_TYPE, SQL_NAME`;
    
    vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
      content,
      type: `statement`,
      open: false,
    });
  }

  static getIndexes(schema: string, name: string): void {
    // Maybe choose/rename which columns to get?
    const content = `SELECT * FROM QSYS2.SYSINDEXSTAT WHERE TABLE_SCHEMA = '${schema}' and TABLE_NAME = '${name}'`;
    vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
      content,
      type: `statement`,
      open: false,
    });
  }

  static getAdvisedIndexes(schema: string, name: string): void {
    // Maybe choose/rename which columns to get?
    const content = `SELECT * FROM QSYS2.SYSIXADV WHERE TABLE_SCHEMA = '${schema}' and TABLE_NAME = '${name}' ORDER BY TIMES_ADVISED DESC`;
    vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
      content,
      type: `statement`,
      open: false,
    });
  }

  static async clearAdvisedIndexes(schema: string, name: string): Promise<void> {
    const query = `DELETE FROM QSYS2.SYSIXADV WHERE TABLE_SCHEMA = '${schema}' and TABLE_NAME = '${name}'`;
    await getInstance().getContent().runSQL(query);
  }

  static async clearFile(schema: string, name: string): Promise<void> {
    const command = `CLRPFM ${schema}/${name}`;
              
    const commandResult = await getInstance().getConnection().runCommand({
      command: command,
      environment: `ile`
    });

    if (commandResult.code !== 0) {
      throw new Error(commandResult.stderr);
    }
  }

  static async copyFile(schema: string, name: string, toLib: string, toFile: string, replace: string, create: string): Promise<void> {
    const command = `CPYF FROMFILE(${schema}/${name}) TOFILE(${toLib}/${toFile}) MBROPT(${replace}) CRTFILE(${create})`;
                  
    const commandResult = await getInstance().getConnection().runCommand({
      command: command,
      environment: `ile`
    });

    if (commandResult.code !== 0) {
      throw new Error(commandResult.stderr);
    }
  }
}