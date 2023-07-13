
import vscode from "vscode";

export default class Configuration {
  /**
   * Returns variable not specific to a host (e.g. a global config)
   */
  static get(prop: string) {
    const globalData = vscode.workspace.getConfiguration(`vscode-db2i`);
    return globalData.get(prop);
  }

  static set(prop: string, newValue: any) {
    const globalData = vscode.workspace.getConfiguration(`vscode-db2i`);
    return globalData.update(prop, newValue, true);
  }
}
