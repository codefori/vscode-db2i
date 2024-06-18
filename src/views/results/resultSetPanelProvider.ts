import { CancellationToken, WebviewPanel, WebviewView, WebviewViewProvider, WebviewViewResolveContext, commands } from "vscode";

import { setCancelButtonVisibility } from ".";
import { JobManager } from "../../config";
import { Query, QueryState } from "../../connection/query";
import { updateStatusBar } from "../jobManager/statusBar";
import Configuration from "../../configuration";
import * as html from "./html";

export class ResultSetPanelProvider implements WebviewViewProvider {
  _view: WebviewView | WebviewPanel;
  loadingState: boolean;
  currentQuery: Query<any>;
  constructor() {
    this._view = undefined;
    this.loadingState = false;
  }

  resolveWebviewView(webviewView: WebviewView | WebviewPanel, context?: WebviewViewResolveContext, _token?: CancellationToken) {
    this._view = webviewView;

    this._view.onDidDispose(() => {
      this._view = undefined;
      this.currentQuery.close().then(() => {
        this.currentQuery = undefined;
      });
    });

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
    };

    webviewView.webview.html = html.getLoadingHTML();
    this._view.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case `cancel`:
          commands.executeCommand(`vscode-db2i.statement.cancel`);
          if (this.currentQuery) {
            await this.currentQuery.close();
          }
          break;

        default:
          if (message.query) {

            if (this.currentQuery) {
              // If we get a request for a new query, then we need to close the old one
              if (this.currentQuery.getId() !== message.queryId) {
                // This is a new query, so we need to clean up the old one
                await this.currentQuery.close();
                this.currentQuery = undefined;
              }
            }

            try {
              setCancelButtonVisibility(true);
              if (this.currentQuery === undefined) {
                // We will need to revisit this if we ever allow multiple result tabs like ACS does
                // Query.cleanup();

                let query = await JobManager.getPagingStatement(message.query, { isClCommand: message.isCL, autoClose: true, isTerseResults: true });
                this.currentQuery = query;
              }

              let queryResults = this.currentQuery.getState() == QueryState.RUN_MORE_DATA_AVAILABLE ? await this.currentQuery.fetchMore() : await this.currentQuery.run();

              const jobId = this.currentQuery.getHostJob().id;

              this._view.webview.postMessage({
                command: `rows`,
                jobId,
                rows: queryResults.data,
                columnMetaData: queryResults.metadata ? queryResults.metadata.columns : undefined, // Query.fetchMore() doesn't return the metadata
                columnHeadings: Configuration.get(`resultsets.columnHeadings`) || 'Name',
                queryId: this.currentQuery.getId(),
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

            setCancelButtonVisibility(false);
            updateStatusBar();
          }
          break;
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

    if (this._view && 'show' in this._view) {
      this._view.show(true);
    }

  }

  async focus() {
    if (!this._view) {
      // Weird one. Kind of a hack. _view.show doesn't work yet because it's not initialized.
      // But, we can call a VS Code API to focus on the tab, which then
      // 1. calls resolveWebviewView
      // 2. sets this._view
      await commands.executeCommand(`vscode-db2i.resultset.focus`);
    }
  }

  async setLoadingText(content: string, focus = true) {
    if (focus) {
      await this.focus();
    }

    if (!this.loadingState) {
      this._view.webview.html = html.getLoadingHTML();
      this.loadingState = true;
    }

    html.setLoadingText(this._view.webview, content);
  }

  /** Update the result table column headings based on the configuration setting */
  async updateHeader() {
    if (this._view) {
      this._view.webview.postMessage({
        command: `header`,
        columnHeadings: Configuration.get(`resultsets.columnHeadings`) || 'Name',
      });
    }
  }

  async setScrolling(basicSelect, isCL = false, queryId: string = ``, withCancel = false) {
    this.loadingState = false;
    await this.focus();

    this._view.webview.html = html.generateScroller(basicSelect, isCL, withCancel);

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
