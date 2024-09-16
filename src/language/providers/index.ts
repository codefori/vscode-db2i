import { completionProvider } from "./completionProvider";
import { formatProvider } from "./formatProvider";
import { hoverProvider } from "./hoverProvider";
import { signatureProvider } from "./parameterProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider,
    hoverProvider
  );
  
  return functionality;
}
