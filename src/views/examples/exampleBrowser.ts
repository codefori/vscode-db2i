import { Event, EventEmitter, ExtensionContext, MarkdownString, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands, window, workspace } from "vscode";
import { Examples, SQLExample, ServiceInfoLabel } from ".";
import { getInstance } from "../../base";
import { OSData, fetchSystemInfo } from "../../config";
import { getServiceInfo } from "../../database/serviceInfo";

const openExampleCommand = `vscode-db2i.examples.open`;

export class ExampleBrowser implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private currentFilter: string | undefined;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      commands.registerCommand(openExampleCommand, (example: SQLExample) => {
        if (example) {
          workspace.openTextDocument({
            content: example.content.join(`\n`),
            language: `sql`
          }).then(doc => {
            window.showTextDocument(doc);
          });
        }
      }),

      commands.registerCommand(`vscode-db2i.examples.setFilter`, async () => {
        this.currentFilter = await window.showInputBox({
          title: `Example Filter`,
          prompt: `Enter filter criteria`,
          value: this.currentFilter,
        });

        this.refresh();
      }),

      commands.registerCommand(`vscode-db2i.examples.clearFilter`, async () => {
        this.currentFilter = undefined;
        this.refresh();
      })
    );

    getInstance().onEvent(`connected`, () => {
      // We need to fetch the system info
      fetchSystemInfo().then(() => {
        // Refresh the examples when we have it, so we only display certain examples
        this.refresh();
      })
    })
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: ExampleGroupItem): Promise<SQLExampleItem[]> {
    if (element) {
      return element.getChildren();
    }
    else {
      // Unlike the bulk of the examples which are defined in views/examples/index.ts, the services examples are retrieved dynamically
      if (!Examples[ServiceInfoLabel]) {
        Examples[ServiceInfoLabel] = await getServiceInfo();
      }

      if (this.currentFilter) {
        // If there is a filter, then show all examples that include this criteria
        const upperFilter = this.currentFilter.toUpperCase();
        return Object.values(Examples)
          .flatMap(examples => examples.filter(exampleWorksForOnOS))
          .filter(example => example.name.toUpperCase().includes(upperFilter) || example.content.some(line => line.toUpperCase().includes(upperFilter)))
          .map(example => new SQLExampleItem(example));
      }
      else {
        return Object.entries(Examples).map(([name, examples]) => new ExampleGroupItem(name, examples));
      }
    }
  }
}

class ExampleGroupItem extends TreeItem {
  constructor(name: string, private group: SQLExample[]) {
    super(name, TreeItemCollapsibleState.Collapsed);
    this.iconPath = ThemeIcon.Folder;
  }

  getChildren(): SQLExampleItem[] {
    return this.group
      .filter(example => exampleWorksForOnOS(example))
      .map(example => new SQLExampleItem(example));
  }
}

class SQLExampleItem extends TreeItem {
  constructor(example: SQLExample) {
    super(example.name, TreeItemCollapsibleState.None);
    this.iconPath = ThemeIcon.File;

    this.tooltip = new MarkdownString(['```sql', example.content.join(`\n`), '```'].join(`\n`));

    this.command = {
      command: openExampleCommand,
      title: `Open example`,
      arguments: [example]
    };
  }
}

function exampleWorksForOnOS(example: SQLExample): boolean {
  if (OSData) {
    const myOsVersion = OSData.version;

    // If this example has specific system requirements defined
    if (example.requirements &&
      example.requirements[myOsVersion] &&
      OSData.db2Level < example.requirements[myOsVersion]) {
      return false;
    }
  }

  return true;
}