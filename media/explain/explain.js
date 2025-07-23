// @ts-nocheck
import {
  getTooltipPosition,
  showResizeWarning,
  isWindowTooSmall,
  isEnoughAreaWithoutBorders,
} from "./graphUtils.js";
import {
  deleteAllBorders,
  drawBorderAndIconForEachExplainNode,
} from "./borderAndIconDraw.js";

const tooltips = window.tooltips;
const vscode = window.acquireVsCodeApi();
const GRAPH_PADDING = 50;

if (isWindowTooSmall(GRAPH_PADDING)) {
  showResizeWarning();
} else {
  // Initialize Cytoscape
  const cy = cytoscape({
    container: document.getElementById("diagramContainer"),
    elements: window.data,
    userZoomingEnabled: false,
    style: [
      {
        selector: "node",
        style: {
          padding: "5px",
          width: "150px",
          shape: "roundrectangle",
          "background-color": "lightgray",
          color: "black",
          label: "data(label)",
          "text-wrap": "wrap",
          "text-max-width": "150px",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "14px",
          "line-height": "1.2",
        },
      },
      {
        selector: "node:selected",
        style: {
          "background-color": "deepskyblue",
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
      fit: true, // whether to fit the viewport to the graph
      padding: GRAPH_PADDING, // padding used on fit
      avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
      avoidOverlapPadding: 10, // extra spacing around nodes when avoidOverlap: true
      nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
      condense: false, // uses all available space on false, uses minimal space on true
      animate: false, // whether to transition the node positions
    },
  });

  window.addEventListener("resize", () => {
    cy.resize();
    cy.fit(cy.nodes().boundingBox(), GRAPH_PADDING);
    cy.center();
  });

  if (!isEnoughAreaWithoutBorders(cy, GRAPH_PADDING)) {
    cy.destroy();
    showResizeWarning();
  } else {
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
      hoverDiv.innerText = tooltip;
      hoverDiv.className = "hover-box";
      document.body.appendChild(hoverDiv);

      function updatePosition() {
        const { left, top } = getTooltipPosition(
          node,
          cy.container(),
          hoverDiv
        );
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

    function redrawBorders() {
      deleteAllBorders();
      drawBorderAndIconForEachExplainNode(cy, GRAPH_PADDING);
    }

    cy.on("pan zoom resize", redrawBorders);
    drawBorderAndIconForEachExplainNode(cy, GRAPH_PADDING);
  }
}
