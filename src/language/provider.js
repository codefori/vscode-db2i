const vscode = require(`vscode`);

const Store = require(`./store`);

/**
 * 
 * @param {vscode.ExtensionContext} context 
 */
exports.initialise = async (context) => {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider({language: `sql` }, {
      provideCompletionItems: async (document, position) => {
        ///** @type vscode.CompletionItem[] */
        const items = [];

        Store.data.routines.forEach(proc => {
          const item = new vscode.CompletionItem(proc.name, proc.type === `PROCEDURE` ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Function);
          item.insertText = new vscode.SnippetString(`${proc.name}(${proc.parameters.map((parm, index) => `\${${index+1}:${parm.name}}`).join(`:`)})\$0`)
          item.detail = `${proc.schema}.${proc.name} ${proc.type}`;
          item.documentation = new vscode.MarkdownString(`${proc.comment} (\`${proc.externalName}\`)`);
          items.push(item);
        });

        return items;
      }
    })
  )
}