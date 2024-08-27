
import { env } from "process";
import { ServerComponent } from "../../connection/serverComponent";
import { JobManager } from "../../config";

export function localAssistIsEnabled() {
  return (env.DB2I_DISABLE_CA !== `true`);
}

export function remoteAssistIsEnabled() {
  return localAssistIsEnabled() && ServerComponent.isInstalled() && JobManager.getSelection() !== undefined;
}