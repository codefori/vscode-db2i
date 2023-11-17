import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, ThemeIcon, ThemeColor } from "vscode";
import { ExplainNode } from "./nodes";

/**
 * Icon labels as defined by the API, along with the name of the icon to display
 * @see https://www.ibm.com/docs/en/i/7.5?topic=ssw_ibm_i_75/apis/qqqvexpl.html#icon_labels
 */
const icons = {
    // TODO: fill in the rest of the icons
  "Table Probe":                            `list-selection`,
  "Table Scan":                             `search`,
  "Table Scan, Parallel":                   `search`,
  "Index Scan - Key Selection":             ``,
  "Index Scan - Key Selection, Parallel":   ``,
  "Index Scan - Key Positioning":           ``,
  "Index Scan - Key Positioning, Parallel": ``,
  "Skip Sequential Table Scan":             ``,
  "Skip Sequential Table Scan, Parallel":   ``,
  "Encoded Vector Index":                   ``,
  "Encoded Vector Index, Parallel":         ``,
  "Dynamic Bitmap":                         ``,
  "Temporary Table":                        ``,
  "Temporary Hash Table":                   ``,
  "Temporary Index":                        ``,
  "Hash Join":                              ``,
  "Nested Loop Join":                       ``,
  "Index Grouping":                         ``,
  "Hash Grouping":                          ``,
  "Sort":                                   `sort-precedence`,
  "Union Merge":                            ``,
  "Subquery Merge":                         ``,
  "Bitmap Merge":                           ``,
  "Distinct":                               ``,
  "Select":                                 ``,
  "Final Select":                           `pass-filled`,
  "Insert":                                 `pencil`,
  "Update":                                 `replace`,
  "Delete":                                 `trash`,
  "Unknown":                                ``,
}

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

    // If the node is associated with a DB object, display the qualified object name in the description
    if (node.objectSchema && node.objectName) {
      this.description = node.objectSchema + `.` + node.objectName;
    }

    // TODO: the tooltip should be built using a MarkdownString, but every attempt results in 'Loading...' being displayed
    this.tooltip = [node.title, node.tooltipProps.map<string>(prop => prop.title + `: ` + prop.value).join(`\n`)].join(`\n`);

    // TODO: highlights

    // TODO: testing icon colors
    // this.iconPath = new ThemeIcon("flame", new ThemeColor("testing.iconFailed"));
    this.iconPath = new ThemeIcon(icons[node.title]);
  }

  getChildren() {
    return this.explainNode.children.map(c => new ExplainTreeItem(c));
  }
}