"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyTextToClipboard = copyTextToClipboard;
let clipboard;
const hasElectronRuntime = typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    !!process.versions.electron;
if (hasElectronRuntime) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron');
    clipboard = electron.clipboard;
}
function copyTextToClipboard(text) {
    if (!clipboard) {
        throw new Error('Clipboard API is not available outside Electron runtime.');
    }
    clipboard.writeText(text);
}
