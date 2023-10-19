import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands } from "vscode";
import { ExplainNode, ExplainProperty } from "./nodes";

// https://www.ibm.com/docs/en/i/7.5?topic=ssw_ibm_i_75/apis/qqqvexpl.html -> ICON labels
const icons = {
  "Table Probe": `list-selection`,
  "Table Scan, Parallel": `search`,
  "Table Scan": `search`,
  "Index Scan - Key Selection": ``,
  "Index Scan - Key Selection, Parallel": ``,
  "Index Scan - Key Positioning": ``,
  "Index Scan - Key Positioning, Parallel": ``,
  "Skip Sequential Table Scan": ``,
  "Skip Sequential Table Scan, Parallel": ``,
  "Encoded Vector Index": ``,
  "Encoded Vector Index, Parallel": ``,
  "Dynamic Bitmap": ``,
  "Skip sequential table scan": ``,
  "Index scan - key positioning": ``,
  "Index scan - key selection": ``,
  "Temporary Table": ``,
  "Temporary Hash Table": ``,
  "Temporary Index": ``,
  "Hash Join": ``,
  "Nested Loop Join": ``,
  "Index Grouping": ``,
  "Hash Grouping": ``,
  "Sort": ``,
  "Union Merge": ``,
  "Subquery Merge": ``,
  "Bitmap Merge": ``,
  "Distinct": ``,
  "Select": ``,
  "Final Select": `pass-filled`,
  "Insert": ``,
  "Update": ``,
  "Delete": ``,
  "Unknown": ``,
}

export class DoveNodeView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<PropertyNode | undefined | null | void> = new EventEmitter<PropertyNode | undefined | null | void>();
  readonly onDidChangeTreeData: Event<PropertyNode | undefined | null | void> = this._onDidChangeTreeData.event;

  private propertyNodes: PropertyNode[];

  setNode(currentNode: ExplainNode) {
    this.propertyNodes = currentNode.props.map(p => new PropertyNode(p));
    this._onDidChangeTreeData.fire();

    // Show tree in the view
    commands.executeCommand(`setContext`, `vscode-db2i:explainingNode`, true);
  }

  close() {
    commands.executeCommand(`setContext`, `vscode-db2i:explainingNode`, false);
  }

  getTreeItem(element: PropertyNode): PropertyNode | Thenable<PropertyNode> {
    return element;
  }

  getChildren(element?: PropertyNode): ProviderResult<PropertyNode[]> {
    return this.propertyNodes;
  }

  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }
  resolveTreeItem?(item: TreeItem, element: any, token: CancellationToken): ProviderResult<PropertyNode> {
    throw new Error("Method not implemented.");
  }
}

export class PropertyNode extends TreeItem {
  constructor(property: ExplainProperty) {
    super(property.title);

    this.description = String(property.value);
  }
}