import { MarkdownString, StatusBarAlignment, ThemeColor, languages, window } from "vscode";
import { ServerComponent } from "../../connection/serverComponent";
import { SQLJobManager } from "../../connection/manager";
import { JobManager } from "../../config";

const statusItem = languages.createLanguageStatusItem(`sqlStatus`, {language: `sql`});

const item = window.createStatusBarItem(`sqlJob`, StatusBarAlignment.Left);

export async function updateStatusBar() {
  if (ServerComponent.isInstalled()) {
    const selected = JobManager.getSelection();

    let text;
    let backgroundColour: ThemeColor|undefined = undefined;
    let toolTipItems = [];

    if (selected) {
      text = `$(database) ${selected.name}`;

      if (selected.job.underCommitControl()) {
        const pendingsTracts = await selected.job.getPendingTransactions();
        if (pendingsTracts > 0) {
          backgroundColour = new ThemeColor('statusBarItem.warningBackground');
          text = `$(pencil) ${selected.name}`;

          toolTipItems.push(
            `$(warning) Pending Transaction`,
            `[$(save) Commit](command:vscode-db2i.jobManager.jobCommit) / [$(discard) Rollback](command:vscode-db2i.jobManager.jobRollback)`
          );
        }
      }

      toolTipItems.push(`[$(info) View Job Log](command:vscode-db2i.jobManager.viewJobLog)`);
      toolTipItems.push(`[$(edit) Edit Connection Settings](command:vscode-db2i.jobManager.editJobProps)`);
    } else {
      text = `$(database) No job active`;
      toolTipItems.push(`[Start Job](command:vscode-db2i.jobManager.newJob)`);
    }
    
    const toolTip = new MarkdownString(toolTipItems.join(`\n\n---\n\n`), true);
    toolTip.isTrusted = true;
    
    item.text = text;
    item.tooltip = toolTip;
    item.backgroundColor = backgroundColour;

    item.show();
  } else {
    item.hide();
  }
}