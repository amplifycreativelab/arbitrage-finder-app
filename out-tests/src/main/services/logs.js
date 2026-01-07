"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openLogDirectory = openLogDirectory;
exports.getLogFilePath = getLogFilePath;
exports.openLogFile = openLogFile;
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const path_1 = __importDefault(require("path"));
const errors_1 = require("../../../shared/errors");
/**
 * Opens the application log directory in the system file explorer.
 * Uses electron-log's default log path.
 */
function openLogDirectory() {
    try {
        // electron-log stores logs in app.getPath('logs') by default
        // On Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs
        const logsPath = electron_1.app.getPath('logs');
        electron_log_1.default.info('[logs] Opening log directory', { path: logsPath });
        electron_1.shell.openPath(logsPath);
        return (0, errors_1.ipcSuccess)(undefined);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open log directory';
        electron_log_1.default.error('[logs] Failed to open log directory', { error: message });
        return (0, errors_1.ipcFailure)('InfrastructureError', 'DISK_ERROR', message);
    }
}
/**
 * Gets the path to the main log file.
 */
function getLogFilePath() {
    const logsPath = electron_1.app.getPath('logs');
    // electron-log default file name
    return path_1.default.join(logsPath, 'main.log');
}
/**
 * Opens the main log file directly in the default application.
 */
function openLogFile() {
    try {
        const logFilePath = getLogFilePath();
        electron_log_1.default.info('[logs] Opening log file', { path: logFilePath });
        electron_1.shell.openPath(logFilePath);
        return { ok: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open log file';
        electron_log_1.default.error('[logs] Failed to open log file', { error: message });
        return { ok: false, error: message };
    }
}
