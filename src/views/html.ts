
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

    /* https://cssloaders.github.io */
    .loader {
      width: 48px;
      height: 48px;
      border: 5px solid #FFF;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }

    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    } 
  </style>`;