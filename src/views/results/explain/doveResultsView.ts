import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands } from "vscode";
import { ExplainNode } from "./nodes";

export class DoveResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ExplainTreeItem | undefined | null | void> = new EventEmitter<ExplainTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<ExplainTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private topNode: ExplainTreeItem;

  setRootNode(topNode: ExplainNode) {
    this.topNode = new ExplainTreeItem(topNode);
    this._onDidChangeTreeData.fire();

    // Show tree in the view
    commands.executeCommand(`setContext`, `vscode-db2i:explaining`, true);
  }

  getRootExplainNode() {
    return this.topNode.explainNode;
  }

  close() {
    commands.executeCommand(`setContext`, `vscode-db2i:explaining`, false);
  }

  getTreeItem(element: ExplainTreeItem): ExplainTreeItem | Thenable<ExplainTreeItem> {
    return element;
  }

  getChildren(element?: ExplainTreeItem): ProviderResult<ExplainTreeItem[]> {
    if (element) {
      return element.getChildren();
    }
    else if (this.topNode) {
      return [this.topNode];
    } else {
      return [];
    }
  }

  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }
  resolveTreeItem?(item: TreeItem, element: any, token: CancellationToken): ProviderResult<ExplainTreeItem> {
    throw new Error("Method not implemented.");
  }
}

export class ExplainTreeItem extends TreeItem {
  children: ExplainTreeItem[];
  explainNode: ExplainNode;
  constructor(node: ExplainNode) {
    super(node.title, node.childrenNodes > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);

    this.explainNode = node;
    this.contextValue = `explainTreeItem`;

    // TODO: icons
  }

  getChildren() {
    return this.explainNode.children.map(c => new ExplainTreeItem(c));
  }
}