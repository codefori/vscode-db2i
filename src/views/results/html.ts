import { Webview } from "vscode";
import { head } from "../html";

export function setLoadingText(webview: Webview, text: string) {
  webview.postMessage({
    command: `loadingText`,
    text,
  });
}

export function getLoadingHTML(): string {
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
        </section>
      </body>
    </html>
  `;
}

export function generateScroller(basicSelect: string, isCL: boolean): string {
  return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${head}
        <script>
          const vscode = acquireVsCodeApi();
          const basicSelect = ${JSON.stringify(basicSelect)};
          let myQueryId = '';

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
                  myQueryId = data.queryId;
                  noMoreRows = data.isDone;

                  if (data.rows.length > 0 && scroller.columnDefinitions.length === 0) {
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

                  const nextButton = document.getElementById("nextButton");
                  nextButton.innerText = noMoreRows ? ('Loaded ' + scroller.rowsData.length + '. End of data') : ('Loaded ' + scroller.rowsData.length + '. Fetching more...');
                  break;

                case 'fetch':
                  scroller.columnDefinitions = [];
                  scroller.rowsData = [];
                  fetchNextPage();
                  break;
              }
            });
          }

          function fetchNextPage() {
            isFetching = true;
            vscode.postMessage({
              query: basicSelect,
              isCL: ${isCL},
              queryId: myQueryId
            });
          }
        </script>
      </head>
      <body>
        <vscode-data-grid id="scroller" style="min-width: max-content;"></vscode-data-grid>
        <vscode-divider></vscode-divider>
        <p id="nextButton">Execute statement.</p>
      </body>
    </html>
  `;
}

export function generateResults(rows: object[]): string {
  const columns = Object.keys(rows[0]).map(column => ({
    title: column,
    columnDataKey: column,
  }));

  const inlineData = generateTable(`results`, columns, rows);

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

interface ColumnDetail {title: string, columnDataKey: string|number, transform?: (row: object) => string|number};

export function generateTable(id: string, columns: ColumnDetail[], rows: any[]) {
  rows.forEach(row => {
    columns.forEach(column => {
      if (row[column.columnDataKey] && column.transform) {
        row[column.columnDataKey] = column.transform(row);
      }
    });
  });
    
  let result = {
    html: `<vscode-data-grid id="${id}" style="min-width: max-content;"></vscode-data-grid>`,
    js: [
      `const ${id} = document.getElementById("${id}");`,
      `${id}.columnDefinitions = ${JSON.stringify(columns)};`,
      `${id}.rowsData = ${JSON.stringify(rows)};`,
    ].join(``),
  };

  return result;
}