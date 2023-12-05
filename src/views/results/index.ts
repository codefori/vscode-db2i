import vscode, { SnippetString, ViewColumn } from "vscode"

import * as csv from "csv/sync";


import { JobManager } from "../../config";
import Document from "../../language/sql/document";
import { changedCache } from "../../language/providers/completionItemCache";
import { ParsedEmbeddedStatement, StatementGroup, StatementType } from "../../language/sql/types";
import Statement from "../../language/sql/statement";
import { ExplainTree } from "./explain/nodes";
import { DoveResultsView, ExplainTreeItem } from "./explain/doveResultsView";
import { DoveNodeView } from "./explain/doveNodeView";
import { DoveTreeDecorationProvider } from "./explain/doveTreeDecorationProvider";
import { ResultSetPanelProvider } from "./resultSetPanelProvider";

export type StatementQualifier = "statement" | "explain" | "json" | "csv" | "cl" | "sql";

export interface StatementInfo {
  content: string,
  qualifier: StatementQualifier,
  open?: boolean,
  viewColumn?: ViewColumn,
  viewFocus?: boolean,
  history?: boolean
}

export interface ParsedStatementInfo extends StatementInfo {
  statement: Statement;
  group: StatementGroup;
  embeddedInfo: ParsedEmbeddedStatement;
}

let resultSetProvider = new ResultSetPanelProvider();
let doveResultsView = new DoveResultsView();
let doveNodeView = new DoveNodeView();
let doveTreeDecorationProvider = new DoveTreeDecorationProvider(); // Self-registers as a tree decoration providor

