import { ExtensionContext, commands, window } from "vscode";
import { ConnectionStorage } from "./Storage";
import { getInstance } from "./base";
import { SQLJobManager } from "./connection/manager";
import { ServerComponent } from "./connection/serverComponent";
import { JobManagerView } from "./views/jobManager/jobManagerView";

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

    const backendSupport = await ServerComponent.initialise().then(result => {
      if (result) {
        JobManagerView.setVisible(true);
      }
    });

    const didUpdate = ServerComponent.checkForUpdate().then(result => {
      if (result) {
        JobManagerView.setVisible(true);
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