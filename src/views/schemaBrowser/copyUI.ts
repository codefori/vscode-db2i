import { getBase, getInstance, loadBase } from "../../base";

export function getCopyUi() {
  return getBase()!.customUI()
    .addInput('toFile', 'To File', 'Name', {
        minlength: 1,
        maxlength: 10
    })
    .addInput('toLib', 'Library', 'Name', {
        default: '*LIBL',
        minlength: 1,
        maxlength: 10
    })
    .addInput('fromMbr', 'From member', 'Name, generic*, *FIRST, *ALL', {
        default: '*FIRST'
    })
    .addInput('toMbr', 'To member or label', 'Name, *FIRST, *FROMMBR, *ALL', {
        default: '*FIRST'
    })
    .addSelect('mbrOpt', 'Replace or add records', [
        { text: '*NONE', description: '*NONE', value: '*NONE' },
        { text: '*ADD', description: '*ADD', value: '*ADD' },
        { text: '*REPLACE', description: '*REPLACE', value: '*REPLACE' },
        { text: '*UPDADD', description: '*UPDADD', value: '*UPDADD' },
    ])
    .addSelect('crtFile', 'Create file', [
        { text: '*NO', description: '*NO', value: '*NO' },
        { text: '*YES', description: '*YES', value: '*YES' },
    ])
    .addSelect('outFmt', 'Print format', [
        { text: '*CHAR', description: '*CHAR', value: '*CHAR' },
        { text: '*HEX', description: '*HEX', value: '*HEX' },
    ])
    .addButtons(
        { id: 'copy', label: 'Copy', requiresValidation: true },
        { id: 'cancel', label: 'Cancel' }
    );
}