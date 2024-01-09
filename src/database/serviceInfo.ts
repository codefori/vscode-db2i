import { JobManager } from "../config";
import { SQLExample } from "../views/examples";
import Statement from "./statement";

export async function getServiceInfo(): Promise<SQLExample[]> {
  // The reason we check for a selection is because we don't want it to prompt the user to start one here
  if (JobManager.getSelection()) {
    const resultSet = await JobManager.runSQL<{ SERVICE_NAME: string, EXAMPLE: string }>(`select SERVICE_NAME, EXAMPLE from qsys2.services_info`);

    return resultSet.map(r => ({
      name: Statement.prettyName(r.SERVICE_NAME),
      content: [r.EXAMPLE],
    }))
  } else {
    return [{ name: "Please start an SQL job to load the examples", content: [""] }];
  }
}