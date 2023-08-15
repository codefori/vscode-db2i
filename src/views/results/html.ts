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
        <div id="spinnerContent" class="center-screen">
          <p id="loadingText">View will be active when a statement is executed.</p>
          <span class="loader"></span>
        </div>
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
          /* 
          ${new Date().getTime()}
          */
          const vscode = acquireVsCodeApi();
          const basicSelect = ${JSON.stringify(basicSelect)};
          let myQueryId = '';
          
          let mustLoadHeaders = true;
          let totalRows = 0;
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
              const data = event.data;
              myQueryId = data.queryId;

              switch (data.command) {
                case 'rows':
                  hideSpinner();

                  // Change loading state here...
                  isFetching = false;
                  noMoreRows = data.isDone;

                  if (mustLoadHeaders && event.data.columnList) {
                    setHeaders('resultset', event.data.columnList);
                    mustLoadHeaders = false;
                  }

                  if (data.rows && data.rows.length > 0) {
                    totalRows += data.rows.length;
                    appendRows('resultset', data.rows);
                  }

                  const nextButton = document.getElementById("nextButton");
                  if (data.rows === undefined && totalRows === 0) {
                    nextButton.innerText = 'Query executed with no result set returned. Rows affected: ' + data.update_count;
                  } else {
                    nextButton.innerText = noMoreRows ? ('Loaded ' + totalRows + '. End of data') : ('Loaded ' + totalRows + '. Fetching more...');
                  }
                  break;

                case 'fetch':
                  // Set loading here....
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

          function hideSpinner() {
            document.getElementById("spinnerContent").style.display = 'none';
          }

          function setHeaders(tableId, columns) {
            var tHeadRef = document.getElementById(tableId).getElementsByTagName('thead')[0];
            tHeadRef.innerHTML = '';

            // Insert a row at the end of table
            var newRow = tHeadRef.insertRow();

            columns.forEach(colName => {
              // Insert a cell at the end of the row
              var newCell = newRow.insertCell();

              // Append a text node to the cell
              var newText = document.createTextNode(colName);
              newCell.appendChild(newText);
            });
          }

          function appendRows(tableId, arrayOfObjects) {
            var tBodyRef = document.getElementById(tableId).getElementsByTagName('tbody')[0];

            for (const row of arrayOfObjects) {
              // Insert a row at the end of table
              var newRow = tBodyRef.insertRow();

              for (const cell of row) {
                // Insert a cell at the end of the row
                var newCell = newRow.insertCell();

                // Append a text node to the cell
                var newText = document.createTextNode(cell === undefined ? 'null' : cell);
                newCell.appendChild(newText);
              }
            }

          }
        </script>
      </head>
      <body>
        <table id="resultset">
          <thead></thead>
          <tbody></tbody>
        </table>
        <p id="nextButton"></p>
        <div id="spinnerContent" class="center-screen">
          <p id="loadingText">Running statement</p>
          <span class="loader"></span>
        </div>
      </body>
    </html>
  `;
}

interface ColumnDetail {title: string, columnDataKey: string|number, transform?: (row: object) => string|number};
