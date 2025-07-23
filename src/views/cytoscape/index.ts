import { ViewColumn, window } from "vscode";
import * as vscode from "vscode";
import { ContextProvider } from "../../contextProvider";
import { icons } from "../results/explain/icons";
import { ExplainNode } from "../results/explain/nodes";

export type Styles = { [key: string]: string };

export interface Element {
  data: { id: string; label: string };
  style: Styles;
  classes: string;
  grabbable: boolean;
}

export interface Edge {
  data: { id: string; source: string; target: string };
}

interface NewNode {
  label: string;
  styles?: Styles;
  parent?: string;
  data?: ExplainNode;
}

const randomId = () => Math.random().toString(36).substring(7);

export class CytoscapeGraph {
  private elementData = new Map<string, any>();
  private tooltips = {};
  private elements: Element[] = [];
  private edges: Edge[] = [];

  constructor() {}

  addNode(node: NewNode): string {
    const id = randomId();

    if (node.data) {
      this.elementData.set(id, node.data);
      const tooltip = node.data.tooltipProps
        .map((prop) => `${prop.title}: ${prop.value}`)
        .join("\n");
      this.tooltips[id] = tooltip;
    }

    this.elements.push({
      data: { id, label: node.label },
      style: node.styles || {},
      classes: "l1",
      grabbable: false
    });

    if (node.parent) {
      this.edges.push({
        data: { id: randomId(), source:id , target: node.parent },
      });
    }

    return id;
  }

  createView(title: string, onNodeSelected: (data: unknown) => void): any {
    const webview = window.createWebviewPanel(
      `c`,
      title,
      { viewColumn: ViewColumn.One },
      { enableScripts: true, retainContextWhenHidden: true }
    );
    webview.webview.html = this.getHtml(webview.webview);

    webview.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "selected") {
          const data = this.elementData.get(message.nodeId);
          onNodeSelected(data);
        }
      },
      undefined,
      []
    );

    return webview;
  }

  private getUri(path: string[], webview: vscode.Webview): vscode.Uri {
    const context = ContextProvider.getContext();
    const vscodeUri = vscode.Uri.joinPath(context.extensionUri, ...path);
    return webview.asWebviewUri(vscodeUri);
  }

  private getHtml(webview: vscode.Webview): string {
    const data = JSON.stringify([...this.elements, ...this.edges]);
    const iconMap = JSON.stringify(icons);
    const tooltips = JSON.stringify(this.tooltips);
    const cssUri = this.getUri(
      ["media", "explain", "explain.css"],
      webview
    );

    const codiconsUri = this.getUri(
      ["media", "explain", "dist", "codicon.css"],
      webview
    );

    const cytoscapeUri = this.getUri(
      ["media", "explain", "cytoscape.min.js"],
      webview
    );

    const explainUri = this.getUri(
      ["media", "explain", "explain.js"],
      webview
    );

    return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${cssUri}" rel="stylesheet" />
      <link href="${codiconsUri}" rel="stylesheet" />
      <script src="${cytoscapeUri}"></script>
      <script type="module" src="${explainUri}" defer></script>
      <script>
          window.data = ${data};
          window.iconMap = ${iconMap}
          window.tooltips = ${tooltips}
      </script>
    </head>
    <body>
      <div class="diagram-container" id="diagramContainer"></div>
    </body>
    </html>
    `;
  }
}
