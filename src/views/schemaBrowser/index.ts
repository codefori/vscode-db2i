
import { ThemeIcon, TreeItem } from "vscode"
import * as vscode from "vscode"
import Schemas, { AllSQLTypes, InternalTypes, SQL_ESCAPE_CHAR, SQLType } from "../../database/schemas";
import Table from "../../database/table";
import { getInstance, loadBase } from "../../base";

import Configuration from "../../configuration";

import Types from "../types";
import Statement from "../../database/statement";
import { getCopyUi } from "./copyUI";
import { getAdvisedIndexesStatement, getIndexesStatement, getMTIStatement, getAuthoritiesStatement, getObjectLocksStatement, getRecordLocksStatement } from "./statements";
import { BasicSQLObject } from "../../types";
import { TextDecoder } from "util";
import { parse } from "csv/sync";

const itemIcons = {
  "table": `split-horizontal`,
  "procedure": `run`,
  "function": `run`,
  "alias": `symbol-reference`,
  "view": `symbol-constant`,
  "type": `symbol-parameter`,
  "trigger": `play`,
  "variable": `symbol-value`,
  "index": `list-tree`,
  "logical": `symbol-interface`
}

export default class schemaBrowser {
  emitter: vscode.EventEmitter<any | undefined | null | void>;
  onDidChangeTreeData: vscode.Event<any | undefined | null | void>;
  cache: { [key: string]: object[] };

