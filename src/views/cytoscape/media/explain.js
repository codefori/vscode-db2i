// Initialize Cytoscape

// const vscode = acquireVsCodeApi();
console.log("IN EXPLAIN.JS!!!")
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
    name: "breadthfirst",
    directed: true, // Directional tree
    padding: 10, // Padding around the graph
    spacingFactor: 1.5, // Spacing between nodes
  },
});

// Add click event to show alert for nodes
cy.on("tap", "node", function (evt) {
  const id = evt.target.id();
  //   vscode.postMessage({
  //     command: 'selected',
  //     nodeId: id
  //   });
});

const getCodiconClass = (label) => {
  const codiconClass = new Map([["d", "d"]]);
  return codiconClass.get(label);
};

// cy.nodeHtmlLabel([
//   {
//     query: ".l1",
//     valign: "top",
//     halign: "center",
//     valignBox: "top",
//     halignBox: "center",
//     tpl: function (data) {
//       const className = getCodiconClass(data.label);
//       return `<div><div class="icon"><i class="codicon ${className}"></i></div>`;
//     },
//   },
// ]);
