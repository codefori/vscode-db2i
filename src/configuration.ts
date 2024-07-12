
import * as vscode from "vscode";

const getConfiguration = (): vscode.WorkspaceConfiguration => {
  return vscode.workspace.getConfiguration(`vscode-db2i`);
}

export default class Configuration {
  private static extensionContext: vscode.ExtensionContext;

  static setContext(context: vscode.ExtensionContext) {
    Configuration.extensionContext = context;
  }

  static getSecret(prop: string) {
    return Configuration.extensionContext.secrets.get(prop);
  }

  static setSecret(prop: string, newValue: any) {
    return Configuration.extensionContext.secrets.store(prop, newValue);
  }

  static deleteSecret(prop: string) {
    return Configuration.extensionContext.secrets.delete(prop);
  }

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
