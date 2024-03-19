import * as vscode from "vscode";
import {
  Event,
  EventEmitter,
  FileDecorationProvider,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  Uri,
  Disposable
} from "vscode";
import { JobManager } from "../../../config";
import { SelfCodeNode } from "./nodes";

type ChangeTreeDataEventType = SelfCodeTreeItem | undefined | null | void;

export class selfCodesResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> =
    new EventEmitter<ChangeTreeDataEventType>();
  readonly onDidChangeTreeData: vscode.Event<ChangeTreeDataEventType> = this._onDidChangeTreeData.event;
  private autoRefresh: boolean = false;
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.self.refresh`, async () => this.refresh()),
      vscode.commands.registerCommand(`vscode-db2i.self.reset`, async () => {
        const selected = JobManager.getRunningJobs();
        if (selected) {
          try {
            const resetSelfCmd = `DELETE FROM qsys2.SQL_ERRORT where user_name = current_user`
            await JobManager.runSQL(resetSelfCmd, undefined);
            this.refresh();
            vscode.window.showInformationMessage(`Reset SELF code error log.`)
          } catch (e) {
            vscode.window.showErrorMessage(`An Error occured reseting SELF code error log: ${e}`)
          }
        }
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.enableAutoRefresh`, async () => {
        this.setRefreshEnabled(true, true);
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.disableAutoRefresh`, async () => {
        this.setRefreshEnabled(false, true);
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.copySqlStatement`, async (item: SelfCodeTreeItem) => {
        if (item && item.selfCodeNode.STMTTEXT) {
          await vscode.env.clipboard.writeText(item.selfCodeNode.STMTTEXT);
          vscode.window.showInformationMessage(`SQL statement copied to clipboard.`);
        }
      }),
      vscode.commands.registerCommand(`vscode-db2i.self.displayDetails`, async (item: SelfCodeTreeItem) => {
        if (item && item.selfCodeNode) {
          const jsonData = JSON.stringify(item.selfCodeNode, null, 2);
          const document = await vscode.workspace.openTextDocument({
            content: jsonData,
            language: `json`
          });
          await vscode.window.showTextDocument(document, { preview: false });
        }
      })
    );
    setInterval(async () => {
      if (this.autoRefresh) {
        this.refresh();
      }
    }, 5000);

  }

  setRefreshEnabled(enabled: boolean, withMessage = false): void {
    this.autoRefresh = enabled;
    vscode.commands.executeCommand(`setContext`, `vscode-db2i.self.autoRefresh`, enabled);

    if (withMessage) {
      vscode.window.showInformationMessage(`SELF Code Auto Refresh ${enabled ? 'Enabled' : 'Disabled'}`);
    }
  }

  async getSelfCodes(): Promise<SelfCodeNode[]> {
    const selected = JobManager.getSelection();
    if (selected) {
      const content = `SELECT job_name, user_name, reason_code, logged_time, logged_sqlstate, logged_sqlcode, matches, stmttext, 
                          message_text, message_second_level_text 
                      FROM qsys2.sql_error_log, lateral 
                          (select * from TABLE(SYSTOOLS.SQLCODE_INFO(logged_sqlcode)))
                      where user_name = current_user
                      order by logged_time desc`;
      const data: SelfCodeNode[] = await JobManager.runSQL<SelfCodeNode>(content, undefined);
      return data;
    }
    return;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }
  async getChildren(element?: any): Promise<any[]> {
    if (element) {
      return [];
    } else {
      const selfCodes = await this.getSelfCodes();

      if (selfCodes) {
        return selfCodes.map((error) => {
          const label = `${error.LOGGED_SQLSTATE} (${error.LOGGED_SQLCODE}) ${error.REASON_CODE != null ? error.REASON_CODE : ""}`;
          const details = `${error.MESSAGE_TEXT}`; // ${error.MATCHES < 100 ? hitsTxt : '💯'.padStart(10, ' ')} 🔥`;
          const hoverMessage = new vscode.MarkdownString(
            `**SQL Statement💻:** ${error.STMTTEXT}\n\n---\n\n**SQL Job🛠️:** ${error.JOB_NAME}\n\n---\n\n**Occurrences🔥:** ${error.MATCHES}\n\n---\n\n**Details✏️:** ${error.MESSAGE_SECOND_LEVEL_TEXT}`
          );
          hoverMessage.isTrusted = true;
          const treeItem = new SelfCodeTreeItem(
            label,
            details,
            hoverMessage,
            vscode.TreeItemCollapsibleState.None,
            error
          );
          treeItem.contextValue = `selfCodeNode`;
          return treeItem;
        });
      }

      return [];
    }
  }
  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }
  resolveTreeItem(
    item: SelfCodeTreeItem,
    element: any,
    token: vscode.CancellationToken
  ): ProviderResult<TreeItem> {
    if (!item.tooltip) {
      // Only set the tooltip if it hasn't been set yet
      item.tooltip = new vscode.MarkdownString(
        `**SQL Statement:** ${element.STMTTEXT}\n\n---\n\n**Detail:** ${element.MESSAGE_SECOND_LEVEL_TEXT}`
      );
      item.tooltip.isTrusted = true; // Make sure to allow Markdown content
    }
    return item;
  }
}
export class SelfCodeTreeItem extends TreeItem {
  selfCodeNode: SelfCodeNode;

  constructor(
    public readonly errorMessage: string,
    public readonly details: string,
    public readonly hoverMessage: vscode.MarkdownString,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    error: SelfCodeNode
  ) {
    super(errorMessage, collapsibleState);
    this.selfCodeNode = error;
    this.tooltip = hoverMessage; // Hover text
    this.description = details; // Additional details shown in the tree view
    this.resourceUri = vscode.Uri.parse(`selfCodeTreeView:${encodeURIComponent(error.MATCHES.toString())}`);
    this.resourceUri = vscode.Uri.from({
      scheme: `selfCodeTreeView`,
      path: error.MATCHES.toString()
    })
    this.iconPath = error.LOGGED_SQLCODE < 0 ? new vscode.ThemeIcon(`error`): new vscode.ThemeIcon(`warning`);
  }
}

// maybe can be used for showing node details
export class SelfTreeDecorationProvider implements FileDecorationProvider {
  private disposables: Array<Disposable> = [];

  readonly _onDidChangeFileDecorations: EventEmitter<Uri | Uri[]> = new EventEmitter<Uri | Uri[]>();
  readonly onDidChangeFileDecorations: Event<Uri | Uri[]> = this._onDidChangeFileDecorations.event;

  constructor() {
      this.disposables = [];
      this.disposables.push(vscode.window.registerFileDecorationProvider(this));
  }
  provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme === `selfCodeTreeView`) {
      const errorCount = parseInt(uri.path);
      
      if (!isNaN(errorCount) && errorCount > 0) {
        return {
          badge: errorCount < 100 ? errorCount.toString() : '💯',
          tooltip: `Occurrences: ${errorCount}`
        }
      }
    }

    return null;
  }

  async updateTreeItems(treeItem: TreeItem): Promise<void> {
      this._onDidChangeFileDecorations.fire(treeItem.resourceUri);
  }
}
