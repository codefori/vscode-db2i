
export const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    #resultset {
      height: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
      font-family: sans-serif;
      min-width: 400px;
    }

    thead tr {
      background-color: var(--vscode-banner-background);
      color: var(--vscode-banner-foreground);
      text-align: left;
    }

    #resultset th,
    #resultset td {
      padding: 12px 15px;
    }
    
    #resultset tbody tr {
      border-bottom: 1px solid var(--vscode-activityBar-border);
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