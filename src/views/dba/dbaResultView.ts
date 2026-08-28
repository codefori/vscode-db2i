import * as vscode from "vscode";
import Configuration from "../../configuration";
import { nullCellColor } from "../html";
import { DataTableHandlers, DataTableOptions, handleDataTableMessage, renderDataTable } from "../html/dataTable";

/**
 * The "Db2 for i - DBA" panel — a webview view in its own panel tab, separate
 * from the SQL results view. DBA-style listings (MTIs today; locks, advised
 * indexes, … later) render here through {@link DbaResultView.showTable}.
 */
export class DbaResultView implements vscode.WebviewViewProvider {
  static readonly viewId = `vscode-db2i.dbaResultView`;

  private view?: vscode.WebviewView;
  /** Routes webview messages for whatever table is currently shown */
  private handler?: (message: any) => void | Promise<void>;
  /** Set when showTable() is called before the view has been resolved */
  private pendingHtml?: string;
  /** The table currently on screen, kept so settings changes can re-render it */
  private current?: DataTableOptions<any>;

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.onDidDispose(() => { this.view = undefined; });
    view.webview.onDidReceiveMessage(message => this.handler?.(message));
    view.webview.html = this.pendingHtml ?? placeholder();
    this.pendingHtml = undefined;
  }

  /** Render a data table into the DBA panel, revealing the panel first. */
  async showTable<T>(options: DataTableOptions<T>, handlers: DataTableHandlers<T> = {}): Promise<void> {
    this.current = options;
    this.handler = message =>
      handleDataTableMessage(message, options, handlers, msg => this.view?.webview.postMessage(msg));

    const html = this.renderCurrent();

    await this.reveal();

    if (this.view) {
      this.view.webview.html = html;
      this.view.show?.(true);
    } else {
      // The view resolves asynchronously; resolveWebviewView will pick this up
      this.pendingHtml = html;
    }
  }

  private renderCurrent(): string {
    return renderDataTable({
      nullColor: nullCellColor(Configuration.get<string>(`resultsets.nullCellColor`)),
      ...this.current!,
    });
  }

  /** Re-render the current table (the NULL colour is baked into the page CSS) */
  refresh() {
    if (this.current && this.view) {
      this.view.webview.html = this.renderCurrent();
    }
  }

  /** Post a message to the current table (e.g. to refresh its rows) */
  post(message: any) {
    this.view?.webview.postMessage(message);
  }

  private async reveal() {
    if (this.view) {
      return;
    }
    // Revealing the view triggers resolveWebviewView, which lands a tick later
    await vscode.commands.executeCommand(`${DbaResultView.viewId}.focus`);
    for (let attempt = 0; attempt < 20 && !this.view; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

function placeholder(): string {
  return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 24px;
      font-family: sans-serif;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body><p>Db2 for i DBA tools show their results here.</p></body>
</html>`;
}

/** Module singleton — registered by {@link initialise}, used by feature code directly */
export const dbaResultView = new DbaResultView();

export function initialise(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(DbaResultView.viewId, dbaResultView, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(`vscode-db2i.resultsets.nullCellColor`)) {
        dbaResultView.refresh();
      }
    }),
  );
}
