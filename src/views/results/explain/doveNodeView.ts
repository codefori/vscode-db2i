import * as vscode from "vscode";
import { CancellationToken, Event, EventEmitter, ProviderResult, TreeView, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands } from "vscode";
import { ExplainNode, ExplainProperty, Highlighting, RecordType, NodeHighlights } from "./nodes";
import { toDoveTreeDecorationProviderUri } from "./doveTreeDecorationProvider";
import * as crypto from "crypto";

type EventType = PropertyNode | undefined | null | void;

export class DoveNodeView implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<EventType> = new EventEmitter<EventType>();
  readonly onDidChangeTreeData: Event<EventType> = this._onDidChangeTreeData.event;

  private currentNode: ExplainNode;
  private propertyNodes: PropertyNode[];

  private treeView: TreeView<PropertyNode>;
  
  private defaultTitle: string;

  constructor() {
    this.treeView = vscode.window.createTreeView(`vscode-db2i.dove.node`, { treeDataProvider: this, showCollapseAll: true });
    this.defaultTitle = this.treeView.title;
  }

  public getTreeView(): TreeView<PropertyNode> {
    return this.treeView;
  }

  setNode(node: ExplainNode, title?: string) {
    // If we have a current node in the view and it has a context defined, reset it before processing the new node
    if (this.currentNode?.nodeContext) {
      commands.executeCommand(`setContext`, this.currentNode.nodeContext, false);
    }
    this.currentNode = node;
    this.treeView.title = title || this.defaultTitle;
    this.propertyNodes = [];
    let currentSection: PropertySection = null;
    for (let property of node.props) {
      let node = property.type === RecordType.HEADING ? new PropertySection(property) : new PropertyNode(property);
      // If the property node is a new section, add it to the top level node list and set as the current section
      if (node instanceof PropertySection) {
        // If this is the first section, but the tree already has nodes, add a blank node to space things out a bit
        if (currentSection === null && this.propertyNodes.length > 0) {
          this.propertyNodes.push(new PropertyNode());
        }
        // We expect that we are now processing a new section, so add a blank property to current section to finish it off
        if (currentSection && node != currentSection) {
          currentSection.addProperty(new PropertyNode());
        }
        this.propertyNodes.push(node);
        currentSection = node;
      } else if (currentSection) {
        currentSection.addProperty(node);
      } else {
        this.propertyNodes.push(node);
      }
    }
    this._onDidChangeTreeData.fire();
    // Ensure that the tree is positioned such that the first element is visible
    this.treeView.reveal(this.propertyNodes[0],  { select: false });
    // Show the detail view and if the explain node has a context defined, set it
    this.setContext(true);
  }
  getNode(): ExplainNode {
    return this.currentNode;
  }

  private setContext(enable: boolean): void {
    commands.executeCommand(`setContext`, `vscode-db2i:explainingNode`, enable);
    if (this.currentNode?.nodeContext) {
      commands.executeCommand(`setContext`, this.currentNode.nodeContext, enable);
    }
  }

  close() {
    // Hide the detail view and if the explain node has a context defined, reset it
    this.setContext(false);
  }

  getTreeItem(element: PropertyNode): PropertyNode | Thenable<PropertyNode> {
    return element;
  }

  getChildren(element?: PropertyNode): ProviderResult<PropertyNode[]> {
    if (element) {
      return element instanceof PropertySection ? element.getProperties() : [];
    }
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
  constructor(property?: ExplainProperty) {
    super(property?.title || ``);
    // Initialize the tooltip to an empty string, otherwise 'Loading...' is displayed
    this.tooltip = ``;
    if (property?.value) {
      this.description = String(property.value || ``);
      this.tooltip = this.description;
      this.contextValue = `propertyNode`;
    }
  }
}

class PropertySection extends PropertyNode {
  propertyNodes: PropertyNode[] = [];
  constructor(property: ExplainProperty) {
    super(property);
    // Random ID so that when switching between result nodes the expansion state of its attribute sections are not applied to another nodes attribute sections with the same title
    this.id = crypto.randomUUID();
    this.collapsibleState = TreeItemCollapsibleState.Expanded;
    // Visually differentiate section headings from the rest of the attributes via node highlighting
    this.resourceUri = toDoveTreeDecorationProviderUri(new NodeHighlights().set(Highlighting.ATTRIBUTE_SECTION_HEADING));
  }
  addProperty(p: PropertyNode) {
    this.propertyNodes.push(p);
  }
  getProperties(): PropertyNode[] {
    return this.propertyNodes;
  }
}
