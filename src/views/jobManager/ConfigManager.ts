import { Disposable, ProgressLocation, ThemeIcon, TreeItem, TreeItemCollapsibleState, commands, window } from "vscode";
import Configuration from "../../configuration";
import { JDBCOptions } from "../../connection/types";
import { JobManagerView, SQLJobItem } from "./jobManagerView";
import { JobManager } from "../../config";
import { SQLJob } from "../../connection/sqlJob";
import { editJobUi } from "./editJob";

interface JobConfigs {
  [name: string]: JDBCOptions
};

export class ConfigManager {
  static refresh() {
    commands.executeCommand(`vscode-db2i.jobManager.refresh`);
  }

  static initialiseSaveCommands(): Disposable[] {
    return [
      commands.registerCommand(`vscode-db2i.jobManager.newConfig`, async (jobNode: SQLJobItem) => {
        if (jobNode && jobNode.label) {
          const id = jobNode.label as string;
          let selected = JobManager.getJob(id);

          if (selected) {
            window.showInputBox({
              value: selected.name,
              title: `New Config`,
              prompt: `New name for config`
            }).then(async newName => {
              if (newName) {
                await this.storeConfig(newName, selected.job.options);
                selected.name = newName;
                this.refresh();
              }
            })
          }
        }
      }),

      commands.registerCommand(`vscode-db2i.jobManager.startJobFromConfig`, async (name: string) => {
        const options = this.getConfig(name);

        if (options) {
          await window.withProgress({ location: ProgressLocation.Window }, async (progress) => {
            try {
              progress.report({ message: `Spinning up SQL job...` });
              const newJob: SQLJob = new SQLJob(options);
              await JobManager.newJob(newJob, name);
              if (options.selfcodes) {
                newJob.setSelfCodes(options.selfcodes);
              }
            } catch (e) {
              window.showErrorMessage(e.message);
            }

            this.refresh();
          });
        }
      }),

      commands.registerCommand(`vscode-db2i.jobManager.editConfig`, (configNode: SavedConfig) => {
        if (configNode && configNode.name) {
          const options = this.getConfig(configNode.name);

          if (options) {
            editJobUi(options, configNode.name).then(newOptions => {
              if (newOptions) {
                this.storeConfig(configNode.name, options);
              }
            })
          }
        }
      }),

      commands.registerCommand(`vscode-db2i.jobManager.deleteConfig`, async (configNode: SavedConfig) => {
        if (configNode && configNode.name) {
          await this.deleteConfig(configNode.name);
          this.refresh();
        }
      }),

      // Currently not accessible from the UI
      commands.registerCommand(`vscode-db2i.jobManager.setAsStartupConfig`, async (configNode: SavedConfig) => {
        if (configNode && configNode.name) {
          window.showWarningMessage(`This will attempt to startup ${configNode.name} automatically when you connect to any system. Do you want to continue?`, `Absolutely`, `Cancel`).then(chosen => {
            if (chosen === `Absolutely`) {
              Configuration.set(`alwaysStartSQLJob`, configNode.name);
            }
          })
        }
      }),
    ]
  }

  static hasSavedItems() {
    const saved = ConfigManager.getSavedConfigs();
    const names = Object.keys(saved);
    return names.length > 0;
  }

  static getConfigTreeItems(): SavedConfig[] {
    // TODO: add profiles in here?

    const saved = ConfigManager.getSavedConfigs();
    const names = Object.keys(saved);
    return names.map(name => new SavedConfig(name));
  }

  private static getSavedConfigs() {
    return Configuration.get<JobConfigs>(`jobConfigs`);
  }

  static getConfig(name: string): JDBCOptions | undefined {
    const configs = this.getSavedConfigs(); // Returns a proxy
    return Object.assign({}, configs[name]);
  }

  private static storeConfig(name: string, options: JDBCOptions) {
    let configs: JobConfigs = {
      ...ConfigManager.getSavedConfigs(),
      [name]: options
    };

    return Configuration.set(`jobConfigs`, configs);
  }

  private static deleteConfig(name: string) {
    let configs = ConfigManager.getSavedConfigs();

    configs[name] = undefined;

    return Configuration.set(`jobConfigs`, configs);
  };
}

export class ConfigGroup extends TreeItem {
  static contextValue = `configGroup`;
  constructor() {
    super(`Saved Configuration`, TreeItemCollapsibleState.Expanded);

    this.iconPath = new ThemeIcon(`gear`);
    this.contextValue = ConfigGroup.contextValue;
  }
}

class SavedConfig extends TreeItem {
  constructor(public name: string) {
    super(name, TreeItemCollapsibleState.None);

    this.iconPath = new ThemeIcon(`add`);
    this.tooltip = `Click to start`
    this.command = {
      command: `vscode-db2i.jobManager.startJobFromConfig`,
      title: `Start Job from config`,
      arguments: [name]
    };

    this.contextValue = `savedConfig`;
  }
}