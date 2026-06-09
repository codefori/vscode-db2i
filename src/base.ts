import { CodeForIBMi } from "@halcyontech/vscode-ibmi-types";
import Instance from "@halcyontech/vscode-ibmi-types/Instance";
import { VscodeTools } from "@halcyontech/vscode-ibmi-types/ui/Tools";
import { ExtensionContext, extensions } from "vscode";

let baseExtension: CodeForIBMi;

export async function loadBase(context: ExtensionContext) {
  const code4iExtension = extensions.getExtension<CodeForIBMi>(`halcyontechltd.code-for-ibmi`);
  if (code4iExtension) {
    baseExtension = code4iExtension.isActive ? code4iExtension.exports : await code4iExtension.activate();
  }
  else {
    //This cannot happen since the dependency is in package.json
    throw new Error(`${context.extension.id} requires halcyontechltd.code-for-ibmi extension`);
  }
}

export function getBase(): CodeForIBMi {
  return baseExtension;
}

export function getInstance(): Instance {
  return baseExtension.instance;
}

/**
 * Get the VS Code tools from the base extension
 * @returns The VscodeTools if available, undefined otherwise
 */
export function getVSCodeTools(): typeof VscodeTools {
  return baseExtension.tools;
}