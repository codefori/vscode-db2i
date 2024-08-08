import { TreeDataProvider, TreeItem, ExtensionContext, commands, workspace, window, TreeItemCollapsibleState, EventEmitter, Event, MarkdownString, ThemeIcon } from "vscode";
import { getServiceInfo } from "../../database/serviceInfo";
import { notebookFromStatements } from "../../notebooks/logic/openAsNotebook";
import { SQLExample, Examples, ServiceInfoLabel } from "../examples";
import { SQLObject } from "../schemaBrowser";
import ColumnTreeItem from "../types/ColumnTreeItem";
import { JobManager } from "../../config";
import Statement from "../../database/statement";

type VariableType = "sql"|"dataarea";

interface Variable {
  type: VariableType,
  label: string;
  statement: string;
}

export class Variables implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private variables: Variable[] = [];

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(`vscode-db2i.variables.add`, async (object?: SQLObject) => {
        let fetchStatement;
        
        if (object && object.type === `variable`) {
          fetchStatement = Statement.delimName(object.schema) + `.` + Statement.delimName(object.name);
        }

        if (!fetchStatement) {
          // TODO: support chosen parameter
          fetchStatement = await window.showInputBox({
            placeHolder: `schema.variableName`,
            title: `Enter an existing variable name`
          });
        }

        if (fetchStatement) {
          let type: VariableType = `sql`;

          if (fetchStatement.length < 21 && fetchStatement.includes(`/`)) {
            type = `dataarea`;
          }

          this.variables.push({
            type,
            label: fetchStatement,
            statement: fetchStatement
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

  async getChildren(element?: VariableTreeItem): Promise<TreeItem[]> {
    if (this.variables.length === 0) return [];

    const sql = this.buildStatement();

    let variableResults: TreeItem[];
    try {
      const results = await JobManager.runSQL(sql);

      if (results.length === 1) {
        const firstRow = results[0];
        const labels = Object.keys(firstRow);

        variableResults = labels.map((label, index) => {
          return new VariableTreeItem(label, {
            value: String(firstRow[label])
          });
        });
      } else {
        // TODO: welcome page 
      }
    } catch (e) {
      variableResults = [new VariableTreeItemError(e.message)];
      variableResults.push(...this.variables.map(variable => 
        new VariableTreeItem(variable.label, {
          error: true
        })
      ));
    }

    return variableResults;
  }

  private buildStatement(): string {
    return `select ${this.variables.map(variable => {
      switch (variable.type) {
        case `sql`:
          return `${variable.statement} as "${variable.label}"`;
        case `dataarea`:
          const parts = variable.statement.split(`/`);
          if (parts.length !== 2) {
            return `'invalid name' as "${variable.label}"`;
          }
          return `(select DATA_AREA_VALUE from table(qsys2.data_area_info(data_area_library => '${parts[0].toUpperCase()}', data_area_name => '${parts[1].toUpperCase()}'))) as "${variable.label}"`
      }
    }).join(`, `)} from sysibm.sysdummy1`;
  }
}

class VariableTreeItem extends TreeItem {
  constructor(variable: string, detail: {error?: boolean, value?: string}) {
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
    }

    if (!detail.value && !detail.error) {
      this.iconPath = new ThemeIcon(`question`);
    }
  }
}

class VariableTreeItemError extends TreeItem {
  constructor(label: string) {
    super(label, TreeItemCollapsibleState.None);
    this.contextValue = `sqlVarValueError`;
    this.iconPath = new ThemeIcon(`warning`);
  }
}