import * as vscode from "vscode";
import { ContextItem, ContextProviderDescription, ContextProviderExtras, ContextSubmenuItem, IContextProvider, LoadSubmenuItemsArgs } from "@continuedev/core";
import { JobInfo } from "../../connection/manager";
import { JobManager } from "../../config";
import { isContinueActive } from "./continueContextProvider";
import { findPossibleTables } from "../context";
import Statement from "../../database/statement";

const listDb2Table: ContextProviderDescription = {
  title: "list Db2i Tables",
  displayTitle: "Db2i-tables",
  description: "Add Db2i Table info to Context",
  type: "submenu"
}

class ListDb2iTables implements IContextProvider {
  get description(): ContextProviderDescription {
    return listDb2Table
  }

  getCurrentJob(): JobInfo {
    const currentJob: JobInfo = JobManager.getSelection();
    return currentJob;
  }

  private getDefaultSchema = (): string => {
    const currentJob: JobInfo = this.getCurrentJob();
    return currentJob?.job.options.libraries[0] || "QGPL";
  }

  async getTables(curSchema: string) {
    const schema = Statement.delimName(curSchema, true);
    const sql = `
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM QSYS2.SYSTABLES
      WHERE TABLE_SCHEMA = '${schema}'
        AND TABLE_TYPE = 'T'
      ORDER BY TABLE_NAME
    `;

    const result = await JobManager.runSQL(sql);
    return result;
  }

  async getColumnInfoForAllTables(schema: string) {
    const sql = `
      SELECT COLUMN_NAME, TABLE_NAME, DATA_TYPE
      FROM QSYS2.SYSCOLUMNS
      WHERE TABLE_SCHEMA = '${Statement.delimName(schema)}'
    `;

    const result = await JobManager.runSQL(sql);
    return result;

  }

  async getContextItems(query: string, extras: ContextProviderExtras): Promise<ContextItem[]> {
    const schema = this.getDefaultSchema();
    if (query.toUpperCase() === schema.toUpperCase()) {
      const tableInfo = await this.getColumnInfoForAllTables(schema);
      return [{
        name: `Info for all tables in ${schema}`,
        content: JSON.stringify(tableInfo),
        description: "table metadata"
      }]
    }
    const tableInfo = await findPossibleTables(null, schema, query.split(` `));
    return [{
      name: `${query}`,
      content: JSON.stringify(tableInfo),
      description: "table metadata"

    }]
  }
  
  async loadSubmenuItems(args: LoadSubmenuItemsArgs): Promise<ContextSubmenuItem[]> {
    const schema = this.getDefaultSchema();
    const tables: any[] = await this.getTables(schema);
    
    const schemaSubmenuItem: ContextSubmenuItem = {
      id: schema,
      title: schema,
      description: `All table info in schema: ${schema}`
    };

    const tableSubmenuItems: ContextSubmenuItem[] = tables.map((table) => ({
      id: table.TABLE_NAME,
      title: table.TABLE_NAME,
      description: `${table.TABLE_SCHEMA}-${table.TABLE_NAME}`,
    }));

    return [schemaSubmenuItem, ...tableSubmenuItems];
  }
  
}

export async function registerDb2iTablesProvider() {
  const provider = new ListDb2iTables();
  const continueID = `Continue.continue`;
  const continueEx = vscode.extensions.getExtension(continueID);
  if (continueEx) {
    if (!continueEx.isActive) {
      await continueEx.activate();
    }
  
    const continueAPI = continueEx?.exports;
    continueAPI?.registerCustomContextProvider(provider);
  }
}