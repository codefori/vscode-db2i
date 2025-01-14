
import { JobManager } from "../config";
import { getInstance } from "../base";

export default class Table {
  /**
   * @param {string} schema Not user input
   * @param {string} table Not user input
   * @returns {Promise<TableColumn[]>}
   */
  static async getItems(schema: string, table?: string): Promise<TableColumn[]> {
    const params = table ? [schema, table] : [schema];
    const sql = [
      `SELECT `,
      `  column.TABLE_SCHEMA,`,
      `  column.TABLE_NAME,`,
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
      `WHERE column.TABLE_SCHEMA = ?`,
      ...[
        table ? `AND column.TABLE_NAME = ?` : ``,
      ],
      `ORDER BY column.ORDINAL_POSITION`,
    ].join(` `);

    return JobManager.runSQL(sql, {parameters: params});
  }

  /**
   * This is to be used instead of getItems when the table is in session/QTEMP
   */
  static async getSessionItems(name: string): Promise<TableColumn[]> {
    const sql = [
      `SELECT `,
      `  column.TABLE_SCHEMA,`,
      `  column.TABLE_NAME,`,
      `  column.COLUMN_NAME,`,
      `  '' as CONSTRAINT_NAME,`,
      `  column.DATA_TYPE, `,
      `  column.CHARACTER_MAXIMUM_LENGTH,`,
      `  column.NUMERIC_SCALE, `,
      `  column.NUMERIC_PRECISION,`,
      `  column.IS_NULLABLE, `,
      `  column.HAS_DEFAULT, `,
      `  column.COLUMN_DEFAULT, `,
      `  column.COLUMN_TEXT, `,
      `  column.IS_IDENTITY`,
      `FROM QSYS2.SYSCOLUMNS2_SESSION as column`,
      `WHERE column.TABLE_NAME = ?`,
      `ORDER BY column.ORDINAL_POSITION`,
    ].join(` `);

    return JobManager.runSQL(sql, {parameters: [name]});
  }

  static async isPartitioned(schema: string, name: string): Promise<boolean> {
    const sql = `select table_name, partitioned_table from qsys2.sysfiles where table_schema = ? and table_name = ? and partitioned_table is not null and partitioned_table = 'YES'`;
    const parameters = [schema, name];

    const result = await JobManager.runSQL(sql, {parameters});
    return result.length > 0;
  }

  static async clearFile(library: string, objectName: string): Promise<void> {
    const command = `CLRPFM ${library}/${objectName}`;
              
    const commandResult = await getInstance().getConnection().runCommand({
      command: command,
      environment: `ile`
    });

    if (commandResult.code !== 0) {
      throw new Error(commandResult.stderr);
    }
  }

  static async copyFile(library: string, objectName: string, options: CPYFOptions): Promise<void> {
    const command = [
      `CPYF FROMFILE(${library}/${objectName}) TOFILE(${options.toLib}/${options.toFile})`,
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