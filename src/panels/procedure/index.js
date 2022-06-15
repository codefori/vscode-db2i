
const WebToolkit = require(`@vscode/webview-ui-toolkit/dist/toolkit.min.js`);

const vscode = require(`vscode`);
const Tools = require(`../tools`);

const Statement = require(`../../database/statement`);
const Procedure = require(`../../database/procedure`);
const Headers = require(`./headers`);

const checkValues = {
  N: `None`,
  C: `Cascaded`,
  Y: `Local`
}

module.exports = class ViewPanel {
  /**
   * @param {string} schema 
   * @param {string} procedure 
   * @param {vscode.Uri} extensionUri
   */
  constructor(schema, procedure, extensionUri) {
    this.schema = schema;
    this.procedure = procedure;

    this.extensionUri = extensionUri;

    /** @type {vscode.WebviewPanel} */
    this.panel = undefined;
  }

  async render() {
    if (this.panel) return;

    this.panel = vscode.window.createWebviewPanel(
      `view`,
      `View ${this.procedure}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
      }
    );

    this.panel.webview.html = Tools.getLoadingHTML(this.panel.webview, this.extensionUri);
    this.panel.webview.html = await this._getContent();
  }

  async _getContent() {
    const proc = new Procedure(this.schema, this.procedure)

    Tools.setLoadingText(this.panel.webview, `Fetching base info`);
    const info = await proc.getInfo();

    Tools.setLoadingText(this.panel.webview, `Fetching columns`);
    const parms = await proc.getParms();

    Tools.setLoadingText(this.panel.webview, `Rendering`);

    const columnData = Tools.generateTable(
      `procParms`, 
      Headers.columns,
      parms
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
      content: /*html*/ `
                  <section class="component-container">
                    <section class="component">
                      <vscode-text-field readonly value="${info.ROUTINE_NAME}">Name</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.ROUTINE_SCHEMA}">Schema</vscode-text-field>
                    </section>
                    <!-- <section class="component">
                      <vscode-text-field readonly value="${info.SPECIFIC_NAME}">Specific name</vscode-text-field>
                    </section> -->
                    <section class="component">
                      <vscode-text-field readonly value="${info.EXTERNAL_LANGUAGE}">Language</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.PARAMETER_STYLE}">Parameter style</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.EXTERNAL_NAME}" size="50">Program</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.ROUTINE_DEFINER}">Definer</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.ROUTINE_TEXT || ``}" size="50">Text</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.LONG_COMMENT || ``}" size="50">Comment</vscode-text-field>
                    </section>
                      <section class="component">
                    </section>
                    <vscode-divider role="separator"></vscode-divider>
                    <section class="component">
                      <vscode-text-field readonly value="${info.RESULT_SETS || ``}" size="50">Maximum number of result sets</vscode-text-field>
                    </section>
                    <section class="component">
                      <vscode-text-field readonly value="${info.SQL_DATA_ACCESS || ``}" size="50">Data access</vscode-text-field>
                    </section>
                  </section>
                  `
    },
    {
      title: `Columns`,
      content: columnData.html
    },
    {
      title: `Query text`,
      content: info.ROUTINE_DEFINITION ? `<pre>${Statement.format(info.ROUTINE_DEFINITION)}</pre>` : `No routine definition found.`
    }
  ])}
          </section>
        </body>
      </html>
    `;
  }
}