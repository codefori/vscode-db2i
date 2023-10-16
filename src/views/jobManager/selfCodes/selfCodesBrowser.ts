import * as vscode from 'vscode';
import { JobManager } from '../../../config';
import { SelfCodeObject } from './selfCodes';

export class SelfCodesQuickPickItem implements vscode.QuickPickItem {
  label: string;
  description?: string;
  detail?: string;

  constructor(object: SelfCodeObject) {
    this.label = object.code;
    this.description = object.message;
  }
}

export async function setSelfCodes(codes: string[]) {
  try {
    await JobManager.runSQL(`SET SYSIBMADM.SELFCODES = SYSIBMADM.VALIDATE_SELF('${codes.join(', ')}')`);

    vscode.window.showInformationMessage(`Applied SELFCODES: ${codes}`);
  } catch (e) {
    vscode.window.showErrorMessage(e.message);
  }
}