export function initialise(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(`vscode-db2i.resultset`, resultSetProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.commands.registerCommand(`vscode-db2i.resultset.reset`, async () => {
      resultSetProvider.loadingState = false;
      resultSetProvider.setLoadingText(`View will be active when a statement is executed.`);
    }),
    
    vscode.window.registerTreeDataProvider(`vscode-db2i.dove.nodes`, doveResultsView),
    vscode.window.registerTreeDataProvider(`vscode-db2i.dove.node`, doveNodeView),

    vscode.commands.registerCommand(`vscode-db2i.dove.close`, () => {
      doveResultsView.close();
      doveNodeView.close();
    }),
    vscode.commands.registerCommand(`vscode-db2i.dove.nodeDetail`, (explainTreeItem: ExplainTreeItem) => {
      doveNodeView.setNode(explainTreeItem.explainNode);
    }),
    vscode.commands.registerCommand(`vscode-db2i.dove.export`, () => {
      vscode.workspace.openTextDocument({
        language: `json`,
        content: JSON.stringify(doveResultsView.getRootExplainNode(), null, 2)
      }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }),

    vscode.commands.registerCommand(`vscode-db2i.explainEditorStatement`, (options?: StatementInfo) => { runHandler({ qualifier: `explain`, ...options }) }),
    vscode.commands.registerCommand(`vscode-db2i.runEditorStatement`, (options?: StatementInfo) => { runHandler(options) })
  )
}

async function runHandler(options?: StatementInfo) {
  // Options here can be a vscode.Uri when called from editor context.
  // But that isn't valid here.
  const optionsIsValid = (options && options.content !== undefined);
  let editor = vscode.window.activeTextEditor;

  doveResultsView.close();
  doveNodeView.close();

  if (optionsIsValid || (editor && editor.document.languageId === `sql`)) {
    await resultSetProvider.ensureActivation();

    const statementDetail = parseStatement(editor, optionsIsValid ? options : undefined);

    if (options && options.qualifier) {
      statementDetail.qualifier = options.qualifier
    }

    if (statementDetail.open) {
      const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content: statementDetail.content });
      editor = await vscode.window.showTextDocument(textDoc, statementDetail.viewColumn, statementDetail.viewFocus);
    }

    if (editor) {
      const group = statementDetail.group;
      editor.selection = new vscode.Selection(editor.document.positionAt(group.range.start), editor.document.positionAt(group.range.end));

      if (group.statements.length === 1 && statementDetail.embeddedInfo.changed) {
        editor.insertSnippet(
          new SnippetString(statementDetail.embeddedInfo.content)
        )
        return;
      }
    }

    const statement = statementDetail.statement;

    if (statement.type === StatementType.Create || statement.type === StatementType.Alter) {
      const refs = statement.getObjectReferences();
      const ref = refs[0];
      const databaseObj =
        statement.type === StatementType.Create && ref.createType.toUpperCase() === `schema`
          ? ref.object.schema || ``
          : ref.object.schema + ref.object.name;
      changedCache.add((databaseObj || ``).toUpperCase());
    }

    if (statementDetail.content.trim().length > 0) {
      try {
        if (statementDetail.qualifier === `cl`) {
          resultSetProvider.setScrolling(statementDetail.content, true);
        } else {
          if (statementDetail.qualifier === `statement`) {
            // If it's a basic statement, we can let it scroll!
            resultSetProvider.setScrolling(statementDetail.content);

          } else {
            if (statementDetail.qualifier === `explain`) {
              const selectedJob = JobManager.getSelection();
              if (selectedJob) {
                try {
                  resultSetProvider.setLoadingText(`Explaining...`);

                  const explained = await selectedJob.job.explain(statementDetail.content);
                  const tree = new ExplainTree(explained.vedata);
                  const topLevel = tree.get();

                  doveTreeDecorationProvider.updateTreeItems(doveResultsView.setRootNode(topLevel));

                  // TODO: handle when explain without running
                  resultSetProvider.setScrolling(statementDetail.content, false, explained.id);

                } catch (e) {
                  resultSetProvider.setError(e.message);
                }
              } else {
                vscode.window.showInformationMessage(`No job currently selected.`);
              }

            } else {
              // Otherwise... it's a bit complicated.
              const data = await JobManager.runSQL(statementDetail.content, undefined);

              if (data.length > 0) {
                switch (statementDetail.qualifier) {

                  case `csv`:
                  case `json`:
                  case `sql`:
                    let content = ``;
                    switch (statementDetail.qualifier) {
                      case `csv`: content = csv.stringify(data, {
                        header: true,
                        quoted_string: true,
                      }); break;
                      case `json`: content = JSON.stringify(data, null, 2); break;

                      case `sql`:
                        const keys = Object.keys(data[0]);

                        const insertStatement = [
                          `insert into TABLE (`,
                          `  ${keys.join(`, `)}`,
                          `) values `,
                          data.map(
                            row => `  (${keys.map(key => {
                              if (row[key] === null) return `null`;
                              if (typeof row[key] === `string`) return `'${String(row[key]).replace(/'/g, `''`)}'`;
                              return row[key];
                            }).join(`, `)})`
                          ).join(`,\n`),
                        ];
                        content = insertStatement.join(`\n`);
                        break;
                    }

                    const textDoc = await vscode.workspace.openTextDocument({ language: statementDetail.qualifier, content });
                    await vscode.window.showTextDocument(textDoc);
                    break;
                }

              } else {
                vscode.window.showInformationMessage(`Query executed with no data returned.`);
              }
            }
          }
        }

        if (statementDetail.qualifier === `statement` && statementDetail.history !== false) {
          vscode.commands.executeCommand(`vscode-db2i.queryHistory.prepend`, statementDetail.content);
        }

      } catch (e) {
        let errorText;
        if (typeof e === `string`) {
          errorText = e.length > 0 ? e : `An error occurred when executing the statement.`;
        } else {
          errorText = e.message || `Error running SQL statement.`;
        }

        if (statementDetail.qualifier === `statement` && statementDetail.history !== false) {
          resultSetProvider.setError(errorText);
        } else {
          vscode.window.showErrorMessage(errorText);
        }
      }
    }
  }
}

export function parseStatement(editor?: vscode.TextEditor, existingInfo?: StatementInfo): ParsedStatementInfo {
  let statementInfo: ParsedStatementInfo = {
    content: ``,
    qualifier: `statement`,
    group: undefined,
    statement: undefined,
    embeddedInfo: undefined
  };

  let sqlDocument: Document;

  if (existingInfo) {
    statementInfo = {
      ...existingInfo,
      group: undefined,
      statement: undefined,
      embeddedInfo: undefined
    };

    // Running from existing data
    sqlDocument = new Document(statementInfo.content);
    statementInfo.group = sqlDocument.getStatementGroups()[0];

  } else if (editor) {
    // Is being run from the editor

    const document = editor.document;
    const cursor = editor.document.offsetAt(editor.selection.active);

    sqlDocument = new Document(document.getText());
    statementInfo.group = sqlDocument.getGroupByOffset(cursor);

    if (statementInfo.group) {
      statementInfo.content = sqlDocument.content.substring(
        statementInfo.group.range.start, statementInfo.group.range.end
      );
    }

    if (statementInfo.content) {
      [`cl`, `json`, `csv`, `sql`, `explain`].forEach(mode => {
        if (statementInfo.content.trim().toLowerCase().startsWith(mode + `:`)) {
          statementInfo.content = statementInfo.content.substring(mode.length + 1).trim();

          //@ts-ignore We know the type.
          statementInfo.qualifier = mode;
        }
      });
    }
  }

  statementInfo.statement = statementInfo.group.statements[0];

  if (statementInfo.qualifier !== `cl`) {
    statementInfo.embeddedInfo = sqlDocument.removeEmbeddedAreas(statementInfo.statement, true);
  }

  return statementInfo;
}