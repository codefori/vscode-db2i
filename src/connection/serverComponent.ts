import { getInstance } from "../base";

import { Octokit } from "octokit";

import { Config } from "../config";
import path from "path";
import { OutputChannel, extensions, window } from "vscode";

import { stat } from "fs/promises";
import { SERVER_VERSION_FILE } from "./SCVersion";

const ExecutablePathDir = `$HOME/.vscode/`;

export enum UpdateStatus {
  FAILED,
  NONE_AVAILABLE,
  UP_TO_DATE,
  DECLINED_UPDATE,
  JUST_UPDATED,
}

export class ServerComponent {
  private static installed: boolean = false;
  static outputChannel: OutputChannel;

  static initOutputChannel() {
    if (!this.outputChannel) {
      this.outputChannel = window.createOutputChannel(`Db2 for i Server Component`, `json`);
    }

    return this.outputChannel;
  }

  static writeOutput(jsonString: string, show = false) {
    if (show) {
      this.outputChannel.show();
    }
    
    if (this.outputChannel) {
      this.outputChannel.appendLine(jsonString);
    }
  }

  static isInstalled() {
    return this.installed;
  }

  static getInitCommand(): string|undefined {
    const path = this.getComponentPath();

    if (path) {
      return `/QOpenSys/QIBM/ProdData/JavaVM/jdk80/64bit/bin/java -Dos400.stdio.convert=N -jar ${path}`
    }
  }

  static getComponentPath(): string|undefined {
    if (Config.ready) {
      const installedVersion = Config.getServerComponentName();

      if (installedVersion) {
        return path.posix.join(ExecutablePathDir, installedVersion);
      }
    }

    return;
  }

  static async initialise(): Promise<boolean> {
    const instance = getInstance();
    const connection = instance.getConnection();

    const exists = await connection.sendCommand({
      command: `ls ${this.getComponentPath()}`
    });

    this.installed = (exists.code === 0);

    return this.installed;
  }

  /**
   * Returns whether server component is installed.
   */
  public static async checkForUpdate(): Promise<UpdateStatus> {
    let updateResult: UpdateStatus = UpdateStatus.NONE_AVAILABLE;

    const extensionPath = extensions.getExtension(`halcyontechltd.vscode-db2i`).extensionPath;
    const instance = getInstance();
    const connection = instance.getConnection();

    try {
      const assetPath = path.join(extensionPath, `dist`, SERVER_VERSION_FILE);
      const assetExists = await exists(assetPath);

      ServerComponent.writeOutput(JSON.stringify({assetPath, assetExists}));

      if (assetExists) {
        const basename = SERVER_VERSION_FILE;
        const lastInstalledName = Config.getServerComponentName();

        ServerComponent.writeOutput(JSON.stringify({basename, lastInstalledName}));

        if (lastInstalledName !== basename || this.installed === false) {
          // This means we're currently running a different version, 
          // or maybe not at all (currentlyInstalled can be undefined)

          // First, we need their home directory
          const commandResult = await connection.sendCommand({
            command: `echo ${ExecutablePathDir}`
          });

          if (commandResult.code === 0 && commandResult.stderr === ``) {
            const remotePath = path.posix.join(commandResult.stdout, basename);

            ServerComponent.writeOutput(JSON.stringify({remotePath, ExecutablePathDir}));

            await connection.uploadFiles([{local: assetPath, remote: remotePath}]);

            await Config.setServerComponentName(basename);

            window.showInformationMessage(`Db2 for IBM i extension server component has been updated!`);
            this.installed = true;
            updateResult = UpdateStatus.JUST_UPDATED;
            
          } else {
            updateResult = UpdateStatus.FAILED;

            this.writeOutput(JSON.stringify(commandResult));
            window.showErrorMessage(`Something went really wrong when trying to fetch your home directory.`).then(chosen => {
              if (chosen === `Show`) {
                this.outputChannel.show();
              }
            });
          }

        } else {
          // Already installed. Move along
          updateResult = UpdateStatus.UP_TO_DATE;
        }

      } else {
        // Uh oh. A release was made by there's no jar file??
        ServerComponent.writeOutput('Unable to get file name from server component release.');
        updateResult = UpdateStatus.NONE_AVAILABLE;
      }

    } catch (e) {
      updateResult = UpdateStatus.FAILED;
      ServerComponent.writeOutput(JSON.stringify(e));
      console.log(e);

      window.showErrorMessage(`Something went really wrong during the update process! Check the Db2 for i Output log for the log`, `Show`).then(chosen => {
        if (chosen === `Show`) {
          this.outputChannel.show();
        }
      });
    }

    return updateResult;
  }
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (e) {
    return false;
  }
}