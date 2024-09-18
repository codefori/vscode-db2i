import { TextDocument } from "vscode";
import Document from "../../sql/document";

let cached: Map<string, {ast, version}> = new Map();

export function getSqlDocument(document: TextDocument): Document {
  const uri = document.uri.toString();
  const likelyNew = document.uri.scheme === `untitled` && document.version === 1;

  if (cached.has(uri) && !likelyNew) {
    const { ast, version } = cached.get(uri)!;

    if (version === document.version) {
      return ast;
    }
  }
  
  const newAsp = new Document(document.getText());
  cached.set(uri, { ast: newAsp, version: document.version });

  return newAsp;
}