import { TextDocument } from "vscode";
import Document from "../../sql/document";

let cachedAst: Document | undefined;
let cachedVersion: number = -1;

export function getSqlDocument(document: TextDocument) {
  if (cachedAst && cachedVersion === document.version) {
    return cachedAst;
  }

  cachedAst = new Document(document.getText());
  cachedVersion = document.version;

  return cachedAst;
}