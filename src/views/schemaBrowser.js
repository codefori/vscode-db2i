
const vscode = require(`vscode`);
const Schemas = require(`../database/schemas`);

const Configuration = require(`../configuration`);

const Store = require(`../language/store`);

const Types = require(`./types`);

const {instance} = vscode.extensions.getExtension(`halcyontechltd.code-for-ibmi`).exports;

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

module.exports = class schemaBrowser {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;

    /** @type {{[key: string]: object[]}} */
    this.cache = {};

    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.refreshSchemaBrowser`, async () => {
        this.cache = {};
        Store.refresh();
        this.refresh();
      }),

      vscode.commands.registerCommand(`vscode-db2i.addSchemaToSchemaBrowser`, async () => {
        const config = instance.getConfig();

        const schemas = config.get(`databaseBrowserList`) || [];

        const newSchema = await vscode.window.showInputBox({
          prompt: `Library to add to Database Browser`
        });

        if (newSchema && !schemas.includes(newSchema.toUpperCase())) {
          schemas.push(newSchema.toUpperCase());
          await config.set(`databaseBrowserList`, schemas);
          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.removeSchemaFromSchemaBrowser`, async (node) => {
        if (node) {
          //Running from right click
          const config = instance.getConfig();

          let schemas = config.get(`databaseBrowserList`);

          let index = schemas.findIndex(file => file.toUpperCase() === node.schema)
          if (index >= 0) {
            schemas.splice(index, 1);
          }

          await config.set(`databaseBrowserList`, schemas);
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

          const config = instance.getConfig();
          const currentLibrary = config.currentLibrary.toUpperCase();
  
          if (schema && schema !== currentLibrary) {
            await config.set(`currentLibrary`, schema);
          }

          vscode.window.showInformationMessage(`Current schema set to ${schema}.`);
        }
      })
    )
  }

  refresh() {
    this.emitter.fire();
  }

  /**
   * 
   * @param {string} schema 
   * @param {string} type
   * @param {boolean} [addRows] True when we need rows added
   */
  async fetchData(schema, type, addRows) {
    const pageSize = Configuration.get(`pageSize`);
    const key = `${schema}-${type}`;
    let offset;

    if (addRows || this.cache[key] === undefined) {
      if (this.cache[key]) {
        offset = this.cache[key].length;
      } else {
        offset = 0;
      }

      const data = await Schemas.getObjects(schema, type, {
        limit: pageSize,
        offset
      });

      if (data.length > 0) {
        const items = data.map(item => new SQLObject(item));
        if (this.cache[key]) {
          this.cache[key].push(...items);
        } else {
          this.cache[key] = items;
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

  /**
   * @param {Schema|SchemaItem|SQLObject} [element]
   * @returns {Promise<vscode.TreeItem[]>};
   */
  async getChildren(element) {
    let items = [];

    if (element) {

      const contextValue = element.contextValue;

      if (element instanceof Schema) {
        items = getSchemaItems(element.schema);
      } else
      if (element instanceof SchemaItem) {
        items = await this.fetchData(element.schema, contextValue, false);

        // @ts-ignore
        items.push(moreButton(element.schema, contextValue));
      } else
      if (element instanceof SQLObject) {
        const type = element.type;

        if (Types[type]) {
          items = await Types[type].getChildren(element.schema, element.name);
        }
      }

    } else {
      const connection = instance.getConnection();
      if (connection) {
        const config = instance.getConfig();

        const libraries = config.get(`databaseBrowserList`) || [];

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
  constructor(name) {
    super(name.toLowerCase(), vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = `schema`;
    this.schema = name;
    this.iconPath = new vscode.ThemeIcon(`database`);
  }
}

class SchemaItem extends vscode.TreeItem {
  constructor(name, type, schema, icon) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = type;
    this.schema = schema;
    if (icon) this.iconPath = new vscode.ThemeIcon(icon);
  }
}

class SQLObject extends vscode.TreeItem {
  constructor(item) {
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
