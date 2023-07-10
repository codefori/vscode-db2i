
import vscode from "vscode"
import { JobManager } from "../config";

export default class View {
  static getColumns(schema: string, name: string): Promise<TableColumn[]> {
    return JobManager.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${schema.toUpperCase()}' AND TABLE_NAME = '${name.toUpperCase()}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}