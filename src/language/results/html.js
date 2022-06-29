const WebToolkit = require(`@vscode/webview-ui-toolkit/dist/toolkit.min.js`);

const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="module">${WebToolkit}</script>
  <style>
    .center-screen {
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 100vh;
    }

    .plaintext {
      background-color: var(--vscode-button-secondaryBackground);
      padding: 1em;
      color: var(--vscode-button-secondaryForeground);
    }

    .errortext {
      background-color: var(--vscode-button-secondaryBackground);
      padding: 1em;
      color: var(--vscode-errorForeground);
    }

    .loading {
      position: fixed; /* or absolute */
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  </style>`;

exports.setLoadingText = (webview, text) => {
  webview.postMessage({
    command: `loadingText`,
    text,
  });
}

exports.getLoadingHTML = () => {
  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${head}
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
 * @param {string} basicSelect
 * @returns {string}
 */
exports.generateScroller = (basicSelect) => {
  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${head}
        <script>
          const vscode = acquireVsCodeApi();
          const basicSelect = ${JSON.stringify(basicSelect)};
          const limit = 50;

          let nextOffset = 0;
          let noMoreRows = false;
          let isFetching = false;

          window.addEventListener("load", main);
            function main() {
              let Observer = new IntersectionObserver(function(entries) {
              // isIntersecting is true when element and viewport are overlapping
              // isIntersecting is false when element and viewport don't overlap
              if(entries[0].isIntersecting === true) {
                if (isFetching === false && noMoreRows === false) {
                  fetchNextPage();
                }
              }
            }, { threshold: [0] });

            Observer.observe(document.getElementById("nextButton"));

            window.addEventListener('message', event => {
              const scroller = document.getElementById("scroller");
              const data = event.data;

              switch (data.command) {
                case 'rows':

                  isFetching = false;

                  if (scroller.columnDefinitions.length === 0) {
                    scroller.columnDefinitions = Object.keys(data.rows[0]).map(col => ({
                      title: col,
                      columnDataKey: col,
                    }));
                  }

                  if (scroller.rowsData.length > 0) {
                    scroller.rowsData = [...scroller.rowsData, ...data.rows];
                  } else {
                    scroller.rowsData = data.rows;
                  }

                  console.log('row check');
                  if (data.rows.length < limit) {
                    console.log("No more rows");
                    noMoreRows = true;
                  }

                  const nextButton = document.getElementById("nextButton");
                  nextButton.innerText = noMoreRows ? 'End of data' : 'Fetching more...';
                  break;

                case 'fetch':
                  scroller.columnDefinitions = [];
                  scroller.rowsData = [];
                  nextOffset = 0;
                  fetchNextPage();
                  break;
              }
            });
          }

          function fetchNextPage() {
            isFetching = true;
            vscode.postMessage({
              query: basicSelect,
              limit,
              offset: nextOffset,
            });

            nextOffset += limit;
          }
        </script>
      </head>
      <body>
        <vscode-data-grid id="scroller"></vscode-data-grid>
        <vscode-divider></vscode-divider>
        <p id="nextButton">Execute statement.</p>
      </body>
    </html>
  `;
}

/**
 * 
 * @param {object[]} rows 
 * @returns {string}
 */
exports.generateResults = (rows) => {
  const columns = Object.keys(rows[0]).map(column => ({
    title: column,
    columnDataKey: column,
  }));

  const inlineData = this.generateTable(`results`, columns, rows);

  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${head}
        <script>
          window.addEventListener("load", main);
          function main() {
            ${inlineData.js}
          }
        </script>
      </head>
      <body>
        ${inlineData.html}
      </body>
    </html>
  `;
}

/**
   * 
   * @param {{title: string, columnDataKey: string|number, transform?: (row: object) => string|number}[]} columns 
   * @param {object[]} rows 
   * @returns {{html: string, js: string}}
   */
exports.generateTable = (id, columns, rows) => {
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