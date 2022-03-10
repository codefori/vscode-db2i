
const vscode = require(`vscode`);
const Tools = require(`../tools`);

const Table = require(`../../database/table`);
const Headers = require(`./headers`);

module.exports = class TablePanel {
  /**
   * @param {string} schema 
   * @param {string} schema 
   * @param {vscode.Uri} extensionUri
   */
  constructor(schema, object, extensionUri) {
    this.schema = schema;
    this.table = object;

    this.extensionUri = extensionUri;

    /** @type {vscode.WebviewPanel} */
    this.panel = undefined;
  }

  async render() {
    if (this.panel) return;

    this.panel = vscode.window.createWebviewPanel(
      `table`,
      `Table ${this.table}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
      }
    );

    this.panel.webview.html = Tools.getLoadingHTML(this.panel.webview, this.extensionUri);
    this.panel.webview.html = await this._getContent();
  }

  async _getContent() {
    const toolkitUri = Tools.getUri(this.panel.webview, this.extensionUri, [
      `node_modules`,
      `@vscode`,
      `webview-ui-toolkit`,
      `dist`,
      `toolkit.js`,
    ]);

    const table = new Table(this.schema, this.table);

    // TODO: each await should also send an update to the frontend loading screen (below)
    Tools.setLoadingText(this.panel.webview, `Fetching base info`);
    const info = await table.getInfo();

    Tools.setLoadingText(this.panel.webview, `Fetching columns`);
    const columns = await table.getColumns();

    Tools.setLoadingText(this.panel.webview, `Fetching constraints`);
    const keyContraints = await table.getConstraints();

    Tools.setLoadingText(this.panel.webview, `Fetching constraint columns`);
    const constraintColumns = await table.getConstraintColumns();

    Tools.setLoadingText(this.panel.webview, `Fetching foreign keys`);
    const foreignKeys = await table.getForeignKeys();
    
    Tools.setLoadingText(this.panel.webview, `Fetching check constraints`);
    const checkConstraints = await table.getCheckConstraintsInfo(keyContraints.filter(c => c.CONSTRAINT_TYPE === `CHECK`));

    Tools.setLoadingText(this.panel.webview, `Rendering`);

    const columnData = Tools.generateTable(
      `tableColumns`, 
      Headers.columns,
      columns
    );

    const keyContraintsData = Tools.generateTable(
      `tableKeyConstraints`, 
      Headers.keyConstraints,
      keyContraints
        .filter(constraint => [`PRIMARY KEY`, `UNIQUE`].includes(constraint.CONSTRAINT_TYPE))
        .map(constraint => {
          const columns = constraintColumns.filter(column => column.CONSTRAINT_NAME === constraint.CONSTRAINT_NAME);
          constraint.columns = columns.map(column => column.COLUMN_NAME).join(`, `);
          return constraint;
        })
    );

    const foreignKeysData = Tools.generateTable(
      `tableForeignKeys`,
      Headers.foreignKeys,
      foreignKeys
    );

    const checkData = Tools.generateTable(
      `tableCheckConstraints`,
      Headers.checkConstraints,
      checkConstraints
    );

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script type="module" src="${toolkitUri}"></script>
          <style type="text/css">
            .component {
              margin-bottom: 0.5rem;
            }
          </style>
          <script>
            window.addEventListener("load", main);
            function main() {
              ${columnData.js}
              ${keyContraintsData.js}
              ${foreignKeysData.js}
              ${checkData.js}
            }
          </script>
          <title>Table</title>
        </head>
        <body>
          <section class="tables">
            ${Tools.generateTabs([
    {
      title: `Table`,
      content: `
                  <section class="component-container">
                    <section class="component">
                      <vscode-text-field readonly value="${info.TABLE_NAME}">Name</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.TABLE_SCHEMA}">Schema</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.SYSTEM_TABLE_NAME}">System name</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.TABLE_TEXT}" size="50">Text</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.LONG_COMMENT || ``}" size="50">Comment</vscode-text-field>
                    </section>
                  </section>
                  `
    },
    {
      title: `Columns`,
      content: columnData.html
    },
    {
      title: `Key constraints`,
      content: keyContraintsData.html
    },
    {
      title: `Foreign keys`,
      content: foreignKeysData.html
    },
    {
      title: `Check constraints`,
      content: checkData.html
    }
  ])}
          </section>
        </body>
      </html>
    `;
  }
}