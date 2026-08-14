/**
 * Minimal host page for webviews built on the base extension's FastTable API
 * (`getBase().frontendTables`, see ../base.ts).
 *
 * `generateFastTable`/`generateFastTableUpdate` return markup that assumes two things are
 * already set up on the page: the `@vscode-elements/elements` custom elements (for
 * `<vscode-table>`, `<vscode-button>`, ...) and a global `vscode` object with a delegated click
 * listener that turns a click on `[href^="action:"]` into a `postMessage`. Core's own views get
 * this from `Core/src/webviewToolkit.ts`; this is the same contract, ported locally so the Db2
 * extension can use the same FastTable views without depending on Core's internals.
 */

const webComponents = require(`@vscode-elements/elements/dist/bundled.js`);

const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script defer type="module">${webComponents}</script>`;

const footer = /*html*/`
  <script defer>
    const vscode = acquireVsCodeApi();

    // Handle click events on action links (e.g. the buttons a FastTable column renders).
    // Delegated on the document: tables replace their rows in place on refresh, so buttons
    // bound one-by-one at load time would stop responding once a search or an action
    // re-rendered the body.
    document.addEventListener('click', (event) => {
      const path = event.composedPath ? event.composedPath() : [event.target];
      let link = null;

      for (const node of path) {
        if (node instanceof Element && node.getAttribute('href')?.startsWith('action:')) {
          link = node;
          break;
        }
      }

      if (!link) {
        return;
      }

      const data = {};
      link.getAttributeNames().forEach(attr => {
        data[attr] = link.getAttribute(attr);
      });

      vscode.postMessage(data);
    });
  </script>
`;

/**
 * Wrap FastTable body markup (from `generateFastTable`) into a complete webview page.
 * @param body - HTML body content, typically the return value of `generateFastTable`
 * @returns Complete HTML page string
 */
export function generatePage(body: string): string {
  return /*html*/`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      ${head}
    </head>
    <body>
      ${body}
    </body>
    ${footer}
  </html>
`;
}
