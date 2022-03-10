
const vscode = require(`vscode`);

module.exports = class {
  /**
   * @param {vscode.Webview} webview 
   * @param {vscode.Uri} extensionUri 
   * @param {string[]} pathList 
   */
  static getUri(webview, extensionUri, pathList) {
    return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
  }

  static setLoadingText(webview, text) {
    webview.postMessage({
      command: `loadingText`,
      text,
    });
  }

  static getLoadingHTML(webview, extensionUri) {
    const toolkitUri = this.getUri(webview, extensionUri, [
      `node_modules`,
      `@vscode`,
      `webview-ui-toolkit`,
      `dist`,
      `toolkit.js`,
    ]);

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script type="module" src="${toolkitUri}"></script>
          <script>
            window.addEventListener("message", (event) => {
              const command = event.data.command;

              switch (command) {
                case "loadingText":
                  const text = document.getElementById("loadingText");
                  text.innerText = event.data.text;
                  break;
              }
            });
          </script>
          <style type="text/css">
            .loading {
              position: fixed; /* or absolute */
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }
          </style>
        </head>
        <body>
          <p id="loadingText">Loading..</p>
          <section class="loading">
            <p><vscode-progress-ring></vscode-progress-ring></p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * 
   * @param {{title: string, content: string}[]} data 
   */
  static generateTabs(data) {
    let html = `<vscode-panels>`;

    data.forEach((tab, index) => {
      html += `<vscode-panel-tab id="tab-${index}">${tab.title}</vscode-panel-tab>`;
    });

    data.forEach((tab, index) => {
      html += `<vscode-panel-view id="view-${index}"><section class="component-container">${tab.content}</section></vscode-panel-view>`;
    });

    html += `</vscode-panels>`;

    return html;
  }

  /**
   * 
   * @param {{label?: string, value: string, size?: number}[]} fields 
   */
  static generateFields(fields) {
    let html = ``;

    fields.forEach(field => {
      html += /*html*/`
      <section class="component">
        <vscode-text-field readonly value="${field.value.replace(new RegExp(`"`, `g`), `&quot;`)}" ${field.size ? `size="${field.size}"` : ``}>${field.label || ``}</vscode-text-field>
      </section>
      `;
    });

    return html
  }

  /**
   * 
   * @param {{title: string, columnDataKey: string|number, transform?: (row: object) => string|number}[]} columns 
   * @param {object[]} rows 
   * @returns {{html: string, js: string}}
   */
  static generateTable(id, columns, rows) {
    rows.forEach(row => {
      columns.forEach(column => {
        if (row[column.columnDataKey] && column.transform) {
          row[column.columnDataKey] = column.transform(row);
        }
      });
    });
    
    let result = {
      html: `<vscode-data-grid id="${id}"></vscode-data-grid>`,
      js: [
        `const ${id} = document.getElementById("${id}");`,
        `${id}.columnDefinitions = ${JSON.stringify(columns)};`,
        `${id}.rowsData = ${JSON.stringify(rows)};`,
      ].join(``),
    };

    return result;
  }
}