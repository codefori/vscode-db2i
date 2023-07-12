
const DatatableJs = require(`frappe-datatable/dist/frappe-datatable.min.js`);
const DatatableCss = require(`frappe-datatable/dist/frappe-datatable.min.css`);

export const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>${DatatableJs}</script>
  <style>
    ${DatatableCss}
    /* END OF DATATABLE-CSS */

    #resultset {
      margin: 0.5em;
      height: 100%;
    }

    .datatable {
      height: 100% !important;
    }

    .dt-scrollable {
      height: 93% !important;
      overflow: auto !important;
      position: relative !important;
      padding-bottom: 10em !important;
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