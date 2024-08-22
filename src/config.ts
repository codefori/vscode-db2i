import { ExtensionContext, commands, window } from "vscode";
import { ConnectionStorage } from "./Storage";
import { getInstance } from "./base";
import { SQLJobManager } from "./connection/manager";
import { ServerComponent, UpdateStatus } from "./connection/serverComponent";
import { JobManagerView } from "./views/jobManager/jobManagerView";
import Configuration from "./configuration";
import { ConfigManager } from "./views/jobManager/ConfigManager";
import { Examples, ServiceInfoLabel } from "./views/examples";
import { updateStatusBar } from "./views/jobManager/statusBar";
import { IBMiDetail } from "./IBMiDetail";

export let Config: ConnectionStorage;
export let osDetail: IBMiDetail;
export let JobManager: SQLJobManager = new SQLJobManager();


export async function onConnectOrServerInstall(): Promise<boolean> {
  const instance = getInstance();

  Config.setConnectionName(instance.getConnection().currentConnectionName);

  await Config.fixPastQueries();

  osDetail = new IBMiDetail();

  await osDetail.fetchSystemInfo();

  await ServerComponent.initialise().then(installed => {
    if (installed) {
      JobManagerView.setVisible(true);
    }
  });

  await ServerComponent.checkForUpdate();

  updateStatusBar();

  if (ServerComponent.isInstalled()) {
    JobManagerView.setVisible(true);

    let newJob = Configuration.get<string>(`alwaysStartSQLJob`) || `ask`;
    if (typeof newJob !== `string`) newJob = `ask`; //For legacy settings where it used to be a boolean

    switch (newJob) {
    case `ask`:
      return await askAboutNewJob(true);

    case `new`:
      await commands.executeCommand(`vscode-db2i.jobManager.newJob`);
      return true;

    case `never`:
      break;

    default:
      if (ConfigManager.getConfig(newJob)) {
        await commands.executeCommand(`vscode-db2i.jobManager.startJobFromConfig`, newJob);
      } else {
        await commands.executeCommand(`vscode-db2i.jobManager.newJob`);
        return true;
      }
      break;
    }
  }
  return false;
}

export function initConfig(context: ExtensionContext) {
  Config = new ConnectionStorage(context);

  getInstance().onEvent(`disconnected`, async () => {
    JobManagerView.setVisible(false);
    JobManager.endAll();
    updateStatusBar();

    // Remove old service examples
    delete Examples[ServiceInfoLabel];

    // Close out the Visual Explain panels
    commands.executeCommand('vscode-db2i.dove.close');
  });
}

export async function askAboutNewJob(startup?: boolean): Promise<boolean> {
  const instance = getInstance();
  const connection = instance.getConnection();

  if (connection) {
    const options = startup ? [`Yes`, `Always`, `No`, `Never`] : [`Yes`, `No`];

    const chosen = await window.showInformationMessage(`Would you like to start an SQL Job?`, ...options);
    switch (chosen) {
      case `Yes`: 
      case `Always`:
        if (chosen === `Always`) {
          await Configuration.set(`alwaysStartSQLJob`, `new`);
        }

        await commands.executeCommand(`vscode-db2i.jobManager.newJob`);
        return true;

      case `Never`:
        await Configuration.set(`alwaysStartSQLJob`, `never`);
        break;
    }
  }

  return false;
}