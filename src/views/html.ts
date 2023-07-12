const DatatableJs = require(`frappe-datatable/dist/frappe-datatable.min.js`);
const {default: DatatableCss} = require(`raw-loader!frappe-datatable/dist/frappe-datatable.min.css`);
const SortableJs = require(`sortablejs/Sortable.min.js`)

export const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>${SortableJs}</script>
  <script>${DatatableJs}</script>
  <style>
    ${DatatableCss}
    /* END OF DATATABLE-CSS */

    html, body {
      padding-right: 20px;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

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