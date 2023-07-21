import { ExtensionContext, commands, window } from "vscode";
import { ConnectionStorage } from "./Storage";
import { getInstance } from "./base";
import { SQLJobManager } from "./connection/manager";
import { ServerComponent } from "./connection/serverComponent";
import { JobManagerView } from "./views/jobManager/jobManagerView";
import Configuration from "./configuration";
import { ConfigManager } from "./views/jobManager/ConfigManager";

interface IBMiLevels {
  version: number;
  db2Level: number;
}

export let Config: ConnectionStorage;
export let OSData: IBMiLevels|undefined;
export let JobManager: SQLJobManager = new SQLJobManager();

export function setupConfig(context: ExtensionContext) {
  Config = new ConnectionStorage(context);

  getInstance().onEvent(`connected`, async () => {
    const instance = getInstance();

    Config.setConnectionName(instance.getConnection().currentConnectionName);

    await ServerComponent.initialise().then(installed => {
      if (installed) {
        JobManagerView.setVisible(true);
      }
    });

    ServerComponent.checkForUpdate().then(result => {
      if (ServerComponent.isInstalled()) {
        JobManagerView.setVisible(true);

        let newJob = Configuration.get<string>(`alwaysStartSQLJob`) || `ask`;
        if (typeof newJob !== `string`) newJob = `ask`; //For legacy settings where it used to be a boolean

        switch (newJob) {
          case `ask`:
            window.showInformationMessage(`Would you like to start an SQL Job?`, `Yes`, `Always`, `No`).then(async chosen => {
              if (chosen === `Yes` || chosen === `Always`) {
                if (chosen === `Always`) {
                  await Configuration.set(`alwaysStartSQLJob`, `new`);
                }
  
                commands.executeCommand(`vscode-db2i.jobManager.newJob`);
              }
            });
            break;

          case `new`:
            commands.executeCommand(`vscode-db2i.jobManager.newJob`);
            break;

          case `never`:
            break;

          default:
            if (ConfigManager.getConfig(newJob)) {
              commands.executeCommand(`vscode-db2i.jobManager.startJobFromConfig`, newJob);
            } else {
              commands.executeCommand(`vscode-db2i.jobManager.newJob`);
            }
            break;
        }
      }
    });
  });

  getInstance().onEvent(`disconnected`, async () => {
    JobManagerView.setVisible(false);
    await JobManager.endAll();
  });
}

export async function fetchSystemInfo() {
  const instance = getInstance();
  const content = instance.getContent();

  const [versionResults, db2LevelResults] = await Promise.all([
    content.runSQL(`select OS_VERSION || '.' || OS_RELEASE as VERSION from sysibmadm.env_sys_info`),
    content.runSQL([
      `select max(ptf_group_level) as HIGHEST_DB2_PTF_GROUP_LEVEL`,
      `from qsys2.group_ptf_info`,
      `where PTF_GROUP_DESCRIPTION like 'DB2 FOR IBM I%' and`,
      `ptf_group_status = 'INSTALLED';`
    ].join(` `))
  ]);

  const version = Number(versionResults[0].VERSION);
  const db2Level = Number(db2LevelResults[0].HIGHEST_DB2_PTF_GROUP_LEVEL);

  if (version && db2Level) {
    OSData = {
      version,
      db2Level
    }
  }
}