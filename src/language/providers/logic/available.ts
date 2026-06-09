
import { env } from "process";
import { JobManager } from "../../../config";
import Configuration from "../../../configuration";
import { JobInfo } from "../../../connection/manager";

export function useSystemNames() {
  return Configuration.get<boolean>(`syntax.useSystemNames`) || false;
}

export function localAssistIsEnabled() {
  return (env.DB2I_DISABLE_CA !== `true`);
}

export function remoteAssistIsEnabled(needsToBeReady?: boolean): JobInfo|undefined {
  if (!localAssistIsEnabled()) return;

  const selection = JobManager.getSelection();
  if (!selection) return;
  if (selection.job.getStatus() !== `ready` && needsToBeReady) return;

  return selection;
}