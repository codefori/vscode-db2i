// Initialize Cytoscape

// @ts-ignore
const iconMap = window.iconMap;
// @ts-ignore
const vscode = window.acquireVsCodeApi();
// @ts-ignore
const cy = cytoscape({
  container: document.getElementById("diagramContainer"),
  // @ts-ignore
  elements: window.data,

  style: [
    {
      selector: "node",
      style: {
        padding: "5px",
        height: "15px",
        width: "label",
        "background-color": "var(--vscode-list-activeSelectionBackground)",
        color: "var(--vscode-list-activeSelectionForeground)",
        label: "data(label)",
        "text-valign": "center",
        "font-size": "14px",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#5c96bc",
        "target-arrow-color": "#5c96bc",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ],

  // Layout options
  layout: {
    name: "grid",
    padding: 100, // Padding around the graph
    spacingFactor: 0.4, // Spacing between nodes
  },
});

// Add click event to show alert for nodes
cy.on("tap", "node", function (evt) {
  const id = evt.target.id();
  // @ts-ignore
  vscode.postMessage({
    command: "selected",
    nodeId: id,
  });
});

const getCodiconClass = (label) => {
  const className = iconMap[label];
  return className !== undefined ? `codicon-${className}` : "";
};

cy.nodeHtmlLabel([
  {
    query: ".l1",
    valign: "top",
    halign: "center",
    valignBox: "top",
    halignBox: "center",
    tpl: function (data) {
      const className = getCodiconClass(data.label);
      return `<div><div class="icon"><i class="codicon ${className}"></i></div>`;
    },
  },
]);
