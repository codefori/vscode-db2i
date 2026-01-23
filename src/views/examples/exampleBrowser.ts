import { Event, EventEmitter, ExtensionContext, FileSystemWatcher, MarkdownString, RelativePattern, TextDocument, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, commands, window, workspace } from "vscode";
import { Examples, SQLExample, SQLExamples, ServiceInfoLabel } from ".";
import { notebookFromStatements } from "../../notebooks/logic/openAsNotebook";
import { osDetail } from "../../config";
import Configuration from "../../configuration";
import * as path from 'path';

export const openExampleCommand = `vscode-db2i.examples.open`;

export class ExampleBrowser implements TreeDataProvider<any> {
  private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | null | void> = new EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private watchers: FileSystemWatcher[] = [];
  private currentFilter: string | undefined;

  constructor(context: ExtensionContext) {
    this.setupWatchers();

    context.subscriptions.push(
      commands.registerCommand(openExampleCommand, (example: SQLExample) => {
        if (example) {
          if (example.isNotebook) {
            notebookFromStatements(example.content);
          } else {
            workspace.openTextDocument({
              content: example.content.join(`\n`),
              language: `sql`
            }).then(doc => {
              window.showTextDocument(doc);
            });
          }
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
      }),

      commands.registerCommand("vscode-db2i.examples.reload", () => {
        delete Examples[ServiceInfoLabel];
        this.refresh();
      }),

      commands.registerCommand("vscode-db2i.examples.save", async () => {
        const editor = window.activeTextEditor;
        if (editor) {
          const document = editor.document;
          if (document.languageId === `sql`) {
            const existingDirectories = Configuration.get<string[]>(`examples.customExampleDirectories`) || [];
            if (existingDirectories.length === 0) {
              window.showErrorMessage(`You must first add a custom examples directory before saving new examples.`, { modal: true }, `Add Custom Examples Directory`).then(async selection => {
                if (selection === `Add Custom Examples Directory`) {
                  const isAdded = await commands.executeCommand(`vscode-db2i.examples.add`);
                  if (isAdded) {
                    await commands.executeCommand(`vscode-db2i.examples.save`);
                  }

                  return;
                };
              });
            } else {
              const quickPickItems = existingDirectories.map(dir => ({ label: dir }));
              const selectedDirectory = await window.showQuickPick(quickPickItems, {
                title: `Select a custom example directories to save this example to`
              });
              if (selectedDirectory) {
                const suggestedFileName = path.basename(document.fileName);
                let exampleFileName = await window.showInputBox({
                  title: `Example file name`,
                  prompt: `Enter example file name`,
                  value: suggestedFileName,
                });

                if (exampleFileName) {
                  if (!exampleFileName.includes(`.`)) {
                    exampleFileName = `${exampleFileName}.sql`;
                  }

                  try {
                    const filePath = Uri.joinPath(Uri.file(selectedDirectory.label), exampleFileName);
                    const fileContent = Buffer.from(document.getText(), 'utf8')
                    await workspace.fs.writeFile(filePath, fileContent);
                    window.showInformationMessage(`Example saved to ${filePath.fsPath}`);
                    this.refresh();
                  } catch (error) {
                    window.showErrorMessage(`Failed to save example: ${error}`);
                  }
                }
              }
            }
          } else {
            window.showErrorMessage(`The active document is not a SQL file.`);
          }
        } else {
          window.showErrorMessage(`No SQL file open.`);
        }
      }),

      commands.registerCommand("vscode-db2i.examples.add", async () => {
        const dirsToAdd = await window.showOpenDialog({
          title: "Add Custom Example Directory",
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: true
        });

        if (dirsToAdd && dirsToAdd.length > 0) {
          const existingDirectories = Configuration.get<string[]>(`examples.customExampleDirectories`) || [];
          const newDirectoryPaths = dirsToAdd.map(dir => dir.fsPath);
          const updatedDirectories = Array.from(new Set([...existingDirectories, ...newDirectoryPaths]));
          await Configuration.set(`examples.customExampleDirectories`, updatedDirectories);
          return true;
        } else {
          return false;
        }
      }),

      commands.registerCommand("vscode-db2i.examples.remove", async () => {
        const existingDirectories = Configuration.get<string[]>(`examples.customExampleDirectories`) || [];
        if (existingDirectories.length === 0) {
          window.showErrorMessage(`No custom example directories to remove.`);
          return;
        }

        const quickPickItems = existingDirectories.map(dir => ({ label: dir }));
        const selectedDirectories = await window.showQuickPick(quickPickItems, {
          title: `Select a custom example directories to remove`,
          canPickMany: true
        });

        if (selectedDirectories && selectedDirectories.length > 0) {
          const dirsToRemove = selectedDirectories.map(item => item.label);
          const updatedDirectories = existingDirectories.filter(dir => !dirsToRemove.includes(dir));
          await Configuration.set(`examples.customExampleDirectories`, updatedDirectories);
        }
      }),

      commands.registerCommand("vscode-db2i.examples.edit", async (item: SQLExampleItem) => {
        if (item.example.customFileUri) {
          const document = await workspace.openTextDocument(item.example.customFileUri);
          await window.showTextDocument(document);
        }
      }),

      workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('vscode-db2i.examples.customExampleDirectories')) {
          this.setupWatchers();
          this.refresh();
        }
      })
    );
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: any): TreeItem | Thenable<TreeItem> {
    return element;
  }

  async getChildren(element?: ExampleGroupItem): Promise<TreeItem[]> {
    if (element) {
      return element.getChildren();
    }
    else {
      const mergedExamples = await SQLExamples.getMergedExamples();

      if (this.currentFilter) {
        // If there is a filter, then show all examples that include this criteria
        const upperFilter = this.currentFilter.toUpperCase();
        return Object.values(mergedExamples)
          .flatMap(examples => examples.filter(exampleWorksForOnOS))
          .filter(example => example.name.toUpperCase().includes(upperFilter) || example.content.some(line => line.toUpperCase().includes(upperFilter)))
          .sort(sort)
          .map(example => new SQLExampleItem(example));
      }
      else {
        return Object.entries(mergedExamples)
          .sort(([name1], [name2]) => sort(name1, name2))
          .map(([name, examples]) => new ExampleGroupItem(name, examples));
      }
    }
  }

  setupWatchers() {
    if (this.watchers) {
      for (const watcher of this.watchers) {
        watcher.dispose();
      }
      this.watchers = [];
    }

    const existingDirectories = Configuration.get<string[]>(`examples.customExampleDirectories`) || [];
    for (const directory of existingDirectories) {
      const directoryUri = Uri.file(directory);
      const relativePattern = new RelativePattern(directoryUri, '**/*');
      const watcher = workspace.createFileSystemWatcher(relativePattern);
      watcher.onDidCreate(async (uri) => {
        this.refresh();
      });
      watcher.onDidChange(async (uri) => {
        this.refresh();
      });
      watcher.onDidDelete(async (uri) => {
        this.refresh();
      });
      this.watchers.push(watcher);
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
      .sort(sort)
      .map(example => new SQLExampleItem(example));
  }
}

class SQLExampleItem extends TreeItem {
  constructor(public example: SQLExample) {
    super(example.name, TreeItemCollapsibleState.None);
    this.iconPath = ThemeIcon.File;
    this.resourceUri = Uri.parse('_.sql');
    this.tooltip = new MarkdownString(['```sql', example.content.join(`\n`), '```'].join(`\n`));
    this.contextValue = example.customFileUri ? `example.custom` : `example`;

    this.command = {
      command: openExampleCommand,
      title: `Open example`,
      arguments: [example]
    };
  }
}

function exampleWorksForOnOS(example: SQLExample): boolean {

  if (osDetail) {
    const myOsVersion = osDetail.getVersion();

    // If this example has specific system requirements defined
    if (example.requirements &&
      example.requirements[myOsVersion] &&
      osDetail.getDb2Level() < example.requirements[myOsVersion]) {
      return false;
    }
  }

  return true;
}

function sort(string1: string | SQLExample, string2: string | SQLExample) {
  string1 = typeof string1 === "string" ? string1 : string1.name;
  string2 = typeof string2 === "string" ? string2 : string2.name;
  return string1.localeCompare(string2);
}