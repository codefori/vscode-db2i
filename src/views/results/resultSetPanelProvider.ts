import { WebviewView, WebviewViewResolveContext, CancellationToken, commands } from "vscode";

import { Query, QueryState } from "../../connection/query";
import * as html from "./html";
import { updateStatusBar } from "../jobManager/statusBar";
import { JobManager } from "../../config";

export class ResultSetPanelProvider {
  _view: WebviewView;
  loadingState: boolean;
  constructor() {
    this._view = undefined;
    this.loadingState = false;
  }

  resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext, _token: CancellationToken) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
    };

    webviewView.webview.html = html.getLoadingHTML();
    this._view.webview.onDidReceiveMessage(async (message) => {
      if (message.query) {
        let data = [];

        let queryObject = Query.byId(message.queryId);
        try {
          if (queryObject === undefined) {
            // We will need to revisit this if we ever allow multiple result tabs like ACS does
            Query.cleanup();

            let query = await JobManager.getPagingStatement(message.query, { isClCommand: message.isCL, autoClose: true, isTerseResults: true });
            queryObject = query;
          }

          let queryResults = queryObject.getState() == QueryState.RUN_MORE_DATA_AVAILABLE ? await queryObject.fetchMore() : await queryObject.run();
          data = queryResults.data;
          this._view.webview.postMessage({
            command: `rows`,
            rows: queryResults.data,
            columnList: queryResults.metadata ? queryResults.metadata.columns.map(x => x.name) : undefined, // Query.fetchMore() doesn't return the metadata
            queryId: queryObject.getId(),
            update_count: queryResults.update_count,
            isDone: queryResults.is_done
          });

        } catch (e) {
          this.setError(e.message);
          this._view.webview.postMessage({
            command: `rows`,
            rows: [],
            queryId: ``,
            isDone: true
          });
        }

        updateStatusBar();
      }
    });
  }

  async ensureActivation() {
    let currentLoop = 0;
    while (!this._view && currentLoop < 15) {
      await this.focus();
      await delay(100);
      currentLoop += 1;
    }
  }

  async focus() {
    if (!this._view) {
      // Weird one. Kind of a hack. _view.show doesn't work yet because it's not initialized.
      // But, we can call a VS Code API to focus on the tab, which then
      // 1. calls resolveWebviewView
      // 2. sets this._view
      await commands.executeCommand(`vscode-db2i.resultset.focus`);
    } else {
      this._view.show(true);
    }
  }

  async setLoadingText(content: string) {
    await this.focus();

    if (!this.loadingState) {
      this._view.webview.html = html.getLoadingHTML();
      this.loadingState = true;
    }

    html.setLoadingText(this._view.webview, content);
  }

  async setScrolling(basicSelect, isCL = false, queryId: string = ``) {
    await this.focus();

    this._view.webview.html = html.generateScroller(basicSelect, isCL);

    this._view.webview.postMessage({
      command: `fetch`,
      queryId
    });
  }

  setError(error) {
    this.loadingState = false;
    // TODO: pretty error
    this._view.webview.html = `<p>${error}</p>`;
  }
}

function delay(t: number, v?: number) {
  return new Promise(resolve => setTimeout(resolve, t, v));
}
