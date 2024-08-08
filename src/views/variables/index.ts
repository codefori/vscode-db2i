import { TreeDataProvider, TreeItem, ExtensionContext, commands, workspace, window, TreeItemCollapsibleState, EventEmitter, Event, MarkdownString, ThemeIcon } from "vscode";
import { getServiceInfo } from "../../database/serviceInfo";
import { notebookFromStatements } from "../../notebooks/logic/openAsNotebook";
import { SQLExample, Examples, ServiceInfoLabel } from "../examples";
import { SQLObject } from "../schemaBrowser";
import ColumnTreeItem from "../types/ColumnTreeItem";
import { JobManager } from "../../config";

interface Variable {
  label: string;
  statement: string;
}

export class Variables implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private variables: Variable[] = [];

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(`vscode-db2i.variables.add`, async () => {
        // TODO: support chosen parameter
        const userInput = await window.showInputBox({
          placeHolder: `schema.variableName`,
          title: `Enter an existing variable name`
        });

        if (userInput) {
          this.variables.push({
            label: userInput,
            statement: userInput
          });

          this.refresh();
        }
      }),
      commands.registerCommand(`vscode-db2i.variables.remove`, async (variable?: Variable) => {
        if (variable) {
          const index = this.variables.findIndex(v => v.label === variable.label);

          if (index !== -1) {
            this.variables.splice(index, 1);
            this.refresh();
          }
        }
      }),
      commands.registerCommand(`vscode-db2i.variables.refresh`, () => this.refresh())
    );
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: VariableTreeItem): Promise<VariableTreeItem[]> {
    if (this.variables.length === 0) return [];

    const sql = this.buildStatement();

    let variableResults: VariableTreeItem[];
    try {
      const results = await JobManager.runSQL(sql);

      if (results.length === 1) {
        const firstRow = results[0];
        const labels = Object.keys(firstRow);

        variableResults = labels.map((label, index) => {
          return new VariableTreeItem(label, {
            value: firstRow[label]
          });
        });
      } else {
        // TODO: welcome page 
      }
    } catch (e) {
      //TODO: better error handling
      variableResults = this.variables.map(variable => 
        new VariableTreeItem(variable.label, {
          error: e.message.includes(variable.label) ? e.message : undefined
        })
      );
    }

    return variableResults;
  }

  private buildStatement(): string {
    return `select ${this.variables.map(variable => `(${variable.statement}) as "${variable.label}"`).join(`, `)} from sysibm.sysdummy1`;
  }
}

class VariableTreeItem extends TreeItem {
  constructor(variable: string, detail: {error?: string, value?: string}) {
    super(variable, TreeItemCollapsibleState.None);
    this.contextValue = `sqlVarValue`;

    if (detail.value !== undefined && detail.value === ``) {
      detail.value = `-`;
    }

    if (detail.value) {
      this.description = detail.value;

      const hover = new MarkdownString();
      hover.appendCodeblock(detail.value);
      this.tooltip = hover;
      this.iconPath = new ThemeIcon(`symbol-variable`);
    }

    if (detail.error) {
      this.iconPath = new ThemeIcon(`error`);
      this.description = detail.error;
    }

    if (!detail.value && !detail.error) {
      this.iconPath = new ThemeIcon(`question`);
    }
  }
}