  filters: { [schema: string]: string } = {};

  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;
    this.enableManageCommand(true);
    this.cache = {};

    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.refreshSchemaBrowser`, async () => this.clearCacheAndRefresh()),

      /** Manage the schemas listed in the Schema Browser */
      vscode.commands.registerCommand(`vscode-db2i.manageSchemaBrowserList`, async () => {
        // Disable the command while it is running
        this.enableManageCommand(false);
        try {
          const config = getInstance().getConfig();
          // Get the list of schemas currently selected for display
          const currentSchemas = config[`databaseBrowserList`] || [];
          let allSchemas: BasicSQLObject[];
          // Get all the schemas on the system.  This might take a while, so display a progress message to let the user know something is happening.
          await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: `Retrieving schemas for ${config.name}...`
          }, async () => {
            allSchemas = await Schemas.getObjects(undefined, [`schemas`]);
          });
          // Create an array of SchemaQuickPickItem representing the currently selected schemas
          const selectedItems: SchemaQuickPickItem[] = allSchemas.filter(schema => currentSchemas.includes(Statement.delimName(schema.name))).map(object => new SchemaQuickPickItem(object));
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
            ...allSchemas.filter(schema => !currentSchemas.includes(Statement.delimName(schema.name))).map(object => new SchemaQuickPickItem(object))
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
        } finally {
          // We're done, enable the command
          this.enableManageCommand(true);
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
          vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: `Generating SQL` }, async () => {
            try {
              const content = await Schemas.generateSQL(object.schema, object.uniqueName(), object.type.toUpperCase());
              const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content });
              await vscode.window.showTextDocument(textDoc);
            } catch (e) {
              vscode.window.showErrorMessage(e.message);
            }
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getRelatedObjects`, async (object: SQLObject) => {
        if (object) {
          const content = `SELECT SQL_NAME, SYSTEM_NAME, SCHEMA_NAME, LIBRARY_NAME, SQL_OBJECT_TYPE, 
          OBJECT_OWNER, LAST_ALTERED, OBJECT_TEXT, LONG_COMMENT 
          FROM TABLE(SYSTOOLS.RELATED_OBJECTS('${object.schema}', '${object.name}')) ORDER BY SQL_OBJECT_TYPE, SQL_NAME`;

          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.viewPermissions`, async (object: SQLObject) => {
        if (object) {
          const content = `SELECT AUTHORIZATION_NAME as USER_NAME, OBJECT_AUTHORITY,
          OWNER, OBJECT_OPERATIONAL, OBJECT_MANAGEMENT, OBJECT_EXISTENCE, OBJECT_ALTER, OBJECT_REFERENCE,
          DATA_READ, DATA_ADD, DATA_UPDATE, DATA_DELETE, DATA_EXECUTE FROM QSYS2.OBJECT_PRIVILEGES 
          WHERE OBJECT_SCHEMA='${object.schema}' AND OBJECT_NAME='${object.name}' AND 
          SQL_OBJECT_TYPE='${object.type.toUpperCase()}'`;

          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getMTIs`, async (object: SQLObject | SchemaItem) => {
        if (object) {
          const content = getMTIStatement(object.schema, (`name` in object ? object.name : undefined));

          if (content) {
            vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
              content,
              qualifier: `statement`,
              open: false,
            });
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getIndexes`, async (object: SQLObject) => {
        if (object) {
          const content = getIndexesStatement(object.schema, object.name);
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getAuthorities`, async (object: SQLObject) => {
        if (object) {
          const content = getAuthoritiesStatement(object.schema, object.name, object.type.toUpperCase(), object.tableType);
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getObjectLocks`, async (object: SQLObject) => {
        if (object) {
          const content = getObjectLocksStatement(object.schema, object.name, object.type.toUpperCase(), object.tableType);
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getRecordLocks`, async (object: SQLObject) => {
        if (object) {
          const content = getRecordLocksStatement(object.schema, object.name);
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: false,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.advisedIndexes`, async (object: SQLObject | SchemaItem) => { //table
        if (object) {
          let content: string | undefined;
          if (`name` in object) {
            content = getAdvisedIndexesStatement(object.schema, object.name);
          }
          else {
            content = getAdvisedIndexesStatement(object.schema);
          }

          if (content) {
            vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
              content,
              qualifier: `statement`,
              open: false,
            });
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.clearAdvisedIndexes`, async (object: SQLObject | SchemaItem) => {
        if (object) {
          const isObject = `name` in object;
          let result;

          result = await vscode.window.showWarningMessage(`Are you sure you want to clear all of the advised index rows from the Index Advisor for ${object.schema}${isObject ? `${object.name}` : ''}?`, {
            modal: true,
          }, 'No', 'Yes');

          if (result === 'Yes') {
            try {
              await Schemas.clearAdvisedIndexes(object.schema, isObject ? object.name : undefined);
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

          if (result === 'Yes') {
            try {
              await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Deleting ${object.name}...`
              }, async () => {
                await Schemas.deleteObject(object.schema, object.uniqueName(), object.type);
              });

              vscode.window.showInformationMessage(`${object.name} deleted`);
              this.clearCacheAndRefresh();
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
                this.clearCacheAndRefresh();
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

          if (result === 'Yes') {
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
          const page = await getCopyUi().loadPage<any>((`Copy File - ${object.schema}.${object.name}`));

          if (page && page.data) {
            const data = page.data;
            page.panel.dispose();

            if (data.buttons == 'copy') {
              try {
                await vscode.window.withProgress({
                  location: vscode.ProgressLocation.Notification,
                  title: `Copying ${object.name}...`
                }, async () => {
                  await Table.copyFile(object.system.schema, object.system.name, data);
                });

                vscode.window.showInformationMessage(`Table copied`);
                this.clearCacheAndRefresh();
              } catch (e) {
                vscode.window.showErrorMessage(e.message);
              }
            }
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.getResultSet`, async (object: SQLObject) => {
        if (object && object instanceof SQLObject) {
          const content = `SELECT * FROM ${Statement.delimName(object.schema)}.${Statement.delimName(object.name)} as a`;
          vscode.commands.executeCommand(`vscode-db2i.runEditorStatement`, {
            content,
            qualifier: `statement`,
            open: true,
          });
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.setSchemaFilter`, async (node: SchemaItem) => {
        if (node) {
          const value = await vscode.window.showInputBox({
            title: `Set filter for ${node.schema}`,
            value: this.filters[node.schema],
            placeHolder: `COOL, COOL*`,
            prompt: `Show objects that contain this value (case-insensitive). Blank to reset. Use '*' for wildcard at end.`,
          });

          if (value !== undefined) {
            this.filters[node.schema] = value.trim() === `` ? undefined : value;

            updateSchemaNode(node, this.filters[node.schema]);
            this.refresh(node);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.importDataContextMenu`, async () => {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: `Generating SQL` }, async (arg?: any) => {
          try {
            const data = vscode.window.activeTextEditor.document.getText();
            const uri = vscode.window.activeTextEditor.document.uri;
            await this.generateInsert(uri, data);
          } catch (e) {
            vscode.window.showErrorMessage(e.message);
          }
        });
      }),

      vscode.commands.registerCommand(`vscode-db2i.importData`, async () => {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: `Generating SQL` }, async (arg?: any) => {
          try {            
            const uri = await this.pickFile();
            if (!uri) { return; }
            const data = await this.readFile(uri);

            await this.generateInsert(uri, data);
          } catch (e) {
            vscode.window.showErrorMessage(e.message);
          }
        });
      })
    )

    getInstance().subscribe(context, `connected`, `db2i-clearCacheAndRefresh`, () => this.clearCacheAndRefresh());
  }

  async pickFile(): Promise<vscode.Uri | undefined> {
    const res = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Import',
      filters: {
        'Data files': ['csv', 'json'],
        'All files': ['*']
      }
    });
    return res?.[0];
  }

  async readFile(uri: vscode.Uri): Promise<string> {
    const ab = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder('utf-8').decode(ab);
  }

  async generateInsert(uri: vscode.Uri, data: string) {
    let ext: string = (uri.fsPath.split('.').pop() || '').toLowerCase();
    if (ext != `csv` && ext != `json`) {
      ext = await vscode.window.showQuickPick(['csv','json'], { placeHolder: 'What format is this file?' });
      if (!ext) { return; }
    }

    let rows: any[] = [];
    let hasHeaders = true;
    if (ext === `csv`) {
      hasHeaders = (await vscode.window.showQuickPick(['Yes','No'], { placeHolder: 'Does the file have headers?' })) === `Yes` ? true : false;
      rows = parse(data, {
        columns: hasHeaders,
        cast: true
      });
    } else if (ext === `json`) {
      rows = JSON.parse(data);
      if (!Array.isArray(rows)) {
        throw new Error('Unsupported JSON format: expected an array of objects.');
      }
    }
    
    if (!rows.length) { 
      vscode.window.showWarningMessage('No rows found.'); 
      return;
    }

    let content: string = ``;
    if(hasHeaders) {
      // Get headers using the first row of data
      const colNames = Object.keys(rows[0]);
      const cols = colNames.map(c => c.includes(` `) ? `"${c}"` : c).join(', ');

      // Generate the INSERT statement
      content = `INSERT INTO TABLE (${cols}) \nVALUES\n`;
      const allRowValues = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let allValues = [];
        for(const col of colNames) {
          const val = row[col];
          if (typeof val === `string`) {
            allValues.push(`'${val.replace(`'`, `''`)}'`);
          } else {
            allValues.push(val);
          }
        }
        allRowValues.push(`  (${allValues.join(', ')})`);
      }   
      content += allRowValues.join(`,\n`);
    } else {
      // Generate the INSERT statement
      content = `INSERT INTO TABLE \nVALUES\n`;
      const allRowValues = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let allValues = [];
        for(let j = 0; j < row.length; j++) {
          const val = row[j];
          if (typeof val === `string`) {
            allValues.push(`'${val}'`);
          } else {
            allValues.push(val);
          }
        }
        allRowValues.push(`  (${allValues.join(', ')})`);
      }   
      content += allRowValues.join(`,\n`);
    }

    content += `;`;
    
    // Open the generated SQL in a new file
    const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content });
    await vscode.window.showTextDocument(textDoc);
  }

  clearCacheAndRefresh() {
    this.cache = {};
    this.refresh();
  }

  refresh(node?: TreeItem) {
    this.emitter.fire(node);
  }

  private enableManageCommand(enabled: boolean) {
    vscode.commands.executeCommand(`setContext`, `vscode-db2i:manageSchemaBrowserEnabled`, enabled);
  }

  /**
   * @returns {Number};
   */
  getPageSize() {
    return Number(Configuration.get(`pageSize`)) || 100;
  }


  async fetchData(schema: string, type: SQLType, addRows?: boolean) {
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

      const data = await Schemas.getObjects(schema, [type], {
        limit: pageSize,
        offset,
        sort: true
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

  async getChildren(element?: Schema | SchemaItem | SQLObject) {
    let items = [];

    if (element) {

      const contextValue = element.contextValue;

      if (element instanceof Schema) {

        let filterValue = this.filters[element.schema];
        if (filterValue) {
          const validSchemaName = Statement.noQuotes(element.schema);
          const filteredObjects = await Schemas.getObjects(validSchemaName, AllSQLTypes, { filter: filterValue, sort: true });
          items = filteredObjects.map(obj => new SQLObject(obj));

        } else {
          // If no filter is provided, group objects by types
          items = getSchemaItems(element.schema);
        }


      } else
        if (element instanceof SchemaItem) {
          items = await this.fetchData(element.schema, contextValue as SQLType, false);
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
          items.push(new Schema(schema, this.filters[schema]));
        }
      } else {
        items.push(new Schema(`No connection. Refresh when ready.`));
      }
    }

    return items;
  }
}

function updateSchemaNode(node: Schema, newFilterValue?: string) {
  node.iconPath = new vscode.ThemeIcon(newFilterValue ? `filter` : `database`);
  node.description = newFilterValue ? `(${newFilterValue})` : undefined;
}

class Schema extends vscode.TreeItem {
  schema: string;
  constructor(name: string, currentFilterLabel?: string) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = `schema`;
    this.schema = name;

    updateSchemaNode(this, currentFilterLabel);
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
  tableType: string;
  system: {
    schema: string;
    name: string;
  }

  constructor(item: BasicSQLObject) {
    const type = InternalTypes[item.type];
    super(Statement.prettyName(item.name), Types[type] ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);

    this.contextValue = type;
    this.path = `${item.schema}.${item.name}`;
    this.schema = item.schema;
    this.name = item.name;
    this.specificName = item.specificName; // Only applies to routines
    this.system = item.system;
    this.type = type;
    this.tableType = item.tableType;
    this.description = item.text;
    // For functions and procedures, set a tooltip that includes the specific name
    if (Schemas.isRoutineType(this.type)) {
      this.tooltip = new vscode.MarkdownString(`${Statement.prettyName(item.name)} ${item.specificName ? `(*${Statement.prettyName(item.specificName)}*)` : ``}`); // Name (Specific name)
    }
    this.iconPath = itemIcons[type] ? new vscode.ThemeIcon(itemIcons[type]) : undefined;
  }

  /**
   * Returns the unique name to use to reference the object.
   * For most objects this just returns the name, but for routines, which can be overloaded, it returns the specific name.
   */
  uniqueName(): string {
    return Schemas.isRoutineType(this.type) ? this.specificName || this.name : this.name;
  }
}

/**
 * QuickPick item that represents a schema
 */
class SchemaQuickPickItem implements vscode.QuickPickItem {
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


const getSchemaItems = (schema) => {
  const items = [
    //new SchemaItem(`All Database Objects`, `all`, schema),
    new SchemaItem(`Aliases`, `aliases`, schema, `symbol-reference`),
    //new SchemaItem(`Column Masks`, `masks`, schema),
    //new SchemaItem(`Constraints`, `constraints`, schema),
    new SchemaItem(`Logicals`, `logicals`, schema, `telescope`),
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
