import { CancellationToken, Definition, DefinitionProvider, DocumentSymbol, DocumentSymbolProvider, Location, Position, ProviderResult, Range, SymbolInformation, SymbolKind, TextDocument, Uri } from "vscode";

import { StatementType } from "../sql/types";
import Statement from "../sql/statement";
import Document from "../sql/document";

export let sqlSymbolProvider: DocumentSymbolProvider = {
  provideDocumentSymbols: async (document: TextDocument, token: CancellationToken): Promise<DocumentSymbol[]> => {
    let defintions: DocumentSymbol[] =[];

    const content = document.getText();

    const sqlDoc = new Document(content);
    const groups = sqlDoc.getStatementGroups();

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      if (group.statements.length > 0) {
        if (group.statements.length === 1) {
          defintions.push(...getSymbolsForStatements(document, group.statements));

        } else {
          const [baseDef] = getSymbolsForStatements(document, [group.statements[0]]);
          
          if (baseDef) {
            baseDef.children = getSymbolsForStatements(document, group.statements.slice(1))
          }

          defintions.push(baseDef);
        }
      }
    }

    return defintions;
  }
}

function getSymbolsForStatements(document: TextDocument, statements: Statement[]) {
  let defintions: DocumentSymbol[] = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    const statementRange = new Range(
      document.positionAt(statement.range.start),
      document.positionAt(statement.range.end),
    )

    switch (statement.type) {
      case StatementType.Create:
        defintions.push(new DocumentSymbol(statement.type, `Cool`, SymbolKind.File, statementRange, statementRange))
        break;

      case StatementType.Declare:
        defintions.push(new DocumentSymbol(statement.type, `Cool`, SymbolKind.Variable, statementRange, statementRange))
        break;
    }
  }

  return defintions;
}