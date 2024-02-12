import * as vscode from "vscode";
import { CancellationToken, Event, EventEmitter, ProviderResult, TreeView, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, ThemeIcon } from "vscode";
import { ExplainNode } from "./nodes";
import { toDoveTreeDecorationProviderUri } from "./doveTreeDecorationProvider";

/**
 * Icon labels as defined by the API, along with the name of the icon to display.
 * Not surprisingly, the reference link does not provide a complete list of icons.
 * TODO: Add missing icons
 * @see https://www.ibm.com/docs/en/i/7.5?topic=ssw_ibm_i_75/apis/qqqvexpl.html#icon_labels
 * @see https://code.visualstudio.com/api/references/icons-in-labels
 */
const icons = {
  "Bitmap Merge":                           `merge`,
  "Cache":                                  ``,
  "Cache Probe":                            ``,
  "Delete":                                 `trash`,
  "Distinct":                               `list-flat`,
  "Dynamic Bitmap":                         `symbol-misc`,
  "Encoded Vector Index":                   `symbol-reference`,
  "Encoded Vector Index, Parallel":         `symbol-reference`,
  "Final Select":                           `selection`,
  "Hash Grouping":                          `group-by-ref-type`,
  "Hash Join":                              `add`,
  "Hash Scan":                              `search`,
  "Index Grouping":                         `group-by-ref-type`,
  "Index Scan - Key Positioning":           `key`,
  "Index Scan - Key Positioning, Parallel": `key`,
  "Index Scan - Key Selection":             `key`,
  "Index Scan - Key Selection, Parallel":   `key`,
  "Insert":                                 `insert`,
  "Nested Loop Join":                       `add`,
  "Select":                                 `selection`,
  "Skip Sequential Table Scan":             `list-unordered`,
  "Skip Sequential Table Scan, Parallel":   `list-unordered`,
  "Sort":                                   `sort-precedence`,
  "Sorted List Scan":                       `list-ordered`,
  "Subquery Merge":                         `merge`,
  "Table Probe":                            `list-selection`,
  "Table Scan":                             `search`,
  "Table Scan, Parallel":                   `search`,
  "Temporary Distinct Hash Table":          `new-file`,
  "Temporary Hash Table":                   `new-file`,
  "Temporary Index":                        `new-file`,
  "Temporary Sorted List":                  `list-ordered`,
  "Temporary Table":                        `new-file`,
  "Union Merge":                            `merge`,
  "User Defined Table Function":            `symbol-function`,
  "Unknown":                                `question`,
  "Update":                                 `replace`,
  "VALUES LIST":                            `list-flat`,
}

type ChangeTreeDataEventType = ExplainTreeItem | undefined | null | void;

export class DoveResultsView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<ChangeTreeDataEventType> = new EventEmitter<ChangeTreeDataEventType>();
  readonly onDidChangeTreeData: Event<ChangeTreeDataEventType> = this._onDidChangeTreeData.event;

  private topNode: ExplainTreeItem;

  private treeView: TreeView<ExplainTreeItem>;
  
  constructor() {
    this.treeView = vscode.window.createTreeView(`vscode-db2i.dove.nodes`, { treeDataProvider: this, showCollapseAll: true });
  }

  public getTreeView(): TreeView<ExplainTreeItem> {
    return this.treeView;
  }

  setRootNode(topNode: ExplainNode): ExplainTreeItem {
    this.topNode = new ExplainTreeItem(topNode);
    this._onDidChangeTreeData.fire();

    // Show tree in the view
    commands.executeCommand(`setContext`, `vscode-db2i:explaining`, true);
    // Ensure that the tree is positioned such that the first element is visible
    this.treeView.reveal(this.topNode,  { select: false });
    return this.topNode;
  }
  getRootNode(): ExplainTreeItem {
    return this.topNode;
  }

  getRootExplainNode(): ExplainNode {
    return this.topNode.explainNode;
  }

  close(): void {
    commands.executeCommand(`setContext`, `vscode-db2i:explaining`, false);
  }

  getTreeItem(element: ExplainTreeItem): ExplainTreeItem | Thenable<ExplainTreeItem> {
    return element;
  }

  getChildren(element?: ExplainTreeItem): ProviderResult<ExplainTreeItem[]> {
    if (element) {
      return element.getChildren();
    } else if (this.topNode) {
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
  explainNode: ExplainNode;
  private children: ExplainTreeItem[];

  constructor(node: ExplainNode) {
    super(node.title, node.childrenNodes > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);
    this.explainNode = node;
    this.contextValue = `explainTreeItem`;

    // If the node is associated with a DB object, display the qualified object name in the description
    if (node.objectSchema && node.objectName) {
      this.description = node.objectSchema + `.` + node.objectName;
    }

    // TODO: ideally the tooltip would be built using a MarkdownString, but regardless of everything tried, 'Loading...' is always displayed
    this.tooltip = [node.title, node.tooltipProps.map<string>(prop => prop.title + `: ` + prop.value).join(`\n`), ``].join(`\n`);
    this.resourceUri = toDoveTreeDecorationProviderUri(node.highlights);
    this.iconPath = new ThemeIcon(icons[node.title] || `server-process`, node.highlights.getPriorityColor()); // `circle-outline`
  }

  getChildren(): ExplainTreeItem[] {
    if (!this.children) {
      this.children = this.explainNode.children.map(c => new ExplainTreeItem(c));
    }
    return this.children;
  }
}