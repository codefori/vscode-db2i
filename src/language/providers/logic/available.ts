
import { env } from "process";
import { ServerComponent } from "../../../connection/serverComponent";
import { JobManager } from "../../../config";
import { JobInfo } from "../../../connection/manager";
import Configuration from "../../../configuration";

export function useSystemNames() {
  return Configuration.get<boolean>(`syntax.useSystemNames`) || false;
}

export function localAssistIsEnabled() {
  return (env.DB2I_DISABLE_CA !== `true`);
}

export function remoteAssistIsEnabled(needsToBeReady?: boolean): JobInfo|undefined {
  if (!localAssistIsEnabled()) return;
  if (!ServerComponent.isInstalled()) return;

  const selection = JobManager.getSelection();
  if (!selection) return;
  if (selection.job.getStatus() !== `ready` && needsToBeReady) return;

  return selection;
}