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

export interface UpdatableInfo {table: string, columns: BasicColumn[]};

export interface BasicColumn {
  name: string;
  useInWhere: boolean
  jsType: "number"|"asString";
}

export function generateScroller(basicSelect: string, isCL: boolean, withCancel?: boolean, updatable?: UpdatableInfo): string {
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

          // Updatable information

          const updateTable = ${JSON.stringify(updatable)};

          let myQueryId = '';
          let columnMetaData = undefined;
          let needToInitializeTable = true;
          let totalRows = 0;
          let noMoreRows = false;
          let isFetching = false;

          function isNumeric(str) {
            if (typeof str != "string") return false // we only process strings!  
            return !isNaN(str) && // use type coercion to parse the _entirety_ of the string ('parseFloat' alone does not do this)...
                  !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
          }

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

            document.getElementById('resultset').onclick = function(e){
              console.log('click')
              if (updateTable === undefined) return;

              var e = e || window.event;
              var target = e.target || e.srcElement;

              let chosenValue;
              let trWithColumn;
              let editableNode;

              if (target.tagName.toLowerCase() == "div") {
                chosenValue = target.innerText;
                editableNode = target;
                trWithColumn = target.parentElement;
              }
              else if (target.tagName.toLowerCase() == "td") {
                // get the inner div
                chosenValue = target.firstChild.innerText;
                editableNode = target;
                trWithColumn = target;
              }

              if (trWithColumn && trWithColumn.column) {
                const chosenColumn = trWithColumn.column;
                const chosenColumnDetail = updateTable.columns.find(col => col.name === chosenColumn);
                if (!chosenColumnDetail) return;
                
                const parentRow = trWithColumn.parentElement;

                const updateKeyColumns = updateTable.columns.filter(col => col.useInWhere);

                let idValues = [];
                for (let i = 0; i < parentRow.cells.length; i++) {
                  const cell = parentRow.cells[i];
                  if (updateKeyColumns.some(col => col.name === cell.column)) {
                    idValues.push(cell.firstChild.innerText);
                  }
                }

                // Already editable, just return
                if (editableNode.contentEditable === 'true') return;
                editableNode.contentEditable = true;
                editableNode.focus();

                const keydownEvent = (e) => {
                  if (e.key === 'Enter') {  
                    e.preventDefault();
                    finishEditing();
                  }
                }

                const finishEditing = () => {
                  if (editableNode === undefined) return;

                  // Remove keydown listener
                  editableNode.removeEventListener('keydown', keydownEvent);

                  editableNode.contentEditable = false;
                  const newValue = editableNode.innerText;

                  if (newValue === chosenValue) return;

                  let bindings = [];
                  let updateStatement = 'UPDATE ' + updateTable.table + ' SET ' + chosenColumn + ' = ';

                  if (newValue === 'null') {
                    updateStatement += 'NULL';

                  } else { 
                    switch (chosenColumnDetail.jsType) {
                      case 'number':
                        if (isNumeric(newValue)) {
                          bindings.push(newValue);
                          updateStatement += '?';
                        } else {
                          editableNode.innerHTML = chosenValue;
                          return;
                        }
                        break;

                      case 'asString':
                        updateStatement += '?';
                        bindings.push(newValue);
                        break;
                    }
                  }

                  updateStatement += ' WHERE ';
                  
                  for (let i = 0; i < updateKeyColumns.length; i++) {
                    if (idValues[i] === 'null') continue;
                    updateStatement += updateKeyColumns[i].name + ' = ?';
                    switch (updateKeyColumns[i].jsType) {
                      case 'number':
                        bindings.push(Number(idValues[i]));
                        break;
                      case 'asString':
                        bindings.push(idValues[i]);
                        break;
                    }

                    if (i < updateKeyColumns.length - 1) {
                      updateStatement += ' AND ';
                    }
                  }

                  editableNode = undefined;

                  vscode.postMessage({
                    command: 'update',
                    update: updateStatement,
                    bindings: bindings
                  });
                }

                editableNode.addEventListener('blur', (e) => {
                  e.stopPropagation();
                  console.log('blur');
                  // Code to execute when the element loses focus
                  finishEditing();
                }, {once: true});

                editableNode.addEventListener('keydown', keydownEvent);
              }
            };

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
                    document.getElementById(statusId).innerText = (noMoreRows ? ('Loaded ' + totalRows + '. End of data.') : ('Loaded ' + totalRows + '. More available.')) + ' ' + (updateTable ? 'Updatable.' : '');
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

            const cancelButton = document.getElementById('cancelButton');

            if (cancelButton) {
              cancelButton.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'cancel',
                  queryId: myQueryId
                });
              });
            }
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

            if (columnMetaData.length > 2) {
              statusCell.colSpan = 2;
              jobIdCell.colSpan = columnMetaData.length - 2;
            }
          }

          function appendRows(rows) {
            let tBodyRef = document.getElementById(htmlTableId).getElementsByTagName('tbody')[0];

            for (const row of rows) {
              // Insert a row at the end of table
              let newRow = tBodyRef.insertRow()
              let currentColumn = 0;

              for (const cell of row) {
                let columnName = columnMetaData[currentColumn].name;
                // Insert a cell at the end of the row
                let newCell = newRow.insertCell();

                let newDiv = document.createElement("div");
                newDiv.className = "hoverable";

                // Append a formatted JSON object to the cell
                const contentMightBeJson = typeof cell === 'string' && (cell.startsWith('{') || cell.startsWith('[')) && (cell.endsWith('}') || cell.endsWith(']'));
                let isJson = false;
                if (contentMightBeJson) {
                  try {
                    const cellJson = JSON.stringify(JSON.parse(cell), null, 2);
                    newDiv.style.whiteSpace = "pre";
                    newDiv.style["font-family"] = "monospace";
                    newDiv.innerText = cellJson;
                    isJson = true;
                  } catch (e) {}
                }

                if (!isJson) {
                  // Append a text node to the cell
                  newDiv.appendChild(document.createTextNode(cell === undefined ? 'null' : cell));
                }
                
                newCell.column = columnName;
                newCell.appendChild(newDiv);
                currentColumn += 1;
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
          ${withCancel ? `<button id="cancelButton" class="primaryButton">Cancel</button>` : ``}
        </div>
      </body>
    </html>
  `;
}