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
        <table id="resultset">
          <tbody>
            ${rows.map(row => {
              return `<tr>
                <td width="150px">
                  ${row.MESSAGE_TIMESTAMP}
                </td>
                <td>
                  ${row.MESSAGE_TYPE}
                </td>
                <td>
                  ${row.SEVERITY}
                </td>
                <td>
                  ${row.MESSAGE_ID}
                </td>
                <td>
                  ${escapeHTML(row.MESSAGE_TEXT || ``)}
                </td>
                <td>
                  ${escapeHTML(row.MESSAGE_SECOND_LEVEL_TEXT || ``)}
                </td>
              </tr>`
            }).join(``)}
          </tbody>
        </table>
      </body>
    </html>
  `;
}
