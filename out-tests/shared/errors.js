"use strict";
/**
 * Error types and categories for the Arbitrage Finder App.
 * These follow the discriminated union pattern defined in the architecture.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIpcSuccess = isIpcSuccess;
exports.isIpcFailure = isIpcFailure;
exports.ipcSuccess = ipcSuccess;
exports.ipcFailure = ipcFailure;
/** Type guard to check if result is success */
function isIpcSuccess(result) {
    return result.ok === true;
}
/** Type guard to check if result is failure */
function isIpcFailure(result) {
    return result.ok === false;
}
/** Helper to create a success result */
function ipcSuccess(data) {
    return { ok: true, data };
}
/** Helper to create a failure result */
function ipcFailure(category, code, message, details) {
    return {
        ok: false,
        error: {
            category,
            code,
            message,
            details,
            correlationId: generateCorrelationId()
        }
    };
}
/** Generate a simple correlation ID for error tracking */
function generateCorrelationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}
