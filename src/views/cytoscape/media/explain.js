// Initialize Cytoscape
// main.js
import { getTooltipPosition } from "./graphUtils.js";
import {
  deleteAllBorders,
  drawBorderAndIconForEachExplainNode,
} from "./borderDraw.js";
// // @ts-ignore
// const iconMap = window.iconMap;
// @ts-ignore
const tooltips = window.tooltips;
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
    padding: 50, // Padding around the graph
    spacingFactor: 0.9, // Spacing between nodes
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

// const getCodiconClass = (label) => {
//   const className = iconMap[label];
//   return className !== undefined ? `codicon-${className}` : "";
// };

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

// cy.nodes().on("mouseover", (event) => {
//   const node = event.target;
//   const id = node.id();
//   const tooltip = tooltips[id];
//   const hoverDiv = document.createElement("pre");
//   hoverDiv.innerText = tooltip;
//   hoverDiv.className = "hover-box";
//   document.body.appendChild(hoverDiv);

//   function updatePosition() {
//     const { x, y } = node.renderedPosition(); // center of node
//     const containerRect = cy.container().getBoundingClientRect(); // Cytoscape canvas
//     const boxRect = hoverDiv.getBoundingClientRect(); // Tooltip box
//     const boxWidth = boxRect.width;
//     const boxHeight = boxRect.height;

//     const nodeTopY = y - node.renderedOuterHeight() / 2;
//     const offset = 20;

//     let top = nodeTopY + containerRect.top - boxHeight - offset;
//     let left = x + containerRect.left - boxWidth / 2;

//     // Constrain to visible area
//     const viewportWidth = window.innerWidth;
//     const viewportHeight = window.innerHeight;

//     // Keep inside horizontal bounds
//     if (left < 4) left = 4;
//     if (left + boxWidth > viewportWidth - 4) {
//       left = viewportWidth - boxWidth - 4;
//     }

//     // If tooltip would be cut off vertically, show it *below* the node instead
//     if (top < 4) {
//       top = y + containerRect.top + node.renderedOuterHeight() / 2;
//     }

//     hoverDiv.style.left = `${left}px`;
//     hoverDiv.style.top = `${top}px`;
//   }

//   updatePosition(); // initial position
//   cy.on("pan zoom resize", updatePosition);
//   node.on("position", updatePosition);

//   node.once("mouseout", () => {
//     hoverDiv.remove();
//     cy.off("pan zoom resize", updatePosition);
//     node.off("position", updatePosition);
//   });
// });

// === Tooltip Hover Handler ===
cy.nodes().on("mouseover", (event) => {
  const node = event.target;

  const hoverDiv = document.createElement("pre");
  const id = node.id();
  const tooltip = tooltips[id];
  hoverDiv.innerText = tooltip
  hoverDiv.className = "hover-box";
  document.body.appendChild(hoverDiv);

  function updatePosition() {
    const { left, top } = getTooltipPosition(node, cy.container(), hoverDiv);
    hoverDiv.style.left = `${left}px`;
    hoverDiv.style.top = `${top}px`;
  }

  updatePosition();
  cy.on("pan zoom resize", updatePosition);
  node.on("position", updatePosition);

  node.once("mouseout", () => {
    hoverDiv.remove();
    cy.off("pan zoom resize", updatePosition);
    node.off("position", updatePosition);
  });
});

// === Border sync on resize/pan/zoom ===
function redrawBorders() {
  deleteAllBorders();
  drawBorderAndIconForEachExplainNode(cy);
}

cy.on("pan zoom resize", redrawBorders);
drawBorderAndIconForEachExplainNode(cy);
