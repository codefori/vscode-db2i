
import vscode from "vscode"
import { JobManager } from "../config";
import { getInstance } from "../base";
import Statement from "./statement";

export default class Table {
  /**
   * @param {string} schema 
   * @param {string} name 
   * @returns {Promise<TableColumn[]>}
   */
  static async getItems(schema: string, name: string): Promise<TableColumn[]> {
    schema = Statement.noQuotes(Statement.delimName(schema, true));
    name = Statement.noQuotes(Statement.delimName(name, true));
    
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
      `WHERE column.TABLE_SCHEMA = '${schema}' AND column.TABLE_NAME = '${name}'`,
      `ORDER BY column.ORDINAL_POSITION`,
    ].join(` `);

    return JobManager.runSQL(sql);
  }

  static clearAdvisedIndexes(schema: string, name: string) {
    schema = Statement.noQuotes(Statement.delimName(schema, true));
    name = Statement.noQuotes(Statement.delimName(name, true));

    const query = `DELETE FROM QSYS2.SYSIXADV WHERE TABLE_SCHEMA = '${schema}' and TABLE_NAME = '${name}'`;
    return getInstance().getContent().runSQL(query);
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

  static async copyFile(schema: string, name: string, options: CPYFOptions): Promise<void> {
    const command = [
      `CPYF FROMFILE(${schema}/${name}) TOFILE(${options.toLib}/${options.toFile})`,
      `FROMMBR(${options.fromMbr}) TOMBR(${options.toMbr}) MBROPT(${options.mbrOpt})`,
      `CRTFILE(${options.crtFile}) OUTFMT(${options.outFmt})`
    ].join(` `);
                  
    const commandResult = await getInstance().getConnection().runCommand({
      command: command,
      environment: `ile`
    });

    if (commandResult.code !== 0) {
      throw new Error(commandResult.stderr);
    }
  }
}