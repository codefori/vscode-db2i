import vscode, { MarkdownString, ProgressLocation, ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, commands, env, window, workspace } from "vscode";
import { TreeDataProvider } from "vscode";
import { Config, JobManager } from "../../config";
import { JobInfo, SQLJobManager } from "../../connection/manager";
import { editJobUi } from "./editJob";
import { displayJobLog } from "./jobLog";
import { ServerTraceDest, ServerTraceLevel } from "../../connection/types";
import { ServerComponent } from "../../connection/serverComponent";
import { updateStatusBar } from "./statusBar";
import { TransactionEndType } from "../../connection/sqlJob";
import { ConfigGroup, ConfigManager } from "./ConfigManager";
import { getInstance } from "../../base";

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

      ...ConfigManager.initialiseSaveCommands(),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.newJob`, async () => {
        await window.withProgress({ location: ProgressLocation.Window }, async (progress) => {
          try {
            progress.report({ message: `Spinning up SQL job...` });
            await JobManager.newJob();
          } catch (e) {
            window.showErrorMessage(e.message);
          }

          this.refresh();
        });
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.closeJob`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          let selected = JobManager.getJob(id);

          if (selected) {

            if (selected.job.underCommitControl()) {
              const uncommitted = await selected.job.getPendingTransactions();

              if (uncommitted > 0) {
                const decision = await vscode.window.showWarningMessage(
                  `Cannot end job yet`,
                  {
                    modal: true,
                    detail: `You have ${uncommitted} uncommitted change${uncommitted !== 1 ? `s` : ``}.`
                  },
                  `Commit and end`,
                  `Rollback and end`
                );

                switch (decision) {
                  case `Commit and end`:
                    await selected.job.endTransaction(TransactionEndType.COMMIT);
                    break;
                  case `Rollback and end`:
                    await selected.job.endTransaction(TransactionEndType.ROLLBACK);
                    break;
                  default:
                    // Actually... don't end the job
                    return;
                }
              }
            }

            await JobManager.closeJobByName(id);
            this.refresh();
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.viewJobLog`, async (node?: SQLJobItem) => {
        const id = node ? node.label as string : undefined;
        let selected = id ? JobManager.getJob(id) : JobManager.getSelection();
        if (selected) {
          displayJobLog(selected);
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
        const id = node ? node.label as string : undefined;
        let selected = id ? JobManager.getJob(id) : JobManager.getSelection();
        if (selected) {
          editJobUi(selected.job.options, selected.name).then(newOptions => {
            if (newOptions) {
              window.withProgress({ location: ProgressLocation.Window }, async (progress) => {
                progress.report({ message: `Ending current job` });

                await selected.job.close();

                progress.report({ message: `Starting new job` });

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

      vscode.commands.registerCommand(`vscode-db2i.jobManager.toggleDbMonitor`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          const instance = getInstance();
          const config = instance.getConfig();

          if (selected.job.isMonitoring()) {
            await selected.job.endDbMonitor();
            window.showInformationMessage(`Disabled database monitor for ${selected.job.id}`);
          } else {
            const defaultOutfile = `${config.currentLibrary}/DBMONOUT`;

            const chosenOutfile = await window.showInputBox({
              title: `STRDBMON Outfile`,
              prompt: `Enter qualified path for DBMON outfile.`,
              value: defaultOutfile,
              valueSelection: [config.currentLibrary.length+1, defaultOutfile.length],
              validateInput: (v) => {
                if (v.length > 21) return `Path too long`;
                if (!v.includes(`/`)) return `Path must be qualified.`;
                return;
              }
            });

            if (chosenOutfile) {
              await selected.job.startDbMonitor(chosenOutfile);
              window.showInformationMessage(`Enabled database monitor for ${selected.job.id}`);
            }
          }
        }

        this.refresh();
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.enableTracing`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          ServerComponent.writeOutput(`Enabling tracing for ${selected.name} (${selected.job.id})`, true);

          selected.job.setTraceConfig(ServerTraceDest.IN_MEM, ServerTraceLevel.DATASTREAM);
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.getTrace`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          const possibleFile = selected.job.getTraceFilePath();

          if (possibleFile) {
            // Trace was written to a file
            vscode.workspace.openTextDocument(Uri.from({
              scheme: `streamfile`,
              path: possibleFile
            })).then(doc => {
              vscode.window.showTextDocument(doc);
            });
            
          } else {
            // This likely means IN_MEM was used
            const trace = await selected.job.getTraceData();
            if (trace.success) {
              vscode.workspace.openTextDocument({
                content: trace.tracedata.trim()
              }).then(doc => {
                vscode.window.showTextDocument(doc);
              })

            } else {
              ServerComponent.writeOutput(`Unable to get trace data for ${selected.name} (${selected.job.id}):`, true);
              ServerComponent.writeOutput(trace.error);
            }
          }
        }
      }),
      vscode.commands.registerCommand(`vscode-db2i.jobManager.jobCommit`, async (node?: SQLJobItem) => {
        const id = node ? node.label as string : undefined;
        let selected = id ? JobManager.getJob(id) : JobManager.getSelection();
        if (selected) {
          if (selected.job.underCommitControl()) {
            const result = await selected.job.endTransaction(TransactionEndType.COMMIT);
            if (!result.success) {
              vscode.window.showErrorMessage(`Failed to commit.` + result.error);
            }

            this.refresh();
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.jobRollback`, async (node?: SQLJobItem) => {
        const id = node ? node.label as string : undefined;
        let selected = id ? JobManager.getJob(id) : JobManager.getSelection();
        if (selected) {
          if (selected.job.underCommitControl()) {
            try {
              const result = await selected.job.endTransaction(TransactionEndType.ROLLBACK);
              if (!result.success) {
                vscode.window.showErrorMessage(`Failed to rollback. ` + result.error);
              }
            } catch (e) {
              vscode.window.showErrorMessage(`Failed to rollback. ` + e.message);
            }

            this.refresh();
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
    updateStatusBar();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(element: ConfigGroup): Promise<SQLJobItem[]> {
    if (element) {
      return ConfigManager.getConfigTreeItems();

    } else {
      let nodes =
        JobManager
          .getRunningJobs()
          .map((info, index) => new SQLJobItem(info, index === JobManager.selectedJob));

      if (ConfigManager.hasSavedItems()) {
        nodes.push(new ConfigGroup());
      }

      return nodes;
    }
  }
}

export class SQLJobItem extends vscode.TreeItem {
  constructor(jobInfo: JobInfo, active: boolean = false) {
    super(jobInfo.name, TreeItemCollapsibleState.None);

    this.contextValue = `sqlJob`;
    this.description = jobInfo.job.id + (jobInfo.job.isMonitoring() ? ` (Monitoring)` : ``);

    this.command = {
      command: selectJobCommand,
      arguments: [jobInfo.name],
      title: `Switch job`
    };

    this.iconPath = new vscode.ThemeIcon(active ? `layers-active` : `layers`, (active ? activeColor : undefined));
  }
}
