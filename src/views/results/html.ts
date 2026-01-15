import { Webview } from "vscode";
import { getHeader } from "../html";

import Configuration from "../../configuration";
import { SqlParameter } from "./resultSetPanelProvider";

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
  isNullable: boolean,
  maxInputLength?: number;
}

const editableCellsLogic = /*js*/`
let updateRequests = {};

function requestCellUpdate(cellNode, originalValue, statement, bindings) {
  const randomId = Math.floor(Math.random() * 1000000);
  updateRequests[randomId] = {cellNode, originalValue};

  vscode.postMessage({
    command: 'update',
    id: randomId,
    update: statement,
    bindings: bindings
  });
}

function handleCellResponse(id, success) {
  const previousRequest = updateRequests[id];

  if (previousRequest) {
    if (!success) {
      previousRequest.cellNode.innerText = previousRequest.originalValue;
    }

    delete updateRequests[id];
  }
}

const validKeyPresses = ['Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];

const updateMessageContent = (show, initialMessage) => {
  const updateMessage = document.getElementById(updateMessageId);
  if (updateMessage) {
    if (initialMessage) {
      updateMessage.innerHTML = initialMessage;
    }
    updateMessage.style.display = show ? '' : 'none';
  }
}

document.getElementById('resultset').onclick = function(e){
  if (updateTable === undefined) return;

  var e = e || window.event;
  var target = e.target || e.srcElement;

  let originalValue;
  let trWithColumn;
  let editableNode;

  if (target.tagName.toLowerCase() == "div" && target.classList.contains("hoverable")) {
    originalValue = target.innerText;
    editableNode = target;
    trWithColumn = target.parentNode;
  }
  else if (target.tagName.toLowerCase() == "div" && target.classList.contains("cell")) {
    // Usually means it is blank
    if (!target.firstChild) {
      // Add a div to the cell
      const newDiv = document.createElement("div");
      newDiv.className = "hoverable";
      newDiv.innerText = '';
      target.appendChild(newDiv);
      originalValue = '';
      editableNode = newDiv;
      trWithColumn = target;
    } else {    
      originalValue = target.firstChild.innerText;
      editableNode = target.firstChild;
      trWithColumn = target;
    }
  }

  if (trWithColumn && trWithColumn.column) {
    const chosenColumn = trWithColumn.column;
    if (chosenColumn === 'RRN') return;

    const chosenColumnDetail = updateTable.columns.find(col => col.name === chosenColumn);
    if (!chosenColumnDetail) return;
    
    const parentRow = trWithColumn.parentElement;

    const updateKeyColumns = updateTable.columns.filter(col => col.useInWhere);
    if (updateKeyColumns.length === 0) return;

    let idValues = [];
    const cols = parentRow.children;
    for (let i = 0; i < cols.length; i++) {
      const cell = cols[i];
      if (updateKeyColumns.some(col => col.name === cell.column)) {
        idValues.push(cell.firstChild.innerText);
      }
    }

    // Can return undefined or {updateStatement, bindings, saneStatement?}
    const getSqlStatement = (newValue, withSane = false, nullify = false) => {
      const useRrn = updateKeyColumns.length === 1 && updateKeyColumns.some(col => col.name === 'RRN');

      let bindings = [];
      let updateStatement = 'UPDATE ' + updateTable.table + ' t SET t.' + chosenColumn + ' = ';

      if (nullify) {
        updateStatement += 'NULL';
      } else { 
        switch (chosenColumnDetail.jsType) {
          case 'number':
            if (isNumeric(newValue)) {
              bindings.push(newValue);
              updateStatement += '?';
            } else {
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

        if (useRrn && updateKeyColumns[i].name === 'RRN') {
          updateStatement += 'RRN(t) = ?';
        } else {
          updateStatement += updateKeyColumns[i].name + ' = ?';
        }

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

      let statementParts = updateStatement.split('?');
      let saneStatement = '';

      if (withSane) {
        for (let i = 0; i < statementParts.length; i++) {
          saneStatement += statementParts[i];
          if (bindings[i]) {
            if (typeof bindings[i] === 'string') {
              saneStatement += "'" + bindings[i] + "'";
            } else {
              saneStatement += bindings[i];
            }
          }
        }
      }

      return {
        updateStatement,
        bindings,
        saneStatement
      }
    };

    const updateMessageWithSql = (newValue) => {
      const sql = getSqlStatement(newValue, true);
      updateMessageContent(true, '<pre style="margin: 0;">' + sql.saneStatement + '</pre>');
    }

    // Already editable, just return
    if (editableNode.contentEditable === 'true') return;
    let nullify = false;
    editableNode.contentEditable = true;
    if((editableNode.classList.contains("null") || editableNode.parentNode.classList.contains("null")) && editableNode.innerText === 'null') {
      editableNode.innerText = '';
    }
    editableNode.focus();
    updateMessageWithSql(originalValue);

    const keydownEvent = (e) => {
      const newValue = editableNode.innerText;
      if (chosenColumnDetail.maxInputLength && newValue.length >= chosenColumnDetail.maxInputLength) {
        if (!validKeyPresses.includes(e.key)) {
          e.preventDefault();
        }
      }

      switch (e.key) {
        case 'Enter':
          if(chosenColumnDetail.isNullable && e.shiftKey) {
            nullify = true;
          }
          e.preventDefault();
          editableNode.blur();
          break;
        case 'Escape':
          editableNode.innerHTML = originalValue;
          editableNode.blur();
          break;
      }
    }

    const keyupEvent = (e) => {
      const newValue = editableNode.innerText;
      updateMessageWithSql(newValue);
    }

    const finishEditing = () => {
      updateMessageContent(false);
      if (editableNode === undefined) return;

      // Remove keydown listener
      editableNode.removeEventListener('keydown', keydownEvent);
      editableNode.removeEventListener('keyup', keyupEvent);

      editableNode.contentEditable = false;
      let newValue = editableNode.innerText;

      if (!nullify && newValue === originalValue) return;
      if (chosenColumnDetail.maxInputLength && newValue.length > chosenColumnDetail.maxInputLength) {
        newValue = newValue.substring(0, chosenColumnDetail.maxInputLength);
        editableNode.innerText = newValue;
      }

      const sql = getSqlStatement(newValue, false, nullify);

      if (!sql) {
        editableNode.innerHTML = originalValue;
        return;
      }

      if(nullify) {
        editableNode.innerHTML = "null";
        if(editableNode.classList.contains("cell")) {
          editableNode.classList.add("null");
        } else {
          editableNode.parentNode.classList.add("null");
        }
      } else {
        editableNode.classList.remove("null");
        editableNode.parentNode.classList.remove("null");
      }

      requestCellUpdate(editableNode, originalValue, sql.updateStatement, sql.bindings);

      editableNode = undefined;
    }

    editableNode.addEventListener('blur', (e) => {
      e.stopPropagation();
      console.log('blur');
      // Code to execute when the element loses focus
      finishEditing();
    }, {once: true});

    editableNode.addEventListener('keydown', keydownEvent);
    editableNode.addEventListener('keyup', keyupEvent);
  }
};
`;

