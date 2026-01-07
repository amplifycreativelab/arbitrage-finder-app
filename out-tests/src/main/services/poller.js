"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test = void 0;
exports.getRateLimiterConfig = getRateLimiterConfig;
exports.getProviderQuotaStatus = getProviderQuotaStatus;
exports.scheduleProviderRequest = scheduleProviderRequest;
exports.registerAdapter = registerAdapter;
exports.registerAdapters = registerAdapters;
exports.notifyActiveProviderChanged = notifyActiveProviderChanged;
exports.getActiveProviderForPolling = getActiveProviderForPolling;
exports.notifyEnabledProvidersChanged = notifyEnabledProvidersChanged;
exports.getEnabledProvidersForPolling = getEnabledProvidersForPolling;
exports.pollOnceForEnabledProviders = pollOnceForEnabledProviders;
exports.getRegisteredAdapter = getRegisteredAdapter;
exports.pollOnceForActiveProvider = pollOnceForActiveProvider;
exports.getLatestSnapshotForProvider = getLatestSnapshotForProvider;
exports.getDashboardStatusSnapshot = getDashboardStatusSnapshot;
const bottleneck_1 = __importDefault(require("bottleneck"));
const schemas_1 = require("../../../shared/schemas");
const logger_1 = require("./logger");
const credentials_1 = require("../credentials");
const PRD_REQUESTS_PER_HOUR = 5000;
const DEFAULT_LIMITER_CONFIG = {
    minTime: 720, // 3600s / 5000 req => ~0.72s spacing (FR8, NFR1)
    maxConcurrent: 1,
    reservoir: PRD_REQUESTS_PER_HOUR,
    reservoirRefreshAmount: PRD_REQUESTS_PER_HOUR,
    reservoirRefreshInterval: 60 * 60 * 1000
};
const rateLimiterConfigByProvider = {
    'odds-api-io': DEFAULT_LIMITER_CONFIG,
    'the-odds-api': DEFAULT_LIMITER_CONFIG
};
const limiterByProvider = new Map();
const backoffByProvider = {};
const providerStatus = {};
let currentCorrelationId = null;
const lastProviderErrorTimestampByProviderId = {};
const lastProviderErrorCategoryByProviderId = {};
let lastSystemErrorTimestamp = null;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 15000;
const JITTER_MS = 300;
function resolveLimiterConfig(providerId) {
    return rateLimiterConfigByProvider[providerId] ?? DEFAULT_LIMITER_CONFIG;
}
function getLimiter(providerId) {
    const existing = limiterByProvider.get(providerId);
    if (existing) {
        return existing;
    }
    const cfg = resolveLimiterConfig(providerId);
    const limiter = new bottleneck_1.default({
        minTime: cfg.minTime,
        maxConcurrent: cfg.maxConcurrent,
        reservoir: cfg.reservoir,
        reservoirRefreshAmount: cfg.reservoirRefreshAmount,
        reservoirRefreshInterval: cfg.reservoirRefreshInterval
    });
    limiterByProvider.set(providerId, limiter);
    return limiter;
}
function setProviderStatus(providerId, status) {
    providerStatus[providerId] = status;
}
function clearBackoff(providerId) {
    backoffByProvider[providerId] = {
        consecutive429s: 0,
        cooldownUntil: null,
        lastBackoffMs: 0
    };
    setProviderStatus(providerId, 'OK');
}
function ensureBackoffState(providerId) {
    if (!backoffByProvider[providerId]) {
        backoffByProvider[providerId] = {
            consecutive429s: 0,
            cooldownUntil: null,
            lastBackoffMs: 0
        };
    }
    return backoffByProvider[providerId];
}
function computeBackoffMs(consecutive429s) {
    const exponent = Math.max(0, consecutive429s - 1);
    const base = BASE_BACKOFF_MS * Math.pow(2, exponent);
    const jitter = Math.floor(Math.random() * JITTER_MS);
    return Math.min(MAX_BACKOFF_MS, base + jitter);
}
function markErrorForStatus(providerId, category, _error) {
    const nowIso = new Date().toISOString();
    if (category === 'ProviderError') {
        lastProviderErrorTimestampByProviderId[providerId] = nowIso;
        lastProviderErrorCategoryByProviderId[providerId] = category;
    }
    else if (category === 'SystemError') {
        lastSystemErrorTimestamp = nowIso;
    }
    // For other categories (UserError, InfrastructureError, null) we do not
    // currently feed into the status model.
}
async function dropQueuedJobsAndResetLimiter(providerId) {
    const limiter = limiterByProvider.get(providerId);
    if (!limiter) {
        return;
    }
    limiterByProvider.delete(providerId);
    try {
        await limiter.stop({
            dropWaitingJobs: true,
            dropErrorMessage: 'Dropped due to provider rate limiting backoff'
        });
    }
    catch (error) {
        (0, logger_1.logWarn)('provider.rate-limit.stop-error', {
            context: 'service:poller',
            operation: 'dropQueuedJobsAndResetLimiter',
            providerId,
            correlationId: currentCorrelationId ?? undefined,
            durationMs: null,
            errorCategory: 'ProviderError',
            message: error?.message ?? 'failed to stop limiter after rate limit signal'
        });
    }
}
function markRateLimited(providerId) {
    const state = ensureBackoffState(providerId);
    state.consecutive429s += 1;
    const backoffMs = computeBackoffMs(state.consecutive429s);
    state.lastBackoffMs = backoffMs;
    state.cooldownUntil = Date.now() + backoffMs;
    const status = state.consecutive429s >= 2 ? 'Degraded' : 'QuotaLimited';
    setProviderStatus(providerId, status);
    void dropQueuedJobsAndResetLimiter(providerId);
    return backoffMs;
}
function isRateLimitSignal(signal) {
    const err = signal;
    return (err?.status === 429 ||
        err?.statusCode === 429 ||
        err?.response?.status === 429 ||
        err?.code === 'RATE_LIMITED');
}
async function waitForCooldown(providerId) {
    const state = backoffByProvider[providerId];
    if (!state?.cooldownUntil) {
        return;
    }
    const now = Date.now();
    if (state.cooldownUntil <= now) {
        return;
    }
    const waitMs = state.cooldownUntil - now;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
}
let activeProviderIdForPolling = null;
// Multi-provider polling targets (Story 5.1)
const enabledProvidersForPolling = new Set();
const adaptersByProviderId = {};
const latestSnapshotByProviderId = {};
const latestSnapshotTimestampByProviderId = {};
clearBackoff('odds-api-io');
clearBackoff('the-odds-api');
function getRateLimiterConfig(providerId) {
    return resolveLimiterConfig(providerId);
}
function getProviderQuotaStatus(providerId) {
    return providerStatus[providerId] ?? 'OK';
}
async function scheduleProviderRequest(providerId, fn) {
    const correlationId = currentCorrelationId ?? (0, logger_1.createCorrelationId)();
    await waitForCooldown(providerId);
    try {
        const result = await getLimiter(providerId).schedule(() => fn({ correlationId }));
        if (isRateLimitSignal(result)) {
            const delayMs = markRateLimited(providerId);
            const signal = result;
            const statusCode = signal.status ?? signal.statusCode ?? signal.response?.status;
            (0, logger_1.logWarn)('provider.rate-limit', {
                context: 'service:poller',
                operation: 'scheduleProviderRequest',
                providerId,
                correlationId,
                durationMs: null,
                errorCategory: 'ProviderError',
                providerStatus: getProviderQuotaStatus(providerId),
                delayMs,
                message: signal.message ?? 'rate limit signal (response)',
                code: signal.code,
                statusCode
            });
            const error = new Error(signal.message ?? 'Rate limited');
            error.status =
                signal.status ?? signal.statusCode ?? signal.response?.status ?? 429;
            error.__fromRateLimitResult = true;
            throw error;
        }
        clearBackoff(providerId);
        return result;
    }
    catch (error) {
        if (isRateLimitSignal(error) &&
            !error.__fromRateLimitResult) {
            const delayMs = markRateLimited(providerId);
            const statusCode = error.status ??
                error.statusCode ??
                error.response?.status;
            (0, logger_1.logWarn)('provider.rate-limit', {
                context: 'service:poller',
                operation: 'scheduleProviderRequest',
                providerId,
                correlationId,
                durationMs: null,
                errorCategory: 'ProviderError',
                providerStatus: getProviderQuotaStatus(providerId),
                delayMs,
                message: error?.message ?? 'rate limit signal',
                code: error.code,
                statusCode
            });
        }
        throw error;
    }
}
function registerAdapter(adapter) {
    const usesCentralLimiter = adapter.__usesCentralRateLimiter === true;
    if (usesCentralLimiter) {
        adaptersByProviderId[adapter.id] = adapter;
        return;
    }
    const providerId = adapter.id;
    const originalFetch = adapter.fetchOpportunities.bind(adapter);
    adaptersByProviderId[providerId] = {
        id: providerId,
        async fetchOpportunities() {
            return scheduleProviderRequest(providerId, () => originalFetch());
        },
        __usesCentralRateLimiter: true
    };
}
function registerAdapters(adapters) {
    for (const adapter of adapters) {
        registerAdapter(adapter);
    }
}
function notifyActiveProviderChanged(providerId) {
    activeProviderIdForPolling = providerId;
}
function getActiveProviderForPolling() {
    return activeProviderIdForPolling;
}
// ============================================================
// Multi-provider polling functions (Story 5.1)
// ============================================================
/**
 * Update the set of enabled providers for polling.
 * Called when user enables/disables providers in settings.
 */
