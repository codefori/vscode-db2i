import { CancellationToken, DefinitionProvider, DocumentSymbol, DocumentSymbolProvider, Location, Position, ProviderResult, Range, SymbolInformation, SymbolKind, TextDocument, Uri } from "vscode";

import { StatementType, Definition } from "../sql/types";
import Document from "../sql/document";

export let sqlSymbolProvider: DocumentSymbolProvider = {
  provideDocumentSymbols: async (document: TextDocument, token: CancellationToken): Promise<DocumentSymbol[]> => {
    let defintions: DocumentSymbol[] =[];

    const content = document.getText();

    const sqlDoc = new Document(content);
    const defs = sqlDoc.getDefinitions();

    for (const def of defs) {
      const symbol = defToSymbol(document, def);

      symbol.children = def.children.map(cd => defToSymbol(document, cd));

      defintions.push(symbol);
    }

    return defintions;
  }
}

function defToSymbol(doc: TextDocument, def: Definition) {
  const range = new Range(
    doc.positionAt(def.range.start),
    doc.positionAt(def.range.end)
  );

  return new DocumentSymbol(
    def.object.name, 
    def.type, 
    SymbolKind.File,
    range,
    range
  );
}