import { CodeForIBMi } from "@halcyontech/vscode-ibmi-types";
import Instance from "@halcyontech/vscode-ibmi-types/Instance";
import { Extension, ExtensionContext, extensions } from "vscode";
import { CheckStatementComponent } from "./connection/components/checkStatement";
import { ValidateStatementComponent } from "./connection/components/validateStatement";

let baseExtension: Extension<CodeForIBMi>|undefined;

export function loadBase(context: ExtensionContext): CodeForIBMi|undefined {
  if (!baseExtension) {
    baseExtension = (extensions ? extensions.getExtension(`halcyontechltd.code-for-ibmi`) : undefined);

    if (baseExtension) {
      baseExtension.activate().then(() => {
        baseExtension.exports.componentRegistry.registerComponent(context, new CheckStatementComponent());
        baseExtension.exports.componentRegistry.registerComponent(context, new ValidateStatementComponent());
      });
    }
  }
  
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports : undefined);
}

export function getBase(): CodeForIBMi|undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports : undefined);
}

export function getInstance(): Instance|undefined {
  return (baseExtension && baseExtension.isActive && baseExtension.exports ? baseExtension.exports.instance : undefined);
}