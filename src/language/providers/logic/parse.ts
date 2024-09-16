import { TextDocument } from "vscode";
import Document from "../../sql/document";

let cached: Map<string, {ast, version}> = new Map();

export function getSqlDocument(document: TextDocument) {
  const uri = document.uri.toString();

  if (cached.has(uri)) {
    const { ast, version } = cached.get(uri)!;

    if (version === document.version) {
      return ast;
    }
  }
  
  const newAsp = new Document(document.getText());
  cached.set(uri, { ast: newAsp, version: document.version });

  return newAsp;
}