function notifyEnabledProvidersChanged(providers) {
    enabledProvidersForPolling.clear();
    for (const providerId of providers) {
        enabledProvidersForPolling.add(providerId);
    }
}
/**
 * Get all currently enabled providers for polling.
 */
function getEnabledProvidersForPolling() {
    return Array.from(enabledProvidersForPolling);
}
/**
 * Poll all enabled providers and return concatenated opportunities.
 * Each provider is polled respecting its own rate limiter.
 */
async function pollOnceForEnabledProviders() {
    const providerIds = Array.from(enabledProvidersForPolling);
    if (providerIds.length === 0) {
        return [];
    }
    const correlationId = (0, logger_1.createCorrelationId)();
    const tickStartedAt = Date.now();
    const allOpportunities = [];
    const errors = [];
    currentCorrelationId = correlationId;
    // Poll each enabled provider (sequentially to respect rate limits)
    for (const providerId of providerIds) {
        const adapter = adaptersByProviderId[providerId];
        if (!adapter) {
            continue;
        }
        try {
            const result = await adapter.fetchOpportunities();
            const validated = schemas_1.arbitrageOpportunityListSchema.parse(result);
            // Tag each opportunity with its source provider (Story 5.1)
            const taggedOpportunities = validated.map((opp) => ({
                ...opp,
                providerId
            }));
            latestSnapshotByProviderId[providerId] = taggedOpportunities;
            latestSnapshotTimestampByProviderId[providerId] = new Date().toISOString();
            allOpportunities.push(...taggedOpportunities);
        }
        catch (error) {
            const status = error.status ??
                error.statusCode ??
                error.response?.status;
            const errorCategory = typeof status === 'number' && status >= 400 ? 'ProviderError' : 'SystemError';
            markErrorForStatus(providerId, errorCategory, error);
            errors.push({ providerId, error });
        }
    }
    currentCorrelationId = null;
    const durationMs = Date.now() - tickStartedAt;
    const nowIso = new Date().toISOString();
    const providerStatuses = {
        'odds-api-io': getProviderQuotaStatus('odds-api-io'),
        'the-odds-api': getProviderQuotaStatus('the-odds-api')
    };
    const lastSuccessfulFetchTimestamps = {
        'odds-api-io': latestSnapshotTimestampByProviderId['odds-api-io'] ?? null,
        'the-odds-api': latestSnapshotTimestampByProviderId['the-odds-api'] ?? null
    };
    const staleThresholdMs = 5 * 60 * 1000;
    const hasStaleProvider = Object.values(lastSuccessfulFetchTimestamps).some((ts) => {
        if (!ts)
            return false;
        const ageMs = Date.now() - new Date(ts).getTime();
        return ageMs > staleThresholdMs;
    });
    let systemStatus = 'OK';
    const hasErrors = errors.length > 0;
    if (hasErrors && errors.some((e) => {
        const status = e.error.status;
        return typeof status !== 'number' || status < 400 || status >= 500;
    })) {
        systemStatus = 'Error';
    }
    else if (Object.values(providerStatuses).some((status) => status === 'QuotaLimited' || status === 'Degraded')) {
        systemStatus = 'Degraded';
    }
    else if (hasStaleProvider) {
        systemStatus = 'Stale';
    }
    (0, logger_1.logHeartbeat)({
        context: 'service:poller',
        operation: 'pollOnceForEnabledProviders',
        // Use providerIds (plural) for multi-provider polling, not providerId
        providerIds: providerIds,
        correlationId,
        durationMs,
        errorCategory: hasErrors ? 'ProviderError' : null,
        success: errors.length === 0,
        opportunitiesCount: allOpportunities.length,
        providerStatuses,
        lastSuccessfulFetchTimestamps,
        systemStatus,
        tickStartedAt: new Date(tickStartedAt).toISOString(),
        tickCompletedAt: nowIso,
        errorMessage: errors.length > 0 ? `Errors from ${errors.map((e) => e.providerId).join(', ')}` : undefined
    });
    return allOpportunities;
}
function getRegisteredAdapter(providerId) {
    return adaptersByProviderId[providerId] ?? null;
}
async function pollOnceForActiveProvider() {
    const providerId = activeProviderIdForPolling;
    if (!providerId) {
        return [];
    }
    const adapter = adaptersByProviderId[providerId];
    if (!adapter) {
        return [];
    }
    const correlationId = (0, logger_1.createCorrelationId)();
    const tickStartedAt = Date.now();
    let success = false;
    let opportunities = [];
    let errorCategory = null;
    let errorMessage;
    currentCorrelationId = correlationId;
    try {
        const result = await adapter.fetchOpportunities();
        const validated = schemas_1.arbitrageOpportunityListSchema.parse(result);
        // Tag each opportunity with its source provider (Story 5.1)
        opportunities = validated.map((opp) => ({
            ...opp,
            providerId
        }));
        latestSnapshotByProviderId[providerId] = opportunities;
        latestSnapshotTimestampByProviderId[providerId] = new Date().toISOString();
        success = true;
        return validated;
    }
    catch (error) {
        const status = error.status ??
            error.statusCode ??
            error.response?.status;
        if (typeof status === 'number' && status >= 400) {
            errorCategory = 'ProviderError';
        }
        else {
            errorCategory = 'SystemError';
        }
        errorMessage = error?.message ?? 'pollOnceForActiveProvider error';
        markErrorForStatus(providerId, errorCategory, error);
        throw error;
    }
    finally {
        currentCorrelationId = null;
        const durationMs = Date.now() - tickStartedAt;
        const nowIso = new Date().toISOString();
        const providerStatuses = {
            'odds-api-io': getProviderQuotaStatus('odds-api-io'),
            'the-odds-api': getProviderQuotaStatus('the-odds-api')
        };
        const lastSuccessfulFetchTimestamps = {
            'odds-api-io': latestSnapshotTimestampByProviderId['odds-api-io'] ?? null,
            'the-odds-api': latestSnapshotTimestampByProviderId['the-odds-api'] ?? null
        };
        const staleThresholdMs = 5 * 60 * 1000;
        const hasStaleProvider = Object.values(lastSuccessfulFetchTimestamps).some((ts) => {
            if (!ts)
                return false;
            const ageMs = Date.now() - new Date(ts).getTime();
            return ageMs > staleThresholdMs;
        });
        let systemStatus = 'OK';
        if (!success && errorCategory === 'SystemError') {
            systemStatus = 'Error';
        }
        else if (Object.values(providerStatuses).some((status) => status === 'QuotaLimited' || status === 'Degraded')) {
            systemStatus = 'Degraded';
        }
        else if (hasStaleProvider) {
            systemStatus = 'Stale';
        }
        (0, logger_1.logHeartbeat)({
            context: 'service:poller',
            operation: 'pollOnceForActiveProvider',
            providerId,
            correlationId,
            durationMs,
            errorCategory,
            success,
            opportunitiesCount: opportunities.length,
            providerStatuses,
            lastSuccessfulFetchTimestamps,
            systemStatus,
            tickStartedAt: new Date(tickStartedAt).toISOString(),
            tickCompletedAt: nowIso,
            errorMessage
        });
    }
}
function getLatestSnapshotForProvider(providerId) {
    return {
        opportunities: latestSnapshotByProviderId[providerId] ?? [],
        fetchedAt: latestSnapshotTimestampByProviderId[providerId] ?? null
    };
}
async function getDashboardStatusSnapshot() {
    const providerIds = ['odds-api-io', 'the-odds-api'];
    const now = Date.now();
    const staleThresholdMs = 5 * 60 * 1000;
    const providers = [];
    let hasQuotaOrDegraded = false;
    let hasStaleProvider = false;
    for (const providerId of providerIds) {
        const quotaStatus = getProviderQuotaStatus(providerId);
        const lastSuccessfulFetchAt = latestSnapshotTimestampByProviderId[providerId] ?? null;
        const lastErrorAt = lastProviderErrorTimestampByProviderId[providerId] ?? null;
        const isConfigured = await (0, credentials_1.isProviderConfigured)(providerId);
        const lastSuccessMs = lastSuccessfulFetchAt !== null ? new Date(lastSuccessfulFetchAt).getTime() : null;
        const isStale = lastSuccessMs !== null && now - lastSuccessMs > staleThresholdMs;
        if (isStale) {
            hasStaleProvider = true;
        }
        let providerStatusResolved = 'OK';
        if (!isConfigured) {
            providerStatusResolved = 'ConfigMissing';
        }
        else if (quotaStatus === 'QuotaLimited') {
            providerStatusResolved = 'QuotaLimited';
            hasQuotaOrDegraded = true;
        }
        else if (quotaStatus === 'Degraded') {
            providerStatusResolved = 'Degraded';
            hasQuotaOrDegraded = true;
        }
        else if (lastErrorAt &&
            lastProviderErrorCategoryByProviderId[providerId] === 'ProviderError' &&
            now - new Date(lastErrorAt).getTime() <= staleThresholdMs) {
            providerStatusResolved = 'Down';
        }
        providers.push({
            providerId,
            status: providerStatusResolved,
            lastSuccessfulFetchAt
        });
    }
    let systemStatus = 'OK';
    const hasRecentSystemError = lastSystemErrorTimestamp !== null &&
        now - new Date(lastSystemErrorTimestamp).getTime() <= staleThresholdMs;
    if (hasRecentSystemError) {
        systemStatus = 'Error';
    }
    else if (hasQuotaOrDegraded) {
        systemStatus = 'Degraded';
    }
    else if (hasStaleProvider) {
        systemStatus = 'Stale';
    }
    const lastUpdatedAt = (() => {
        const timestamps = providers
            .map((provider) => provider.lastSuccessfulFetchAt)
            .filter((value) => typeof value === 'string');
        if (timestamps.length === 0) {
            return null;
        }
        return timestamps.reduce((latest, ts) => (ts > latest ? ts : latest));
    })();
    return {
        systemStatus,
        providers,
        lastUpdatedAt
    };
}
exports.__test = {
    resetLimiterState() {
        limiterByProvider.clear();
        Object.keys(backoffByProvider).forEach((providerId) => clearBackoff(providerId));
        Object.keys(providerStatus).forEach((providerId) => setProviderStatus(providerId, 'OK'));
    },
    getLimiterCounts(providerId) {
        return getLimiter(providerId).counts();
    },
    getBackoffState(providerId) {
        return ensureBackoffState(providerId);
    }
};
