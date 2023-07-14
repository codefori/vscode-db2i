import vscode, { MarkdownString, ProgressLocation, ThemeIcon, TreeItem, TreeItemCollapsibleState, commands, env, window, workspace } from "vscode";
import { TreeDataProvider } from "vscode";
import { Config, JobManager } from "../../config";
import { JobInfo, SQLJobManager } from "../../connection/manager";
import { editJobUi } from "./editJob";
import { displayJobLog } from "./jobLog";
import { ServerTraceDest, ServerTraceLevel } from "../../connection/types";
import { ServerComponent } from "../../connection/serverComponent";

const selectJobCommand = `vscode-db2i.jobManager.selectJob`;
const activeColor = new vscode.ThemeColor(`minimapGutter.addedBackground`);

export class JobManagerView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.jobManager.refresh`, async () => {
        this.refresh();
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.newJob`, async () => {

        await window.withProgress({location: ProgressLocation.Window}, async (progress) => {
          try {
            progress.report({message: `Spinning up SQL job...`});
            await JobManager.newJob();
          } catch (e) {
            window.showErrorMessage(e.message);
          }
        });

        this.refresh();
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.closeJob`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          await JobManager.closeJobByName(id);
          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.viewJobLog`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          if (selected) {
            displayJobLog(selected);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.copyJobId`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          if (selected) {
            await env.clipboard.writeText(selected.job.id);
            window.showInformationMessage(`Copied ${selected.job.id} to clipboard.`);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.editJobProps`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          editJobUi(selected.job.options, selected.name).then(newOptions => {
            if (newOptions) {
              window.withProgress({location: ProgressLocation.Window}, async (progress) => {
                progress.report({message: `Ending current job`});

                await selected.job.close();

                progress.report({message: `Starting new job`});

                selected.job.options = newOptions;
                
                try {
                  await selected.job.connect();
                } catch (e) {
                  window.showErrorMessage(`Failed to start new job with updated properties.`);
                }

                this.refresh();
              })
            }
          })
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.enableTracing`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          ServerComponent.writeOutput(`Enabling tracing for ${selected.name} (${selected.job.id})`, true);

          selected.job.setTraceConfig(ServerTraceDest.IN_MEM, ServerTraceLevel.ERRORS);
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.getTrace`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          const trace = await selected.job.getTraceData();
          if (trace.success) {
            ServerComponent.writeOutput(trace.tracedata, true);
          } else {
            ServerComponent.writeOutput(`Unable to get trace data for ${selected.name} (${selected.job.id}):`, true);
            ServerComponent.writeOutput(trace.error);
          }
        }
      }),

      vscode.commands.registerCommand(selectJobCommand, async (selectedName: string) => {
        if (selectedName) {
          await JobManager.setSelection(selectedName);
          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.endAll`, async (node?: SQLJobItem) => {
        await JobManager.endAll();
        this.refresh();
      }),
    )
  }

  static setVisible(visible: boolean) {
    commands.executeCommand(`setContext`, `vscode-db2i:jobManager`, visible).then(() => {
      if (visible) {
        commands.executeCommand(`vscode-db2i.jobManager.refresh`);
      }
    });
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(): Promise<SQLJobItem[]> {
    return JobManager
      .getRunningJobs()
      .map((info, index) => new SQLJobItem(info, index === JobManager.selectedJob));
  }
}

class SQLJobItem extends vscode.TreeItem {
  constructor(jobInfo: JobInfo, active: boolean = false) {
    super(jobInfo.name, TreeItemCollapsibleState.None);

    this.contextValue = `sqlJob`;
    this.description = jobInfo.job.id;

    this.command = {
      command: selectJobCommand,
      arguments: [jobInfo.name],
      title: `Switch job`
    };

    this.iconPath = new vscode.ThemeIcon(active ? `layers-active` : `layers`, (active ? activeColor : undefined));
  }
}