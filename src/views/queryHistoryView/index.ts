import { commands, EventEmitter, ExtensionContext, MarkdownString, ThemeIcon, TreeItem, TreeItemCollapsibleState, window, workspace, Event } from "vscode";
import { TreeDataProvider } from "vscode";
import { Config } from "../../config";
import { QueryHistoryItem } from "../../Storage";

const openSqlDocumentCommand = `vscode-db2i.openSqlDocument`;
const openHistoryItemCommand = `vscode-db2i.queryHistory.openItem`;

export class QueryHistory implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(openSqlDocumentCommand, (query: string = ``) => {
        workspace.openTextDocument({
          language: `sql`,
          content: (typeof query === `string` ? query : ``)
        }).then(doc => {
          window.showTextDocument(doc);
        });
      }),

      commands.registerCommand(openHistoryItemCommand, (item?: QueryHistoryItem) => {
        if (!item) {
          return;
        }

        let content = item.query + `;`;

        if (item.substatements && item.substatements.length > 0) {
          content += `\n\n-- Substatements: ${item.substatements.length}\n`;
          content += item.substatements.map(sub => sub + `;`).join(`\n`);
        }

        workspace.openTextDocument({
          language: `sql`,
          content
        }).then(doc => {
          window.showTextDocument(doc);
        });
      }),

      commands.registerCommand(`vscode-db2i.queryHistory.find`, async () => {
        commands.executeCommand('queryHistory.focus');
        commands.executeCommand('list.find');
      }),

      commands.registerCommand(`vscode-db2i.queryHistory.prepend`, async (newQuery?: string, substatement?: string) => {
        if (newQuery && Config.ready) {
          let currentList = Config.getPastQueries();
          const unixNow = Math.floor(Date.now() / 1000);
          const existingQueryi = currentList.findIndex(queryItem => queryItem.query.trim() === newQuery.trim());
          let existingQuery: QueryHistoryItem;
          if (existingQueryi >= 0) {
            // Update existing query item with unix timestamp
            existingQuery = currentList[existingQueryi];
            existingQuery.unix = unixNow;
          } else {
            // Create new query item
            existingQuery = { query: newQuery, unix: unixNow };
          }

          if (substatement) {
            if (!existingQuery.substatements) {
              existingQuery.substatements = [];
            }

            // If the substatement already exists, don't add it again
            if (!existingQuery.substatements.includes(substatement)) {
              existingQuery.substatements.push(substatement);
            }
          }

          // If it exists, remove it
          if (existingQueryi > 0) {
            currentList.splice(existingQueryi, 1);
          }

          // If it's at the top, don't add it, it's already at the top
          if (existingQueryi !== 0) {
            currentList.splice(0, 0, existingQuery);
          }

          await Config.setPastQueries(currentList);

          this.refresh();
        }
      }),

      commands.registerCommand(`vscode-db2i.queryHistory.toggleStar`, async (node: PastQueryNode) => {
        if (node && Config.ready) {
          let currentList = Config.getPastQueries();
          const existingQuery = currentList.findIndex(queryItem =>
            queryItem.unix === node.item.unix
          );

          // If it exists, remove it
          if (existingQuery >= 0) {
            // Toggle the starred status
            currentList[existingQuery].starred = !(currentList[existingQuery].starred === true);
            await Config.setPastQueries(currentList);
            this.refresh();
          }
        }
      }),

      commands.registerCommand(`vscode-db2i.queryHistory.remove`, async (node: PastQueryNode) => {
        if (node && Config.ready) {
          let currentList = Config.getPastQueries();
          const existingQuery = currentList.findIndex(queryItem =>
            queryItem.unix === node.item.unix
          );

          // If it exists, remove it
          if (existingQuery >= 0) {
            currentList.splice(existingQuery, 1);
            await Config.setPastQueries(currentList);
            this.refresh();
          }
        }
      }),

      commands.registerCommand(`vscode-db2i.queryHistory.clear`, async () => {
        window.showInformationMessage(`Statement history`, { detail: `Are you sure you want to clear your statement history? This will not remove starred items.`, modal: true }, `Clear`).then(async (result) => {
          if (result) {
            if (Config.ready) {
              const starredItems = Config.getPastQueries().filter(queryItem => queryItem.starred === true);
              await Config.setPastQueries(starredItems);
              this.refresh();
            }
          }
        });
      }),
    )
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem) {
    return element;
  }

  async getChildren(timePeriod?: TimePeriodNode): Promise<TreeItem[]> {
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
        const starredQueries = currentList.filter(queryItem => queryItem.starred);
        const hasStarredQueries = starredQueries.length > 0;

        currentList.forEach(queryItem => {
          // The smaller the unix value, the older it is
          if (queryItem.unix < monthAgo) {
            olderQueries.push(new PastQueryNode(queryItem));
          } else if (queryItem.unix < weekAgo) {
            pastMonthQueries.push(new PastQueryNode(queryItem));
          } else if (queryItem.unix < dayAgo) {
            pastWeekQueries.push(new PastQueryNode(queryItem));
          } else {
            pastDayQueries.push(new PastQueryNode(queryItem));
          }
        });

        let nodes: TimePeriodNode[] = [];

        if (hasStarredQueries) {
          nodes.push(new TimePeriodNode(`Starred`, starredQueries.map(q => new PastQueryNode(q)), { expanded: true, stars: true }));
        }
        if (pastDayQueries.length > 0) {
          nodes.push(new TimePeriodNode(`Past day`, pastDayQueries, { expanded: !hasStarredQueries }));
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

class TimePeriodNode extends TreeItem {
  constructor(title: string, private nodes: PastQueryNode[], opts: { expanded?: boolean, stars?: boolean } = {}) {
    super(title, opts.expanded ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
    this.contextValue = `timePeriod`;

    this.iconPath = new ThemeIcon(opts.stars ? `star-full` : `calendar`);
  }

  getChildren() {
    return this.nodes;
  }
}

class PastQueryNode extends TreeItem {
  constructor(public item: QueryHistoryItem) {
    super(item.query);

    this.contextValue = `query`;

    let markdownLines = ['```sql', item.query];

    if (item.substatements && item.substatements.length > 0) {
      markdownLines.push(``, `-- substatements: ${item.substatements.length}`);
    }

    this.tooltip = new MarkdownString(markdownLines.join(`\n`));

    this.command = {
      command: openHistoryItemCommand,
      arguments: [item],
      title: `Open into new document`
    };

    this.iconPath = new ThemeIcon(item.starred ? `star` : `go-to-file`);
  }
}