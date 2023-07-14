import { getInstance } from "../base";

import { Octokit } from "octokit";
import fetch from 'node-fetch';

import { Config } from "../config";
import path from "path";
import { OutputChannel, commands, window } from "vscode";

import { writeFile } from "fs/promises";
import os from "os";
import { JobManagerView } from "../views/jobManager/jobManagerView";

const octokit = new Octokit();

const ExecutablePathDir = `$HOME/.vscode/`;

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
      return `/QOpenSys/QIBM/ProdData/JavaVM/jdk80/64bit/bin/java -jar ${path}`
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

  static async initialise(withUpdate = true): Promise<boolean> {
    const instance = getInstance();
    const connection = instance.getConnection();

    const exists = await connection.sendCommand({
      command: `ls ${this.getComponentPath()}`
    });

    this.installed = (exists.code === 0);

    if (withUpdate)
      this.checkForUpdate();

    return this.installed;
  }

  /**
   * Returns whether server component is installed.
   */
  private static async checkForUpdate() {
    const instance = getInstance();
    const connection = instance.getConnection();

    const owner = `ThePrez`;
    const repo = `CodeForIBMiServer`;

    try {
      const result = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
        owner,
        repo,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      const newAsset = result.data.assets.find(asset => asset.name.endsWith(`.jar`));

      if (newAsset) {
        const url = newAsset.browser_download_url;
        const basename = newAsset.name;
        const lastInstalledName = Config.getServerComponentName();

        if (lastInstalledName !== basename || this.installed === false) {
          const updateQuestion = await window.showInformationMessage(`An update to the database server component is available: ${basename}`, `Update`);

          if (updateQuestion === `Update`) {
            // This means we're currently running a different version, 
            // or maybe not at all (currentlyInstalled can be undefined)

            // First, we need their home directory
            const commandResult = await connection.sendCommand({
              command: `echo ${ExecutablePathDir}`
            });

            if (commandResult.code === 0 && commandResult.stderr === ``) {
              const remotePath = path.posix.join(commandResult.stdout, basename)

              const tempFile = path.join(os.tmpdir(), basename);

              await downloadFile(url, tempFile);

              await connection.uploadFiles([{local: tempFile, remote: remotePath}]);

              await Config.setServerComponentName(basename);

              window.showInformationMessage(`Db2 for IBM i extension server component has been updated!`);
              JobManagerView.setVisible(true);
              
            } else {
              window.showErrorMessage(`Something went really wrong when trying to fetch your home directory.`);
            }
          }

        } else {
          // Already installed. Move along
        }

      } else {
        // Uh oh. A release was made by there's no jar file??
      }
    } catch (e) {
      window.showErrorMessage(`Something went really wrong during the update process! ${e.message}`);
      console.log(e);
    }

    return this.installed;
  }
}

function downloadFile(url, outputPath) {
  return fetch(url)
      .then(x => x.arrayBuffer())
      .then(x => writeFile(outputPath, Buffer.from(x)));
}