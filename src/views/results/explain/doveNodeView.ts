import { CancellationToken, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, ThemeIcon, commands } from "vscode";
import { ExplainNode, ExplainProperty, RecordType } from "./nodes";
import { TreeNodeHighlights } from "./doveTreeDecorationProvider";

type EventType = PropertyNode | undefined | null | void;

export class DoveNodeView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<EventType> = new EventEmitter<EventType>();
  readonly onDidChangeTreeData: Event<EventType> = this._onDidChangeTreeData.event;

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
     // Set an empty tooltip, otherwise 'Loading...' is displayed
    this.tooltip = ``;
    // Differentiate section headings from the rest of the attributes via node highlighting
    if (property.type === RecordType.HEADING) {
      const highlight = TreeNodeHighlights["attribute_heading"];
      this.resourceUri = highlight.uri;
      this.iconPath = new ThemeIcon("list-tree", highlight.color);
    }
  }
}