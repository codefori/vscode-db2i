import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, ThemeIcon } from "vscode";
import { ExplainNode } from "./nodes";
import { TreeNodeHighlights } from "./doveTreeDecorationProvider";

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

  setRootNode(topNode: ExplainNode): ExplainTreeItem {
    this.topNode = new ExplainTreeItem(topNode);
    this._onDidChangeTreeData.fire();

    // Show tree in the view
    commands.executeCommand(`setContext`, `vscode-db2i:explaining`, true);
    return this.topNode;
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
    this.tooltip = [node.title, node.tooltipProps.map<string>(prop => prop.title + `: ` + prop.value).join(`\n`), `\n`].join(`\n`);

    // TODO: highlights - set the correct highlight resource Uri
    // Ex: this.resourceUri = TreeNodeHighlights["index_advised"].uri;

    // TODO: testing icon colors --- this.iconPath = new ThemeIcon("flame", new ThemeColor("testing.iconFailed"));
    const icon = icons[node.title] || `chevron-right`;
    this.iconPath = new ThemeIcon(icon);
  }

  getChildren() {
    return this.explainNode.children.map(c => new ExplainTreeItem(c));
  }
}

