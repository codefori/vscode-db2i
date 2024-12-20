import { ContextItem, ContextProviderDescription, ContextProviderExtras, ContextSubmenuItem, IContextProvider, LoadSubmenuItemsArgs } from "@continuedev/core";
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from "vscode";
import { JobManager } from "../../config";
import { JobInfo } from "../../connection/manager";
import Schemas from "../../database/schemas";
import Table from "../../database/table";
import { findPossibleTables } from "../context";

const listDb2Table: ContextProviderDescription = {
  title: "list Db2i Tables",
  displayTitle: "Db2i-tables",
  description: "Add Db2i Table info to Context",
  type: "submenu"
}

export let listDb2TableContextProvider: Boolean = false;

class ListDb2iTables implements IContextProvider {
  get description(): ContextProviderDescription {
    return listDb2Table;
  }

  getCurrentJob(): JobInfo {
    const currentJob: JobInfo = JobManager.getSelection();
    return currentJob;
  }

  private getDefaultSchema = (): string => {
    const currentJob: JobInfo = this.getCurrentJob();
    return currentJob?.job.options.libraries[0] || "QGPL";
  };

  async getColumnInfoForAllTables(schema: string) {
    const items: TableColumn[] = await Table.getItems(schema);

    return items.map((column) => ({
      table_name: column.TABLE_NAME,
      schema: column.TABLE_SCHEMA,
      column_name: column.COLUMN_NAME,
      column_data_type: column.DATA_TYPE,
    }));
  }

  async getContextItems(
    query: string,
    extras: ContextProviderExtras
  ): Promise<ContextItem[]> {
    let contextitems: ContextItem[] = [];
    const schema = this.getDefaultSchema();
    if (query.toUpperCase() === schema.toUpperCase()) {
      const tableInfo = await this.getColumnInfoForAllTables(schema);
      contextitems.push({
        name: `Info for all tables in ${schema}`,
        content: `Db2 for i table Assistant: The following table and column information is from the ${query} schema. Utilize the provided schema and table metadata to assist the user:\n${JSON.stringify(tableInfo)}`,
        description: "table metadata",
      });
    } else {
      const tableInfo = await findPossibleTables(
        null,
        schema,
        query.split(` `)
      );
      contextitems.push({
        name: `${query}`,
        content: `Db2 for i table Assistant: The following information is based on the ${query} table within the ${schema} schema. Utilize the provided schema and table metadata to assist the user:\n${JSON.stringify(tableInfo)}`,
        description: "table metadata",
      });
    }
    return contextitems;
  }

  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs
  ): Promise<ContextSubmenuItem[]> {
    const schema = this.getDefaultSchema();
    const tables: BasicSQLObject[] = await Schemas.getObjects(schema, [
      `tables`,
    ]);

    const schemaSubmenuItem: ContextSubmenuItem = {
      id: schema,
      title: schema,
      description: `All table info in schema: ${schema}`,
    };

    const tableSubmenuItems: ContextSubmenuItem[] = tables.map((table) => ({
      id: table.name,
      title: table.name,
      description: `${table.schema}-${table.name}`,
    }));

    return [schemaSubmenuItem, ...tableSubmenuItems];
  }
}

class emptyContextProvider implements IContextProvider {
  get description(): ContextProviderDescription {
    return {
      title: "",
      displayTitle: "",
      description: "",
      type: "normal"
    };
  }
  async getContextItems(query: string, extras: ContextProviderExtras): Promise<ContextItem[]> {
    return [];
  }
  async loadSubmenuItems(args: LoadSubmenuItemsArgs): Promise<ContextSubmenuItem[]> {
    return [];
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
    if (listDb2TableContextProvider) {

      // HACK: re register context provider work around
      // save continue config file to trigger a config reload to update list tables provider
      const configFile = path.join(os.homedir(), `.continue`, `config.json`);
      const now = new Date();
      fs.utimes(configFile, now, now, (err) => {
        if (err) {
          console.error('Error saving Continue config file:', err);
          return;
        }
        vscode.window.showInformationMessage('Updated @Db2-Tables!');
      });
    } else {
      continueAPI?.registerCustomContextProvider(provider);
      listDb2TableContextProvider = true;
    }
  }
}