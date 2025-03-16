import * as vscode from "vscode";
import { SnippetString, ViewColumn, TreeView, window } from "vscode"

import * as csv from "csv/sync";


import { JobManager } from "../../config";
import Document from "../../language/sql/document";
import { ObjectRef, ParsedEmbeddedStatement, StatementGroup, StatementType } from "../../language/sql/types";
import Statement from "../../language/sql/statement";
import { ExplainNode, ExplainTree } from "./explain/nodes";
import { DoveResultsView, ExplainTreeItem } from "./explain/doveResultsView";
import { DoveNodeView, PropertyNode } from "./explain/doveNodeView";
import { DoveTreeDecorationProvider } from "./explain/doveTreeDecorationProvider";
import { ResultSetPanelProvider } from "./resultSetPanelProvider";
import { generateSqlForAdvisedIndexes } from "./explain/advice";
import { updateStatusBar } from "../jobManager/statusBar";
import { ExplainType } from "@ibm/mapepire-js/dist/src/types";
import { DbCache } from "../../language/providers/logic/cache";
import { CytoscapeGraph } from "../cytoscape";

export type StatementQualifier = "statement" | "update" | "explain" | "onlyexplain" | "json" | "csv" | "cl" | "sql";

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

export function setCancelButtonVisibility(visible: boolean) {
  vscode.commands.executeCommand(`setContext`, `vscode-db2i:statementCanCancel`, visible);
}

let resultSetProvider = new ResultSetPanelProvider();
let explainTree: ExplainTree;
let doveResultsView = new DoveResultsView();
let doveResultsTreeView: TreeView<ExplainTreeItem> = doveResultsView.getTreeView();
let doveNodeView = new DoveNodeView();
let doveNodeTreeView: TreeView<PropertyNode> = doveNodeView.getTreeView();
let doveTreeDecorationProvider = new DoveTreeDecorationProvider(); // Self-registers as a tree decoration providor

