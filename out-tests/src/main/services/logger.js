"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secret = secret;
exports.getStructuredLoggerBackend = getStructuredLoggerBackend;
exports.setStructuredLoggerBackend = setStructuredLoggerBackend;
exports.createCorrelationId = createCorrelationId;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
exports.logHeartbeat = logHeartbeat;
const electron_log_1 = __importDefault(require("electron-log"));
const REDACTED = '***REDACTED***';
function secret(value) {
    return { __secret: true, value };
}
let backend = {
    info(event, payload) {
        electron_log_1.default.info(event, payload);
    },
    warn(event, payload) {
        electron_log_1.default.warn(event, payload);
    },
    error(event, payload) {
        electron_log_1.default.error(event, payload);
    }
};
function getStructuredLoggerBackend() {
    return backend;
}
function setStructuredLoggerBackend(next) {
    backend = next;
}
function isSecretKey(key) {
    const lower = key.toLowerCase();
    return (lower.includes('apikey') ||
        lower.includes('api_key') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password'));
}
function isSecretValue(value) {
    return !!value && typeof value === 'object' && value.__secret === true;
}
function scrubSecrets(value) {
    if (isSecretValue(value)) {
        return REDACTED;
    }
    if (Array.isArray(value)) {
        return value.map((item) => scrubSecrets(item));
    }
    if (value && typeof value === 'object') {
        const result = {};
        for (const [key, raw] of Object.entries(value)) {
            if (isSecretKey(key)) {
                result[key] = REDACTED;
            }
            else {
                result[key] = scrubSecrets(raw);
            }
        }
        return result;
    }
    return value;
}
function buildPayload(level, base) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        context: String(base.context),
        operation: String(base.operation),
        providerId: base.providerId,
        correlationId: base.correlationId,
        durationMs: base.durationMs ?? null,
        errorCategory: base.errorCategory ?? null
    };
    for (const [key, value] of Object.entries(base)) {
        if (key in payload)
            continue;
        payload[key] = value;
    }
    return scrubSecrets(payload);
}
function createCorrelationId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function logInfo(event, base) {
    const payload = buildPayload('info', base);
    backend.info(event, payload);
}
function logWarn(event, base) {
    const payload = buildPayload('warn', base);
    backend.warn(event, payload);
}
function logError(event, base) {
    const payload = buildPayload('error', base);
    backend.error(event, payload);
}
function logHeartbeat(base) {
    logInfo('poller.heartbeat', base);
}
