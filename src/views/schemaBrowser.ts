
import vscode from "vscode"
import Schemas from "../database/schemas";
import { getInstance } from "../base";
import { fetchSystemInfo } from "../config";

import Configuration from "../configuration";

import Types from "./types";

const viewItem = {
  "tables": `table`,
  "views": `view`,
  "aliases": `alias`,
  "constraints": `constraint`,
  "functions": `function`,
  "variables": `variable`,
  "indexes": `index`,
  "procedures": `procedure`,
  "sequences": `sequence`,
  "packages": `package`,
  "triggers": `trigger`,
  "types": `type`
}

const itemIcons = {
  "table": `split-horizontal`,
  "procedure": `run`,
  "function": `run`,
  "alias": `symbol-reference`,
  "view": `symbol-constant`,
  "type": `symbol-parameter`,
  "trigger": `play`,
  "variable": `symbol-value`,
  "index": `list-tree`
}

export default class schemaBrowser {
  emitter: vscode.EventEmitter<any | undefined | null | void>;
  onDidChangeTreeData: vscode.Event<any | undefined | null | void>;
  cache: {[key: string]: object[]};

  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;

    this.cache = {};

    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.refreshSchemaBrowser`, async () => {
        this.cache = {};
        this.refresh();
      }),

      vscode.commands.registerCommand(`vscode-db2i.addSchemaToSchemaBrowser`, async () => {
        const config = getInstance().getConfig();

        const schemas = config[`databaseBrowserList`] || [];

        const newSchema = await vscode.window.showInputBox({
          prompt: `Library to add to Database Browser`
        });

        if (newSchema && !schemas.includes(newSchema.toUpperCase())) {
          schemas.push(newSchema.toUpperCase());
          config[`databaseBrowserList`] = schemas;
          await getInstance().setConfig(config);
          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.removeSchemaFromSchemaBrowser`, async (node) => {
        if (node) {
          //Running from right click
          const config = getInstance().getConfig();

          let schemas = config[`databaseBrowserList`];

          let index = schemas.findIndex(file => file.toUpperCase() === node.schema)
          if (index >= 0) {
            schemas.splice(index, 1);
          }

          await getInstance().setConfig(config);
          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.loadMoreItems`, async (schema, type) => {
        if (schema && type) {
          await this.fetchData(schema, type, true);
          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.generateSQL`, async (object) => {
        if (object) {
          try {
            const content = await Schemas.generateSQL(object.schema, object.name, object.type.toUpperCase());
            const textDoc = await vscode.workspace.openTextDocument({language: `sql`, content});
            await vscode.window.showTextDocument(textDoc);
          } catch (e) {
            vscode.window.showErrorMessage(e);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getRelatedObjects`, async (object: SQLObject) => {
        if (object) {
          try {
            const content = `SELECT SQL_OBJECT_TYPE, SCHEMA_NAME, SQL_NAME, LIBRARY_NAME,
              SYSTEM_NAME, OBJECT_OWNER, LONG_COMMENT, OBJECT_TEXT, LAST_ALTERED 
              FROM TABLE(SYSTOOLS.RELATED_OBJECTS('${object.schema}', '${object.name}')) ORDER BY SQL_NAME`;
            vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
              content,
              type: `statement`,
              open: false,
            });
          } catch (e) {
            vscode.window.showErrorMessage(e);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getIndexes`, async (object: SQLObject) => {
        if (object) {
          try {
            // Maybe choose/rename which columns to get?
            const content = `SELECT * FROM QSYS2.SYSINDEXSTAT WHERE TABLE_SCHEMA = '${object.schema}' and TABLE_NAME = '${object.name}'`;
            vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
              content,
              type: `statement`,
              open: false,
            });
          } catch (e) {
            vscode.window.showErrorMessage(e);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.deleteObject`, async (object: SQLObject) => {
        if (object) {
          const result = await vscode.window.showWarningMessage(`Are you sure you want to delete ${object.name}?`, 'Yes', 'Cancel');
          if(result === 'Yes') {
            try {
              const query = `DROP ${object.type} IF EXISTS ${object.path}`;
              await getInstance().getContent().runSQL(query);
              
              this.cache = {};
              this.refresh();
            } catch (e) {
              vscode.window.showErrorMessage(e);
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.renameObject`, async (object: SQLObject) => {
        if (object) {
          const name = await vscode.window.showInputBox({
            title: "New File",
            prompt: "Enter new name",
          });

          if (name != "") {
            try {
              const command = `RNMOBJ OBJ(${object.schema}/${object.name}) OBJTYPE(*FILE) NEWOBJ(${name})`;
              
              const commandResult = await getInstance().getConnection().runCommand({
                command: command,
                environment: `ile`
              });
  
              if (commandResult.code !== 0) {
                vscode.window.showErrorMessage(`Command failed to run: ${commandResult.stderr}`);
              }
            } catch (e) {
              vscode.window.showErrorMessage(e);
            }

            this.cache = {};
            this.refresh();
          } else {
            vscode.window.showErrorMessage("Name cannot be blank.");
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.clearData`, async (object: SQLObject) => {
        if (object) {
          const result = await vscode.window.showWarningMessage(`Are you sure you want to clear ${object.name}?`, 'Yes', 'Cancel');
          if(result === 'Yes') {
            try {
              const command = `CLRPFM ${object.schema}/${object.name}`;
              
              const commandResult = await getInstance().getConnection().runCommand({
                command: command,
                environment: `ile`
              });

              if (commandResult.code !== 0) {
                vscode.window.showErrorMessage(`Command failed to run: ${commandResult.stderr}`);
              }
            } catch (e) {
              vscode.window.showErrorMessage(e);
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.copyData`, async (object: SQLObject) => {
        if (object) {
          const schema = await vscode.window.showInputBox({
            title: "Library",
            prompt: "Enter new schema",
          });
          
          const name = await vscode.window.showInputBox({
            title: "To File",
            prompt: "Enter new name",
          });

          const records = await vscode.window.showQuickPick(["*NONE", "*ADD", "*REPLACE", "*UPDADD"], {
            title: "Replace or add records",
            canPickMany: false
          })

          const create = await vscode.window.showQuickPick(["*NO", "*YES"], {
            title: "Create file",
            canPickMany: false
          })

          if (schema != "" && name != "") {
            try {
              const command = `CPYF FROMFILE(${object.schema}/${object.name}) TOFILE(${schema}/${name}) MBROPT(${records}) CRTFILE(${create})`;
              
              const commandResult = await getInstance().getConnection().runCommand({
                command: command,
                environment: `ile`
              });

              if (commandResult.code !== 0) {
                vscode.window.showErrorMessage(`Command failed to run: ${commandResult.stderr}`);
              }

              this.cache = {};
              this.refresh();
            } catch (e) {
              vscode.window.showErrorMessage(e);
            }
          } else {
            vscode.window.showErrorMessage("Schema and Name cannot be blank.");
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getResultSet`, async (object) => {
        if (object && object instanceof SQLObject) {
          const content = `SELECT * FROM ${object.schema}.${object.name} as a`;
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            type: `statement`,
            open: true,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.setCurrentSchema`, async (node) => {
        if (node && node.contextValue === `schema`) {
          const schema = node.schema.toUpperCase();

          const config = getInstance().getConfig();
          const currentLibrary = config.currentLibrary.toUpperCase();
  
          if (schema && schema !== currentLibrary) {
            config.currentLibrary = schema;
            await getInstance().setConfig(config);
          }

          vscode.window.showInformationMessage(`Current schema set to ${schema}.`);
        }
      })
    )

    getInstance().onEvent(`connected`, () => {
      this.cache = {};
      this.refresh();
    });
  }

  refresh() {
    this.emitter.fire(undefined);
  }

  /**
   * @returns {Number};
   */
  getPageSize() {
    return Number(Configuration.get(`pageSize`)) || 100;
  }

  /**
   * 
   * @param {string} schema 
   * @param {string} type
   * @param {boolean} [addRows] True when we need rows added
   */
  async fetchData(schema, type, addRows) {
    const pageSize = this.getPageSize() + 1; //Get 1 extra item to see if we need to add a more button 
    const key = `${schema}-${type}`;
    let offset;

    if (addRows || this.cache[key] === undefined) {
      if (this.cache[key]) {
        this.cache[key].pop(); //Remove more button
        offset = this.cache[key].length;
      } else {
        offset = 0;
      }

      const data = await Schemas.getObjects(schema, type, {
        limit: pageSize,
        offset
      });

      if (data.length > 0) {
        let more = false;
        if (data.length == pageSize) {
          more = true;
          data.pop(); //Remove the extra item
        }

        const items = data.map(item => new SQLObject(item));
        if (this.cache[key]) {
          this.cache[key].push(...items);
        } else {
          this.cache[key] = items;
        }

        if (more) {
          this.cache[key].push(moreButton(schema, type));
        }
      } else {
        vscode.window.showInformationMessage(`No items to load.`);
      }
    }

    if (this.cache[key]) {
      return this.cache[key].slice(0);
    } else {
      return [];
    }
  }

  /**
   * @param {vscode.TreeItem} element
   * @returns {vscode.TreeItem};
   */
  getTreeItem(element) {
    return element;
  }

  async getChildren(element?: Schema|SchemaItem|SQLObject) {
    let items = [];

    if (element) {

      const contextValue = element.contextValue;

      if (element instanceof Schema) {
        items = getSchemaItems(element.schema);
      } else
      if (element instanceof SchemaItem) {
        items = await this.fetchData(element.schema, contextValue, false);
      } else
      if (element instanceof SQLObject) {
        const type = element.type;

        if (Types[type]) {
          items = await Types[type].getChildren(element.schema, element.name);
        }
      }

    } else {
      const connection = getInstance().getConnection();
      if (connection) {
        const config = getInstance().getConfig();

        const libraries = config[`databaseBrowserList`] || [];

        for (let library of libraries) {
          items.push(new Schema(library));
        }
      } else {
        items.push(new Schema(`No connection. Refresh when ready.`));
      }
    }

    return items;
  }
}



class Schema extends vscode.TreeItem {
  schema: string;
  constructor(name: string) {
    super(name.toLowerCase(), vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = `schema`;
    this.schema = name;
    this.iconPath = new vscode.ThemeIcon(`database`);
  }
}

class SchemaItem extends vscode.TreeItem {
  schema: string;
  constructor(name: string, type: string, schema: string, icon: string) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = type;
    this.schema = schema;
    if (icon) this.iconPath = new vscode.ThemeIcon(icon);
  }
}

class SQLObject extends vscode.TreeItem {
  path: string;
  schema: string;
  name: string;
  type: string;

  constructor(item: BasicSQLObject) {
    const type = viewItem[item.type];
    super(item.name.toLowerCase(), Types[type] ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

    this.contextValue = type;
    this.path = `${item.schema}.${item.name}`;
    this.schema = item.schema;
    this.name = item.name;
    this.type = type;
    this.description = item.text;

    this.iconPath = itemIcons[type] ? new vscode.ThemeIcon(itemIcons[type]) : undefined;
  }
}

const getSchemaItems = (schema) => {
  const items = [
    //new SchemaItem(`All Database Objects`, `all`, schema),
    new SchemaItem(`Aliases`, `aliases`, schema, `symbol-reference`),
    //new SchemaItem(`Column Masks`, `masks`, schema),
    //new SchemaItem(`Constraints`, `constraints`, schema),
    new SchemaItem(`Functions`, `functions`, schema, `symbol-function`),
    new SchemaItem(`Global Variables`, `variables`, schema, `symbol-variable`),
    new SchemaItem(`Indexes`, `indexes`, schema, `tag`),
    //new SchemaItem(`Journal Receivers`, `receivers`, schema),
    //new SchemaItem(`Journals`, `journals`, schema),
    new SchemaItem(`Procedures`, `procedures`, schema, `gear`),
    //new SchemaItem(`Row Permissions`, `permissions`, schema),
    //new SchemaItem(`Sequences`, `sequences`, schema),
    //new SchemaItem(`SQL Packages`, `packages`, schema),
    new SchemaItem(`Tables`, `tables`, schema, `menu`),
    new SchemaItem(`Triggers`, `triggers`, schema, `symbol-event`),
    new SchemaItem(`Types`, `types`, schema, `symbol-type-parameter`),
    new SchemaItem(`Views`, `views`, schema, `symbol-interface`)
  ];

  return items;
}

const moreButton = (schema, type) => {
  const item = new vscode.TreeItem(`More...`, vscode.TreeItemCollapsibleState.None);
  item.iconPath = new vscode.ThemeIcon(`add`);
  item.command = {
    command: `vscode-db2i.loadMoreItems`,
    title: `Load more`,
    // @ts-ignore
    arguments: [schema, type]
  };

  return item;
}
