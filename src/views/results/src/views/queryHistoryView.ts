import vscode, { MarkdownString, ThemeIcon, TreeItem, window, workspace } from "vscode";
import { TreeDataProvider } from "vscode";
import { Config } from "../config";

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
          const existingQuery = currentList.findIndex(query => query.trim() === newQuery.trim());
      
          // If it exists, remove it
          if (existingQuery > 0) {
            currentList.splice(existingQuery, 1);
          }
      
          // If it's at the top, don't add it, it's already at the top
          if (existingQuery !== 0) {
            currentList.splice(0, 0, newQuery);
          }
      
          await Config.setPastQueries(currentList);

          this.refresh();
        }
      }),

      vscode.commands.registerCommand(`vscode-db2i.queryHistory.remove`, async (node: PastQuery) => {
        if (node && Config.ready) {
          let currentList = Config.getPastQueries();
          const chosenQuery = node.query;
          const existingQuery = currentList.findIndex(query => query.trim() === chosenQuery.trim());
      
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

  async getChildren(): Promise<vscode.TreeItem[]> {
    if (Config.ready) {
      return Config.getPastQueries().map(query => new PastQuery(query));

    } else {
      return [new TreeItem(`A connection is required for query history`)];
    }
  }
}

class PastQuery extends vscode.TreeItem {
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