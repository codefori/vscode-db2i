import type { ExtensionContext } from "vscode";

export class ContextProvider {
  private static ctx: ExtensionContext | undefined;

  public static setContext(context: ExtensionContext) {
    ContextProvider.ctx = context;
  }

  public static getContext(): ExtensionContext {
    if (!ContextProvider.ctx) {
      throw new Error("Context is not set yet");
    }
    return ContextProvider.ctx;
  }
}
