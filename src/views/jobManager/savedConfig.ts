import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";

class ConfigGroup extends TreeItem {
  constructor() {
    super(`Saved Configuration`, TreeItemCollapsibleState.Expanded);

    this.iconPath = new ThemeIcon(`gear`);
  }
}

class SavedConfig extends TreeItem {
  constructor(name: string) {
    super(name, TreeItemCollapsibleState.Expanded);

    this.iconPath = new ThemeIcon(`layers`);
    this.command = {
      command: `vscode-db2i.jobManager.newJobFromConfig`,
      title: `Start Job from config`,
      arguments: [name]
    }
  }
}