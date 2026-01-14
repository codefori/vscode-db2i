import { ViewColumn, window } from "vscode";
import { JobInfo } from "../../connection/manager";
import { escapeHTML, getHeader } from "../html";
import { JobLogEntry } from "../../connection/types";
import { JobManager } from "../../config";


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
        ${getHeader()}
              </head>
      <body>
        <div style="grid-template-columns:150px auto auto auto auto auto;width: 100%;" class="joblog" id="resultset">
          <div class="row">
            <div class="header">Sent</div>
            <div class="header">Type</div>
            <div class="header">Severity</div>
            <div class="header">Message ID</div>
            <div class="header">Message</div>
            <div class="header">Second Level Text</div>
          </div>
            ${rows.map(row => {
              return `<div class="row">
                <div class="cell">
                  ${row.MESSAGE_TIMESTAMP}
                </div>
                <div class="cell">
                  ${row.MESSAGE_TYPE}
                </div>
                <div class="cell">
                  ${row.SEVERITY}
                </div>
                <div class="cell">
                  ${row.MESSAGE_ID}
                </div>
                <div class="cell">
                  ${escapeHTML(row.MESSAGE_TEXT || ``)}
                </div>
                <div class="cell">
                  ${escapeHTML(row.MESSAGE_SECOND_LEVEL_TEXT || ``)}
                </div>
              </div>`
            }).join(``)}
          </div>
      </body>
    </html>
  `;
}
