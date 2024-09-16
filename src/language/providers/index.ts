import { completionProvider } from "./completionProvider";
import { formatProvider } from "./formatProvider";
import { signatureProvider } from "./parameterProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider
  );
  
  return functionality;
}
