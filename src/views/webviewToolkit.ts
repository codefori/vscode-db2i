/**
 * Minimal host page for webviews built on the base extension's FastTable API
 * (`getBase().frontendTables`, see ../base.ts). Ports the same page contract as
 * `Core/src/webviewToolkit.ts`, so Db2 can use FastTable views without depending on Core's internals.
 */

const webComponents = require(`@vscode-elements/elements/dist/bundled.js`);

const head = /*html*/`
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script defer type="module">${webComponents}</script>`;

const footer = /*html*/`
  <script defer>
    const vscode = acquireVsCodeApi();

    // Delegated on the document, since tables replace their rows in place on refresh
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
