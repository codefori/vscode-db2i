import { completionProvider } from "./providers/completionProvider";
import { formatProvider } from "./providers/formatProvider";
import { signatureProvider } from "./providers/parameterProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider
  );
  
  return functionality;
}
