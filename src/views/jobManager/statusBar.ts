import { MarkdownString, StatusBarAlignment, ThemeColor, languages, window } from "vscode";
import { ServerComponent } from "../../connection/serverComponent";
import { JobManager } from "../../config";
import { getInstance } from "../../base";

const item = window.createStatusBarItem(`sqlJob`, StatusBarAlignment.Left);

export async function updateStatusBar(options: {newJob?: boolean, canceling?: boolean, jobIsBusy?: boolean, executing?: boolean} = {}) {
  const instance = getInstance();
  const connection = instance.getConnection();

  if (connection && ServerComponent.isInstalled()) {
    const selected = JobManager.getSelection();

    let text;
    let backgroundColour: ThemeColor|undefined = undefined;
    let toolTipItems: string[] = [];

    if (options.executing) {
      text = `$(sync~spin) Executing...`;
    } else
    if (options.canceling) {
      text = `$(sync~spin) Canceling...`;
    } else
    if (options.jobIsBusy) {
      text = `🙁 Job is busy`;
    } else
    if (options.newJob) {
      text = `$(sync~spin) Spinning up job...`;
    } else
    if (selected) {
      text = `$(database) ${selected.name}`;

      const job = selected.job;

      if (job.getNaming() === `sql`) {
        toolTipItems.push(`SQL Naming.\n\nCurrent schema: \`${await job.getCurrentSchema()}\``);
      } else {
        toolTipItems.push([
          `System Naming.`,
          ``,
          `Configured user library list for job:`,
          ``,
          ...job.options.libraries.map((lib, i) => `${i+1}. \`${lib}\``)
        ].join(`\n`));
      }

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
      toolTipItems.push(`[$(bracket-error) Edit SELF codes](command:vscode-db2i.jobManager.editSelfCodes)`);
    } else {
      text = `$(database) No job active`;
      toolTipItems.push(`[Start Job](command:vscode-db2i.jobManager.newJob)`);
    }
    
    if (toolTipItems.length > 0) {
      const toolTip = new MarkdownString(toolTipItems.join(`\n\n---\n\n`), true);
      toolTip.isTrusted = true;
      item.tooltip = toolTip;
    }
    
    item.text = text;
    item.backgroundColor = backgroundColour;

    item.show();
  } else {
    item.hide();
  }
}