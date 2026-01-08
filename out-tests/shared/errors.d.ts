/**
 * Error types and categories for the Arbitrage Finder App.
 * These follow the discriminated union pattern defined in the architecture.
 */
/** Error categories as defined in architecture.md */
export type ErrorCategory = 'UserError' | 'ProviderError' | 'SystemError' | 'InfrastructureError';
/** Standard error codes used across the application */
export type ErrorCode = 'MISSING_API_KEY' | 'INVALID_API_KEY' | 'INVALID_FILTER' | 'VALIDATION_FAILED' | 'PROVIDER_TIMEOUT' | 'PROVIDER_RATE_LIMITED' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_RESPONSE_INVALID' | 'QUOTA_EXCEEDED' | 'INVARIANT_VIOLATION' | 'UNEXPECTED_ERROR' | 'PARSE_ERROR' | 'NETWORK_ERROR' | 'DISK_ERROR' | 'STORAGE_UNAVAILABLE' | 'UNKNOWN';
/** Structured error payload for IPC communication */
export interface IpcError {
    category: ErrorCategory;
    code: ErrorCode;
    message: string;
    details?: unknown;
    correlationId: string;
}
/** Success result for IPC procedures */
export interface IpcSuccess<T> {
    ok: true;
    data: T;
}
/** Failure result for IPC procedures */
export interface IpcFailure {
    ok: false;
    error: IpcError;
}
/** Discriminated union result type for all IPC procedures */
export type IpcResult<T> = IpcSuccess<T> | IpcFailure;
/** Type guard to check if result is success */
export declare function isIpcSuccess<T>(result: IpcResult<T>): result is IpcSuccess<T>;
/** Type guard to check if result is failure */
export declare function isIpcFailure<T>(result: IpcResult<T>): result is IpcFailure;
/** Helper to create a success result */
export declare function ipcSuccess<T>(data: T): IpcSuccess<T>;
/** Helper to create a failure result */
export declare function ipcFailure(category: ErrorCategory, code: ErrorCode, message: string, details?: unknown): IpcFailure;
