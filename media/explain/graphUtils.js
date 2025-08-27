export const MIN_DISTANCE_TO_VIEWPORT = 4;
export const TOOLTIP_OFFSET = 20;

// === Node Position Utilities ===

export function getNodeTopLeftAbsolute(node, cy) {
  const containerRect = cy.container().getBoundingClientRect();
  const pos = node.position();
  const zoom = cy.zoom();
  const pan = cy.pan();

  const renderedX = pos.x * zoom + pan.x;
  const renderedY = pos.y * zoom + pan.y;

  return {
    x: containerRect.left + renderedX - node.renderedWidth() / 2,
    y: containerRect.top + renderedY - node.renderedHeight() / 2,
  };
}

// === Border Geometry Utilities ===

export function getTopLeftForBorder(x, y, padX, padY, iconH, iconGap) {
  return {
    x: x - padX - 2, // slight adjustment
    y: y - padY - iconH - iconGap,
  };
}

export function getBorderWidthAndHeight(
  padX,
  nodeW,
  padY,
  nodeH,
  iconH,
  iconGap
) {
  return {
    width: padX * 2 + nodeW,
    height: padY * 2 + iconH + iconGap + nodeH,
  };
}

// === Tooltip Position Utility ===
export function getTooltipPosition(node, container, tooltipBox) {
  const { x, y } = node.renderedPosition();
  const containerRect = container.getBoundingClientRect();
  const boxRect = tooltipBox.getBoundingClientRect();

  let left = x + containerRect.left - boxRect.width / 2;
  let top =
    y -
    node.renderedOuterHeight() / 2 +
    containerRect.top -
    boxRect.height -
    TOOLTIP_OFFSET;

  // Prevent overflow
  if (left < MIN_DISTANCE_TO_VIEWPORT) left = MIN_DISTANCE_TO_VIEWPORT;
  if (left + boxRect.width > window.innerWidth - MIN_DISTANCE_TO_VIEWPORT) {
    left = window.innerWidth - boxRect.width - MIN_DISTANCE_TO_VIEWPORT;
  }

  if (top < MIN_DISTANCE_TO_VIEWPORT) {
    top = y + containerRect.top + node.renderedOuterHeight() / 2;
  }

  return { left, top };
}

export function showResizeWarning() {
  const warningDiv = document.createElement("div");
  warningDiv.className = "warning-div"

  const h1 = document.createElement("h1");
  h1.className = "warning-div-title"
  h1.textContent = "Window is too small. Make your window larger and run again.";
  
  warningDiv.appendChild(h1);
  document.body.appendChild(warningDiv);
}

export function isEnoughAreaWithoutBorders(cy, windowPadding) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let areaNeededForAllNodes = 0;
  let maxHeightNeededForNode = 60;
  let maxWidthNeededForNode = 100;

  cy.nodes().forEach(node => {
    const nodeW = node.renderedWidth();
    const nodeH = node.renderedHeight();
    areaNeededForAllNodes += nodeW * nodeH
    maxHeightNeededForNode = Math.max(maxHeightNeededForNode, nodeH);
    maxWidthNeededForNode = Math.max(maxWidthNeededForNode, nodeW);
  });

  const usableWidth = windowWidth - 2 * windowPadding;
  const usableHeight = windowHeight - 2 * windowPadding;

  const maxCols = Math.floor(usableWidth / maxWidthNeededForNode);
  const maxRows = Math.floor(usableHeight / maxHeightNeededForNode);

  const maxNodesThatCanFit = maxCols * maxRows;

  return cy.nodes().length <= maxNodesThatCanFit;
}

export function isWindowTooSmall(windowPadding){
    const extraRoom = 50
    return windowPadding * 2 >= window.innerWidth || windowPadding * 2 + extraRoom >= window.innerHeight
}