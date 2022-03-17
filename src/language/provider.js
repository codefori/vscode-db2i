const vscode = require(`vscode`);

const { Parser } = require(`node-sql-parser`);

const Store = require(`./store`);

/** @type {{[path: string]: object}} */
const workingAst = {}

/**
 * 
 * @param {vscode.ExtensionContext} context 
 */
exports.initialise = async (context) => {
  
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (editor) => {
      const document = editor.document;
      const text = document.getText();

      if (text.endsWith(`.`)) return;

      if (document.languageId === `sql`) {
        const parser = new Parser();
        try {
          const sqlAst = parser.astify(document.getText(), {
            database: `DB2`,
          });

          if (sqlAst) workingAst[document.uri.path] = sqlAst;
        } catch (e) {
          console.log(e);
        }
      }
    }),

    vscode.languages.registerCompletionItemProvider({language: `sql` }, {
      // @ts-ignore
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

        const ast = workingAst[document.uri.path];
        if (ast) {
          if (ast.from && ast.from.length > 0) {
            ast.from.forEach(definedAs => {
              const item = new vscode.CompletionItem(definedAs.as || definedAs.table, vscode.CompletionItemKind.Struct);
              item.detail = `${definedAs.db}.${definedAs.table}`;
              items.push(item);
            });
          }
        };

        return items;
      }
    })
  ),

  vscode.languages.registerCompletionItemProvider({language: `sql` }, {
    // @ts-ignore
    provideCompletionItems: async (document, position) => {
      ///** @type vscode.CompletionItem[] */
      const items = [];

      const ast = workingAst[document.uri.path];
      if (ast) {
        if (ast.from && ast.from.length > 0) {
          const currentPosition = new vscode.Position(position.line, position.character - 1);
          const range = document.getWordRangeAtPosition(currentPosition);

          if (range) {
            const prefix = document.getText(range);

            console.log(prefix);

            const definedAs = 
              ast.from.find(f => f.as === prefix) ||
              ast.from.find(f => f.table === prefix);

            if (definedAs) {
              const columns = await Store.getTable(definedAs.db, definedAs.table);

              columns.forEach(column => {
                const item = new vscode.CompletionItem(column.COLUMN_NAME.toLowerCase(), vscode.CompletionItemKind.Field);
                item.insertText = new vscode.SnippetString(column.COLUMN_NAME.toLowerCase());
                item.detail = column.DATA_TYPE;
                item.documentation = new vscode.MarkdownString(`${column.COLUMN_TEXT} (\`${definedAs.db}.${definedAs.table}\`)`);
                items.push(item);
              });
            }
          }
        }
      }
      
      return items;
    }
  }, `.`)
}