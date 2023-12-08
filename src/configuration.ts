
import vscode from "vscode";

const getConfiguration = (): vscode.WorkspaceConfiguration => {
  return vscode.workspace.getConfiguration(`vscode-db2i`);
}

export default class Configuration {
  /**
   * Returns variable not specific to a host (e.g. a global config)
   */
  static get<T>(prop: string) {
    return getConfiguration().get<T>(prop);
  }

  static set(prop: string, newValue: any) {
    return getConfiguration().update(prop, newValue, true);
  }
}
