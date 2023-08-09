
import vscode, { ThemeIcon } from "vscode"
import Schemas from "../database/schemas";
import Table from "../database/table";
import { getInstance, loadBase } from "../base";

import Configuration from "../configuration";

import Types from "./types";
import Statement from "../database/statement";

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

      /** Manage the schemas listed in the Schema Browser */
      vscode.commands.registerCommand(`vscode-db2i.manageSchemaBrowserList`, async () => {
        /** QuickPick item that represents a schema */
        class ListItem implements vscode.QuickPickItem {
          label: string;
          detail?: string;
          description?: string;
          iconPath: ThemeIcon;

          constructor(object: BasicSQLObject) {
            const name = Statement.delimName(object.name);
            const systemName = object.system.name;
            this.label = name;
            // If the name and system name are different, show the system name in the detail line
            if (name !== systemName) {
              this.detail = systemName;
            }
            this.description = object.text ? object.text : undefined;
            this.iconPath = new ThemeIcon(`database`);
          }
        }

        try {
          const config = getInstance().getConfig();
          // Get the list of schemas currently selected for display
          const currentSchemas = config[`databaseBrowserList`] || [];
          let allSchemas: BasicSQLObject[];
          // Get all the schemas on the system.  This might take a while, so display a progress message to let the user know something is happening.
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Retrieving schemas for ${config.name}...`
          }, async () => {
            allSchemas = await Schemas.getObjects(undefined, `schemas`);
          });
          // Create an array of ListItems representing the currently selected schemas
          const selectedItems: ListItem[] = allSchemas.filter(schema => currentSchemas.includes(Statement.delimName(schema.name))).map(object => new ListItem(object));
          // Prepare the QuickPick window
          const quickPick = vscode.window.createQuickPick();
          quickPick.title = `Schema Browser - ${config.name}`;
          quickPick.canSelectMany = true;
          quickPick.matchOnDetail = true;
          // Build the quick pick list with two sections, selected schemas first, followed by the remaining available schemas on the system
          quickPick.items = [
            { kind: vscode.QuickPickItemKind.Separator, label: "Currently selected schemas" },
            ...selectedItems,
            { kind: vscode.QuickPickItemKind.Separator, label: "Available schemas" },
            ...allSchemas.filter(schema => !currentSchemas.includes(Statement.delimName(schema.name))).map(object => new ListItem(object))
          ];
          // Set the selected items
          quickPick.selectedItems = selectedItems;
          // Process the selections
          quickPick.onDidAccept(() => {
            const selections = quickPick.selectedItems;
            if (selections) {
              config[`databaseBrowserList`] = selections.map(selection => selection.label);
              getInstance().setConfig(config);
              this.refresh();
            }
            quickPick.hide()
          })
          quickPick.onDidHide(() => quickPick.dispose());
          quickPick.show();
        } catch (e) {
          vscode.window.showErrorMessage(e.message);
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.removeSchemaFromSchemaBrowser`, async (node: SchemaItem) => {
        if (node) {
          //Running from right click
          const config = getInstance().getConfig();

          let schemas = config[`databaseBrowserList`];

          let index = schemas.findIndex(file => file === node.label)
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

      vscode.commands.registerCommand(`vscode-db2i.generateSQL`, async (object: SQLObject) => {
        if (object) {
          try {
            const content = await Schemas.generateSQL(object.schema, object.uniqueName(), object.type.toUpperCase());
            const textDoc = await vscode.workspace.openTextDocument({language: `sql`, content});
            await vscode.window.showTextDocument(textDoc);
          } catch (e) {
            vscode.window.showErrorMessage(e.message);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getRelatedObjects`, async (object: SQLObject) => {
        if (object) {
          const content = `SELECT SQL_NAME, SYSTEM_NAME, SCHEMA_NAME, LIBRARY_NAME, SQL_OBJECT_TYPE, 
          OBJECT_OWNER, LAST_ALTERED, OBJECT_TEXT, LONG_COMMENT 
          FROM TABLE(SYSTOOLS.RELATED_OBJECTS('${object.schema}', '${object.name}')) ORDER BY SQL_OBJECT_TYPE, SQL_NAME`;

          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            type: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getIndexes`, async (object: SQLObject) => {
        if (object) {
          const content = `SELECT * FROM QSYS2.SYSINDEXSTAT WHERE TABLE_SCHEMA = '${object.schema}' and TABLE_NAME = '${object.name}'`;
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            type: `statement`,
            open: false,
          });
        }
      }),
      
      vscode.commands.registerCommand(`vscode-db2i.advisedIndexes`, async (object: SQLObject) => { //table
        if (object) {
          const content = `SELECT * FROM QSYS2.SYSIXADV WHERE TABLE_SCHEMA = '${object.schema}' and TABLE_NAME = '${object.name}' ORDER BY TIMES_ADVISED DESC`;
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            type: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.clearAdvisedIndexes`, async (object: SQLObject) => {
        if (object) {
          const result = await vscode.window.showWarningMessage(`Are you sure you want to clear all of the advised index rows from the Index Advisor for ${object.name}?`,  {
            modal: true,
          }, 'No', 'Yes');
          
          if(result === 'Yes') {
            try {
              await Table.clearAdvisedIndexes(object.schema, object.name);
            } catch (e) {
              vscode.window.showErrorMessage(e.message);
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.deleteObject`, async (object: SQLObject) => {
        if (object) {
          const result = await vscode.window.showWarningMessage(`Are you sure you want to delete ${object.name}?`, {
            modal: true,
          }, 'No', 'Yes');

          if(result === 'Yes') {
            try {
              await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Deleting ${object.name}...`
              }, async () => {
                await Schemas.deleteObject(object.schema, object.uniqueName(), object.type);
              });

              vscode.window.showInformationMessage(`${object.name} deleted`);
              this.cache = {};
              this.refresh();
            } catch (e) {
              vscode.window.showErrorMessage(e.message);
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.renameObject`, async (object: SQLObject) => {
        if (object) {
          const name = await vscode.window.showInputBox({
            title: "New Name",
            prompt: "Enter new name",
            value: object.name
          });

          if (name !== "") {
            if (name) {
              try {
                await vscode.window.withProgress({
                  location: vscode.ProgressLocation.Notification,
                  title: `Renaming ${object.name}...`
                }, async () => {
                  await Schemas.renameObject(object.schema, object.name, name, object.type);
                });
                
                vscode.window.showInformationMessage(`Renamed ${object.name} to ${name}`);
                this.cache = {};
                this.refresh();
              } catch (e) {
                vscode.window.showErrorMessage(e.message);
              }
            }
          } else {
            vscode.window.showErrorMessage(`Name cannot be blank`);
          }
        }
      }),
      
      vscode.commands.registerCommand(`vscode-db2i.clearData`, async (object: SQLObject) => {
        if (object) {
          const result = await vscode.window.showWarningMessage(`Are you sure you want to clear ${object.name}?`, {
            modal: true,
          }, 'No', 'Yes');

          if(result === 'Yes') {
            try {
              await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Clearing ${object.name}...`
              }, async () => {
                await Table.clearFile(object.system.schema, object.system.name);
              });

              vscode.window.showInformationMessage(`${object.name} cleared`);
            } catch (e) {
              vscode.window.showErrorMessage(e.message);
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.copyData`, async (object: SQLObject) => {
        if (object) {
          const base = loadBase();
          const page = await base.customUI()
            .addInput('toFile', 'To File')
            .addInput('toLib', 'Library')
            .addInput('fromMbr', 'From member', 'Name, generic*, *FIRST, *ALL', {
              default: '*FIRST'
            })
            .addInput('toMbr', 'To member or label', 'Name, *FIRST, *FROMMBR, *ALL', {
              default: '*FIRST'
            })
            .addSelect('mbrOpt', 'Replace or add records', [
              {text: '*NONE', description: '*NONE', value: '*NONE'},
              {text: '*ADD', description: '*ADD', value: '*ADD'},
              {text: '*REPLACE', description: '*REPLACE', value: '*REPLACE'},
              {text: '*UPDADD', description: '*UPDADD', value: '*UPDADD'},
            ])
            .addSelect('crtFile', 'Create file', [
              {text: '*NO', description: '*NO', value: '*NO'},
              {text: '*YES', description: '*YES', value: '*YES'},
            ])
            .addSelect('outFmt', 'Print format', [
              {text: '*CHAR', description: '*CHAR', value: '*CHAR'},
              {text: '*HEX', description: '*HEX', value: '*HEX'},
            ])
            .addButtons(
              {id: 'copy', label:'Copy'},
              {id: 'cancel', label:'Cancel'}
            )
            .loadPage<any>((`Copy File - ${object.schema}.${object.name}`));
          
          if(page && page.data) {
            const data = page.data;
            page.panel.dispose();

            if (data.buttons == 'copy') {
              if (data.library != "" && data.file != "") {
                try {
                  await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Copying ${object.name}...`
                  }, async () => {
                    await Table.copyFile(object.system.schema, object.system.name, data);
                  });
    
                  vscode.window.showInformationMessage(`Table copied`);
                  this.cache = {};
                  this.refresh();
                } catch (e) {
                  vscode.window.showErrorMessage(e.message);
                }
              } else {
                vscode.window.showErrorMessage("Schema and Name cannot be blank.");
              }
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getResultSet`, async (object) => {
        if (object && object instanceof SQLObject) {
          const content = `SELECT * FROM ${Statement.delimName(object.schema)}.${Statement.delimName(object.name)} as a`;
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
          items = await Types[type].getChildren(element.schema, element.uniqueName());
        }
      }

    } else {
      const connection = getInstance().getConnection();
      if (connection) {
        const config = getInstance().getConfig();

        const schemas = config[`databaseBrowserList`] || [];
        schemas.sort((s1, s2) => {
          if (s1 > s2) return 1;
          if (s1 < s2) return -1;
          return 0;
        });

        for (let schema of schemas) {
          items.push(new Schema(schema));
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
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

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
    this.schema = Statement.noQuotes(Statement.delimName(schema, true));
    if (icon) this.iconPath = new vscode.ThemeIcon(icon);
  }
}

class SQLObject extends vscode.TreeItem {
  path: string;
  schema: string;
  name: string;
  specificName: string;
  type: string;
  system: {
    schema: string;
    name: string;
  }

  constructor(item: BasicSQLObject) {
    const type = viewItem[item.type];
    super(Statement.prettyName(item.name), Types[type] ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

    this.contextValue = type;
    this.path = `${item.schema}.${item.name}`;
    this.schema = item.schema;
    this.name = item.name;
    this.specificName = item.specificName; // Only applies to routines
    this.system = item.system;
    this.type = type;
    this.description = item.text;
    // For functions and procedures, set a tooltip that includes the specific name
    if (Schemas.isRoutineType(this.type)) {
      this.tooltip = new vscode.MarkdownString(`${Statement.prettyName(item.name)} (*${Statement.prettyName(item.specificName)}*)`); // Name (Specific name)
    }
    this.iconPath = itemIcons[type] ? new vscode.ThemeIcon(itemIcons[type]) : undefined;
  }

  /**
   * Returns the unique name to use to reference the object.
   * For most objects this just returns the name, but for routines, which can be overloaded, it returns the specific name.
   */
  uniqueName(): string {
    return Schemas.isRoutineType(this.type) ? this.specificName : this.name;
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
