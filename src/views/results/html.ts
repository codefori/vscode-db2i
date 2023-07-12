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

          let datatable;
          
          let mustLoadDataTable = true;
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

            let columnList;
            window.addEventListener('message', event => {
              const datatableDiv = document.getElementById("resultset");
              const scroller = document.getElementById("scroller");
              const data = event.data;
              
              switch (data.command) {
                case 'rows':
                  // Change loading state here...
                  isFetching = false;
                  myQueryId = data.queryId;
                  noMoreRows = data.isDone;

                  // TODO: get column names from metadata?
                  columnList = Object.keys(data.rows[0]);

                  if (mustLoadDataTable && columnList.length > 0 && data.rows.length > 0) {
                    const columns = Object.keys(data.rows[0]).map(col => ({
                      name: col,
                      id: col,
                      editable: false,
                      sortable: false,
                      focusable: false,
                      dropdown: false
                    }));

                    datatable = new DataTable(datatableDiv, {
                      columns,
                      data: [],
                      checkboxColumn: false,
                      serialNoColumn: false,
                      inlineFilters: false,
                      layout: "fluid"
                    });

                    mustLoadDataTable = false;
                  }

                  console.log(data.rows);

                  if (data.rows.length > 0) {
                    let rowsOfColumns = data.rows.map(row => {
                      return columnList.map(colName => row[colName] || '')
                    });

                    console.log(rowsOfColumns);

                    const datamanager = datatable.datamanager;
                    console.log(datamanager);

                    const rowCount = datamanager.rowCount;
                    const preppedRows = rowsOfColumns.map((newRow, rowId) => datamanager.prepareRow(newRow, {rowIndex: rowCount+rowId, indent: 0}));
                    console.log(preppedRows);

                    // For some reason we have to push for both. No problem
                    datamanager.rows.push(...preppedRows);
                    datamanager.data.push(...preppedRows);
                    datatable.refresh();
                  }

                  const nextButton = document.getElementById("nextButton");
                  // nextButton.innerText = noMoreRows ? ('Loaded ' + scroller.rowsData.length + '. End of data') : ('Loaded ' + scroller.rowsData.length + '. Fetching more...');
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
        </script>
      </head>
      <body>
        <div id="resultset"></div>
        <hr>
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