export function initialise(context: vscode.ExtensionContext) {
  setCancelButtonVisibility(false);

  context.subscriptions.push(
    doveResultsTreeView,
    doveNodeTreeView,

    vscode.window.registerWebviewViewProvider(`vscode-db2i.resultset`, resultSetProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),

    vscode.commands.registerCommand(`vscode-db2i.statement.cancel`, async (jobName?: string) => {
      const selected = typeof jobName === `string` ? JobManager.getJob(jobName) : JobManager.getSelection();
      if (selected) {
        updateStatusBar({canceling: true});
        const cancelled = await selected.job.requestCancel();
        if (cancelled) {
          resultSetProvider.setError(`Statement canceled.`);
          setCancelButtonVisibility(false);
          updateStatusBar();
        } else {
          updateStatusBar({jobIsBusy: true});
          setTimeout(() => updateStatusBar(), 2000);
        }
      }
    }),

    vscode.commands.registerCommand(`vscode-db2i.resultset.reset`, async () => {
      resultSetProvider.loadingState = false;
      resultSetProvider.setLoadingText(`View will be active when a statement is executed.`);
    }),

    vscode.commands.registerCommand(`vscode-db2i.resultset.settings`, async () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'vscode-db2i.resultsets');
    }),

    vscode.workspace.onDidChangeConfiguration(e => {
      // If the result set column headings setting has changed, update the header of the current result set
      if (e.affectsConfiguration('vscode-db2i.resultsets.columnHeadings')) {
        resultSetProvider.updateHeader();
      }
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.close`, () => {
      doveResultsView.close();
      doveNodeView.close();
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.displayDetails`, (explainTreeItem: ExplainTreeItem) => {
      // When the user clicks for details of a node in the tree, set the focus to that node as a visual indicator tying it to the details tree
      doveResultsTreeView.reveal(explainTreeItem, { select: false, focus: true, expand: true });
      doveNodeView.setNode(explainTreeItem.explainNode);
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.node.copy`, (propertyNode: PropertyNode) => {
      if (propertyNode.description && typeof propertyNode.description === `string`) {
        vscode.env.clipboard.writeText(propertyNode.description);
      }
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.advisedIndexesAndStatistics`, () => {
      // TODO would be nice to clear any current selections or focused tree items
      explainTree.showAdvisedIndexesAndStatistics(doveNodeView);
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.editSettings`, () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'vscode-db2i.visualExplain');
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.export`, () => {
      vscode.workspace.openTextDocument({
        language: `json`,
        content: JSON.stringify(doveResultsView.getRootExplainNode(), null, 2)
      }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.generateSqlForAdvisedIndexes`, () => {
      const scriptContent = generateSqlForAdvisedIndexes(explainTree);

      vscode.workspace.openTextDocument({
        language: `sql`,
        content: scriptContent
      }).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }),

    vscode.commands.registerCommand(`vscode-db2i.dove.closeDetails`, () => {
      doveNodeView.close();
    }),

    vscode.commands.registerCommand(`vscode-db2i.editorExplain.withRun`, (options?: StatementInfo) => { runHandler({ qualifier: `explain`, ...options }) }),
    vscode.commands.registerCommand(`vscode-db2i.editorExplain.withoutRun`, (options?: StatementInfo) => { runHandler({ qualifier: `onlyexplain`, ...options }) }),
    vscode.commands.registerCommand(`vscode-db2i.runEditorStatement.inView`, (options?: StatementInfo) => { runHandler({ viewColumn: ViewColumn.Beside, ...options }) }),
    vscode.commands.registerCommand(`vscode-db2i.runEditorStatement`, (options?: StatementInfo) => { runHandler(options) })
  )
}

async function runHandler(options?: StatementInfo) {
  if (options === undefined || options.viewColumn === undefined) {
    await resultSetProvider.ensureActivation();
  }

  // Options here can be a vscode.Uri when called from editor context.
  // But that isn't valid here.
  const optionsIsValid = (options?.content !== undefined);
  let editor = vscode.window.activeTextEditor;

  vscode.commands.executeCommand('vscode-db2i.dove.close');

  if (optionsIsValid || (editor && editor.document.languageId === `sql`)) {
    let chosenView = resultSetProvider;

    const useWindow = (title: string, column?: ViewColumn) => {
      const webview = window.createWebviewPanel(`sqlResultSet`, title, column || ViewColumn.Two, {retainContextWhenHidden: true, enableScripts: true, enableFindWidget: true});
      chosenView = new ResultSetPanelProvider();
      chosenView.resolveWebviewView(webview);
    }

    const statementDetail = parseStatement(editor, optionsIsValid ? options : undefined);

    if (options?.qualifier) {
      statementDetail.qualifier = options.qualifier
    }

    if (statementDetail.open) {
      const textDoc = await vscode.workspace.openTextDocument({ language: `sql`, content: statementDetail.content });
      editor = await vscode.window.showTextDocument(textDoc, statementDetail.viewColumn, statementDetail.viewFocus);
    }

    if (editor) {
      const group = statementDetail.group;
      editor.selection = new vscode.Selection(editor.document.positionAt(group.range.start), editor.document.positionAt(group.range.end));

      if (group.statements.length === 1 && statementDetail.embeddedInfo && statementDetail.embeddedInfo.changed) {
        editor.insertSnippet(new SnippetString(statementDetail.embeddedInfo.content));
        return;
      }
    }

    const statement = statementDetail.statement;
    const refs = statement.getObjectReferences();
    const ref = refs[0];

    let possibleTitle = `SQL Results`;
    if (ref && ref.object.name) {
      possibleTitle = (ref.object.schema ? ref.object.schema + `.` : ``) + ref.object.name;
    }

    if (statement.type === StatementType.Create || statement.type === StatementType.Alter) {
      const databaseObj =
        statement.type === StatementType.Create && ref.createType.toUpperCase() === `schema`
          ? ref.object.schema || ``
          : ref.object.schema + ref.object.name;

      if (databaseObj) {
        DbCache.resetObject(databaseObj);
      }
    }

    if (statementDetail.content.trim().length > 0) {
      try {
        const inWindow = Boolean(options && options.viewColumn);

        if (statementDetail.qualifier === `cl`) {
          if (inWindow) {
            useWindow(`CL results`, options.viewColumn);
          }
          chosenView.setScrolling(statementDetail.content, true); // Never errors
          
        } else if ([`statement`, `update`].includes(statementDetail.qualifier)) {
          // If it's a basic statement, we can let it scroll!
          if (inWindow) {
            useWindow(possibleTitle, options.viewColumn);
          }

          let updatableTable: ObjectRef | undefined;
          if (statementDetail.qualifier === `update` && statement.type === StatementType.Select && refs.length === 1) {
            updatableTable = refs[0];
          }

          chosenView.setScrolling(statementDetail.content, false, undefined, inWindow, updatableTable); // Never errors

        } else if ([`explain`, `onlyexplain`].includes(statementDetail.qualifier)) {
          // If it's an explain, we need to 
          const selectedJob = JobManager.getSelection();
          if (selectedJob) {
            const onlyExplain = statementDetail.qualifier === `onlyexplain`;

            chosenView.setLoadingText(onlyExplain ? `Explaining without running...` : `Explaining...`);
            const explainType: ExplainType = onlyExplain ? "doNotRun" : "run";

              setCancelButtonVisibility(true);
              const explained = await selectedJob.job.explain(statementDetail.content, explainType); // Can throw
              setCancelButtonVisibility(false);

            if (onlyExplain) {
              chosenView.setLoadingText(`Explained.`, false);
            } else {
              chosenView.setScrolling(statementDetail.content, false, explained.id); // Never errors
            }

            explainTree = new ExplainTree(explained.vedata);
            const topLevel = explainTree.get();
            
            const graph = new CytoscapeGraph();
            
            function addNode(node: ExplainNode, parent?: string) {
              const id = graph.addNode({
                label: node.title,
                parent: parent,
                data: node,
              });

              if (node.children) {
                for (const child of node.children) {
                  addNode(child, id);
                }
              }
            }

            addNode(topLevel);

            const webview = graph.createView(`Explain Graph`, (data: ExplainNode) => {
              if (data) {
                doveNodeView.setNode(data);
              }
            });

          } else {
            vscode.window.showInformationMessage(`No job currently selected.`);
          }
        } else {
          // Otherwise... it's a bit complicated.
          chosenView.setLoadingText(`Executing SQL statement...`, false);

          setCancelButtonVisibility(true);
          updateStatusBar({executing: true});
          const data = await JobManager.runSQL(statementDetail.content);
          setCancelButtonVisibility(false);

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

                    // split array into groups of 1k
                    const insertLimit = 1000;
                    const dataChunks = [];
                    for (let i = 0; i < data.length; i += insertLimit) {
                      dataChunks.push(data.slice(i, i + insertLimit));
                    }

                    content = `-- Generated ${dataChunks.length} insert statement${dataChunks.length === 1 ? `` : `s`}\n\n`;

                    for (const data of dataChunks) {
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
                      content += insertStatement.join(`\n`) + `;\n`;
                    }
                    break;
                }

                const textDoc = await vscode.workspace.openTextDocument({ language: statementDetail.qualifier, content });
                await vscode.window.showTextDocument(textDoc);
                chosenView.setLoadingText(`Query executed with ${data.length} rows returned.`, false);
                break;
            }

          } else {
            vscode.window.showInformationMessage(`Statement executed with no data returned.`);
            chosenView.setLoadingText(`Statement executed with no data returned.`);
          }
        }

        // If we the API is called with no open, then don't add it to history
        if (statementDetail.open === false) {
          statementDetail.history = false;
        }

        if ((statementDetail.qualifier === `statement` || statementDetail.qualifier === `explain`) && statementDetail.history !== false) {
          vscode.commands.executeCommand(`vscode-db2i.queryHistory.prepend`, statementDetail.content);
        }

      } catch (e) {
        setCancelButtonVisibility(false);

        let errorText;
        if (typeof e === `string`) {
          errorText = e.length > 0 ? e : `An error occurred when executing the statement.`;
        } else {
          errorText = e.message || `Error running SQL statement.`;
        }

        if ([`statement`, `explain`, `onlyexplain`].includes(statementDetail.qualifier) && statementDetail.history !== false) {
          chosenView.setError(errorText);
        } else {
          vscode.window.showErrorMessage(errorText);
        }
      }

      updateStatusBar();
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
      [`cl`, `json`, `csv`, `sql`, `explain`, `update`].forEach(mode => {
        if (statementInfo.content.trim().toLowerCase().startsWith(mode + `:`)) {
          statementInfo.content = statementInfo.content.substring(mode.length + 1).trim();

          //@ts-ignore We know the type.
          statementInfo.qualifier = mode;
        }
      });
    }

    if (statementInfo.qualifier === `cl`) {
      const eol = document.eol === vscode.EndOfLine.CRLF ? `\r\n` : `\n`;
      statementInfo.content = statementInfo.content.split(eol).map(line => line.trim()).join(` `);
    }
  }

  statementInfo.statement = statementInfo.group.statements[0];

  if (statementInfo.qualifier !== `cl`) {
    statementInfo.embeddedInfo = sqlDocument.removeEmbeddedAreas(statementInfo.statement, true);
  }

  return statementInfo;
}
