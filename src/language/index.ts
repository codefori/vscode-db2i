import { completionProvider } from "./providers/completionProvider";
import { formatProvider } from "./providers/formatProvider";
import { signatureProvider } from "./providers/parameterProvider";
import { problemProvider } from "./providers/problemProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider,
    problemProvider
  );
  
  return functionality;
}
