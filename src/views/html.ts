
export function getHeader(options: {withCollapsed?: boolean} = {}): string {
  return /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    #resultset {
      height: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
      font-family: sans-serif;
      min-width: 100%;
    }

    thead tr {
      background-color: var(--vscode-banner-background);
      color: var(--vscode-banner-foreground);
      text-align: left;
      position: sticky; /* Lock the header row to the top so it's always visible as rows are scrolled */
      top: 0;           /* Don't forget this, required for the stickiness */
    }

    tfoot {
      position: sticky;
      bottom: 0;
    }

    tfoot tr {
      background-color: var(--vscode-multiDiffEditor-headerBackground);
      text-align: left;
    }

    #resultset th,
    #resultset td {
      padding: 5px 15px;
    }

    #resultset td.preserve {
      white-space: pre-wrap;
    }

    #resultset tbody tr:hover {
      background-color: var(--vscode-list-hoverBackground);
    }
    
    #resultset tbody tr {
      border-bottom: 1px solid var(--vscode-activityBar-border);
    }

    ${options.withCollapsed ? /*css*/`
      .hoverable {
        /* your initial height  */
        height: 12px;
        /* stop content from "spilling" */
        overflow: hidden;

        text-overflow: ellipsis;
        max-width: 200px;
        text-wrap: nowrap;
      }
      .hoverable:hover {
        /* or height: auto then it will expand to text height */
        max-width: initial;
        height: auto;
        text-wrap: initial;
      }
      #resultset tbody tr {
        overflow: hidden;
      }
    ` : ''}

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

export const escapeHTML = str => str.replace(/[&<>'"]/g, 
  tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag]));