import { SQLExample } from "../views/examples";
import { JobManager } from "../config";
import Statement from "./statement";

export async function getServiceInfo(): Promise<SQLExample[]|undefined> {
  // The reason we check for a selection is because we don't want it to prompt the user to start one here
  if (JobManager.getSelection()) {
    const resultSet = await JobManager.runSQL<{SERVICE_NAME: string, EXAMPLE: string}>(`select SERVICE_NAME, EXAMPLE from qsys2.services_info`);

    return resultSet.map(r => ({
      name: Statement.prettyName(r.SERVICE_NAME),
      content: [r.EXAMPLE],
    }))
  } else {
    return undefined;
  }
}