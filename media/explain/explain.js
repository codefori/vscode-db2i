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
    zoomingEnabled: false,
    userZoomingEnabled: false,
    style: [
      {
        selector: "node",
        // style: {
        //   padding: "5px",
        //   height: "15px",
        //   width: "label",
        //   "background-color": "var(--vscode-list-activeSelectionBackground)",
        //   color: "var(--vscode-list-activeSelectionForeground)",
        //   label: "data(label)",
        //   "text-valign": "center",
        //   "font-size": "14px",
        // },
        style: {
          padding: "5px",
          width: "150px", // fixed width
          shape: "roundrectangle",
          "background-color": "var(--vscode-list-activeSelectionBackground)",
          color: "var(--vscode-list-activeSelectionForeground)",
          label: "data(label)",
          "text-wrap": "wrap", // enable wrapping
          "text-max-width": "150px", // must match or be less than width
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "14px",
          "line-height": "1.2",
          // "text-overflow-wrap": "anywhere",
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
      spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
      condense: false, // uses all available space on false, uses minimal space on true
      rows: undefined, // force num of rows in the grid
      cols: undefined, // force num of columns in the grid
      position: function (node) {}, // returns { row, col } for element
      sort: undefined, // a sorting function to order the nodes; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
      animate: false, // whether to transition the node positions
      animationDuration: 500, // duration of animation in ms if enabled
      animationEasing: undefined, // easing of animation if enabled
      animateFilter: function (node, i) {
        return true;
      }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
      ready: undefined, // callback on layoutready
      stop: undefined, // callback on layoutstop
      transform: function (node, position) {
        return position;
      }, // transform a given node position. Useful for changing flow direction in discrete layouts
    },
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

    function isVisibleBorders() {
      console.log(window.location.href);
      const border = document.querySelector(".border");
      if (border !== null) {
        return border.style.borderColor !== "transparent";
      }
      return false;
    }

    function redrawBorders() {
      const showBorder = isVisibleBorders();
      deleteAllBorders();
      drawBorderAndIconForEachExplainNode(cy, GRAPH_PADDING, showBorder);
    }

    cy.on("pan", redrawBorders);
    drawBorderAndIconForEachExplainNode(cy, GRAPH_PADDING, true);
  }
}
