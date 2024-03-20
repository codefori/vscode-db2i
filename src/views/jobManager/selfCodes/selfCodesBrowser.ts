import * as vscode from 'vscode';
import { JobManager } from '../../../config';
import { SelfCodeObject, SelfValue } from './nodes';

export class SelfCodesQuickPickItem implements vscode.QuickPickItem {
  label: SelfValue;
  description?: string;
  detail?: string;

  constructor(object: SelfCodeObject) {
    this.label = object.code;
    this.description = object.message;
  }
}