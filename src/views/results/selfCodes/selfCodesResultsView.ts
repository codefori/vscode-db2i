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

type ChangeTreeDataEventType = SelfCodeTreeItem | undefined | null | void;

export class selfCodesResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> =
    new EventEmitter<ChangeTreeDataEventType>();
  readonly onDidChangeTreeData: vscode.Event<ChangeTreeDataEventType> = this._onDidChangeTreeData.event;
  private treeView: vscode.TreeView<SelfCodeTreeItem>;
  private selfCodes: SelfCodeNode[];
  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-db2i.refreshSelfCodesView`, async () => this.refresh()),
      vscode.commands.registerCommand(`vscode-db2i.self.reset`, async () => {
        const selected = JobManager.getRunningJobs();
        if (selected) {
          try {
            const resetSelfCmd = `DELETE FROM qsys2.sql_error_log where user_name = current_user`
            await JobManager.runSQL(resetSelfCmd, undefined);
            this.refresh();
            vscode.window.showInformationMessage(`Reset SELF code error log.`)
          } catch (e) {
            vscode.window.showErrorMessage(`An Error occured reseting SELF code error log: ${e}`)
          }
        }
      })
    );
  }

  async getSelfCodes(): Promise<SelfCodeNode[]> {
    const selected = JobManager.getRunningJobs();
    if (selected) {
      const content = `SELECT job_name, user_name, logged_time, logged_sqlstate, logged_sqlcode, matches, stmttext, 
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
      return selfCodes.map((error) => {
        const hitsTxt = error.MATCHES.toString().padStart(10, ' ');
        const label = `${error.LOGGED_SQLSTATE} (${error.LOGGED_SQLCODE})`;
        const details = `${error.MESSAGE_TEXT} ${error.MATCHES < 100 ? hitsTxt : '💯'.padStart(10, ' ')} 🔥`;
        const hoverMessage = new vscode.MarkdownString(
          `**SQL Statement💻:** ${error.STMTTEXT}\n\n---\n\n**SQL Job🛠️:** ${error.JOB_NAME}\n\n---\n\n**Details✏️:** ${error.MESSAGE_SECOND_LEVEL_TEXT}`
        );
        hoverMessage.isTrusted = true;
        const treeItem = new SelfCodeTreeItem(
          label,
          details,
          hoverMessage,
          vscode.TreeItemCollapsibleState.None
        );
        return treeItem;
      });
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
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(errorMessage, collapsibleState);
    console.log(hoverMessage);
    this.tooltip = hoverMessage; // Hover text
    this.description = details; // Additional details shown in the tree view
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
    throw new Error("Method not implemented.");
  }

  async updateTreeItems(treeItem: TreeItem): Promise<void> {
      this._onDidChangeFileDecorations.fire(treeItem.resourceUri);
  }
}
