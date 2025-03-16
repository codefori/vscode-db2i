import { ViewColumn, window } from "vscode";

type Styles = {[key: string]: string};

export interface Element {
  data: {id: string, label: string},
  style: Styles
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
      style: node.styles || {}
    });

    if (node.parent) {
      this.edges.push({
        data: {id: randomId(), source: node.parent, target: id}
      });
    }

    return id;
  }

  createView(title: string) {
    const webview = window.createWebviewPanel(`c`, title, {viewColumn: ViewColumn.One}, {enableScripts: true, retainContextWhenHidden: true});
    webview.webview.html = this.getHtml();

    return webview;
  }

  private getHtml(): string {
    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.23.0/cytoscape.min.js"></script>
      <style>
        /* html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow: hidden;
        } */
    
        .diagram-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          margin: 0;
        }
      </style>
    </head>
    
    <body>
      <div class="diagram-container" id="diagramContainer"></div>
    
      <script>
        document.addEventListener("DOMContentLoaded", function () {
          // Initialize Cytoscape
          const cy = cytoscape({
            container: document.getElementById('diagramContainer'),
    
            elements: ${JSON.stringify([...this.elements, ...this.edges])},
    
            style: [
              {
                selector: 'node',
                style: {
                  'width': '120px',
                  'height': '60px',
                  'background-color': 'var(--vscode-list-activeSelectionBackground)',
                  'color': 'var(--vscode-list-activeSelectionForeground)',
                  'label': 'data(label)',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'font-size': '14px',
                  'text-wrap': 'wrap',
                  'text-max-width': '100px'
                }
              },
              {
                selector: 'edge',
                style: {
                  'width': 2,
                  'line-color': '#5c96bc',
                  'target-arrow-color': '#5c96bc',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier'
                }
              }
            ],
    
            // Layout options
            layout: {
              name: 'breadthfirst',
              directed: true, // Directional tree
              padding: 10, // Padding around the graph
              spacingFactor: 1.5 // Spacing between nodes
            }
          });
    
          // Add click event to show alert for nodes
          cy.on('tap', 'node', function (evt) {
            const node = evt.target;
            console.log("You clicked: " + node.data('label'));
          });
        });
      </script>
    </body>
    
    </html>
    `;
  }
}