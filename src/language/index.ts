import { completionProvider } from "./providers/completionProvider";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider
  );
  
  return functionality;
}
