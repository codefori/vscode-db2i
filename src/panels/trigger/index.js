
const WebToolkit = require(`@vscode/webview-ui-toolkit/dist/toolkit.min.js`);

const vscode = require(`vscode`);
const Tools = require(`../tools`);

const Statement = require(`../../database/statement`);
const Trigger = require(`../../database/trigger`);

const checkValues = {
  N: `None`,
  C: `Cascaded`,
  Y: `Local`
}

module.exports = class ViewPanel {
  /**
   * @param {string} schema 
   * @param {string} trigger 
   * @param {vscode.Uri} extensionUri
   */
  constructor(schema, trigger, extensionUri) {
    this.schema = schema;
    this.trigger = trigger;

    this.extensionUri = extensionUri;

    /** @type {vscode.WebviewPanel} */
    this.panel = undefined;
  }

  async render() {
    if (this.panel) return;

    this.panel = vscode.window.createWebviewPanel(
      `view`,
      `View ${this.trigger}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
      }
    );

    this.panel.webview.html = Tools.getLoadingHTML(this.panel.webview, this.extensionUri);
    this.panel.webview.html = await this._getContent();
  }

  async _getContent() {
    const trigger = new Trigger(this.schema, this.trigger);

    Tools.setLoadingText(this.panel.webview, `Fetching base info`);
    const info = await trigger.getInfo();

    Tools.setLoadingText(this.panel.webview, `Rendering`);

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
          label: `Table name`,
          value: info.EVENT_OBJECT_TABLE,
        },
        {
          label: `Table schema`,
          value: info.EVENT_OBJECT_SCHEMA,
        },
        {
          label: `Program name`,
          value: info.TRIGGER_PROGRAM_NAME
        },
        {
          label: `Program schema`,
          value: info.TRIGGER_PROGRAM_LIBRARY
        },
        {
          label: `Enabled`,
          value: info.ENABLED === `Y` ? `Yes` : `No`
        },
        {
          label: `Considerd secure for row and column access control`,
          value: info.SECURE === `Y` ? `Yes` : `No`
        },
        {
          label: `Called on both Db2 Mirror nodes`,
          value: info.MIRRORED === `Y` ? `Yes` : `No`
        },
        {
          label: `Event`,
          value: info.EVENT_MANIPULATION
        },
        {
          label: `When to run`,
          value: info.ACTION_TIMING
        },
        {
          label: `Multi-threaded job action`,
          value: info.MULTITHREADED_JOB_ACTION
        },
        {
          label: `Created`,
          value: info.CREATED,
          size: 50
        },
        {
          label: `Definer`,
          value: info.TRIGGER_DEFINER
        },
        {
          label: `Text`,
          value: info.TRIGGER_TEXT,
          size: 50
        },
        {
          label: `Comment`,
          value: info.LONG_COMMENT,
          size: 50
        }
      ])
    }
  ])}
          </section>
        </body>
      </html>
    `;
  }
}