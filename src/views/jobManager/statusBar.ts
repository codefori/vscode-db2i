import { MarkdownString, StatusBarAlignment, ThemeColor, languages, window } from "vscode";
import { ServerComponent } from "../../connection/serverComponent";
import { SQLJobManager } from "../../connection/manager";
import { JobManager } from "../../config";

const statusItem = languages.createLanguageStatusItem(`sqlStatus`, {language: `sql`});

const item = window.createStatusBarItem(`sqlJob`, StatusBarAlignment.Right);

export async function updateStatusBar() {
  if (ServerComponent.isInstalled()) {
    const selected = JobManager.getSelection();

    let toolTipItems = [];

    if (selected) {
      item.text = `$(database) ${selected.name}`;

      if (selected.job.options["transaction isolation"] !== `none`) {
        const pendingsTracts = await selected.job.getPendingTransactions();
        if (pendingsTracts > 0) {
          item.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
          item.text = `$(pencil) ${selected.name}`;

          toolTipItems.push(`${pendingsTracts} pending change${pendingsTracts !== 1 ? `s` : ``}. [Commit](command:do-commit)`);
        } else {
          item.backgroundColor = undefined;
        }
      }

      toolTipItems.push(`[View Job Log](command:vscode-db2i.jobManager.viewJobLog)`);
      toolTipItems.push(`[Edit Connection Settings](command:vscode-db2i.jobManager.editJobProps)`);
    } else {
      item.text = `$(database) No job active`;
      toolTipItems.push(`[Start Job](command:vscode-db2i.jobManager.newJob)`);
    }
    
    const toolTip = new MarkdownString(toolTipItems.join(`\n\n---\n\n`), true);
    toolTip.isTrusted = true;
    
    item.tooltip = toolTip;

    item.show();
  } else {
    item.hide();
  }
}