import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  IContextProvider,
  LoadSubmenuItemsArgs,
} from "@continuedev/core";
import * as vscode from "vscode";
import Schemas from "../../database/schemas";
import Table from "../../database/table";
import {
  buildSchemaDefinition,
  generateTableDefinition
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
      const schemaSemantic = await buildSchemaDefinition(this.schema);
      contextItems.push({
        name: `SCHEMA Definition`,
        description: `${this.schema} definition`,
        content: JSON.stringify(schemaSemantic),
      });
    } else {
      const tablesRefs = await generateTableDefinition(
        this.schema,
        extras.fullInput.split(` `)
      );
      for (const table of tablesRefs) {
        contextItems.push({
          name: `table definition for ${table.id}`,
          content: table.content,
          description: `${table.type} definition`,
        });
      }
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

