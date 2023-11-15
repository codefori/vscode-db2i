import * as vscode from 'vscode';

class SelfCodesPanelProvider {
  _view: vscode.WebviewView;
  loadingState: boolean;
  constructor() {
    this._view = undefined;
    this.loadingState = false;
  }

  
}
