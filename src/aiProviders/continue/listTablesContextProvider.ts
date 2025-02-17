import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  IContextProvider,
  LoadSubmenuItemsArgs,
} from "@continuedev/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import Schemas from "../../database/schemas";
import Table from "../../database/table";
import {
  createContinueContextItems,
  findPossibleTables,
  refsToMarkdown,
} from "../context";

const listDb2Table: ContextProviderDescription = {
  title: "list Db2i Tables",
  displayTitle: `Db2i-{tables}`,
  description: "Add Db2i Table info to Context",
  type: "submenu",
  dependsOnIndexing: true
};

interface SchemaContextProvider {
  schema: string;
  provider: IContextProvider,
}

let providers: SchemaContextProvider[] = []

class ListDb2iTables implements IContextProvider {
  constructor(private schema: string) {
    this.schema = schema;
  }

  get description(): ContextProviderDescription {
    return {
      title: `Db2i-${this.schema}`,
      displayTitle: `Db2i-${this.schema}`,
      description: "Add Db2i Table info to Context",
      type: "submenu",
      dependsOnIndexing: true
    };
  }

  setCurrentSchema(schema: string) {
    this.schema = schema;
  }

  getCurrentSchema() {
    return this.schema;
  }

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
    let contextItems: ContextItem[] = [];
    if (query.toUpperCase() === this.schema.toUpperCase()) {
      const tableInfo = await this.getColumnInfoForAllTables(this.schema);
      contextItems.push({
        name: `Info for all tables in ${this.schema}`,
        content: `Db2 for i table Assistant: The following table and column information is from the ${query} schema. Utilize the provided schema and table metadata to assist the user:\n${JSON.stringify(
          tableInfo
        )}`,
        description: "table metadata",
      });
    } else {
      const tableInfo = await findPossibleTables(
        null,
        this.schema,
        query.split(` `)
      );
      const markdownRefs = refsToMarkdown(tableInfo);

      // add additional context for working with Db2 for i tables
      contextItems.push({
        name: `Instructions`,
        content: `Db2 for i table Assistant: The following information is based on the ${query} table within the ${this.schema} schema. Utilize the provided schema and table metadata to assist the user. Only use valid Db2 for i SQL syntax and conventions. If input is unclear ask user to clarify`,
        description: "instructions for working with Db2 for i tables",
      });

      contextItems.push(...createContinueContextItems(markdownRefs));
    }
    return contextItems;
  }

  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs
  ): Promise<ContextSubmenuItem[]> {
    const tables: BasicSQLObject[] = await Schemas.getObjects(this.schema, [
      `tables`,
    ]);

    const schemaSubmenuItem: ContextSubmenuItem = {
      id: this.schema,
      title: this.schema,
      description: `All table info in schema: ${this.schema}`,
    };

    const tableSubmenuItems: ContextSubmenuItem[] = tables.map((table) => ({
      id: table.name,
      title: table.name,
      description: `${table.schema}-${table.name}`,
    }));

    return [schemaSubmenuItem, ...tableSubmenuItems];
  }
}

export async function registerDb2iTablesProvider(schema?: string) {
  if (!schema) {
    return;
  }
  const continueID = `Continue.continue`;
  const continueEx = vscode.extensions.getExtension(continueID);
  if (continueEx) {
    if (!continueEx.isActive) {
      await continueEx.activate();
    }

    const existingProvider: SchemaContextProvider = providers.find(p => p.schema === schema);
    if (existingProvider !== undefined) {
      return;
    } else {
      const continueAPI = continueEx?.exports;
      let provider = new ListDb2iTables(schema);
      continueAPI?.registerCustomContextProvider(provider);
      providers.push({provider: provider, schema: schema});
    }
  }
}
