"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportedBookmakers = getSupportedBookmakers;
exports.getSelectedBookmakers = getSelectedBookmakers;
exports.selectBookmakers = selectBookmakers;
exports.clearSelectedBookmakers = clearSelectedBookmakers;
const electron_1 = require("electron");
const logger_1 = require("./logger");
const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io';
const ODDS_API_IO_BOOKMAKERS_PATH = '/v3/bookmakers';
const ODDS_API_IO_SELECTED_BOOKMAKERS_PATH = '/v3/bookmakers/selected';
const ODDS_API_IO_SELECTED_BOOKMAKERS_SELECT_PATH = '/v3/bookmakers/selected/select';
const ODDS_API_IO_SELECTED_BOOKMAKERS_CLEAR_PATH = '/v3/bookmakers/selected/clear';
function getHttpFetch() {
    // Use Electron's net.fetch which handles network properly in the main process
    // This is more reliable than globalThis.fetch in Electron
    if (typeof electron_1.net?.fetch === 'function') {
        return electron_1.net.fetch;
    }
    const httpFetch = globalThis.fetch;
    if (typeof httpFetch !== 'function') {
        throw new Error('Global fetch is not available for Odds-API.io bookmaker management');
    }
    return httpFetch;
}
function extractStringList(payload) {
    const candidates = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.bookmakers)
            ? payload.bookmakers
            : Array.isArray(payload.selectedBookmakers)
                ? payload.selectedBookmakers
                : Array.isArray(payload.selected)
                    ? payload.selected
                    : Array.isArray(payload.data)
                        ? payload.data
                        : [];
    const strings = [];
    for (const item of candidates) {
        if (typeof item === 'string') {
            strings.push(item);
        }
        else if (item && typeof item === 'object' && typeof item.name === 'string') {
            strings.push(item.name);
        }
    }
    return Array.from(new Set(strings.map((s) => s.trim()).filter(Boolean)));
}
async function getSupportedBookmakers() {
    const correlationId = (0, logger_1.createCorrelationId)();
    const startedAt = Date.now();
    let responseStatus;
    try {
        const httpFetch = getHttpFetch();
        const url = new URL(ODDS_API_IO_BOOKMAKERS_PATH, ODDS_API_IO_BASE_URL);
        const response = await httpFetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' }
        }).catch((fetchError) => {
            throw new Error(`Network error fetching bookmakers: ${fetchError.message}`);
        });
        responseStatus = response.status;
        if (!response.ok) {
            const message = await response
                .text()
                .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
                .catch(() => `Odds-API.io request failed with status ${response.status}`);
            throw new Error(message);
        }
        const body = (await response.json());
        const raw = Array.isArray(body) ? body : [];
        const bookmakers = raw
            .map((item) => {
            const name = item && typeof item === 'object' ? item.name : undefined;
            const active = item && typeof item === 'object' ? item.active : undefined;
            return {
                name: typeof name === 'string' ? name : '',
                active: typeof active === 'boolean' ? active : false
            };
        })
            .filter((b) => Boolean(b.name));
        (0, logger_1.logInfo)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'getSupportedBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: null,
            success: true,
            httpStatus: responseStatus,
            bookmakersCount: bookmakers.length
        });
        return bookmakers;
    }
    catch (error) {
        (0, logger_1.logError)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'getSupportedBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
            success: false,
            httpStatus: responseStatus,
            message: error?.message ?? 'Odds-API.io bookmaker request failed'
        });
        throw error;
    }
}
async function getSelectedBookmakers(apiKey) {
    const correlationId = (0, logger_1.createCorrelationId)();
    const startedAt = Date.now();
    let responseStatus;
    try {
        const httpFetch = getHttpFetch();
        const url = new URL(ODDS_API_IO_SELECTED_BOOKMAKERS_PATH, ODDS_API_IO_BASE_URL);
        url.searchParams.set('apiKey', apiKey);
        const response = await httpFetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' }
        });
        responseStatus = response.status;
        if (!response.ok) {
            const message = await response
                .text()
                .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
                .catch(() => `Odds-API.io request failed with status ${response.status}`);
            throw new Error(message);
        }
        const body = (await response.json());
        const selected = extractStringList(body);
        (0, logger_1.logInfo)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'getSelectedBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: null,
            success: true,
            httpStatus: responseStatus,
            selectedCount: selected.length
        });
        return selected;
    }
    catch (error) {
        (0, logger_1.logError)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'getSelectedBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
            success: false,
            httpStatus: responseStatus,
            message: error?.message ?? 'Odds-API.io bookmaker request failed'
        });
        throw error;
    }
}
async function selectBookmakers(apiKey, bookmakers) {
    const correlationId = (0, logger_1.createCorrelationId)();
    const startedAt = Date.now();
    let responseStatus;
    const list = Array.from(new Set(bookmakers.map((b) => b.trim()).filter(Boolean)));
    if (!list.length) {
        throw new Error('No bookmakers provided');
    }
    try {
        const httpFetch = getHttpFetch();
        const url = new URL(ODDS_API_IO_SELECTED_BOOKMAKERS_SELECT_PATH, ODDS_API_IO_BASE_URL);
        url.searchParams.set('apiKey', apiKey);
        url.searchParams.set('bookmakers', list.join(','));
        const response = await httpFetch(url.toString(), {
            method: 'PUT',
            headers: { Accept: 'application/json' }
        });
        responseStatus = response.status;
        if (!response.ok) {
            const message = await response
                .text()
                .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
                .catch(() => `Odds-API.io request failed with status ${response.status}`);
            throw new Error(message);
        }
        (0, logger_1.logInfo)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'selectBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: null,
            success: true,
            httpStatus: responseStatus,
            selectedCount: list.length
        });
    }
    catch (error) {
        (0, logger_1.logError)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'selectBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
            success: false,
            httpStatus: responseStatus,
            message: error?.message ?? 'Odds-API.io bookmaker request failed'
        });
        throw error;
    }
}
async function clearSelectedBookmakers(apiKey) {
    const correlationId = (0, logger_1.createCorrelationId)();
    const startedAt = Date.now();
    let responseStatus;
    try {
        const httpFetch = getHttpFetch();
        const url = new URL(ODDS_API_IO_SELECTED_BOOKMAKERS_CLEAR_PATH, ODDS_API_IO_BASE_URL);
        url.searchParams.set('apiKey', apiKey);
        const response = await httpFetch(url.toString(), {
            method: 'PUT',
            headers: { Accept: 'application/json' }
        });
        responseStatus = response.status;
        if (!response.ok) {
            const message = await response
                .text()
                .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
                .catch(() => `Odds-API.io request failed with status ${response.status}`);
            throw new Error(message);
        }
        (0, logger_1.logInfo)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'clearSelectedBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: null,
            success: true,
            httpStatus: responseStatus
        });
    }
    catch (error) {
        (0, logger_1.logError)('provider.bookmakers', {
            context: 'service:odds-api-io-bookmakers',
            operation: 'clearSelectedBookmakers',
            providerId: 'odds-api-io',
            correlationId,
            durationMs: Date.now() - startedAt,
            errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
            success: false,
            httpStatus: responseStatus,
            message: error?.message ?? 'Odds-API.io bookmaker request failed'
        });
        throw error;
    }
}
