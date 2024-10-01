import vscode, { ProgressLocation, TreeDataProvider, TreeItemCollapsibleState, Uri, commands, env, window } from "vscode";
import { JobManager } from "../../config";
import { JobInfo, SQLJobManager } from "../../connection/manager";
import { ServerComponent } from "../../connection/serverComponent";
import { OldSQLJob } from "../../connection/sqlJob";
import { ConfigGroup, ConfigManager } from "./ConfigManager";
import { editJobUi } from "./editJob";
import { displayJobLog } from "./jobLog";
import { SelfValue, selfCodesMap } from "./selfCodes/nodes";
import { SelfCodesQuickPickItem } from "./selfCodes/selfCodesBrowser";
import { updateStatusBar } from "./statusBar";
import { selfCodesResultsView } from "./selfCodes/selfCodesResultsView";
import { setCancelButtonVisibility } from "../results";
import { JDBCOptions } from "@ibm/mapepire-js/dist/src/types";

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

      vscode.commands.registerCommand(`vscode-db2i.jobManager.defaultSelfSettings`, () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'vscode-db2i.jobSelf');
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.newJob`, async (options?: JDBCOptions, name?: string) => {
        try {
          updateStatusBar({newJob: true});
          await JobManager.newJob(
            (options ? new OldSQLJob(options) : undefined), 
            name
          );
        } catch (e) {
          window.showErrorMessage(e.message);
        }

        this.refresh();
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
                    await selected.job.endTransaction("commit");
                    break;
                  case `Rollback and end`:
                    await selected.job.endTransaction("rollback");
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

      vscode.commands.registerCommand(`vscode-db2i.jobManager.editSelfCodes`, async (node?: SQLJobItem) => {
        const id = node ? node.label as string : undefined;
        let selected = id ? JobManager.getJob(id) : JobManager.getSelection();
        if (selected) {
          try {
            const currentSelfCodes: SelfValue = selected.job.getSelfCode();
            const selfCodeItems: SelfCodesQuickPickItem[] = selfCodesMap.map(
              (code) => new SelfCodesQuickPickItem(code)
            );
            const currentSelfCodeItems: SelfCodesQuickPickItem[] =
              selfCodeItems.filter((item) =>
                currentSelfCodes ? currentSelfCodes.includes(item.label) : false
              );

            const quickPick = vscode.window.createQuickPick();
            quickPick.title = `Set logging level for SELF`;
            quickPick.canSelectMany = false;
            quickPick.matchOnDetail = true;
            quickPick.items = [
              {
                kind: vscode.QuickPickItemKind.Separator,
                label: "Current logging level",
              },
              ...currentSelfCodeItems,
              {
                kind: vscode.QuickPickItemKind.Separator,
                label: "Available logging levels",
              },
              ...selfCodeItems.filter((item) =>
                currentSelfCodeItems
                  ? !currentSelfCodeItems.includes(item)
                  : true
              ),
            ];

            quickPick.selectedItems = currentSelfCodeItems;

            quickPick.onDidChangeSelection(async () => {
              const selections = quickPick.selectedItems;
              // SET SYSIBMADM.SELFCODES = SYSIBMADM.VALIDATE_SELF('-514, -204, -501, +30, -199');
              if (selections && selections[0] && selections[0].label !== currentSelfCodes) {
                const code = selections[0].label as SelfValue;
                try {
                  await selected.job.setSelfState(code);
                  vscode.window.showInformationMessage(`Applied SELF code: ${code}`);
                  quickPick.hide();
                  quickPick.dispose();
                } catch (e) {
                  vscode.window.showErrorMessage(`Cannot set SELF Code: ${code}\n ${e}`)
                }
              }
            });
            quickPick.show();
          } catch (e) {
            vscode.window.showErrorMessage(e.message);
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.jobManager.enableTracing`, async (node?: SQLJobItem) => {
        if (node) {
          const id = node.label as string;
          const selected = await JobManager.getJob(id);

          ServerComponent.writeOutput(`Enabling tracing for ${selected.name} (${selected.job.id})`, true);

          selected.job.setTraceConfig("IN_MEM", "DATASTREAM");
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
            const result = await selected.job.endTransaction("commit");
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
              const result = await selected.job.endTransaction("rollback");
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

    const selectedJob = JobManager.getSelection();

    setCancelButtonVisibility(selectedJob && selectedJob.job.getStatus() === "busy");
    commands.executeCommand(`setContext`, `vscode-db2i:jobManager.hasJob`, selectedJob !== undefined);
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
    this.description = jobInfo.job.id;

    this.command = {
      command: selectJobCommand,
      arguments: [jobInfo.name],
      title: `Switch job`
    };

    this.iconPath = new vscode.ThemeIcon(active ? `layers-active` : `layers`, (active ? activeColor : undefined));
  }
}
