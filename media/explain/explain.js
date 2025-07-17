// @ts-nocheck
import { getTooltipPosition } from "./graphUtils.js";
import {
  deleteAllBorders,
  drawBorderAndIconForEachExplainNode,
} from "./borderAndIconDraw.js";

const tooltips = window.tooltips;
const vscode = window.acquireVsCodeApi();

// Initialize Cytoscape
const cy = cytoscape({
  container: document.getElementById("diagramContainer"),
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

  layout: {
    name: "grid",
    padding: 50, // Padding around the graph
    spacingFactor: 0.9, // Spacing between nodes
  },
});

// When clicked, we display the details for the node in the bottom tree view
cy.on("tap", "node", function (evt) {
  const id = evt.target.id();
  vscode.postMessage({
    command: "selected",
    nodeId: id,
  });
});

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
