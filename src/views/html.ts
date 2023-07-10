
const WebToolkit = require(`@vscode/webview-ui-toolkit/dist/toolkit.min.js`);

export const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script type="module">${WebToolkit}</script>
  <style>
    body {
      padding-top: 1em;
    }

    .center-screen {
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      min-height: 100vh;
    }

    .plaintext {
      background-color: var(--vscode-button-secondaryBackground);
      padding: 1em;
      color: var(--vscode-button-secondaryForeground);
    }

    .errortext {
      background-color: var(--vscode-button-secondaryBackground);
      padding: 1em;
      color: var(--vscode-errorForeground);
    }

    .loading {
      position: fixed; /* or absolute */
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  </style>`;