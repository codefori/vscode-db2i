const vscode = require(`vscode`);

const { Parser } = require(`node-sql-parser`);

const Store = require(`./store`);
const Configuration = require(`../configuration`);

/** @type {{[path: string]: object}} */
const workingAst = {}

/**
 * 
 * @param {vscode.ExtensionContext} context 
 */
exports.initialise = async (context) => {

  let editTimeout;
  const linterDiagnostics = vscode.languages.createDiagnosticCollection(`SQL Diagnostics`);
  
  context.subscriptions.push(
    linterDiagnostics,

    vscode.workspace.onDidChangeTextDocument(async (editor) => {
      const document = editor.document;

      if (document.languageId === `sql`) {
        clearTimeout(editTimeout);
        
        const text = document.getText();
        if (text.endsWith(`.`)) return;

        const parser = new Parser();
        try {
          const sqlAst = parser.astify(document.getText(), {
            database: `DB2`,
          });

          if (sqlAst) {
            workingAst[document.uri.path] = sqlAst;
          }
            
          linterDiagnostics.set(document.uri, []);
        } catch (e) {
          const location = e.location;

          if (Configuration.get(`validator`)) {
            editTimeout = setTimeout(async () => {
              linterDiagnostics.set(document.uri, [{
                message: e.message,
                range: new vscode.Range(location.start.line-1, location.end.column-1, location.end.line-1, location.end.column-1),
                severity: vscode.DiagnosticSeverity.Error,
              }]);
            }, 600);
          }
        }
      }
    }),

    vscode.languages.registerCompletionItemProvider({language: `sql` }, {
      provideCompletionItems: async (document, position) => {
        ///** @type vscode.CompletionItem[] */
        const items = [];

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
    }, ` `)
  ),

  vscode.languages.registerCompletionItemProvider({language: `sql` }, {
    provideCompletionItems: async (document, position) => {
      ///** @type vscode.CompletionItem[] */
      const items = [];

      if (!Store.hasConnection()) return [];

      const currentPosition = new vscode.Position(position.line, position.character - 1);
      const range = document.getWordRangeAtPosition(currentPosition);

      const prefix = range ? document.getText(range) : null;

      let fallbackLookup = false;

      const baseAst = workingAst[document.uri.path];

      let astList = [];
      if (Array.isArray(baseAst)) astList = baseAst;
      else if (baseAst) astList = [baseAst];

      if (prefix) {
        for (const ast of astList) {
          fallbackLookup = false;

          if (ast) {
            if (ast.from && ast.from.length > 0) {
              const definedAs = 
              ast.from.find(f => f.as === prefix) ||
              ast.from.find(f => f.table === prefix);

              if (definedAs) {

                if (definedAs.db) {
                  const columns = await Store.getColumns(definedAs.db, definedAs.table);

                  columns.forEach(column => {
                    const item = new vscode.CompletionItem(column.COLUMN_NAME.toLowerCase(), vscode.CompletionItemKind.Field);
                    item.insertText = new vscode.SnippetString(column.COLUMN_NAME.toLowerCase());
                    
                    let detail = null, length;
                    if ([`DECIMAL`, `ZONED`].includes(column.DATA_TYPE)) {
                      length = column.NUMERIC_PRECISION || null;
                      detail = `${column.DATA_TYPE}${length ? `(${length}${column.NUMERIC_PRECISION ? `, ${column.NUMERIC_SCALE}` : ``})` : ``}`
                    } else {
                      length = column.CHARACTER_MAXIMUM_LENGTH || null;
                      detail = `${column.DATA_TYPE}${length ? `(${length})` : ``}`
                    }

                    item.detail = detail;
                    item.documentation = new vscode.MarkdownString(`${column.COLUMN_TEXT} (\`${definedAs.db}.${definedAs.table}\`)`);
                    items.push(item);
                  });
                } else {
                  const objects = await Store.getObjects(prefix);

                  objects.forEach(object => {
                    let type;

                    switch (object.TABLE_TYPE) {
                    case `T`: type = `Table`; break;
                    case `V`: type = `View`; break;
                    case `P`: type = `Table`; break;
                    }

                    const item = new vscode.CompletionItem(object.TABLE_NAME.toLowerCase(), vscode.CompletionItemKind.Struct);
                    item.insertText = new vscode.SnippetString(object.TABLE_NAME.toLowerCase());
                    item.detail = type;
                    item.documentation = object.TABLE_TEXT;
                    items.push(item);
                  });

                  const routines = await Store.routinesAvailable(prefix);
          
                  if (routines) {
                    routines
                      .filter(proc => proc.type === `FUNCTION`)
                      .forEach(proc => {
                        const item = new vscode.CompletionItem(proc.name.toLowerCase(), proc.type === `PROCEDURE` ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Function);
                        item.insertText = new vscode.SnippetString(`${proc.name.toLowerCase()}(${proc.parameters.map((parm, index) => `\${${index+1}:${parm.name}}`).join(`, `)})\$0`)
                        item.detail = `${proc.schema}.${proc.name} ${proc.type}`;
                        item.documentation = new vscode.MarkdownString(`${proc.comment} (\`${proc.externalName}\`)`);
                        items.push(item);
                      });
                  }
                }
              }
            }

            if (ast.type && ast.type === `call`) {
              fallbackLookup = true;
            }
          }

          if (fallbackLookup) {
            const routines = await Store.getRoutines(prefix);
          
            routines.forEach(proc => {
              const item = new vscode.CompletionItem(proc.name.toLowerCase(), proc.type === `PROCEDURE` ? vscode.CompletionItemKind.Method : vscode.CompletionItemKind.Function);
              item.insertText = new vscode.SnippetString(`${proc.name.toLowerCase()}(${proc.parameters.map((parm, index) => `\${${index+1}:${parm.name}}`).join(`:`)})\$0`)
              item.detail = `${proc.schema}.${proc.name} ${proc.type}`;
              item.documentation = new vscode.MarkdownString(`${proc.comment} (\`${proc.externalName}\`)`);
              items.push(item);
            });
          }
        };
      }
      
      return items;
    }
  }, `.`)
}