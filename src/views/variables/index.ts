import { TreeDataProvider, TreeItem, ExtensionContext, commands, workspace, window, TreeItemCollapsibleState, EventEmitter, Event, MarkdownString, ThemeIcon, FileDecoration, ThemeColor, Uri } from "vscode";
import { SQLObject } from "../schemaBrowser";
import { JobManager } from "../../config";
import Statement from "../../database/statement";
import { Config } from "../../config";

type VariableType = "sqlVariable"|"sqlStatement"|"dataarea";

interface Variable {
  type: VariableType,
  label: string;
  statement: string;
}

const NEW_VARIABLE_VALUE = `*new`;

export class Variables implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private currentSuggestion: Variable|undefined;
  private previousValues: {[key: string]: string} = {};
  private variables: Variable[] = [];

  private cacheNewValue(name: string, value: string) {
    this.previousValues[name] = value;
  }

  private valueHasChanged(name: string, newValue: string): boolean {
    return this.previousValues[name] !== newValue && newValue !== NEW_VARIABLE_VALUE;
  }

  public loadVariables() {
    this.variables = Config.getVariables();
    this.previousValues = {};
  }

  private removeVariable(variableName: string) {
    const index = this.variables.findIndex(v => v.label === variableName);

    if (index !== -1) {
      this.variables.splice(index, 1);
      this.previousValues[variableName] = undefined;
      this.refresh();
      this.saveVariables();
    }
  }

  private addVariable(variable: Variable) {
    this.variables.push(variable);
    this.cacheNewValue(variable.label, NEW_VARIABLE_VALUE);
    this.saveVariables();
    this.refresh();
  };

  private saveVariables() {
    const savableVariables = this.variables.filter(v => [`sqlVariable`, `dataarea`].includes(v.type));
    return Config.setVariables(savableVariables);
  }

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(`vscode-db2i.variables.addSuggestion`, (suggestion: Variable) => {
        if (suggestion) {
          const newVar = this.currentSuggestion;
          this.currentSuggestion = undefined;
          this.addVariable(newVar);
        }
      }),

      commands.registerCommand(`vscode-db2i.variables.add`, async (object?: SQLObject) => {
        let fetchStatement;
        let type: VariableType = `sqlVariable`;
        
        if (object && object.type === `variable`) {
          fetchStatement = Statement.delimName(object.schema) + `.` + Statement.delimName(object.name);
        }

        if (!fetchStatement) {
          fetchStatement = await window.showInputBox({
            placeHolder: `schema.variableName`,
            title: `Enter an existing variable name`,
            validateInput: (value) => {
              if (value.includes(` `)) {
                return `Variable or data structure path cannot contain spaces.`;
              }
            }
          });
        }

        if (fetchStatement) {
          if (fetchStatement.length < 21 && fetchStatement.includes(`/`)) {
            type = `dataarea`;
          }

          this.addVariable({
            type,
            label: fetchStatement,
            statement: fetchStatement
          });

          this.focus();
        }
      }),

      commands.registerCommand(`vscode-db2i.variables.remove`, async (variable?: VariableTreeItem) => {
        if (variable) {
          this.removeVariable(variable.variableName);
        }
      }),

      commands.registerCommand(`vscode-db2i.variables.refresh`, () => this.refresh()),
      window.registerFileDecorationProvider(new VariableDecorationProvider())
    );
  }

  clear() {
    this.variables = [];
    this.previousValues = {};
    this.refresh();
  }

  focus() {
    return commands.executeCommand(`vscode-db2i.variables.focus`);
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  setSuggestion(sqlStatement: string) {
    let possibleName = sqlStatement;
    const upperStatement = sqlStatement.toUpperCase();
    const fromIndex = upperStatement.indexOf(`FROM`);
    if (fromIndex >= 0) {
      possibleName = sqlStatement.substring(fromIndex + 4).trim();
    }

    if (upperStatement.includes(`COUNT(`)) {
      possibleName = `Count ${possibleName}`;
    }

    this.currentSuggestion = {
      type: `sqlStatement`,
      label: possibleName,
      statement: sqlStatement
    };

    this.refresh();
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: VariableTreeItem): Promise<TreeItem[]> {
    let variableResults: TreeItem[] = [];
    try {
      if (this.variables.length > 0) {
        const sql = this.buildStatement();
        const results = await JobManager.runSQL(sql);

        if (results.length === 1) {
          const firstRow = results[0];
          const labels = Object.keys(firstRow);

          variableResults.push(...labels.map((label, index) => {
            const value = String(firstRow[label]);
            const justChanged = this.valueHasChanged(label, value);
            
            this.cacheNewValue(label, value);

            return new VariableTreeItem(label, {
              value,
              justChanged
            });
          }));
        }
      }

      if (this.currentSuggestion) {
        variableResults.push(new VariableSuggestion(this.currentSuggestion));
      }
    } catch (e) {
      variableResults.push(new VariableTreeItemError(e.message));
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
        case `sqlVariable`:
        case `sqlStatement`:
          return `(${variable.statement}) as "${variable.label}"`;
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

const VARIABLE_CHANGED_SCHEMA = `variableValueChanged`;

class VariableTreeItem extends TreeItem {
  constructor(public readonly variableName: string, detail: {error?: boolean, value?: string, justChanged?: boolean}) {
    super(variableName, TreeItemCollapsibleState.None);
    this.contextValue = `sqlVarValue`;

    if (detail.value !== undefined && detail.value === ``) {
      detail.value = `-`;
    }

    if (detail.value) {
      this.label += `:`;
      this.description = detail.value;

      const hover = new MarkdownString();
      hover.appendCodeblock(detail.value);
      this.iconPath = new ThemeIcon(`symbol-variable`);

      if (detail.justChanged) {
        this.resourceUri = Uri.from({
          scheme: VARIABLE_CHANGED_SCHEMA,
          path: `/.`,
        });

        hover.appendMarkdown(`\n\n---\n\nValue changed`);
      }

      this.tooltip = hover;
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

class VariableSuggestion extends TreeItem {
  constructor(variable: Variable) {
    super(variable.label, TreeItemCollapsibleState.None);
    this.contextValue = `sqlVarSuggestion`;
    this.description = `(click to add)`;
    this.tooltip = new MarkdownString();
    this.tooltip.appendCodeblock(variable.statement, `sql`);
    this.iconPath = new ThemeIcon(`lightbulb`);

    this.command = {
      command: `vscode-db2i.variables.addSuggestion`,
      title: `Add suggestion`,
      arguments: [variable]
    }
  }
}

class VariableDecorationProvider implements VariableDecorationProvider {
  provideFileDecoration(uri: Uri): FileDecoration | undefined {
    switch (uri.scheme) {
      case VARIABLE_CHANGED_SCHEMA:
        return {
          // color: new ThemeColor(`debugView.valueChangedHighlight`),
          badge: `☀️`,
        }
    }

    return;
  }
}