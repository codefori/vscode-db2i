import {
  getNodeTopLeftAbsolute,
  getTopLeftForBorder,
  getBorderWidthAndHeight,
} from "./graphUtils.js";

export function deleteAllBorders() {
  document.querySelectorAll(".border").forEach((el) => el.remove());
}

// @ts-ignore
const iconMap = window.iconMap;

const getCodiconClass = (label) => {
  const className = iconMap[label];
  return className !== undefined ? `codicon-${className}` : "";
};

function drawNodeIcon(fontSize, color, label) {
  const icon = document.createElement("i");
  const codiconClass = getCodiconClass(label);
  icon.className = `codicon ${codiconClass}`;
  Object.assign(icon.style, {
    fontSize: `${fontSize}px`,
    color,
    height: "fit-content",
  });
  return icon;
}

function isEnoughRoomForBorders(cy, paddingX, paddingY, iconSize, iconGap, windowPadding){
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight;
    let widthNeededForAllNodes = 0
    let maxHeightNeededForBorder = 0
    cy.nodes().forEach(node => {
        const nodeW = node.renderedWidth();
        const nodeH = node.renderedHeight();
        const dimensions = getBorderWidthAndHeight(paddingX, nodeW, paddingY, nodeH, iconSize, iconGap);
        widthNeededForAllNodes += dimensions.width
        maxHeightNeededForBorder = Math.max(maxHeightNeededForBorder, dimensions.height)
    })
    return widthNeededForAllNodes < windowWidth - windowPadding * 2 && maxHeightNeededForBorder < windowHeight - windowPadding * 2
}

function isEnoughAreaForBorders(cy, paddingX, paddingY, iconSize, iconGap, windowPadding) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let areaNeededForAllNodes = 0;
  let maxHeightNeededForBorder = 0;
  let maxWidthNeededForBorder = 0;

  cy.nodes().forEach(node => {
    const nodeW = node.renderedWidth();
    const nodeH = node.renderedHeight();
    const dimensions = getBorderWidthAndHeight(paddingX, nodeW, paddingY, nodeH, iconSize, iconGap);
    areaNeededForAllNodes += dimensions.width * dimensions.height;
    maxHeightNeededForBorder = Math.max(maxHeightNeededForBorder, dimensions.height);
    maxWidthNeededForBorder = Math.max(maxWidthNeededForBorder, dimensions.width);
  });

  const usableWidth = windowWidth - 2 * windowPadding;
  const usableHeight = windowHeight - 2 * windowPadding;

  const maxCols = Math.floor(usableWidth / maxWidthNeededForBorder);
  const maxRows = Math.floor(usableHeight / maxHeightNeededForBorder);

  const maxNodesThatCanFit = maxCols * maxRows;

  return cy.nodes().length <= maxNodesThatCanFit;
}

export function drawBorderAndIconForEachExplainNode(cy, windowPadding, isVisible) {
  const paddingX = 30;
  const paddingY = 10;
  const iconSize = 50;
  const iconGap = 20;
  const borderRadius = 10;
  const iconColor = "#007acc";
  const shouldDrawBorders = isEnoughAreaForBorders(cy, paddingX, paddingY, iconSize, iconGap, windowPadding)

  cy.nodes().forEach(node => {
    const nodeW = node.renderedWidth();
    const nodeH = node.renderedHeight();
    const nodeTopLeft = getNodeTopLeftAbsolute(node, cy);

    const topLeft = getTopLeftForBorder(nodeTopLeft.x, nodeTopLeft.y, paddingX, paddingY, iconSize, iconGap);
    const dimensions = getBorderWidthAndHeight(paddingX, nodeW, paddingY, nodeH, iconSize, iconGap);

    const border = document.createElement("div");
    border.className = "border";

    Object.assign(border.style, {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      position: "absolute",
      top: `${topLeft.y}px`,
      left: `${topLeft.x}px`,
      display: "flex",
      justifyContent: "center",
      paddingTop: `${paddingY}px`,
      borderRadius: `${borderRadius}px`
    });
    if (!shouldDrawBorders || !isVisible){
        border.style.borderColor = "transparent"
    }

    border.appendChild(drawNodeIcon(iconSize, iconColor, node.data().label));
    document.body.appendChild(border);
  });
}
