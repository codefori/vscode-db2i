import { completionProvider } from "./completionProvider";
import { formatProvider } from "./formatProvider";
import { hoverProvider, openProvider } from "./hoverProvider";
import { signatureProvider } from "./parameterProvider";
import { problemProvider } from "./problemProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider,
    hoverProvider,
    openProvider,
    problemProvider
  );
  
  return functionality;
}
