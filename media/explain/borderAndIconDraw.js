// @ts-nocheck
import {
  getNodeTopLeftAbsolute,
  getTopLeftForBorder,
  getBorderWidthAndHeight,
} from "./graphUtils.js";

export function deleteAllBorders() {
  document.querySelectorAll(".border").forEach((el) => el.remove());
}

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

export function drawBorderAndIconForEachExplainNode(
  cy,
  windowPadding
) {
  const paddingX = 30;
  const paddingY = 10;
  const iconGap = 20;
  const borderRadius = 10;
  const iconColor = "#007acc";

  let minIconSize = 50;
  cy.nodes().forEach((node) => {
    const nodeW = node.renderedWidth();
    const iconSize = nodeW / 2;
    minIconSize = Math.min(minIconSize, iconSize);
  });


  cy.nodes().forEach((node) => {
    const nodeW = node.renderedWidth();
    const nodeH = node.renderedHeight();

    const nodeTopLeft = getNodeTopLeftAbsolute(node, cy);

    const topLeft = getTopLeftForBorder(
      nodeTopLeft.x,
      nodeTopLeft.y,
      paddingX,
      paddingY,
      minIconSize,
      iconGap
    );
    const dimensions = getBorderWidthAndHeight(
      paddingX,
      nodeW,
      paddingY,
      nodeH,
      minIconSize,
      iconGap
    );

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
      borderRadius: `${borderRadius}px`,
      borderColor: "transparent"
    });

    border.appendChild(drawNodeIcon(minIconSize, iconColor, node.data().label));
    document.body.appendChild(border);
  });
}
