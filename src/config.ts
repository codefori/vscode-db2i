import { ExtensionContext } from "vscode";
import { ConnectionStorage } from "./Storage";
import { getInstance } from "./base";

export let Config: ConnectionStorage;

export function setupConfig(context: ExtensionContext) {
  Config = new ConnectionStorage(context);

  getInstance().onEvent(`connected`, () => {
    Config.setConnectionName(getInstance().getConnection().currentConnectionName);
  });
}