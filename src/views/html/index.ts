/**
 * The colours offered by the `vscode-db2i.resultsets.nullCellColor` setting,
 * mapped to a theme-aware CSS value. Anything else (including `"None"`) yields
 * `undefined`, meaning "leave the default foreground colour".
 */
const NULL_CELL_COLOR_VARS: Record<string, string> = {
  Blue: `var(--vscode-charts-blue)`,
  Green: `var(--vscode-charts-green)`,
  Red: `var(--vscode-charts-red)`,
  Orange: `var(--vscode-charts-orange)`,
  Yellow: `var(--vscode-charts-yellow)`,
  Purple: `var(--vscode-charts-purple)`,
};

export function nullCellColor(setting: string | undefined): string | undefined {
  return setting ? NULL_CELL_COLOR_VARS[setting] : undefined;
}

export function getHeader(options: { withCollapsed?: boolean; nullColor?: string } = {}): string {
  const nullColor = options.nullColor;
  return /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Palette aligned with Core's FastTable (frontendTables.generateFastTable):
       a focusBorder accent, foreground-tint overlays for surfaces/zebra/borders,
       descriptionForeground for secondary text, list-hoverBackground on hover. */
    :root {
      --dt-fg-rgb: var(--vscode-editor-foreground-rgb, 204, 204, 204);
      --dt-accent: var(--vscode-focusBorder);
      --dt-surface: rgba(var(--dt-fg-rgb), 0.03);
      --dt-border: rgba(var(--dt-fg-rgb), 0.08);
      --dt-header-a: rgba(var(--dt-fg-rgb), 0.08);
      --dt-header-b: rgba(var(--dt-fg-rgb), 0.05);
      --dt-zebra-odd: rgba(var(--dt-fg-rgb), 0.06);
      --dt-zebra-even: rgba(var(--dt-fg-rgb), 0.20);
      --dt-muted: var(--vscode-descriptionForeground);
    }

    #resultset {
      height: 100%;
      font-size: 0.9em;
      font-family: var(--vscode-font-family);
      min-width: 100%;
      display: grid;
      position: relative;
    }

    .header {
      background:
        linear-gradient(180deg, var(--dt-header-a) 0%, var(--dt-header-b) 100%),
        var(--vscode-editor-background);
      border-bottom: 2px solid var(--dt-accent);
      color: var(--vscode-foreground);
      font-weight: 700;
      font-size: 0.95em;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-align: left;
      position: sticky; /* Lock the header row to the top so it's always visible as rows are scrolled */
      top: 0;           /* Don't forget this, required for the stickiness */
      z-index: 1;
    }

    .row {
      grid-column: 1 / -1;
      display: contents;
    }

    .row.odd > .cell { background-color: var(--dt-zebra-odd); }
    .row.even > .cell { background-color: var(--dt-zebra-even); }

    /* Trailing spacer column — no content, just carries the band to the edge */
    #resultset .filler { min-width: 0; padding: 0; }

    .row:hover > .cell {
      background-color: var(--vscode-list-hoverBackground);
    }

    #footer {
      position: sticky;
      bottom: 0;
      background:
        linear-gradient(var(--dt-surface), var(--dt-surface)),
        var(--vscode-editor-background);
      border-top: 1px solid var(--dt-border);
      text-align: left;
      grid-column: 1 / -1;
      opacity: 1;
      padding: 5px 15px;
    }

    .header,
    .cell {
      padding: 5px 15px;
    }

    .cell {
      position: relative;
      white-space: pre-wrap;
      border-bottom: 1px solid var(--dt-border);
    }

    .joblog > div:not(:first-child) > div.cell {
      display: flex;
      align-items: center;
    }
    .header {
      /* stop content from "spilling" */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hoverable {
      /* stop content from "spilling" */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: break-word;
    }

    .hoverable:hover {
      /* stop content from "spilling" */
      overflow: initial;
      text-overflow: initial;
      text-wrap-mode: wrap !important;
      height: auto;
    }

    #resultset div.cell {
      overflow: visible;
    }

    #resultset div[contenteditable="true"].nullable:before {
      color: var(--vscode-foreground);
      position: absolute;
      top: -22px;
      content: "Shift+Enter for null";
      background-color: var(--vscode-list-hoverBackground);
      opacity: 1;
      padding: 2px;
      font-style: normal;
      border: 1px solid var(--dt-accent);
      width: max-content;
      z-index: 2;
    }

    #resultset .null {
      font-style: italic;
      font-weight: bold;
      ${nullColor ? `color: ${nullColor};` : ``}
    }

    #resultset .grip {
      top: 0;
      right: 0;
      bottom: 0;
      width: 1px;
      position: absolute;
      cursor: col-resize;
      border-right: 1px solid var(--dt-border);
    }

    .center-screen {
      overflow: hidden;
      display: grid;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 100vh;
    }

    .primaryButton {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 5px;
      padding: 5px 10px;
      cursor: pointer;
    }

    /* https://cssloaders.github.io */
    .loader {
      width: 32px;
      height: 90px;
      display: block;
      margin: 20px auto;
      position: relative;
      border-radius: 50% 50% 0 0;
      border-bottom: 10px solid #0055ff;
      background-color: #d6dce3;
      background-image: radial-gradient(ellipse at center, #d6dce3 34%, #0055ff 35%, #0055ff 54%, #d6dce3 55%), linear-gradient(#0055ff 10px, transparent 0);
      background-size: 28px 28px;
      background-position: center 20px , center 2px;
      background-repeat: no-repeat;
      box-sizing: border-box;
      animation: animloaderBack 1s linear infinite alternate;
    }
    .loader::before {
      content: '';  
      box-sizing: border-box;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 64px;
      height: 44px;
      border-radius: 50%;
      box-shadow: 0px 15px #0055ff inset;
      top: 67px;
    }
    .loader::after {
      content: '';  
      position: absolute;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 34px;
      height: 34px;
      top: 112%;
      background: radial-gradient(ellipse at center, #ffdf00 8%, rgba(249, 62, 0, 0.6) 24%, rgba(0, 0, 0, 0) 100%);
      border-radius: 50% 50% 0;
      background-repeat: no-repeat;
      background-position: -44px -44px;
      background-size: 100px 100px;
      box-shadow: 4px 4px 12px 0px rgba(255, 61, 0, 0.5);
      box-sizing: border-box;
      animation: animloader 1s linear infinite alternate;
    }

    @keyframes animloaderBack {
      0%, 30%, 70% {
        transform: translateY(0px);
      }
      20%, 40%, 100% {
        transform: translateY(-5px);
      }
    }

    @keyframes animloader {
      0% {
        box-shadow: 4px 4px 12px 2px rgba(255, 61, 0, 0.75);
        width: 34px;
        height: 34px;
        background-position: -44px -44px;
        background-size: 100px 100px;
      }
      100% {
        box-shadow: 2px 2px 8px 0px rgba(255, 61, 0, 0.5);
        width: 30px;
        height: 28px;
        background-position: -36px -36px;
        background-size: 80px 80px;
      }
    }
  </style>
  `;
}

export const escapeHTML = (str: string) => str.replace(/[&<>'"]/g,
  tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] ?? tag));