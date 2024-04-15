import { Webview } from "vscode";
import { getHeader } from "../html";

import Configuration from "../../configuration";

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
        ${getHeader()}
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
  const withCollapsed = Configuration.get<boolean>('collapsedResultSet');

  return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${getHeader({withCollapsed})}
        <script>
          /* 
          ${new Date().getTime()}
          */
          const vscode = acquireVsCodeApi();
          const basicSelect = ${JSON.stringify(basicSelect)};
          const htmlTableId = 'resultset';
          const statusId = 'status';
          const jobId = 'jobId';
          const messageSpanId = 'messageSpan';

          let myQueryId = '';
          let columnMetaData = undefined;
          let needToInitializeTable = true;
          let totalRows = 0;
          let noMoreRows = false;
          let isFetching = false;

          window.addEventListener("load", main);
            function main() {
              new IntersectionObserver(function(entries) {
              // isIntersecting is true when element and viewport are overlapping
              // isIntersecting is false when element and viewport don't overlap
              if(entries[0].isIntersecting === true) {
                if (isFetching === false && noMoreRows === false) {
                  fetchNextPage();
                }
              }
            }, { threshold: [0] }).observe(document.getElementById(messageSpanId));

            window.addEventListener('message', event => {
              const data = event.data;
              myQueryId = data.queryId;
              // If we haven't yet saved off the column meta data, do so now
              if (columnMetaData === undefined) {
                columnMetaData = data.columnMetaData;
              }

              switch (data.command) {
                case 'rows':
                  hideSpinner();

                  // Change loading state here...
                  isFetching = false;
                  noMoreRows = data.isDone;

                  if (needToInitializeTable && columnMetaData) {
                    initializeTable(data.columnHeadings);
                    needToInitializeTable = false;
                  }

                  if (data.rows && data.rows.length > 0) {
                    totalRows += data.rows.length;
                    appendRows(data.rows);
                  }

                  if (data.rows === undefined && totalRows === 0) {
                    document.getElementById(messageSpanId).innerText = 'Statement executed with no result set returned. Rows affected: ' + data.update_count;
                  } else {
                    document.getElementById(statusId).innerText = noMoreRows ? ('Loaded ' + totalRows + '. End of data.') : ('Loaded ' + totalRows + '. More available.');
                    document.getElementById(jobId).innerText = data.jobId ? data.jobId : '';
                    document.getElementById(messageSpanId).style.visibility = "hidden";
                  }
                  break;

                case 'fetch':
                  // Set loading here....
                  fetchNextPage();
                  break;

                case 'header':
                  updateHeader(event.data.columnHeadings);
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

          function initializeTable(columnHeadings) {
            // Initialize the header
            var header = document.getElementById(htmlTableId).getElementsByTagName('thead')[0];
            header.innerHTML = '';
            var headerRow = header.insertRow();
            columnMetaData.map(col => columnHeadings === 'Label' ? col.label : col.name).forEach(colName => headerRow.insertCell().appendChild(document.createTextNode(colName)));

            // Initialize the footer
            var footer = document.getElementById(htmlTableId).getElementsByTagName('tfoot')[0];
            footer.innerHTML = '';
            const newRow = footer.insertRow();

            const statusCell = newRow.insertCell();
            statusCell.id = statusId;
            statusCell.appendChild(document.createTextNode(' '));

            const jobIdCell = newRow.insertCell();
            jobIdCell.id = jobId;
            jobIdCell.appendChild(document.createTextNode(' '));

            if (columns.length > 2) {
              statusCell.colSpan = 2;
              jobIdCell.colSpan = columns.length - 2;
            }
          }

          function appendRows(rows) {
            var tBodyRef = document.getElementById(htmlTableId).getElementsByTagName('tbody')[0];

            for (const row of rows) {
              // Insert a row at the end of table
              var newRow = tBodyRef.insertRow()

              for (const cell of row) {
                // Insert a cell at the end of the row
                var newCell = newRow.insertCell();

                // Append a text node to the cell

                //TODO: handle cell formatting here
                var newDiv = document.createElement("div");
                newDiv.className = "hoverable";
                newDiv.appendChild(document.createTextNode(cell === undefined ? 'null' : cell));

                newCell.appendChild(newDiv);
              }
            }
          }

          // columnHeadings parameter is the value of the "vscode-db2i.resultsets.columnHeadings" setting, either 'Name' or 'Label'
          function updateHeader(columnHeadings) {
            if (columnMetaData) {
              var headerCells = document.getElementById(htmlTableId).getElementsByTagName('thead')[0].rows[0].cells;
              for (let x = 0; x < headerCells.length; ++x) {
                headerCells[x].innerText = columnHeadings === 'Label' ? columnMetaData[x].label : columnMetaData[x].name;
              }
            }
          }
        </script>
      </head>
      <body>
        <table id="resultset">
          <thead></thead>
          <tbody></tbody>
          <tfoot></tfoot>
          </table>
        <p id="messageSpan"></p>
        <div id="spinnerContent" class="center-screen">
          <p id="loadingText">Running statement</p>
          <span class="loader"></span>
        </div>
      </body>
    </html>
  `;
}