export function generateScroller(uiId: string, basicSelect: string, parameters: SqlParameter[] = [], isCL: boolean = false, withCancel: boolean = false, updatable?: UpdatableInfo): string {
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
        const escapeHTML = str => str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
          }[tag]));

         const vscode = acquireVsCodeApi();
          const basicSelect = ${JSON.stringify(basicSelect)};
          const htmlTableId = 'resultset';
          const footerId = 'footer';
          const statusId = 'status';
          const jobId = 'jobId';
          const messageSpanId = 'messageSpan';
          const updateMessageId = 'updateMessage';

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

            ${editableCellsLogic}

            window.addEventListener('message', event => {
              const data = event.data;
              myQueryId = data.queryId;
              // If we haven't yet saved off the column meta data, do so now
              if (columnMetaData === undefined) {
                columnMetaData = data.columnMetaData;
              }

              switch (data.command) {
                case 'cellResponse':
                  if (data.id) {
                    handleCellResponse(data.id, data.success === true);
                  }
                  break;
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

                  if (data.rows === undefined || totalRows === 0) {
                    document.getElementById(messageSpanId).innerText = 'Statement executed with no result set returned. Rows affected: ' + data.update_count;
                  } else if (totalRows > 0) {
                    if (data.executionTime) {
                      document.getElementById(statusId).innerText = (noMoreRows ? ('Loaded ' + totalRows + ' rows in ' + data.executionTime.toFixed() + 'ms. End of data.') : ('Loaded ' + totalRows + ' rows in ' + data.executionTime.toFixed() + 'ms. More available.')) + ' ' + (updateTable ? 'Updatable.' : '');
                    }
                    else {
                      document.getElementById(statusId).innerText = (noMoreRows ? ('Loaded ' + totalRows + ' rows. End of data.') : ('Loaded ' + totalRows + ' rows. More available.')) + ' ' + (updateTable ? 'Updatable.' : '');
                    }
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
              uiId: ${JSON.stringify(uiId)},
              query: basicSelect,
              parameters: ${JSON.stringify(parameters)},
              isCL: ${isCL},
              queryId: myQueryId
            });
          }

          function hideSpinner() {
            document.getElementById("spinnerContent").style.display = 'none';
          }

          function initializeTable(columnHeadings) {
            // Initialize the header
            let thElem;
            let startOffset;
            let columnTemplate = '';
            let i = 0;
            let adjustingColumn = undefined;
            const resultSetDiv = document.getElementById(htmlTableId);
            const footerDiv = document.getElementById(footerId);
            columnMetaData.forEach(column => {
              const cell = document.createElement("div");
              const col = i++;
              cell.classList.add("header");
              switch(columnHeadings) {
                case 'Name':
                  cell.innerText = column.name;
                  break;
                case 'Both':
                  cell.innerHTML = escapeHTML(column.name)+'<br>'+escapeHTML(column.label);
                  break;
                default:
                  cell.innerText = column.label;
              }
              cell.title = getTooltip(column, columnHeadings);
              const grip = document.createElement("div");
              grip.innerHtml="&nbsp;";
              grip.classList.add("grip");
              grip.addEventListener("mousedown",(e) => {
                adjustingColumn = col;
                startOffset = cell.offsetWidth-e.pageX;
              });
              grip.addEventListener("dblclick",(e) => {
                const columnTemplates = resultSetDiv.style["grid-template-columns"].split(' ');
                columnTemplates[col] = 'max-content';
                ${withCollapsed?`resultSetDiv.style.setProperty('--col-'+adjustingColumn,undefined);`:''}
                resultSetDiv.style["grid-template-columns"] = columnTemplates.join(' ');
              });
              cell.appendChild(grip);
              footerDiv.before(cell);
              columnTemplate += ' max-content';
              ${withCollapsed?
              `resultSetDiv.style.setProperty('--col-'+col,'200px');
              cell.style['max-width'] = 'var(--col-'+col+')';`:''}
            });
            resultSetDiv.style["grid-template-columns"] = columnTemplate;


            document.addEventListener("mousemove",(e) => {
              if(adjustingColumn !== undefined) {
                const columnTemplates = resultSetDiv.style["grid-template-columns"].split(' ');
                columnTemplates[adjustingColumn] = Math.max(startOffset + e.pageX,40) + "px";
                ${withCollapsed?`resultSetDiv.style.setProperty('--col-'+adjustingColumn,undefined);`:''}
                resultSetDiv.style["grid-template-columns"] = columnTemplates.join(' ');
              }
            });

            document.addEventListener("mouseup", () => {
              adjustingColumn = undefined;
            });

            // Foot specificaly for updating tables.
            if (updateTable) {
              // Initialize the footer
              const footer = document.getElementById(updateMessageId);

              footer.innerHTML = '&nbsp;';
            }
          }

          function appendRows(rows) {
            const footerDiv = document.getElementById(footerId);

            for (const row of rows) {
              // Insert a row at the end of table
              let currentColumn = 0;
              const rowDiv = document.createElement("div");
              rowDiv.className = "row";

              for (const cell of row) {
                const columnName = columnMetaData[currentColumn].name;
                // Insert a cell at the end of the row
                const newCell = document.createElement("div");
                newCell.classList.add("cell");

                const newDiv = document.createElement("div");
                newDiv.className = "hoverable";
                if(columnMetaData[currentColumn].nullable === 1) {
                  newCell.classList.add("nullable");
                  newDiv.classList.add("nullable");
                }

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
                  newDiv.style.whiteSpace = "pre";
                  newDiv.style["font-family"] = "monospace";
                  newDiv.appendChild(document.createTextNode(cell === undefined ? 'null' : cell));
                  if(cell === undefined || cell === null) {
                    newCell.classList.add("null");
                  }
                }
                
                newCell.column = columnName;
                newCell.appendChild(newDiv);
                ${withCollapsed?
                `newCell.style['max-width'] = 'var(--col-'+currentColumn+')';`:''}
                rowDiv.appendChild(newCell);
                currentColumn += 1;
              }
              footerDiv.before(rowDiv);
            }
          }

          // columnHeadings parameter is the value of the "vscode-db2i.resultsets.columnHeadings" setting, either 'Name', 'Label' or 'Both'
          function updateHeader(columnHeadings) {
            if (columnMetaData) {
              var headerCells = document.getElementById(htmlTableId).querySelectorAll(':scope > div.header');
              for (let x = 0; x < columnMetaData.length; ++x) {
                const grip = headerCells[x].querySelector('div.grip');
                switch(columnHeadings) {
                  case 'Name':
                    headerCells[x].innerText = columnMetaData[x].name;
                    break;
                  case 'Both':
                    headerCells[x].innerHTML = escapeHTML(columnMetaData[x].name)+'<br>'+escapeHTML(columnMetaData[x].label);
                    break;
                  default:
                    headerCells[x].innerText = columnMetaData[x].label;
                }
                headerCells[x].appendChild(grip);
                headerCells[x].title = getTooltip(columnMetaData[x], columnHeadings);
              }
            }
          }

          function getTooltip(column, columnHeadings) {
            let title = '';
            switch (column.type) {
              case 'CHAR':
              case 'VARCHAR':
              case 'CLOB':
              case 'BINARY':
              case 'VARBINARY':
              case 'BLOB':
              case 'GRAPHIC':
              case 'VARGRAPHIC':
              case 'DBCLOB':
              case 'NCHAR':
              case 'NVARCHAR':
              case 'NCLOB':
              case 'FLOAT':
              case 'DECFLOAT':
              case 'DATALINK':
                title = column.type + '(' + column.precision + ')';
                break;
              case 'DECIMAL':
              case 'NUMERIC':
                title = column.type + '(' + column.precision + ', ' + column.scale + ')';
                break;
              default:
                title = column.type;
            }
            title += \`\\n\`;
            switch(columnHeadings) {
              case 'Name':
                title += column.label;
                break;
              case 'Both':
                break;
              default:
                title += column.name;
            }
            return title;
          }

        </script>
      </head>
      <body style="padding: 0;">
        <div id="resultset">
          <div id="footer">
            <div id="updateMessage"></div>
            <div id="footer2">
              <span id="status"></span>
              <span id="jobId"></span>
            </div>
          </div>
        </div>
        <p style="padding-left: 20px;" id="messageSpan"></p>
        <div id="spinnerContent" class="center-screen">
          <p id="loadingText">Running statement</p>
          <span class="loader"></span>
          ${withCancel ? `<button id="cancelButton" class="primaryButton">Cancel</button>` : ``}
        </div>
      </body>
    </html>
  `;
}