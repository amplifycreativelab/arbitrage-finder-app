"use strict";
/**
 * Error mapper utility for mapping IPC error payloads to UI treatments.
 * Maps error.category to the appropriate display type and provides
 * user-friendly messages and guidance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapIpcError = mapIpcError;
exports.categoryToDisplayType = categoryToDisplayType;
exports.isIpcErrorShape = isIpcErrorShape;
exports.extractIpcError = extractIpcError;
/**
 * Maps an IPC error to a UI-friendly format based on error category.
 *
 * - UserError → inline (near the relevant control)
 * - ProviderError → banner (non-blocking notification)
 * - SystemError / InfrastructureError → errorBar (top-level alert)
 */
function mapIpcError(error) {
    const { category, code, message } = error;
    switch (category) {
        case 'UserError':
            return {
                displayType: 'inline',
                message: getUserErrorMessage(code, message),
                guidance: getUserErrorGuidance(code),
                actionText: getUserErrorAction(code),
                originalError: error
            };
        case 'ProviderError':
            return {
                displayType: 'banner',
                message: getProviderErrorMessage(code, message),
                guidance: getProviderErrorGuidance(code),
                actionText: getProviderErrorAction(code),
                originalError: error
            };
        case 'SystemError':
        case 'InfrastructureError':
            return {
                displayType: 'errorBar',
                message: getSystemErrorMessage(code, message),
                guidance: 'Check logs for more details.',
                actionText: 'Retry',
                originalError: error
            };
        default:
            return {
                displayType: 'errorBar',
                message: message || 'An unexpected error occurred.',
                originalError: error
            };
    }
}
/**
 * Maps a category string to the appropriate display type.
 * Useful when you only have the category, not the full error.
 */
function categoryToDisplayType(category) {
    switch (category) {
        case 'UserError':
            return 'inline';
        case 'ProviderError':
            return 'banner';
        case 'SystemError':
        case 'InfrastructureError':
            return 'errorBar';
        default:
            return 'errorBar';
    }
}
// === User Error Messages ===
function getUserErrorMessage(code, fallback) {
    switch (code) {
        case 'MISSING_API_KEY':
            return 'API key is required.';
        case 'INVALID_API_KEY':
            return 'The API key is invalid or malformed.';
        case 'INVALID_FILTER':
            return 'The selected filter combination is invalid.';
        case 'VALIDATION_FAILED':
            return 'Validation failed. Please check your input.';
        default:
            return fallback || 'A configuration error occurred.';
    }
}
function getUserErrorGuidance(code) {
    switch (code) {
        case 'MISSING_API_KEY':
            return 'Enter your API key in Provider Settings to enable this provider.';
        case 'INVALID_API_KEY':
            return 'Check that your API key is correctly copied from your provider dashboard.';
        case 'INVALID_FILTER':
            return 'Try adjusting your filter settings or reset to defaults.';
        case 'VALIDATION_FAILED':
            return 'Review the highlighted fields and correct any issues.';
        default:
            return undefined;
    }
}
function getUserErrorAction(code) {
    switch (code) {
        case 'MISSING_API_KEY':
        case 'INVALID_API_KEY':
            return 'Open Settings';
        case 'INVALID_FILTER':
            return 'Reset Filters';
        default:
            return undefined;
    }
}
// === Provider Error Messages ===
function getProviderErrorMessage(code, fallback) {
    switch (code) {
        case 'PROVIDER_TIMEOUT':
            return 'Provider request timed out.';
        case 'PROVIDER_RATE_LIMITED':
            return 'Rate limit exceeded. Requests are being throttled.';
        case 'QUOTA_EXCEEDED':
            return 'API quota has been exceeded.';
        case 'PROVIDER_UNAVAILABLE':
            return 'Provider is currently unavailable.';
        case 'PROVIDER_RESPONSE_INVALID':
            return 'Received an invalid response from the provider.';
        default:
            return fallback || 'Provider error occurred.';
    }
}
function getProviderErrorGuidance(code) {
    switch (code) {
        case 'PROVIDER_TIMEOUT':
            return 'The provider may be experiencing high load. Try again in a few minutes.';
        case 'PROVIDER_RATE_LIMITED':
        case 'QUOTA_EXCEEDED':
            return 'Wait for the quota to reset or reduce polling frequency.';
        case 'PROVIDER_UNAVAILABLE':
            return 'Check the provider status page and your network connection.';
        case 'PROVIDER_RESPONSE_INVALID':
            return 'This may be a temporary issue. The feed will retry automatically.';
        default:
            return undefined;
    }
}
function getProviderErrorAction(code) {
    switch (code) {
        case 'PROVIDER_TIMEOUT':
        case 'PROVIDER_UNAVAILABLE':
            return 'Retry Now';
        case 'PROVIDER_RATE_LIMITED':
        case 'QUOTA_EXCEEDED':
            return 'Check Quota';
        default:
            return undefined;
    }
}
// === System Error Messages ===
function getSystemErrorMessage(code, fallback) {
    switch (code) {
        case 'INVARIANT_VIOLATION':
            return 'An internal consistency error occurred.';
        case 'PARSE_ERROR':
            return 'Failed to parse data.';
        case 'NETWORK_ERROR':
            return 'A network error occurred.';
        case 'DISK_ERROR':
            return 'A storage error occurred.';
        case 'STORAGE_UNAVAILABLE':
            return 'Secure storage is unavailable.';
        case 'UNEXPECTED_ERROR':
        default:
            return fallback || 'Something went wrong. Please try again.';
    }
}
/**
 * Checks if an error response follows the IPC error format.
 */
function isIpcErrorShape(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    if (obj.ok !== false)
        return false;
    if (typeof obj.error !== 'object' || obj.error === null)
        return false;
    const err = obj.error;
    return (typeof err.category === 'string' &&
        typeof err.code === 'string' &&
        typeof err.message === 'string');
}
/**
 * Extracts an IpcError from various error formats (TRPC errors, thrown errors, etc.)
 */
function extractIpcError(error) {
    // Already in IPC error shape
    if (isIpcErrorShape(error)) {
        return error.error;
    }
    // Check if it's a nested error structure
    if (typeof error === 'object' && error !== null) {
        const obj = error;
        // TRPC error with data
        if (obj.data && isIpcErrorShape(obj.data)) {
            return obj.data.error;
        }
        // Direct error object
        if (typeof obj.category === 'string' &&
            typeof obj.code === 'string' &&
            typeof obj.message === 'string') {
            return obj;
        }
    }
    return null;
}
