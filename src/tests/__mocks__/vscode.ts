/**
 * The vscode module only exists inside the extension host, so unit tests get this stub instead.
 * It covers what the modules under test pull in when they are imported, not the API itself:
 * a test which needs the editor should be an integration test under src/testing.
 */

export const workspace = {
  getConfiguration: () => ({
    get: () => undefined,
    update: () => Promise.resolve(),
  }),
  onDidChangeConfiguration: () => ({ dispose: () => { } }),
};

export const window = {
  showErrorMessage: () => Promise.resolve(undefined),
  showInformationMessage: () => Promise.resolve(undefined),
};

export const commands = {
  registerCommand: () => ({ dispose: () => { } }),
  executeCommand: () => Promise.resolve(undefined),
};

export const extensions = {
  getExtension: () => undefined,
};

export class EventEmitter {
  event = () => ({ dispose: () => { } });
  fire() { }
  dispose() { }
}

export class ThemeIcon {
  constructor(public id: string) { }
}

export class TreeItem {
  constructor(public label: string, public collapsibleState?: number) { }
}

export const Uri = {
  parse: (value: string) => ({ toString: () => value }),
  file: (value: string) => ({ fsPath: value, toString: () => value }),
};

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}
