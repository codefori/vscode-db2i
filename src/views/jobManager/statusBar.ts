import { StatusBarAlignment, ThemeColor, window } from "vscode";
import { ServerComponent } from "../../connection/serverComponent";
import { SQLJobManager } from "../../connection/manager";
import { JobManager } from "../../config";

const item = window.createStatusBarItem(`sqlJob`, StatusBarAlignment.Right);

export async function updateStatusBar() {
  if (ServerComponent.isInstalled()) {
    const selected = JobManager.getSelection();
    if (selected) {
      item.tooltip = `Active SQL job`;
      item.text = `$(database) ${selected.name}`;

      if (selected.job.options["transaction isolation"] !== `none`) {
        const pendingsTracts = await selected.job.getPendingTransactions();
        if (pendingsTracts > 0) {
          item.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
          item.tooltip = `${pendingsTracts} pending change${pendingsTracts !== 1 ? `s` : ``}`;
          item.text = `$(pencil) ${selected.name}`;
        } else {
          item.backgroundColor = undefined;
        }
      }
    } else {
      item.text = `$(database) No job active`;
    }

    item.show();
  } else {
    item.hide();
  }
}