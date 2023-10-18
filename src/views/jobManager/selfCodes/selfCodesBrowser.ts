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