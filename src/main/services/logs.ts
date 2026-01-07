import { app, shell } from 'electron'
import log from 'electron-log'
import path from 'path'
import type { IpcResult } from '../../../shared/errors'
import { ipcSuccess, ipcFailure } from '../../../shared/errors'

/**
 * Opens the application log directory in the system file explorer.
 * Uses electron-log's default log path.
 */
export function openLogDirectory(): IpcResult<void> {
  try {
    // electron-log stores logs in app.getPath('logs') by default
    // On Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs
    const logsPath = app.getPath('logs')
    
    log.info('[logs] Opening log directory', { path: logsPath })
    shell.openPath(logsPath)
    
    return ipcSuccess(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open log directory'
    log.error('[logs] Failed to open log directory', { error: message })
    return ipcFailure('InfrastructureError', 'DISK_ERROR', message)
  }
}

/**
 * Gets the path to the main log file.
 */
export function getLogFilePath(): string {
  const logsPath = app.getPath('logs')
  // electron-log default file name
  return path.join(logsPath, 'main.log')
}

/**
 * Opens the main log file directly in the default application.
 */
export function openLogFile(): { ok: true } | { ok: false; error: string } {
  try {
    const logFilePath = getLogFilePath()
    
    log.info('[logs] Opening log file', { path: logFilePath })
    shell.openPath(logFilePath)
    
    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open log file'
    log.error('[logs] Failed to open log file', { error: message })
    return { ok: false, error: message }
  }
}
