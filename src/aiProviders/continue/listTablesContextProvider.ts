import * as vscode from "vscode";
import { ContextItem, ContextProviderDescription, ContextProviderExtras, ContextSubmenuItem, IContextProvider, LoadSubmenuItemsArgs } from "@continuedev/core";
import { JobInfo } from "../../connection/manager";
import { JobManager } from "../../config";
import { isContinueActive } from "./continueContextProvider";
import { findPossibleTables } from "../context";

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

  async getTables() {
    const schema = this.getDefaultSchema().toUpperCase();
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

  async getContextItems(query: string, extras: ContextProviderExtras): Promise<ContextItem[]> {
    const tableInfo = await findPossibleTables(null, this.getDefaultSchema(), query.split(` `));
    return [{
      name: `${query}`,
      content: JSON.stringify(tableInfo),
      description: "table metadata"

    }]
  }
  async loadSubmenuItems(args: LoadSubmenuItemsArgs): Promise<ContextSubmenuItem[]> {
    const tables: any[] = await this.getTables();

    return tables.map((table) => {
      return {
        id: table.TABLE_NAME,
        title: table.TABLE_NAME,
        description: `${table.TABLE_SCHEMA}-${table.TABLE_NAME}`,
      }
    })

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