
const vscode = require(`vscode`);
const Database = require(`../database/schemas`);

const Configuration = require(`../configuration`);

const Store = require(`../language/store`);

const Panels = require(`../panels`);

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

        const schemas = config.databaseBrowserList || [];

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

          let schemas = config.databaseBrowserList;

          let index = schemas.findIndex(file => file.toUpperCase() === node.path)
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

      vscode.commands.registerCommand(`vscode-db2i.showObjectInfo`, async (schema, object, type) => {
        if (schema && object && type) {
          let panel;
          switch (type) {
          case `table`:
            panel = new Panels.table(schema, object, context.extensionUri);
            panel.render();
            break;
          case `view`:
            panel = new Panels.view(schema, object, context.extensionUri);
            panel.render();
            break;
          case `procedure`:
            panel = new Panels.procedure(schema, object, context.extensionUri);
            panel.render();
            break;
          case `trigger`:
            panel = new Panels.trigger(schema, object, context.extensionUri);
            panel.render();
            break;
          default:
            vscode.window.showInformationMessage(`No view available for ${type}.`);
            break;
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.generateSQL`, async (object) => {
        if (object) {
          try {
            const lines = await Database.generateSQL(object.schema, object.name, object.type.toUpperCase());
            const textDoc = await vscode.workspace.openTextDocument(vscode.Uri.parse(`untitled:` + `${object.name.toLowerCase()}.sql`));
            const editor = await vscode.window.showTextDocument(textDoc);
            editor.edit(edit => {
              edit.insert(new vscode.Position(0, 0), lines);
            })
          } catch (e) {
            vscode.window.showErrorMessage(e);
          }
        }
      }),
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

      const data = await Database.getObjects(schema, type, {
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
   * @param {vscode.TreeItem|Schema} [element]
   * @returns {Promise<vscode.TreeItem[]>};
   */
  async getChildren(element) {
    let items = [];

    if (element) {
      const type = element.contextValue;
      switch (type) {
      case `schema`:
        // @ts-ignore exists on Schema
        items = getSchemaItems(element.schema);
        break;

      case `tables`:
      case `aliases`:
      case `views`:
      case `constraints`:
      case `procedures`:
      case `functions`:
      case `packages`:
      case `triggers`:
      case `types`:
      case `sequences`:
      case `indexes`:
      case `variables`:
        // @ts-ignore exists on Schema
        items = await this.fetchData(element.schema, type, false);

        // @ts-ignore
        items.push(moreButton(element.schema, type));
        break;
      }

    } else {
      const connection = instance.getConnection();
      if (connection) {
        const config = instance.getConfig();

        const libraries = config.databaseBrowserList || [];

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
    super(item.name.toLowerCase(), vscode.TreeItemCollapsibleState.None);

    const type = viewItem[item.type];

    this.contextValue = type;
    this.path = `${item.schema}.${item.name}`;
    this.schema = item.schema;
    this.name = item.name;
    this.type = type;
    this.description = item.text;

    this.command = {
      command: `vscode-db2i.showObjectInfo`,
      title: `Show Object Info`,
      arguments: [this.schema, this.name, this.type]
    };
  }
}

const getSchemaItems = (schema) => {
  const items = [
    //new SchemaItem(`All Database Objects`, `all`, schema),
    new SchemaItem(`Aliases`, `aliases`, schema),
    //new SchemaItem(`Column Masks`, `masks`, schema),
    new SchemaItem(`Constraints`, `constraints`, schema),
    new SchemaItem(`Function`, `functions`, schema),
    new SchemaItem(`Global Variables`, `variables`, schema),
    new SchemaItem(`Indexes`, `indexes`, schema),
    //new SchemaItem(`Journal Receivers`, `receivers`, schema),
    //new SchemaItem(`Journals`, `journals`, schema),
    new SchemaItem(`Procedures`, `procedures`, schema),
    //new SchemaItem(`Row Permissions`, `permissions`, schema),
    new SchemaItem(`Sequences`, `sequences`, schema),
    new SchemaItem(`SQL Packages`, `packages`, schema),
    new SchemaItem(`Tables`, `tables`, schema),
    new SchemaItem(`Triggers`, `triggers`, schema),
    new SchemaItem(`Types`, `types`, schema),
    new SchemaItem(`Views`, `views`, schema)
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