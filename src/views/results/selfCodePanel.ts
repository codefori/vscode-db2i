import * as vscode from 'vscode';
import * as html from "./html";
import { delay } from "./index";

export class SelfCodePanelProvider {
  _view: vscode.WebviewView;
  loadingState: boolean;
  selfCodeCache: number = 0;
  constructor() {
    this._view = undefined;
    this.loadingState = false;
  }

  resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
    };
    webviewView.webview.html = html.getSelfCodeHelp();
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
      await vscode.commands.executeCommand(`vscode-db2i.resultset.focus`);
    } else {
      this._view.show(true);
    }
  }

  async setTableData(data: any[]) {
    await this.focus();

    const rows = Object.values(data).map(obj => Object.values(obj));
    const cols = Object.keys(data[0]);
  
    const rawhtml = html.generateDynamicTable();
  
    this._view.webview.html = rawhtml;
    this._view.webview.postMessage({
      command: 'setTableData',
      rows: rows,
      columnList: cols
    });
  }

  setError(error) {
    // TODO: pretty error
    this._view.webview.html = `<p>${error}</p>`;
  }
}

