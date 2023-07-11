
import vscode from "vscode"
import { JobManager } from "../config";
import Statement from "./statement";

export default class View {
  static getColumns(schema: string, name: string): Promise<TableColumn[]> {
    schema = Statement.noQuotes(Statement.delimName(schema));
    name = Statement.noQuotes(Statement.delimName(name));
    
    return JobManager.runSQL([
      `SELECT * FROM QSYS2.SYSCOLUMNS`,
      `WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${name}'`,
      `ORDER BY ORDINAL_POSITION`
    ].join(` `));
  }
}