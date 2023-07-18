
import vscode from "vscode"
import { JobManager } from "../config";
import Statement from "./statement";

export default class View {
  static getColumns(schema: string, name: string): Promise<TableColumn[]> {
    return JobManager.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${name}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}