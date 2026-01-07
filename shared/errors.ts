/**
 * Error types and categories for the Arbitrage Finder App.
 * These follow the discriminated union pattern defined in the architecture.
 */

/** Error categories as defined in architecture.md */
export type ErrorCategory = 'UserError' | 'ProviderError' | 'SystemError' | 'InfrastructureError'

/** Standard error codes used across the application */
export type ErrorCode =
  // User errors
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'INVALID_FILTER'
  | 'VALIDATION_FAILED'
  // Provider errors
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'QUOTA_EXCEEDED'
  // System errors
  | 'INVARIANT_VIOLATION'
  | 'UNEXPECTED_ERROR'
  | 'PARSE_ERROR'
  // Infrastructure errors
  | 'NETWORK_ERROR'
  | 'DISK_ERROR'
  | 'STORAGE_UNAVAILABLE'
  // Generic
  | 'UNKNOWN'

/** Structured error payload for IPC communication */
export interface IpcError {
  category: ErrorCategory
  code: ErrorCode
  message: string
  details?: unknown
  correlationId: string
}

/** Success result for IPC procedures */
export interface IpcSuccess<T> {
  ok: true
  data: T
}

/** Failure result for IPC procedures */
export interface IpcFailure {
  ok: false
  error: IpcError
}

/** Discriminated union result type for all IPC procedures */
export type IpcResult<T> = IpcSuccess<T> | IpcFailure

/** Type guard to check if result is success */
export function isIpcSuccess<T>(result: IpcResult<T>): result is IpcSuccess<T> {
  return result.ok === true
}

/** Type guard to check if result is failure */
export function isIpcFailure<T>(result: IpcResult<T>): result is IpcFailure {
  return result.ok === false
}

/** Helper to create a success result */
export function ipcSuccess<T>(data: T): IpcSuccess<T> {
  return { ok: true, data }
}

/** Helper to create a failure result */
export function ipcFailure(
  category: ErrorCategory,
  code: ErrorCode,
  message: string,
  details?: unknown
): IpcFailure {
  return {
    ok: false,
    error: {
      category,
      code,
      message,
      details,
      correlationId: generateCorrelationId()
    }
  }
}

/** Generate a simple correlation ID for error tracking */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}
