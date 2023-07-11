import { ViewColumn, window } from "vscode";
import { JobInfo } from "../../connection/manager";
import { head } from "../html";
import { JobLogEntry } from "../../connection/types";


export async function displayJobLog(selected: JobInfo) {
  const jobLog = await selected.job.getJobLog();

  if (jobLog.data.length > 0) {
    const panel = window.createWebviewPanel(`tab`, selected.job.id, {viewColumn: ViewColumn.Active}, {enableScripts: true});
    panel.webview.html = generatePage(jobLog.data);
    panel.reveal();
  } else {
    window.showInformationMessage(`No messages in job log for ${selected.job.id}`);
  }
}

function generatePage(rows: JobLogEntry[]) {
  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${head}
        <script>
          window.addEventListener("load", main);
          function main() {}
        </script>
      </head>
      <body>
        <vscode-data-grid grid-template-columns="150px 100px auto">
          ${rows.map(row => {
            let i = 1;

            // <vscode-data-grid-cell grid-column="${i++}">
            //   ${row.MESSAGE_TIMESTAMP}
            // </vscode-data-grid-cell>
            // <vscode-data-grid-cell grid-column="${i++}">
            //   <code>${row.FROM_LIBRARY}/${row.FROM_PROGRAM}</code>
            // </vscode-data-grid-cell>

            return `<vscode-data-grid-row>
              <vscode-data-grid-cell grid-column="${i++}">
                ${row.MESSAGE_TYPE}
              </vscode-data-grid-cell>
              <vscode-data-grid-cell grid-column="${i++}">
                ${row.MESSAGE_ID}
              </vscode-data-grid-cell>
              <vscode-data-grid-cell grid-column="${i++}">
                ${escapeHTML(row.MESSAGE_TEXT)}
              </vscode-data-grid-cell>
            </vscode-data-grid-row>`
          }).join(``)}
        </vscode-data-grid>
      </body>
    </html>
  `;
}

const escapeHTML = str => str.replace(/[&<>'"]/g, 
  tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag]));