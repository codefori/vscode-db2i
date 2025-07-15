import { ViewColumn, window } from "vscode";
import * as vscode from 'vscode';
import { ContextProvider } from "../../contextProvider";

export type Styles = {[key: string]: string};

export interface Element {
  data: {id: string, label: string},
  style: Styles,
  classes: string
}

export interface Edge {
  data: {id: string, source: string, target: string}
}

interface NewNode { 
  label: string, 
  styles?: Styles, 
  parent?: string,
  data?: any;
}

const randomId = () => Math.random().toString(36).substring(7);

export class CytoscapeGraph {
  private elementData = new Map<string, any>();
  private elements: Element[] = [];
  private edges: Edge[] = [];

  constructor() {}

  addNode(node: NewNode): string {
    const id = randomId(); // TODO: is this unique enough?

    if (node.data) {
      this.elementData.set(id, node.data);
    }

    this.elements.push({
      data: {id, label: node.label},
      style: node.styles || {},
      classes: ".l1"
    });

    if (node.parent) {
      this.edges.push({
        data: {id: randomId(), source: node.parent, target: id}
      });
    }

    return id;
  }

  createView(title: string, onNodeSelected: (data: unknown) => void): any {
    const webview = window.createWebviewPanel(`c`, title, {viewColumn: ViewColumn.One}, {enableScripts: true, retainContextWhenHidden: true});
    webview.webview.html = this.getHtml(webview.webview);

    webview.webview.onDidReceiveMessage((message) => {
      if (message.command === 'selected') {
        const data = this.elementData.get(message.nodeId);
        onNodeSelected(data);
      }
    }, undefined, []);

    return webview;
  }

  private getHtml(webview: vscode.Webview): string {
    const data = JSON.stringify([...this.elements, ...this.edges])
    const context = ContextProvider.getContext()
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'src', 'views', 'cytoscape', 'media', 'explain.css'))
    const cytoscapeUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'src', 'views', 'cytoscape', 'media', 'cytoscape.min.js'))
    const cytoscapeHtmlLabelUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'src', 'views', 'cytoscape', 'media', 'cytoscape-node-html-label.min.js'))
    const explainUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'src', 'views', 'cytoscape', 'media', 'explain.js'))

  
    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${cssUri}" rel="stylesheet" />
      <script src="${cytoscapeUri}"></script>
      <script src="${cytoscapeHtmlLabelUri}"></script>
      <script src="${explainUri}" defer></script>
      <script>
          window.data = ${data};
      </script>
    </head>
    <body>
      <div class="diagram-container" id="diagramContainer"></div>
    </body>
    </html>
    `;
  }
}