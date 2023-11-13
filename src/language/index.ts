import { completionProvider } from "./providers/completionProvider";
import { formatProvider } from "./providers/formatProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider
  );
  
  return functionality;
}
