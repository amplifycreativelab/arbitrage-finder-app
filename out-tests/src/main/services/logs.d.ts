import type { IpcResult } from '../../../shared/errors';
/**
 * Opens the application log directory in the system file explorer.
 * Uses electron-log's default log path.
 */
export declare function openLogDirectory(): IpcResult<void>;
/**
 * Gets the path to the main log file.
 */
export declare function getLogFilePath(): string;
/**
 * Opens the main log file directly in the default application.
 */
export declare function openLogFile(): {
    ok: true;
} | {
    ok: false;
    error: string;
};
