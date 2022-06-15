
const WebToolkit = require(`@vscode/webview-ui-toolkit/dist/toolkit.min.js`);

const vscode = require(`vscode`);
const Tools = require(`../tools`);

const Statement = require(`../../database/statement`);
const View = require(`../../database/view`);
const Headers = require(`./headers`);

const checkValues = {
  N: `None`,
  C: `Cascaded`,
  Y: `Local`
}

module.exports = class ViewPanel {
  /**
   * @param {string} schema 
   * @param {string} view 
   * @param {vscode.Uri} extensionUri
   */
  constructor(schema, view, extensionUri) {
    this.schema = schema;
    this.view = view;

    this.extensionUri = extensionUri;

    /** @type {vscode.WebviewPanel} */
    this.panel = undefined;
  }

  async render() {
    if (this.panel) return;

    this.panel = vscode.window.createWebviewPanel(
      `view`,
      `View ${this.view}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
      }
    );

    this.panel.webview.html = Tools.getLoadingHTML(this.panel.webview, this.extensionUri);
    this.panel.webview.html = await this._getContent();
  }

  async _getContent() {
    const view = new View(this.schema, this.view);

    Tools.setLoadingText(this.panel.webview, `Fetching base info`);
    const info = await view.getInfo();

    Tools.setLoadingText(this.panel.webview, `Fetching columns`);
    const columns = await view.getColumns();

    Tools.setLoadingText(this.panel.webview, `Rendering`);

    const columnData = Tools.generateTable(
      `viewColumns`, 
      Headers.columns,
      columns
    );

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script type="module">${WebToolkit}</script>
          <style type="text/css">
            .component {
              margin-bottom: 0.5rem;
            }
          </style>
          <script>
            window.addEventListener("load", main);
            function main() {
              ${columnData.js}
            }
          </script>
          <title>Table</title>
        </head>
        <body>
          <section class="tables">
            ${Tools.generateTabs([
    {
      title: `View`,
      content: Tools.generateFields([
        {
          label: `Name`,
          value: info.TABLE_NAME
        },
        {
          label: `Schema`,
          value: info.TABLE_SCHEMA
        },
        {
          label: `System name`,
          value: info.SYSTEM_TABLE_NAME
        },
        {
          label: `Check option`,
          value: checkValues[info.CHECK_OPTION] || `None`
        },
        {
          label: `Insert allowed`,
          value: info.IS_INSERTABLE_INTO === `YES` ? `Yes` : `No`
        },
        {
          label: `Update allowed`,
          value: info.IS_UPDATABLE === `Y` ? `Yes` : `No`
        },
        {
          label: `Delete allowed`,
          value: info.IS_DELETABLE === `Y` ? `Yes` : `No`
        },
        {
          label: `Text`,
          value: info.TABLE_TEXT
        },
        {
          label: `Comment`,
          value: info.LONG_COMMENT || ``
        }
      ]),
    },
    {
      title: `Columns`,
      content: columnData.html
    },
    {
      title: `Query text`,
      content: `<pre>${Statement.format(info.VIEW_DEFINITION)}</pre>`
    }
  ])}
          </section>
        </body>
      </html>
    `;
  }
}