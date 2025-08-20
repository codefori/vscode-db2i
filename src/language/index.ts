import { commands, Uri, window, workspace } from "vscode";
import { completionProvider } from "./providers/completionProvider";
import { formatProvider } from "./providers/formatProvider";
import { signatureProvider } from "./providers/parameterProvider";
import { problemProvider } from "./providers/problemProvider";
import { getSqlDocument } from "./providers/logic/parse";
import { StatementType } from "./sql/types";

export function languageInit() {
  let functionality = [];

  functionality.push(
    completionProvider,
    formatProvider,
    signatureProvider,
    problemProvider
  );

  functionality.push(...registerLanguageCommands());

  return functionality;
}

function registerLanguageCommands() {
  return [
    // Programmable API that is not callable through the UI.
    // Solely for the use for other extensions.
    commands.registerCommand(`vscode-db2i.language.getStatements`, async (uri?: Uri) => {
      const document = await workspace.openTextDocument(uri);

      if (document) {
        const doc = getSqlDocument(document);
        if (doc) {
          const groups = doc.getStatementGroups();
          return groups.map(g => ({
            range: g.range,
            type: g.statements[0] ? g.statements[0].type : StatementType.Unknown
          }));
        }
      }
    })
  ]
}