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
exports.getRegisteredAdapter = getRegisteredAdapter;
exports.pollOnceForActiveProvider = pollOnceForActiveProvider;
exports.getLatestSnapshotForProvider = getLatestSnapshotForProvider;
const bottleneck_1 = __importDefault(require("bottleneck"));
const electron_log_1 = __importDefault(require("electron-log"));
const schemas_1 = require("../../../shared/schemas");
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
        electron_log_1.default.warn('provider.rate-limit.stop-error', {
            providerId,
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
    await waitForCooldown(providerId);
    try {
        const result = await getLimiter(providerId).schedule(fn);
        if (isRateLimitSignal(result)) {
            const delayMs = markRateLimited(providerId);
            const signal = result;
            electron_log_1.default.warn('provider.rate-limit', {
                providerId,
                providerStatus: getProviderQuotaStatus(providerId),
                delayMs,
                message: signal.message ?? 'rate limit signal (response)',
                code: signal.code,
                statusCode: signal.status ?? signal.statusCode ?? signal.response?.status
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
            electron_log_1.default.warn('provider.rate-limit', {
                providerId,
                providerStatus: getProviderQuotaStatus(providerId),
                delayMs,
                message: error?.message ?? 'rate limit signal',
                code: error.code,
                statusCode: error.status ??
                    error.statusCode ??
                    error.response?.status
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
    const opportunities = await adapter.fetchOpportunities();
    const validated = schemas_1.arbitrageOpportunityListSchema.parse(opportunities);
    latestSnapshotByProviderId[providerId] = validated;
    latestSnapshotTimestampByProviderId[providerId] = new Date().toISOString();
    return validated;
}
function getLatestSnapshotForProvider(providerId) {
    return {
        opportunities: latestSnapshotByProviderId[providerId] ?? [],
        fetchedAt: latestSnapshotTimestampByProviderId[providerId] ?? null
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
