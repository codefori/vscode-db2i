import { completionProvider } from "./completionProvider";
import { formatProvider } from "./formatProvider";
import { hoverProvider, openProvider } from "./hoverProvider";
import { signatureProvider } from "./parameterProvider";
import { peekProvider } from "./peekProvider";
import { checkDocumentDefintion, problemProvider } from "./problemProvider";
import { Db2StatusProvider } from "./statusProvider";

export const sqlLanguageStatus = new Db2StatusProvider();

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider,
    hoverProvider,
    openProvider,
    // peekProvider,
    ...problemProvider,
    checkDocumentDefintion,
    sqlLanguageStatus
  );
  
  return functionality;
}
