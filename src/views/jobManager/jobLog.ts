import { ViewColumn, window } from "vscode";
import { JobInfo } from "../../connection/manager";

interface JobLogMessage {
  MESSAGE_ID: string;
  MESSAGE_TIMESTAMP: string;
  FROM_LIBRARY: string;
  FROM_PROGRAM: string;
  MESSAGE_TYPE: string;
  MESSAGE_TEXT: string;
}

export async function displayJobLog(selected: JobInfo) {
  const jobLogRows = await selected.job.query<JobLogMessage>(`select * from table(qsys2.joblog_info('*')) a`);

  if (jobLogRows.length > 0) {
    const panel = window.createWebviewPanel(`tab`, selected.job.id, {viewColumn: ViewColumn.Active}, {enableScripts: true});
    panel.webview.html = generatePage(jobLogRows);
    panel.reveal();
  } else {
    window.showInformationMessage(`No messages in job log for ${selected.job.id}`);
  }
}

function generatePage(rows: JobLogMessage[]) {
  return /*html*/`
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @media only screen and (min-width: 750px) {
        #jobLogRows {
          padding-left: 15%;
          padding-right: 15%;
        }
      }
      #jobLogRows {
        margin: 2em 2em 2em 2em;
      }


      .toTheRight {
        float: right;
      }

      .collapsible {
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-foreground);
        cursor: pointer;
        padding: 1em;
        width: 100%;
        border: none;
        outline: none;
        font-size: 15px;
        margin-top: 2px;
        margin-bottom: 2px;
        text-align: left;
      }
      .active,
      .collapsible:hover {
        background-color: var(--vscode-button-secondaryHoverBackground);
      }

      .content {
        padding: 0 18px;
        display: none;
        overflow: hidden;
        background-color: var(--vscode-button-secondaryHoverBackground);
        margin-left: 3em;
        margin-top: 2px;
        margin-bottom: 2px;
      }
    </style>
  </head>
  <body>
    <div id="jobLogRows">
      ${rows.map(row => 
        `<button type="button" class="collapsible">[<code>${row.MESSAGE_ID}</code>] ${escapeHTML(row.MESSAGE_TYPE)} <span class="toTheRight">${escapeHTML(row.MESSAGE_TIMESTAMP)}</span></button>
        <div class="content">
          <p>${row.FROM_LIBRARY}/${row.FROM_PROGRAM}</p>
          <p>${escapeHTML(row.MESSAGE_TEXT)}</p>
        </div>`
        ).join(``)}
    </div>

    <script>
      var coll = document.getElementsByClassName("collapsible");
      var i;

      for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
          this.classList.toggle("active");
          var content = this.nextElementSibling;
          if (content.style.display === "block") {
            content.style.display = "none";
          } else {
            content.style.display = "block";
          }
        });
      }
    </script>
  </body>
</html>
  `
}

const escapeHTML = str => str.replace(/[&<>'"]/g, 
  tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag]));