import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, ThemeIcon, ThemeColor } from "vscode";
import { ExplainNode, ExplainProperty, RecordType } from "./nodes";

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
    this.tooltip = ``;
    // Differentiate section headings from the rest of the attributes
    if (property.type === RecordType.HEADING) {
      // TODO: can we do something more elegant than highlighting the text? https://stackoverflow.com/questions/74486107/how-to-color-tree-view-item-in-vscode-extension/74493474#74493474
      this.label = { label: property.title, highlights: [[0, property.title.length]] };
    }
    // TODO: icons
    // if (property.title !== ``) {
    //   this.iconPath = new ThemeIcon("flame", new ThemeColor("testing.iconFailed"));
    // }
  }
}