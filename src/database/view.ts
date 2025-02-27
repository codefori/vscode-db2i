
import { JobManager } from "../config";
import { TableColumn } from "../types";

export default class View {
  static getColumns(schema: string, name: string): Promise<TableColumn[]> {
    return JobManager.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${name}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}