import vscode, { MarkdownString, ThemeIcon, TreeItem, window, workspace } from "vscode";
import { TreeDataProvider } from "vscode";
import { Config } from "../config";
import { QueryHistoryItem } from "../Storage";

const openSqlDocumentCommand = `vscode-db2i.openSqlDocument`;

export class queryHistory implements TreeDataProvider<any> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(openSqlDocumentCommand, (query: string = ``) => {
        workspace.openTextDocument({
          language: `sql`,
          content: (typeof query === `string` ? query : ``)
        }).then(doc => {
          window.showTextDocument(doc);
        });
      }),

      vscode.commands.registerCommand(`vscode-db2i.queryHistory.prepend`, async (newQuery?: string) => {
        if (newQuery && Config.ready) {
          let currentList = Config.getPastQueries();
          const existingQuery = currentList.findIndex(queryItem => queryItem.query.trim() === newQuery.trim());
      
          // If it exists, remove it
          if (existingQuery > 0) {
            currentList.splice(existingQuery, 1);
          }
      
          // If it's at the top, don't add it, it's already at the top
          if (existingQuery !== 0) {
            currentList.splice(0, 0, {
              query: newQuery,
              unix: Math.floor(Date.now() / 1000)
            });
          }
      
          await Config.setPastQueries(currentList);

          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.queryHistory.remove`, async (node: PastQueryNode) => {
        if (node && Config.ready) {
          let currentList = Config.getPastQueries();
          const chosenQuery = node.query;
          const existingQuery = currentList.findIndex(queryItem => 
            queryItem.query.trim() === chosenQuery.trim()
          );
      
          // If it exists, remove it
          if (existingQuery >= 0) {
            currentList.splice(existingQuery, 1);
            await Config.setPastQueries(currentList);
            this.refresh();
          }
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.queryHistory.clear`, async () => {
        if (Config.ready) {
          await Config.setPastQueries([]);
          this.refresh();
        }
      }),
    )
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem) {
    return element;
  }

  async getChildren(timePeriod?: TimePeriodNode): Promise<vscode.TreeItem[]> {
    if (Config.ready) {
      if (timePeriod) {
        return timePeriod.getChildren();

      } else {
        const currentList = Config.getPastQueries();
        
        const day = 60 * 60 * 24;
        const week = day * 7;
        const month = day * 30;
        
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - day;
        const weekAgo = now - week;
        const monthAgo = now - month;

        let pastDayQueries: PastQueryNode[] = [];
        let pastWeekQueries: PastQueryNode[] = [];
        let pastMonthQueries: PastQueryNode[] = [];
        let olderQueries: PastQueryNode[] = [];

        currentList.forEach(queryItem => {
          // The smaller the unix value, the older it is
          if (queryItem.unix < monthAgo) {
             olderQueries.push(new PastQueryNode(queryItem.query));
          } else if (queryItem.unix < weekAgo) {
            pastMonthQueries.push(new PastQueryNode(queryItem.query));
         } else if (queryItem.unix < dayAgo) {
            pastWeekQueries.push(new PastQueryNode(queryItem.query));
         } else {
            pastDayQueries.push(new PastQueryNode(queryItem.query));
         }
        });

        let nodes: TimePeriodNode[] = [];

        if (pastDayQueries.length > 0) {
          nodes.push(new TimePeriodNode(`Past day`, pastDayQueries, true));
        }
        if (pastWeekQueries.length > 0) {
          nodes.push(new TimePeriodNode(`Past week`, pastWeekQueries));
        }
        if (pastMonthQueries.length > 0) {
          nodes.push(new TimePeriodNode(`Past month`, pastMonthQueries));
        }
        if (olderQueries.length > 0) {
          nodes.push(new TimePeriodNode(`Older`, olderQueries));
        }

        return nodes;
      }

    } else {
      return [new TreeItem(`A connection is required for query history`)];
    }
  }
}

class TimePeriodNode extends vscode.TreeItem {
  constructor(public period: string, private nodes: PastQueryNode[], expanded = false) {
    super(period, expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = `timePeriod`;

    this.iconPath = new ThemeIcon(`calendar`);
  }

  getChildren() {
    return this.nodes;
  }
}

class PastQueryNode extends vscode.TreeItem {
  constructor(public query: string) {
    super(query.length > 63 ? query.substring(0, 60) + `...` : query);

    this.contextValue = `query`;

    this.tooltip = new MarkdownString(['```sql', query, '```'].join(`\n`));

    this.command = {
      command: openSqlDocumentCommand,
      arguments: [query],
      title: `Open into new document`
    };

    this.iconPath = new ThemeIcon(`go-to-file`);
  }
}