import * as vscode from "vscode";
import {
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem
} from "vscode";

type ChangeTreeDataEventType = SelfCodeTreeItem | undefined | null | void;

export class selfCodesResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> =
    new EventEmitter<ChangeTreeDataEventType>();
  private treeView: vscode.TreeView<SelfCodeTreeItem>;
  constructor(private selfCodes: any[]) {
    // this.treeView = vscode.window.createTreeView(`vscode-db2i.self.errorNodes`, { treeDataProvider: this, showCollapseAll: true });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }
  getChildren(element?: any): ProviderResult<any[]> {
    if (element) {
      return Promise.resolve([]);
    } else {
      return Promise.resolve(
        this.selfCodes.map((error) => {
          const label = `${error.LOGGED_SQLSTATE} (${error.LOGGED_SQLCODE}) - ${error.MATCHES} hits`;
          const details = `${error.MESSAGE_TEXT}`;
          const hoverMessage = new vscode.MarkdownString(
            `**SQL Statement:** ${error.STMTTEXT}\n\n---\n\n**Detail:** ${error.MESSAGE_SECOND_LEVEL_TEXT}`
          );
          hoverMessage.isTrusted = true;
          const treeItem = new SelfCodeTreeItem(
            label,
            details,
            hoverMessage,
            vscode.TreeItemCollapsibleState.None
          );
          return treeItem;
        })
      );
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
