import { EventEmitter, MarkdownString, workspace } from "vscode";
import { window } from "vscode";
import { CancellationToken, Event, ExtensionContext, ProviderResult, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, commands } from "vscode";
import { SQLExample, Examples } from "./examples";
import { OSData, fetchSystemInfo } from "../config";
import { getInstance } from "../base";

const openExampleCommand = `vscode-db2i.examples.open`;

export class ExampleBrowser implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private currentFilter: string|undefined;

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

  getChildren(element?: ExampleGroupItem): ProviderResult<any[]> {
    if (this.currentFilter) {
      // If there is a filter, then show all examples that include this criteria
      let items: SQLExampleItem[] = [];

      const upperFilter = this.currentFilter.toUpperCase();

      for (const exampleName in Examples) {
        items.push(
          ...Examples[exampleName]
            .filter(example => exampleWorksForOnOS(example))
            .filter(example => example.name.toUpperCase().includes(upperFilter) || example.content.some(line => line.toUpperCase().includes(upperFilter)))
            .map(example => new SQLExampleItem(example))
        )
      }

      return items;

    } else {
      if (element) {
        return element.getChildren();
      } else {
        let items: ExampleGroupItem[] = [];

        for (const exampleName in Examples) {
          items.push(
            new ExampleGroupItem(exampleName, Examples[exampleName])
          )
        }

        return items;
      }
    }
  }

  getParent?(element: any) {
    throw new Error("Method not implemented.");
  }
}

class ExampleGroupItem extends TreeItem {
  constructor(name: string, private group: SQLExample[]) {
    super(name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = new ThemeIcon(`folder`);
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

    this.iconPath = new ThemeIcon(`file`);

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

    // If this example has specific system requirements defined..
    if (example.requirements && example.requirements[myOsVersion]) {
      if (OSData.db2Level < example.requirements[myOsVersion]) {
        return false;
      }
    }
  }

  return true;
}