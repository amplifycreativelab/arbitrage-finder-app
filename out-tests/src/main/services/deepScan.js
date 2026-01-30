"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test = exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS = exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE = exports.SCAN_CACHE_TTL_MS_DEFAULT = void 0;
exports.getAllRawOdds = getAllRawOdds;
exports.clearRawOddsCache = clearRawOddsCache;
exports.clearScanCache = clearScanCache;
exports.shouldScanEvent = shouldScanEvent;
exports.discoverAllEvents = discoverAllEvents;
exports.getBatchOddsFetcher = getBatchOddsFetcher;
exports.getLiveEventsFetcher = getLiveEventsFetcher;
exports.getIncrementalOddsFetcher = getIncrementalOddsFetcher;
exports.getLastIncrementalFetchTimestamp = getLastIncrementalFetchTimestamp;
exports.setLastIncrementalFetchTimestamp = setLastIncrementalFetchTimestamp;
exports.getBestOddsForEvent = getBestOddsForEvent;
exports.getContinuousDeepScanEnabled = getContinuousDeepScanEnabled;
exports.setContinuousDeepScanEnabled = setContinuousDeepScanEnabled;
exports.getContinuousScanMaxEventsPerCycle = getContinuousScanMaxEventsPerCycle;
exports.setContinuousScanMaxEventsPerCycle = setContinuousScanMaxEventsPerCycle;
exports.getScanCacheTtlMinutes = getScanCacheTtlMinutes;
exports.setScanCacheTtl = setScanCacheTtl;
exports.getContinuousScanBatchSize = getContinuousScanBatchSize;
exports.setContinuousScanBatchSize = setContinuousScanBatchSize;
exports.getScanIntervalMinutes = getScanIntervalMinutes;
exports.setScanIntervalMinutes = setScanIntervalMinutes;
exports.getConcurrentRequests = getConcurrentRequests;
exports.setConcurrentRequests = setConcurrentRequests;
exports.getScanScope = getScanScope;
exports.setScanScope = setScanScope;
exports.pauseContinuousScan = pauseContinuousScan;
exports.resumeContinuousScan = resumeContinuousScan;
exports.isContinuousScanPaused = isContinuousScanPaused;
exports.getScanHistory = getScanHistory;
exports.getDeepScanQuotaStatus = getDeepScanQuotaStatus;
exports.getAvailableSports = getAvailableSports;
exports.getEnabledSportsFilter = getEnabledSportsFilter;
exports.setEnabledSportsFilter = setEnabledSportsFilter;
exports.getEnabledLeaguesFilter = getEnabledLeaguesFilter;
exports.setEnabledLeaguesFilter = setEnabledLeaguesFilter;
exports.getContinuousScanStatus = getContinuousScanStatus;
exports.setContinuousScanDefaultThresholds = setContinuousScanDefaultThresholds;
exports.startContinuousDeepScan = startContinuousDeepScan;
exports.startDeepScan = startDeepScan;
exports.cancelDeepScan = cancelDeepScan;
exports.getDeepScanProgress = getDeepScanProgress;
exports.getDeepScanResults = getDeepScanResults;
const electron_1 = require("electron");
const types_1 = require("../../../shared/types");
const schemas_1 = require("../../../shared/schemas");
const credentials_1 = require("../credentials");
const poller_1 = require("./poller");
const odds_api_io_bookmakers_1 = require("./odds-api-io-bookmakers");
const logger_1 = require("./logger");
const calculator_1 = require("./calculator");
const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io';
const ODDS_API_IO_EVENTS_PATH = '/v3/events';
const ODDS_API_IO_ODDS_PATH = '/v3/odds';
// Story 7.8: New API endpoints for efficiency
const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi';
const ODDS_API_IO_ODDS_UPDATED_PATH = '/v3/odds/updated';
const ODDS_API_IO_EVENTS_LIVE_PATH = '/v3/events/live';
const DEEP_SCAN_PROVIDER_ID = 'odds-api-io';
// Story 7.8: Batch fetching constants
const BATCH_SIZE_MAX = 10; // API limit for /v3/odds/multi
const DEFAULT_SCAN_HORIZON_HOURS = 4;
exports.SCAN_CACHE_TTL_MS_DEFAULT = 5 * 60 * 1000;
exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE = 50;
exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS = 60_000;
const CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT = 10;
let scanCacheTtlMs = exports.SCAN_CACHE_TTL_MS_DEFAULT;
let continuousScanBatchSize = CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT;
let scanIntervalMinutes = 5;
let concurrentRequests = 2;
let scanScope = 'all-sports';
// Story 7.8: API efficiency settings
let useBatchOdds = true;
let useIncrementalUpdates = true;
let scanHorizonHours = DEFAULT_SCAN_HORIZON_HOURS;
let scanMode = 'all';
let marketFreshnessThresholdMinutes = 5;
// Track last fetch timestamp for incremental updates
let lastIncrementalFetchTimestamp = null;
const HOURLY_REQUEST_LIMIT = 5000;
const HOURLY_WARN_THRESHOLD = 0.8;
const HOURLY_THROTTLE_THRESHOLD = 0.9;
let currentScan = null;
let manualResults = [];
let continuousResults = [];
let manualAbortController = null;
let continuousAbortController = null;
let manualCorrelationId = null;
let continuousCorrelationId = null;
let manualScanPromise = null;
let continuousScanPromise = null;
let manualScanInProgress = false;
let continuousDeepScanEnabled = true;
let isContinuousScanActive = false;
let continuousScanQueued = false;
let lastContinuousScanAt = null;
let lastContinuousScanStartedAtMs = null;
let currentScanMode = 'manual';
let minIntervalTimer = null;
let lastThresholdConfig = {};
let continuousScanMaxEventsPerCycle = exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE;
const scanCache = new Map();
// Story 7.8: Odds Movement History Buffer
// Maps opportunity ID to historical snapshots (max 3 per opportunity)
const oddsHistoryBuffer = new Map();
const ODDS_HISTORY_MAX_SNAPSHOTS = 3;
// Threshold for determining if ROI change is significant (0.1% = 0.001)
const ODDS_TREND_THRESHOLD = 0.001;
/**
 * Story 7.8: Calculate odds trend based on historical snapshots.
 * Compares the most recent ROI to the oldest in history:
 * - 'improving': ROI increased by more than threshold
 * - 'worsening': ROI decreased by more than threshold
 * - 'stable': ROI change is within threshold
 */
function calculateOddsTrend(history, currentRoi) {
    if (history.length === 0) {
        return 'stable'; // No history, default to stable
    }
    // Compare current ROI to the oldest snapshot (first in array)
    const oldestRoi = history[0].roi;
    const roiDelta = currentRoi - oldestRoi;
    if (roiDelta > ODDS_TREND_THRESHOLD) {
        return 'improving';
    }
    else if (roiDelta < -ODDS_TREND_THRESHOLD) {
        return 'worsening';
    }
    return 'stable';
}
/**
 * Story 7.8: Update the odds history buffer for an opportunity.
 * Maintains a sliding window of the most recent N snapshots.
 * Returns the updated history array (including the new snapshot).
 */
function updateOddsHistory(opportunityId, currentRoi, legOdds, timestamp) {
    const existing = oddsHistoryBuffer.get(opportunityId) || [];
    const newSnapshot = {
        roi: currentRoi,
        timestamp,
        legOdds
    };
    // Add new snapshot to the end
    const updated = [...existing, newSnapshot];
    // Keep only the most recent N snapshots
    if (updated.length > ODDS_HISTORY_MAX_SNAPSHOTS) {
        updated.shift(); // Remove oldest
    }
    oddsHistoryBuffer.set(opportunityId, updated);
    return updated;
}
const bestOddsCache = new Map();
const BEST_ODDS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const rawOddsCache = new Map();
const RAW_ODDS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RAW_ODDS_CACHE_MAX_ENTRIES = 1000; // Limit cache size
/**
 * Cache raw odds for an event.
 * Called when processing odds data during Deep Scan.
 */
function cacheRawOdds(eventId, payload) {
    // Cleanup expired entries before adding new ones
    cleanupRawOddsCache();
    // Enforce max entries limit (remove oldest if needed)
    if (rawOddsCache.size >= RAW_ODDS_CACHE_MAX_ENTRIES) {
        const oldestKey = rawOddsCache.keys().next().value;
        if (oldestKey !== undefined) {
            rawOddsCache.delete(oldestKey);
        }
    }
    rawOddsCache.set(eventId, { payload, cachedAt: nowMs() });
}
/**
 * Get all cached raw odds.
 * Returns array of all non-expired raw odds payloads.
 * Story 8.1: Exported for TRPC endpoint.
 */
function getAllRawOdds() {
    cleanupRawOddsCache();
    return Array.from(rawOddsCache.values()).map(entry => entry.payload);
}
/**
 * Cleanup expired raw odds cache entries.
 */
function cleanupRawOddsCache() {
    const now = nowMs();
    for (const [eventId, entry] of rawOddsCache.entries()) {
        if (now - entry.cachedAt > RAW_ODDS_CACHE_TTL_MS) {
            rawOddsCache.delete(eventId);
        }
    }
}
/**
 * Clear raw odds cache.
 * Called when scan cache is cleared or bookmakers change.
 */
function clearRawOddsCache() {
    rawOddsCache.clear();
}
let timeOffsetMs = 0;
let hourlyWindowStartedAtMs = null;
let hourlyRequestsUsed = 0;
let hourlyWarnLogged = false;
let dailyStatsKey = null;
let dailyEventsScanned = 0;
let dailyOpportunitiesFound = 0;
let dailyRequestsMade = 0;
// Story 7.6: Pause/Resume state
let continuousScanPaused = false;
// Story 7.6: Scan history ring buffer (max 5 entries)
const MAX_HISTORY_ENTRIES = 5;
const scanHistory = [];
let lastDiscoveredSports = [];
let enabledSportsFilter = [];
let enabledLeaguesFilter = [];
let eventResolverOverride = null;
let eventsFetcherOverride = null;
let oddsFetcherOverride = null;
let bookmakersResolverOverride = null;
// Story 7.8: Batch, live, and incremental fetcher overrides for testing
let batchOddsFetcherOverride = null;
let liveEventsFetcherOverride = null;
let incrementalOddsFetcherOverride = null;
const SPORT_SLUG_ALIAS_MAP = {
    // Odds-API.io uses "football" as the sport slug for soccer/football.
    soccer: 'football',
    futbol: 'football',
    'association-football': 'football'
};
function nowMs() {
    return Date.now() + timeOffsetMs;
}
function nowIso() {
    return new Date(nowMs()).toISOString();
}
function toDailyKey(ms) {
    const date = new Date(ms);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function ensureDailyStats(ms) {
    const key = toDailyKey(ms);
    if (dailyStatsKey === key) {
        return;
    }
    dailyStatsKey = key;
    dailyEventsScanned = 0;
    dailyOpportunitiesFound = 0;
    dailyRequestsMade = 0;
}
function ensureHourlyWindow(ms) {
    if (hourlyWindowStartedAtMs === null || ms - hourlyWindowStartedAtMs >= 60 * 60 * 1000) {
        hourlyWindowStartedAtMs = ms;
        hourlyRequestsUsed = 0;
        hourlyWarnLogged = false;
    }
}
function recordContinuousRequest() {
    const ms = nowMs();
    ensureHourlyWindow(ms);
    ensureDailyStats(ms);
    hourlyRequestsUsed += 1;
    dailyRequestsMade += 1;
}
function recordContinuousRequestWithWarnings(correlationId) {
    const before = getHourlyQuotaStatus();
    recordContinuousRequest();
    const after = getHourlyQuotaStatus();
    if (!hourlyWarnLogged && after.percentUsed >= HOURLY_WARN_THRESHOLD && before.percentUsed < HOURLY_WARN_THRESHOLD) {
        hourlyWarnLogged = true;
        (0, logger_1.logWarn)('continuousScan.quota.warn', {
            context: 'service:deepScan',
            operation: 'recordContinuousRequest',
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId,
            durationMs: null,
            errorCategory: null,
            hourlyRequestsUsed: after.used,
            hourlyRequestLimit: after.limit,
            percentUsed: Number((after.percentUsed * 100).toFixed(1))
        });
    }
}
function recordContinuousEventScanned(count = 1) {
    const ms = nowMs();
    ensureDailyStats(ms);
    dailyEventsScanned += Math.max(0, count);
}
function recordContinuousOpportunitiesFound(delta) {
    const ms = nowMs();
    ensureDailyStats(ms);
    if (delta > 0) {
        dailyOpportunitiesFound += delta;
    }
}
function getHourlyQuotaStatus() {
    const ms = nowMs();
    ensureHourlyWindow(ms);
    const started = hourlyWindowStartedAtMs ?? ms;
    const percentUsed = HOURLY_REQUEST_LIMIT > 0 ? hourlyRequestsUsed / HOURLY_REQUEST_LIMIT : 0;
    return {
        used: hourlyRequestsUsed,
        limit: HOURLY_REQUEST_LIMIT,
        percentUsed: percentUsed > 0 ? percentUsed : 0,
        windowStartedAtMs: started
    };
}
function computeContinuousEventBudget(availableEvents) {
    const base = Math.max(0, Math.min(continuousScanMaxEventsPerCycle, availableEvents));
    if (base === 0)
        return 0;
    const quota = getHourlyQuotaStatus();
    const percent = quota.percentUsed;
    if (percent >= HOURLY_THROTTLE_THRESHOLD) {
        return Math.min(base, 10);
    }
    return base;
}
function computeBookmakerHash(bookmakers) {
    const normalized = bookmakers.map((b) => b.trim()).filter(Boolean).sort();
    return normalized.join('|');
}
function clearScanCache(reason) {
    scanCache.clear();
    (0, logger_1.logInfo)('continuousScan.cache.clear', {
        context: 'service:deepScan',
        operation: 'clearScanCache',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        reason
    });
}
function shouldScanEvent(eventId, bookmakers) {
    const now = nowMs();
    const entry = scanCache.get(eventId);
    const bookmakerHash = computeBookmakerHash(bookmakers);
    if (!entry) {
        return true;
    }
    const ageMs = now - entry.scannedAt;
    const isExpired = ageMs >= scanCacheTtlMs;
    const hashChanged = entry.bookmakerHash !== bookmakerHash;
    if (isExpired || hashChanged) {
        scanCache.delete(eventId);
        return true;
    }
    return false;
}
function updateScanCache(eventId, bookmakers) {
    scanCache.set(eventId, {
        scannedAt: nowMs(),
        bookmakerHash: computeBookmakerHash(bookmakers)
    });
}
function chunk(items, size) {
    const safeSize = Math.max(1, size);
    const result = [];
    for (let index = 0; index < items.length; index += safeSize) {
        result.push(items.slice(index, index + safeSize));
    }
    return result;
}
function clearMinIntervalTimer() {
    if (minIntervalTimer) {
        clearTimeout(minIntervalTimer);
        minIntervalTimer = null;
    }
}
function idleProgress() {
    return {
        status: 'idle',
        eventsScanned: 0,
        eventsTotal: 0,
        requestsMade: 0,
        opportunitiesFound: 0,
        marketsScanned: 0,
        marketGroupsWithArbs: [],
        startedAt: null,
        elapsedMs: 0,
        mode: 'manual',
        lastContinuousScanAt: lastContinuousScanAt ?? undefined,
        isContinuousScanActive,
        isPaused: continuousScanPaused
    };
}
function computeElapsedMs(startedAt) {
    if (!startedAt)
        return 0;
    const started = new Date(startedAt).getTime();
    if (!Number.isFinite(started))
        return 0;
    const diff = nowMs() - started;
    return diff > 0 ? diff : 0;
}
function updateProgress(patch) {
    const patchMode = patch.mode;
    const currentMode = currentScan?.mode;
    if (manualScanInProgress && patchMode === 'continuous' && currentMode === 'manual') {
        return;
    }
    const base = currentScan ?? idleProgress();
    const next = {
        ...base,
        ...patch
    };
    next.elapsedMs = computeElapsedMs(next.startedAt);
    next.lastContinuousScanAt =
        lastContinuousScanAt ?? next.lastContinuousScanAt;
    next.isContinuousScanActive =
        isContinuousScanActive;
    currentScan = next;
}
function ensureScope(config) {
    if (config.eventIds?.length || config.leagueId || config.sportSlug) {
        return;
    }
    throw new Error('Deep scan requires at least one of eventIds, leagueId, or sportSlug');
}
function isAbortError(error) {
    const err = error;
    return err?.name === 'AbortError' || /abort/i.test(err?.message ?? '');
}
function getStatusCode(error) {
    const err = error;
    const direct = typeof err.status === 'number' ? err.status : undefined;
    if (direct)
        return direct;
    const code = typeof err.statusCode === 'number' ? err.statusCode : undefined;
    if (code)
        return code;
    const responseStatus = typeof err.response?.status === 'number' ? err.response.status : undefined;
    return responseStatus;
}
function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}
function sleep(ms, signal) {
    if (ms <= 0)
        return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('aborted'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
    });
}
function getHttpFetch() {
    if (typeof electron_1.net?.fetch === 'function') {
        return electron_1.net.fetch;
    }
    if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch.bind(globalThis);
    }
    throw new Error('No fetch implementation available for deep scan');
}
async function trackedRequest(fn, correlationId, options = {}) {
    const mode = options.mode ?? 'manual';
    updateProgress({ requestsMade: (currentScan?.requestsMade ?? 0) + 1 });
    if (mode === 'continuous') {
        recordContinuousRequestWithWarnings(correlationId);
    }
    return (0, poller_1.scheduleProviderRequest)(DEEP_SCAN_PROVIDER_ID, () => fn({ correlationId }));
}
function extractEvents(payload, defaults = {}) {
    const candidates = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
            ? payload.data
            : Array.isArray(payload.events)
                ? payload.events
                : [];
    const seen = new Set();
    const events = [];
    for (const item of candidates) {
        if (!item || typeof item !== 'object')
            continue;
        const rawId = item.id ?? item.eventId;
        const id = rawId != null ? String(rawId) : '';
        if (!id || seen.has(id))
            continue;
        const homeCandidate = item.home ??
            item.home_team ??
            item.event?.home ??
            item.event?.home_team;
        const awayCandidate = item.away ??
            item.away_team ??
            item.event?.away ??
            item.event?.away_team;
        const inferredName = typeof homeCandidate === 'string' &&
            homeCandidate.trim().length &&
            typeof awayCandidate === 'string' &&
            awayCandidate.trim().length
            ? `${homeCandidate.trim()} vs ${awayCandidate.trim()}`
            : null;
        const rawName = item.name ??
            item.event?.name ??
            inferredName ??
            id;
        const name = typeof rawName === 'string' && rawName.trim().length ? rawName : id;
        const rawDate = item.date ??
            item.commence_time ??
            item.event?.date;
        const date = typeof rawDate === 'string' && rawDate.trim().length ? rawDate : undefined;
        const leagueCandidate = item.league ??
            item.event?.league ??
            defaults.league;
        const rawLeague = typeof leagueCandidate === 'object' && leagueCandidate !== null
            ? (leagueCandidate.name ??
                leagueCandidate.slug)
            : leagueCandidate;
        const league = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : undefined;
        const sportCandidate = item.sport ?? defaults.sport;
        const rawSport = typeof sportCandidate === 'object' && sportCandidate !== null
            ? (sportCandidate.slug ??
                sportCandidate.name)
            : sportCandidate;
        const sport = typeof rawSport === 'string' && rawSport.trim().length ? rawSport : undefined;
        seen.add(id);
        events.push({ id, name, date, league, sport });
    }
    return events;
}
const defaultEventResolver = async ({ config, apiKey, signal, correlationId }) => {
    if (config.eventIds?.length) {
        return config.eventIds.map((id) => ({ id: String(id), name: String(id) }));
    }
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_EVENTS_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    if (config.leagueId) {
        url.searchParams.set('league', config.leagueId);
    }
    if (config.sportSlug) {
        url.searchParams.set('sport', config.sportSlug);
    }
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId, { mode: currentScanMode });
    if (!response.ok) {
        const message = await response.text().catch(() => `Events request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Events request failed with status ${response.status}`);
    }
    const body = (await response.json());
    return extractEvents(body, { league: config.leagueId, sport: config.sportSlug });
};
const defaultEventsFetcher = async ({ apiKey, signal, correlationId, page, sport, from, to }) => {
    // CRITICAL: odds-api.io /v3/events endpoint requires 'sport' parameter
    // See: https://docs.odds-api.io/api-reference/events
    // Required params: apiKey, sport
    // Optional params: league, participantId, status, from, to, bookmaker
    if (!sport) {
        throw new Error('Sport parameter is required for odds-api.io /events endpoint. ' +
            'This is an internal error - please report it.');
    }
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_EVENTS_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('sport', sport); // REQUIRED by the API
    if (typeof page === 'number' && Number.isFinite(page) && page > 0) {
        url.searchParams.set('page', String(Math.floor(page)));
    }
    // Story 7.8: Add time-range filtering parameters
    if (from) {
        url.searchParams.set('from', from);
    }
    if (to) {
        url.searchParams.set('to', to);
    }
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId, { mode: 'continuous' });
    if (!response.ok) {
        const message = await response.text().catch(() => `Events request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Events request failed with status ${response.status}`);
    }
    return response.json();
};
function getEventsFetcher() {
    return eventsFetcherOverride ?? defaultEventsFetcher;
}
function isUpcomingEvent(event, now) {
    if (!event.date) {
        return true;
    }
    const ms = new Date(event.date).getTime();
    if (!Number.isFinite(ms)) {
        return true;
    }
    return ms > now;
}
function computePriorityTier(event, now) {
    if (!event.date)
        return 3;
    const ms = new Date(event.date).getTime();
    if (!Number.isFinite(ms))
        return 3;
    const diffMs = ms - now;
    if (diffMs <= 60 * 60 * 1000) {
        return 0;
    }
    const nowKey = toDailyKey(now);
    const eventKey = toDailyKey(ms);
    if (eventKey === nowKey) {
        return 1;
    }
    const tomorrowKey = toDailyKey(now + 24 * 60 * 60 * 1000);
    if (eventKey === tomorrowKey) {
        return 2;
    }
    return 3;
}
function sortEventsByPriority(events) {
    const now = nowMs();
    return events
        .slice()
        .sort((a, b) => {
        const tierA = computePriorityTier(a, now);
        const tierB = computePriorityTier(b, now);
        if (tierA !== tierB) {
            return tierA - tierB;
        }
        const timeA = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
        const timeB = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
        if (timeA !== timeB) {
            return timeA - timeB;
        }
        return a.id.localeCompare(b.id);
    });
}
function extractNextPage(payload) {
    if (!payload || typeof payload !== 'object')
        return null;
    const direct = payload.nextPage;
    if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
        return Math.floor(direct);
    }
    const paginationNext = payload.pagination?.nextPage;
    if (typeof paginationNext === 'number' && Number.isFinite(paginationNext) && paginationNext > 0) {
        return Math.floor(paginationNext);
    }
    return null;
}
function normalizeSportSlug(value) {
    const normalized = value.trim().toLowerCase();
    return SPORT_SLUG_ALIAS_MAP[normalized] ?? normalized;
}
async function discoverAllEvents(args) {
    const { apiKey, signal, correlationId, sports } = args;
    const fetchEvents = getEventsFetcher();
    const seen = new Set();
    const all = [];
    const requestedSports = Array.isArray(sports) && sports.length > 0
        ? sports.map((s) => normalizeSportSlug(s)).filter(Boolean)
        : ['football'];
    const requestedSportsDeduped = Array.from(new Set(requestedSports));
    const sportsFilter = Array.isArray(sports) && sports.length > 0 ? new Set(requestedSportsDeduped) : null;
    // Story 7.8: Calculate time-range filtering parameters based on scanHorizonHours
    // 0 = all events (no time filtering), otherwise filter by hours from now
    let fromTime;
    let toTime;
    if (scanHorizonHours > 0) {
        const now = new Date();
        fromTime = now.toISOString();
        const toDate = new Date(now.getTime() + scanHorizonHours * 60 * 60 * 1000);
        toTime = toDate.toISOString();
    }
    for (const sport of requestedSportsDeduped) {
        let page = null;
        let pageGuard = 0;
        do {
            const payload = await fetchEvents({
                apiKey,
                signal,
                correlationId,
                page: page ?? undefined,
                sport,
                from: fromTime,
                to: toTime
            });
            const extracted = extractEvents(payload, { sport });
            for (const event of extracted) {
                if (seen.has(event.id))
                    continue;
                seen.add(event.id);
                all.push(event);
            }
            page = extractNextPage(payload);
            pageGuard += 1;
        } while (page !== null && pageGuard < 5 && !signal.aborted);
    }
    const now = nowMs();
    const upcoming = all.filter((event) => {
        if (!isUpcomingEvent(event, now))
            return false;
        if (!sportsFilter)
            return true;
        if (!event.sport)
            return true;
        const normalizedEventSport = normalizeSportSlug(event.sport);
        return sportsFilter.has(normalizedEventSport);
    });
    const sorted = sortEventsByPriority(upcoming);
    const sportsCovered = Array.from(new Set(sorted.map((event) => event.sport).filter((value) => Boolean(value))));
    const datedEvents = sorted.filter((event) => typeof event.date === 'string');
    const minDate = datedEvents.reduce((min, event) => {
        if (!event.date)
            return min;
        if (!min || event.date < min)
            return event.date;
        return min;
    }, null);
    const maxDate = datedEvents.reduce((max, event) => {
        if (!event.date)
            return max;
        if (!max || event.date > max)
            return event.date;
        return max;
    }, null);
    // Track discovered sports for getAvailableSports query
    lastDiscoveredSports = sportsCovered;
    (0, logger_1.logInfo)('continuousScan.discovery', {
        context: 'service:deepScan',
        operation: 'discoverAllEvents',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        eventsDiscovered: sorted.length,
        sportsCovered,
        dateRange: {
            from: minDate,
            to: maxDate
        }
    });
    return sorted;
}
const defaultBookmakersResolver = async ({ config, apiKey }) => {
    if (config.bookmakers?.length) {
        return Array.from(new Set(config.bookmakers.map((b) => b.trim()).filter(Boolean)));
    }
    const selected = await (0, odds_api_io_bookmakers_1.getSelectedBookmakers)(apiKey);
    return selected;
};
const defaultOddsFetcher = async ({ event, apiKey, bookmakers, signal, correlationId }) => {
    // CRITICAL: odds-api.io /v3/odds endpoint requires 'bookmakers' parameter
    // See: https://docs.odds-api.io/api-reference/odds
    // Required params: apiKey, eventId, bookmakers (comma-separated, max 30)
    if (!bookmakers.length) {
        throw new Error('No bookmakers configured for Deep Scan. The odds-api.io /odds endpoint requires at least one bookmaker. ' +
            'Please select bookmakers in Settings (Odds-API.io bookmaker selection) and try again.');
    }
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_ODDS_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('eventId', event.id);
    // bookmakers is REQUIRED by the API (not optional) - always set it
    url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(',')); // API max: 30 bookmakers
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId);
    if (!response.ok) {
        const message = await response.text().catch(() => `Odds request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Odds request failed with status ${response.status}`);
    }
    return response.json();
};
/**
 * Story 7.8: Batch odds fetcher for /v3/odds/multi endpoint.
 * Fetches odds for up to 10 events in a single request.
 * Returns a BatchOddsResponse with per-event success/failure handling.
 */
const defaultBatchOddsFetcher = async ({ events, apiKey, bookmakers, signal, correlationId }) => {
    if (!bookmakers.length) {
        throw new Error('No bookmakers configured for Deep Scan. The odds-api.io /odds/multi endpoint requires at least one bookmaker. ' +
            'Please select bookmakers in Settings (Odds-API.io bookmaker selection) and try again.');
    }
    if (events.length === 0) {
        return { results: [] };
    }
    // Clamp to API maximum of 10 events per batch
    const batchEvents = events.slice(0, BATCH_SIZE_MAX);
    const eventIds = batchEvents.map((e) => e.id).join(',');
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_ODDS_MULTI_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('eventIds', eventIds);
    url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(','));
    (0, logger_1.logInfo)('deepScan.batch.request', {
        context: 'service:deepScan',
        operation: 'fetchOddsMulti',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        eventCount: batchEvents.length,
        eventIds: batchEvents.map((e) => e.id),
        bookmakersCount: Math.min(bookmakers.length, 30)
    });
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId, { mode: currentScanMode });
    if (!response.ok) {
        const message = await response.text().catch(() => `Batch odds request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Batch odds request failed with status ${response.status}`);
    }
    const body = await response.json();
    // Parse batch response: array of event odds objects
    // Each item should have an eventId (or id) and bookmakers data
    const results = parseBatchOddsResponse(body, batchEvents);
    (0, logger_1.logInfo)('deepScan.batch.response', {
        context: 'service:deepScan',
        operation: 'fetchOddsMulti',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        totalEvents: batchEvents.length,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length
    });
    return { results };
};
/**
 * Story 7.8: Parse batch odds response from /v3/odds/multi endpoint.
 * The API returns an array of EventResponse objects, one per requested event.
 * Events that fail may be missing from the response or have error fields.
 */
function parseBatchOddsResponse(body, requestedEvents) {
    const results = [];
    // Handle array response (expected format)
    if (Array.isArray(body)) {
        const seenEventIds = new Set();
        for (const item of body) {
            if (!item || typeof item !== 'object')
                continue;
            // Extract event ID from response item
            const rawId = item.id ??
                item.eventId;
            const eventId = rawId != null ? String(rawId) : null;
            if (!eventId)
                continue;
            seenEventIds.add(eventId);
            // Check for error field in response
            const errorField = item.error;
            if (typeof errorField === 'string' && errorField.length > 0) {
                results.push({ eventId, success: false, error: errorField });
                continue;
            }
            // Successful response - item contains bookmakers data
            results.push({ eventId, success: true, data: item });
        }
        // Add failures for any requested events not in response
        for (const event of requestedEvents) {
            if (!seenEventIds.has(event.id)) {
                results.push({ eventId: event.id, success: false, error: 'Event not in batch response' });
            }
        }
        return results;
    }
    // Handle object response with data array
    if (typeof body === 'object' && body !== null) {
        const dataArray = body.data;
        if (Array.isArray(dataArray)) {
            return parseBatchOddsResponse(dataArray, requestedEvents);
        }
        // Single object response - treat as single event result
        const rawId = body.id ??
            body.eventId;
        const eventId = rawId != null ? String(rawId) : requestedEvents[0]?.id;
        if (eventId) {
            const errorField = body.error;
            if (typeof errorField === 'string' && errorField.length > 0) {
                results.push({ eventId, success: false, error: errorField });
            }
            else {
                results.push({ eventId, success: true, data: body });
            }
            // Mark other events as failed
            for (const event of requestedEvents) {
                if (event.id !== eventId) {
                    results.push({ eventId: event.id, success: false, error: 'Event not in batch response' });
                }
            }
        }
    }
    // Fallback: mark all events as failed
    if (results.length === 0) {
        for (const event of requestedEvents) {
            results.push({ eventId: event.id, success: false, error: 'Invalid batch response format' });
        }
    }
    return results;
}
/**
 * Story 7.8: Live events fetcher for /v3/events/live endpoint.
 * Returns all currently live events across all sports (or filtered by sport).
 */
const defaultLiveEventsFetcher = async ({ apiKey, signal, correlationId, sport }) => {
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_EVENTS_LIVE_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    if (sport) {
        url.searchParams.set('sport', sport);
    }
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId, { mode: currentScanMode });
    if (!response.ok) {
        const message = await response.text().catch(() => `Live events request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Live events request failed with status ${response.status}`);
    }
    return response.json();
};
/**
 * Story 7.8: Get the batch odds fetcher (default or override for testing).
 * Exported for use in Task 2 integration.
 */
function getBatchOddsFetcher() {
    return batchOddsFetcherOverride ?? defaultBatchOddsFetcher;
}
/**
 * Story 7.8: Get the live events fetcher (default or override for testing).
 * Exported for use in Task 5 integration.
 */
function getLiveEventsFetcher() {
    return liveEventsFetcherOverride ?? defaultLiveEventsFetcher;
}
/**
 * Story 7.8: Incremental odds fetcher for /v3/odds/updated endpoint.
 * Returns only odds that have changed since the given timestamp.
 * Reduces data transfer on subsequent scans by fetching only updates.
 */
const defaultIncrementalOddsFetcher = async ({ apiKey, signal, correlationId, since, bookmakers }) => {
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_ODDS_UPDATED_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('since', since);
    if (bookmakers && bookmakers.length > 0) {
        url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(','));
    }
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId, { mode: currentScanMode });
    if (!response.ok) {
        const message = await response.text().catch(() => `Incremental odds request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Incremental odds request failed with status ${response.status}`);
    }
    return response.json();
};
/**
 * Story 7.8: Get the incremental odds fetcher (default or override for testing).
 * Used to fetch only odds that have changed since a given timestamp.
 */
function getIncrementalOddsFetcher() {
    return incrementalOddsFetcherOverride ?? defaultIncrementalOddsFetcher;
}
/**
 * Story 7.8: Get the last incremental fetch timestamp.
 * Returns null if no incremental fetch has been performed yet.
 */
function getLastIncrementalFetchTimestamp() {
    return lastIncrementalFetchTimestamp;
}
/**
 * Story 7.8: Update the last incremental fetch timestamp.
 * Called after a successful incremental or full fetch.
 */
function setLastIncrementalFetchTimestamp(timestamp) {
    lastIncrementalFetchTimestamp = timestamp;
}
function isOpportunityArray(value) {
    if (!Array.isArray(value))
        return false;
    return value.every((item) => {
        if (!item || typeof item !== 'object')
            return false;
        const opp = item;
        return typeof opp.id === 'string' && Array.isArray(opp.legs) && opp.legs.length === 2;
    });
}
function formatLineValue(value) {
    const rounded = Math.round(value * 100) / 100;
    let formatted = rounded.toString();
    if (formatted.includes('e') || formatted.includes('E')) {
        formatted = rounded.toFixed(2);
    }
    if (formatted.includes('.')) {
        formatted = formatted.replace(/\.?0+$/, '');
    }
    return formatted;
}
function normalizeOutcomeName(name) {
    const normalized = name.toLowerCase().trim();
    if (!normalized)
        return 'unknown';
    // Yes/No variants
    if (normalized === 'yes' || normalized === 'y')
        return 'yes';
    if (normalized === 'no' || normalized === 'n')
        return 'no';
    // Home/Away variants
    if (normalized === 'home' || normalized === '1' || normalized === 'team 1' || normalized === 'team1')
        return 'home';
    if (normalized === 'away' || normalized === '2' || normalized === 'team 2' || normalized === 'team2')
        return 'away';
    // Draw variants
    if (normalized === 'draw' || normalized === 'x')
        return 'draw';
    // Over/Under patterns with line extraction and suffix stripping
    if (normalized.startsWith('over')) {
        const line = extractLineFromOutcomeName(name);
        if (line !== undefined) {
            return `over_${formatLineValue(Math.abs(line))}`;
        }
        const stripped = normalized.replace(/\s*goals?\s*$/i, '').trim();
        return stripped.replace(/\s+/g, '_');
    }
    if (normalized.startsWith('under')) {
        const line = extractLineFromOutcomeName(name);
        if (line !== undefined) {
            return `under_${formatLineValue(Math.abs(line))}`;
        }
        const stripped = normalized.replace(/\s*goals?\s*$/i, '').trim();
        return stripped.replace(/\s+/g, '_');
    }
    // Handicap lines: "+1.5", "-1.5", "Home +1.5", etc.
    const handicapMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)$/);
    if (handicapMatch) {
        const raw = handicapMatch[1];
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) {
            return raw;
        }
        const hadPlusSign = raw.startsWith('+');
        const formatted = formatLineValue(parsed);
        return hadPlusSign && parsed > 0 ? `+${formatted}` : formatted;
    }
    // "Home +1.5" -> "home_+1.5"
    const teamHandicapMatch = normalized.match(/^(home|away|team\s*[12])\s*([+-]?\d+(?:\.\d+)?)$/i);
    if (teamHandicapMatch) {
        const team = teamHandicapMatch[1].toLowerCase().replace(/\s+/g, '');
        const rawLine = teamHandicapMatch[2];
        const parsedLine = Number.parseFloat(rawLine);
        const lineHadPlusSign = rawLine.startsWith('+');
        const formattedLine = Number.isFinite(parsedLine) ? formatLineValue(parsedLine) : rawLine;
        const signedLine = lineHadPlusSign && parsedLine > 0 ? `+${formattedLine}` : formattedLine;
        const normalizedTeam = team === 'team1' ? 'home' : team === 'team2' ? 'away' : team;
        return `${normalizedTeam}_${signedLine}`;
    }
    // BTTS variants
    if (normalized === 'both teams to score' || normalized === 'btts' || normalized === 'gg') {
        return 'yes';
    }
    if (normalized === 'not both teams to score' || normalized === 'no btts' || normalized === 'ng') {
        return 'no';
    }
    // Default: replace spaces with underscores
    return normalized.replace(/\s+/g, '_');
}
function extractLineFromOutcomeName(name) {
    if (!name || typeof name !== 'string') {
        return undefined;
    }
    const overUnderMatch = name.match(/\b(?:over|under)\s*([+-]?\d+(?:\.\d+)?)\b/i);
    if (overUnderMatch) {
        const parsed = Number.parseFloat(overUnderMatch[1]);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    const genericNumberMatch = name.match(/\b([+-]?\d+(?:\.\d+)?)\b/);
    if (!genericNumberMatch) {
        return undefined;
    }
    const parsed = Number.parseFloat(genericNumberMatch[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function summarizeRawOddsResult(result) {
    const emptySummary = {
        rawBookmakersCount: 0,
        rawMarketsCount: 0,
        rawOutcomesCount: 0,
        validBookmakersCount: 0,
        validMarketsCount: 0,
        validOutcomesCount: 0,
        sampleBookmakers: []
    };
    if (!result || typeof result !== 'object') {
        return { ...emptySummary, dropReason: 'result_not_object' };
    }
    const rawBookmakers = result.bookmakers;
    const isLegacyArray = Array.isArray(rawBookmakers);
    const isMapObject = !isLegacyArray && typeof rawBookmakers === 'object' && rawBookmakers !== null;
    if (!isLegacyArray && !isMapObject) {
        return { ...emptySummary, dropReason: 'missing_bookmakers' };
    }
    const bookmakerEntries = [];
    if (isLegacyArray) {
        const list = rawBookmakers;
        if (list.length === 0) {
            return { ...emptySummary, dropReason: 'empty_bookmakers_array' };
        }
        for (const book of list) {
            if (!book || typeof book !== 'object')
                continue;
            const nameCandidate = book.name ??
                book.key ??
                book.bookmaker;
            const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate.trim() : null;
            if (!name)
                continue;
            const marketsRaw = Array.isArray(book.markets)
                ? book.markets
                : [];
            bookmakerEntries.push({ name, marketsRaw });
        }
    }
    else {
        const map = rawBookmakers;
        const keys = Object.keys(map);
        if (keys.length === 0) {
            return { ...emptySummary, dropReason: 'empty_bookmakers_map' };
        }
        for (const [name, marketsContainer] of Object.entries(map)) {
            const trimmed = name.trim();
            if (!trimmed)
                continue;
            const marketsRaw = Array.isArray(marketsContainer)
                ? marketsContainer
                : marketsContainer && typeof marketsContainer === 'object' && Array.isArray(marketsContainer.markets)
                    ? marketsContainer.markets
                    : [];
            bookmakerEntries.push({ name: trimmed, marketsRaw });
        }
    }
    if (bookmakerEntries.length === 0) {
        return { ...emptySummary, dropReason: isLegacyArray ? 'no_valid_bookmakers' : 'no_valid_bookmakers_map' };
    }
    let rawMarketsCount = 0;
    let rawOutcomesCount = 0;
    let validBookmakersCount = 0;
    let validMarketsCount = 0;
    let validOutcomesCount = 0;
    const sampleBookmakers = [];
    for (const bookmaker of bookmakerEntries) {
        const name = bookmaker.name;
        const marketsRaw = bookmaker.marketsRaw;
        rawMarketsCount += marketsRaw.length;
        const validMarketsForBook = [];
        for (const market of marketsRaw) {
            if (!market || typeof market !== 'object')
                continue;
            const keyCandidate = market.key ??
                market.name ??
                market.market;
            const key = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate.trim() : null;
            const legacyOutcomesRaw = Array.isArray(market.outcomes)
                ? market.outcomes
                : null;
            const oddsRowsRaw = Array.isArray(market.odds)
                ? market.odds
                : null;
            const outcomesRaw = legacyOutcomesRaw ?? oddsRowsRaw ?? [];
            rawOutcomesCount += outcomesRaw.length;
            if (!key)
                continue;
            const validOutcomesForMarket = [];
            if (legacyOutcomesRaw) {
                for (const outcome of legacyOutcomesRaw) {
                    if (!outcome || typeof outcome !== 'object')
                        continue;
                    const nameRaw = outcome.name;
                    const outcomeName = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw.trim() : null;
                    if (!outcomeName)
                        continue;
                    const oddsRaw = outcome.odds ??
                        outcome.price ??
                        outcome.decimal;
                    const odds = typeof oddsRaw === 'number'
                        ? oddsRaw
                        : typeof oddsRaw === 'string'
                            ? Number.parseFloat(oddsRaw)
                            : Number.NaN;
                    if (!Number.isFinite(odds) || odds <= 0)
                        continue;
                    validOutcomesForMarket.push({ name: outcomeName, odds });
                }
            }
            else if (oddsRowsRaw) {
                for (const row of oddsRowsRaw) {
                    if (!row || typeof row !== 'object')
                        continue;
                    for (const [outcomeName, priceRaw] of Object.entries(row)) {
                        const normalizedName = outcomeName.trim();
                        if (!normalizedName || ['hdp', 'line', 'points'].includes(normalizedName.toLowerCase()))
                            continue;
                        const odds = typeof priceRaw === 'number'
                            ? priceRaw
                            : typeof priceRaw === 'string'
                                ? Number.parseFloat(priceRaw)
                                : Number.NaN;
                        if (!Number.isFinite(odds) || odds <= 0)
                            continue;
                        validOutcomesForMarket.push({ name: normalizedName, odds });
                    }
                }
            }
            validOutcomesCount += validOutcomesForMarket.length;
            if (validOutcomesForMarket.length < 2)
                continue;
            validMarketsCount += 1;
            if (validMarketsForBook.length < 3) {
                validMarketsForBook.push({ key, outcomes: validOutcomesForMarket.slice(0, 3) });
            }
        }
        if (validMarketsForBook.length === 0)
            continue;
        validBookmakersCount += 1;
        if (sampleBookmakers.length < 2) {
            sampleBookmakers.push({ name, markets: validMarketsForBook.slice(0, 3) });
        }
    }
    let dropReason;
    if (validBookmakersCount === 0) {
        if (rawMarketsCount === 0) {
            dropReason = 'no_markets_in_response';
        }
        else if (validMarketsCount === 0) {
            dropReason = 'no_valid_markets_after_filtering';
        }
        else {
            dropReason = 'no_valid_bookmakers_after_filtering';
        }
    }
    return {
        rawBookmakersCount: bookmakerEntries.length,
        rawMarketsCount,
        rawOutcomesCount,
        validBookmakersCount,
        validMarketsCount,
        validOutcomesCount,
        dropReason,
        sampleBookmakers
    };
}
function summarizeOddsResponseShape(result) {
    if (result === null) {
        return { responseType: 'null' };
    }
    if (result === undefined) {
        return { responseType: 'undefined' };
    }
    if (Array.isArray(result)) {
        return { responseType: 'array', responseLength: result.length };
    }
    if (typeof result === 'string') {
        const trimmed = result.trim();
        return { responseType: 'string', responseLength: result.length, responseError: trimmed.slice(0, 200) || undefined };
    }
    if (typeof result === 'object') {
        const keys = Object.keys(result);
        const errorField = result.error ??
            result.message ??
            result.detail;
        const responseError = typeof errorField === 'string' && errorField.trim().length ? errorField.trim() : undefined;
        return { responseType: 'object', responseKeys: keys, responseLength: keys.length, responseError };
    }
    return { responseType: typeof result };
}
function formatOddsPayloadSnippet(result, maxLength) {
    try {
        const serialized = JSON.stringify(result);
        if (typeof serialized !== 'string') {
            return { preview: String(result), truncated: false };
        }
        if (serialized.length <= maxLength) {
            return { preview: serialized, truncated: false };
        }
        return { preview: `${serialized.slice(0, maxLength)}…`, truncated: true };
    }
    catch {
        const fallback = String(result);
        if (fallback.length <= maxLength) {
            return { preview: fallback, truncated: false };
        }
        return { preview: `${fallback.slice(0, maxLength)}…`, truncated: true };
    }
}
function summarizeRawEventResult(result, event, config) {
    const rawEvent = result && typeof result === 'object' ? result.event : undefined;
    const rawEventId = rawEvent && typeof rawEvent === 'object' && rawEvent.id != null
        ? String(rawEvent.id)
        : event.id;
    const rawEventName = rawEvent && typeof rawEvent === 'object' && typeof rawEvent.name === 'string'
        ? (rawEvent.name || event.name)
        : event.name;
    const rawDate = rawEvent && typeof rawEvent === 'object'
        ? rawEvent.date ??
            rawEvent.commence_time
        : undefined;
    const eventDate = typeof rawDate === 'string' && rawDate.trim().length
        ? rawDate
        : typeof event.date === 'string' && event.date.trim().length
            ? event.date
            : null;
    const rawLeague = rawEvent && typeof rawEvent === 'object' ? rawEvent.league : undefined;
    const eventLeague = typeof rawLeague === 'string' && rawLeague.trim().length
        ? rawLeague
        : typeof event.league === 'string' && event.league.trim().length
            ? event.league
            : null;
    const rawSport = rawEvent && typeof rawEvent === 'object' ? rawEvent.sport : undefined;
    const eventSport = typeof rawSport === 'string' && rawSport.trim().length
        ? rawSport
        : typeof event.sport === 'string' && event.sport.trim().length
            ? event.sport
            : config.sportSlug ?? null;
    return {
        eventId: rawEventId,
        eventName: rawEventName,
        eventDate,
        eventLeague,
        eventSport
    };
}
function toRawOddsPayload(result, event, config) {
    if (!result || typeof result !== 'object') {
        return null;
    }
    const record = result;
    const rawEvent = record.event;
    const rawBookmakers = record.bookmakers;
    const bookmakersIsArray = Array.isArray(rawBookmakers);
    const bookmakersIsMap = !bookmakersIsArray && typeof rawBookmakers === 'object' && rawBookmakers !== null;
    if (!bookmakersIsArray && !bookmakersIsMap) {
        return null;
    }
    const eventId = rawEvent && typeof rawEvent === 'object' && rawEvent.id != null
        ? String(rawEvent.id)
        : record.id != null
            ? String(record.id)
            : event.id;
    const home = typeof record.home === 'string' ? record.home.trim() : '';
    const away = typeof record.away === 'string' ? record.away.trim() : '';
    const inferredEventName = home && away ? `${home} vs ${away}` : null;
    const eventName = rawEvent && typeof rawEvent === 'object' && typeof rawEvent.name === 'string'
        ? (rawEvent.name || inferredEventName || event.name)
        : typeof record.name === 'string' && record.name.trim().length
            ? record.name.trim()
            : inferredEventName || event.name;
    const rawDate = rawEvent && typeof rawEvent === 'object'
        ? rawEvent.date ??
            rawEvent.commence_time
        : undefined;
    const eventDate = typeof rawDate === 'string' && rawDate.trim().length
        ? rawDate
        : typeof record.date === 'string' && record.date.trim().length
            ? record.date.trim()
            : event.date ?? new Date().toISOString();
    const leagueCandidate = rawEvent && typeof rawEvent === 'object'
        ? rawEvent.league
        : record.league;
    const leagueNormalized = typeof leagueCandidate === 'object' && leagueCandidate !== null
        ? (leagueCandidate.name ??
            leagueCandidate.slug)
        : leagueCandidate;
    const eventLeague = typeof leagueNormalized === 'string' && leagueNormalized.trim().length
        ? leagueNormalized.trim()
        : event.league ?? '';
    const sportCandidate = rawEvent && typeof rawEvent === 'object'
        ? rawEvent.sport
        : record.sport;
    const sportNormalized = typeof sportCandidate === 'object' && sportCandidate !== null
        ? (sportCandidate.slug ??
            sportCandidate.name)
        : sportCandidate;
    const eventSport = typeof sportNormalized === 'string' && sportNormalized.trim().length
        ? sportNormalized.trim()
        : event.sport ?? config.sportSlug ?? 'soccer';
    const normalizeKey = (key) => key.toLowerCase().trim().replace(/([a-z])-([a-z])/g, '$1_$2').replace(/ /g, '_');
    const canonicalizeMarketBase = (rawMarketName) => {
        const normalized = normalizeKey(rawMarketName);
        // Match result / Moneyline
        if (normalized === 'ml' || normalized === 'moneyline' || normalized === '1x2' || normalized === 'match_winner') {
            return 'h2h';
        }
        // Asian Handicap - preserve as distinct market
        if (normalized === 'asian_handicap' || normalized === 'ah') {
            return 'asian_handicap';
        }
        // Handicap / Spread markets
        if (normalized === 'spread' ||
            normalized === 'spreads' ||
            normalized === 'handicap') {
            return 'spreads';
        }
        // BTTS
        if (normalized === 'btts' || normalized === 'both_teams_to_score' || normalized === 'gg') {
            return 'btts';
        }
        // Corners-related markets - preserve context
        if (normalized.includes('corner')) {
            if (normalized.includes('total') || normalized.includes('over') || normalized.includes('under')) {
                return 'corners_totals';
            }
            if (normalized.includes('handicap') || normalized.includes('spread')) {
                return 'corners_handicap';
            }
            if (normalized.includes('race')) {
                return 'corners_race';
            }
            if (normalized.includes('1h') || normalized.includes('first_half')) {
                return 'corners_1h';
            }
            if (normalized.includes('2h') || normalized.includes('second_half')) {
                return 'corners_2h';
            }
            return 'corners_totals'; // Default corners to totals
        }
        // Cards/Bookings-related markets - preserve context
        if (normalized.includes('card') || normalized.includes('booking')) {
            if (normalized.includes('red')) {
                return 'red_card';
            }
            if (normalized.includes('total') || normalized.includes('over') || normalized.includes('under')) {
                return 'cards_totals';
            }
            if (normalized.includes('1h') || normalized.includes('first_half')) {
                return 'cards_1h';
            }
            if (normalized.includes('2h') || normalized.includes('second_half')) {
                return 'cards_2h';
            }
            if (normalized.includes('points')) {
                return 'booking_points';
            }
            return 'cards_totals'; // Default cards to totals
        }
        // Shots-related markets
        if (normalized.includes('shot')) {
            if (normalized.includes('target') || normalized === 'sot') {
                return 'shots_on_target';
            }
            if (normalized.includes('total') || normalized.includes('over') || normalized.includes('under')) {
                return 'shots_totals';
            }
            return 'shots_totals'; // Default shots to totals
        }
        // Goals totals (only if explicitly "goal" or generic "total/totals")
        if (normalized.includes('goal') && (normalized.includes('total') || normalized.includes('over') || normalized.includes('under'))) {
            if (normalized.includes('1h') || normalized.includes('first_half')) {
                return 'goals_totals_1h';
            }
            if (normalized.includes('2h') || normalized.includes('second_half')) {
                return 'goals_totals_2h';
            }
            return 'goals_totals';
        }
        // Clean sheet
        if (normalized.includes('clean_sheet') || normalized === 'cleansheet') {
            if (normalized.includes('home'))
                return 'home_clean_sheet';
            if (normalized.includes('away'))
                return 'away_clean_sheet';
            return 'clean_sheet';
        }
        // Draw no bet
        if (normalized === 'dnb' || normalized.includes('draw_no_bet') || normalized.includes('draw-no-bet')) {
            return 'draw_no_bet';
        }
        // Penalty
        if (normalized.includes('penalty')) {
            return 'penalty';
        }
        // Offsides
        if (normalized.includes('offside')) {
            return 'offsides';
        }
        // Fouls
        if (normalized.includes('foul')) {
            return 'fouls';
        }
        // Generic totals - assume goals (match totals)
        if (normalized === 'total' || normalized === 'totals' || normalized === 'over_under' || normalized === 'over/under') {
            return 'goals_totals';
        }
        return normalized;
    };
    const formatSignedLine = (value) => {
        const formatted = formatLineValue(value);
        if (value > 0)
            return `+${formatted}`;
        return formatted;
    };
    const extractUrlMap = () => {
        const candidate = record.urls ??
            record.bookmakerUrls ??
            record.bookmaker_urls;
        if (!candidate || typeof candidate !== 'object')
            return {};
        const map = {};
        for (const [name, url] of Object.entries(candidate)) {
            if (typeof url === 'string' && url.trim().length) {
                map[name] = url.trim();
            }
        }
        return map;
    };
    const urlByBookmaker = extractUrlMap();
    const parseLegacyBookmakersArray = (raw) => {
        return raw
            .map((book) => {
            if (!book || typeof book !== 'object')
                return null;
            const nameCandidate = book.name ??
                book.key ??
                book.bookmaker;
            const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate.trim() : null;
            if (!name)
                return null;
            const urlCandidate = book.url ??
                book.link ??
                book.directLink ??
                urlByBookmaker[name];
            const url = typeof urlCandidate === 'string' && urlCandidate.trim().length ? urlCandidate.trim() : undefined;
            const marketsRaw = Array.isArray(book.markets)
                ? book.markets
                : [];
            const markets = marketsRaw
                .map((market) => {
                if (!market || typeof market !== 'object')
                    return null;
                const keyCandidate = market.key ??
                    market.name ??
                    market.market;
                const keyRaw = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate.trim() : null;
                if (!keyRaw)
                    return null;
                const key = canonicalizeMarketBase(keyRaw);
                const updatedAtCandidate = market.updatedAt ??
                    market.updated_at ??
                    market.last_update;
                const updatedAt = typeof updatedAtCandidate === 'string' && updatedAtCandidate.trim().length
                    ? updatedAtCandidate.trim()
                    : undefined;
                const outcomesRaw = Array.isArray(market.outcomes)
                    ? market.outcomes
                    : [];
                const outcomes = outcomesRaw
                    .map((outcome) => {
                    if (!outcome || typeof outcome !== 'object')
                        return null;
                    const nameRaw = outcome.name;
                    const name = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw.trim() : null;
                    if (!name)
                        return null;
                    const oddsRaw = outcome.odds ??
                        outcome.price ??
                        outcome.decimal;
                    const odds = typeof oddsRaw === 'number'
                        ? oddsRaw
                        : typeof oddsRaw === 'string'
                            ? Number.parseFloat(oddsRaw)
                            : Number.NaN;
                    if (!Number.isFinite(odds) || odds <= 0)
                        return null;
                    return { name, odds };
                })
                    .filter((o) => o !== null);
                if (outcomes.length < 2)
                    return null;
                return { key, ...(updatedAt ? { updatedAt } : {}), outcomes };
            })
                .filter((m) => m !== null);
            if (markets.length === 0)
                return null;
            return { name, ...(url ? { url } : {}), markets };
        })
            .filter((b) => b !== null);
    };
    const parseBookmakersMap = (raw) => {
        const bookmakers = [];
        for (const [bookmakerNameRaw, marketsContainer] of Object.entries(raw)) {
            const bookmakerName = bookmakerNameRaw.trim();
            if (!bookmakerName)
                continue;
            const url = urlByBookmaker[bookmakerName];
            const marketsRaw = Array.isArray(marketsContainer)
                ? marketsContainer
                : marketsContainer && typeof marketsContainer === 'object' && Array.isArray(marketsContainer.markets)
                    ? marketsContainer.markets
                    : [];
            const mergedMarkets = new Map();
            for (const market of marketsRaw) {
                if (!market || typeof market !== 'object')
                    continue;
                const marketNameCandidate = market.name ??
                    market.key ??
                    market.market;
                const marketName = typeof marketNameCandidate === 'string' && marketNameCandidate.trim().length ? marketNameCandidate.trim() : null;
                if (!marketName)
                    continue;
                const baseKey = canonicalizeMarketBase(marketName);
                const marketUpdatedAtCandidate = market.updatedAt ??
                    market.updated_at ??
                    market.last_update;
                const marketUpdatedAt = typeof marketUpdatedAtCandidate === 'string' && marketUpdatedAtCandidate.trim().length
                    ? marketUpdatedAtCandidate.trim()
                    : undefined;
                const oddsRows = Array.isArray(market.odds)
                    ? market.odds
                    : [];
                for (const row of oddsRows) {
                    if (!row || typeof row !== 'object')
                        continue;
                    const rowObj = row;
                    const lineCandidate = rowObj.hdp ??
                        rowObj.line ??
                        rowObj.points ??
                        rowObj.handicap;
                    const line = typeof lineCandidate === 'number'
                        ? lineCandidate
                        : typeof lineCandidate === 'string'
                            ? Number.parseFloat(lineCandidate)
                            : Number.NaN;
                    const hasLine = Number.isFinite(line);
                    const marketKey = hasLine ? `${baseKey}_${formatLineValue(line)}` : baseKey;
                    let state = mergedMarkets.get(marketKey);
                    if (!state) {
                        state = { updatedAt: marketUpdatedAt, outcomes: new Map() };
                        mergedMarkets.set(marketKey, state);
                    }
                    else if (marketUpdatedAt && (!state.updatedAt || marketUpdatedAt > state.updatedAt)) {
                        state.updatedAt = marketUpdatedAt;
                    }
                    const shouldDecorateOutcomeWithLine = hasLine && (baseKey === 'spreads' || baseKey === 'handicap');
                    const shouldDecorateOverUnder = hasLine && baseKey === 'totals';
                    for (const [outcomeKeyRaw, oddsRaw] of Object.entries(rowObj)) {
                        const outcomeKey = outcomeKeyRaw.trim();
                        if (!outcomeKey)
                            continue;
                        const lowered = outcomeKey.toLowerCase();
                        if (['hdp', 'line', 'points', 'handicap', 'updatedat', 'updated_at', 'timestamp', 'id'].includes(lowered)) {
                            continue;
                        }
                        const odds = typeof oddsRaw === 'number'
                            ? oddsRaw
                            : typeof oddsRaw === 'string'
                                ? Number.parseFloat(oddsRaw)
                                : Number.NaN;
                        if (!Number.isFinite(odds) || odds <= 0)
                            continue;
                        let outcomeName = outcomeKey;
                        if (shouldDecorateOutcomeWithLine && (lowered === 'home' || lowered === 'away')) {
                            const signedLine = lowered === 'home' ? formatSignedLine(line) : formatSignedLine(-line);
                            outcomeName = `${lowered} ${signedLine}`;
                        }
                        else if (shouldDecorateOverUnder && (lowered === 'over' || lowered === 'under')) {
                            outcomeName = `${lowered} ${formatLineValue(Math.abs(line))}`;
                        }
                        const existing = state.outcomes.get(outcomeName);
                        if (existing === undefined || odds > existing) {
                            state.outcomes.set(outcomeName, odds);
                        }
                    }
                }
            }
            const markets = [];
            for (const [key, state] of mergedMarkets.entries()) {
                const outcomes = [...state.outcomes.entries()]
                    .map(([name, odds]) => ({ name, odds }))
                    .filter((outcome) => outcome.name.trim().length && Number.isFinite(outcome.odds) && outcome.odds > 0);
                if (outcomes.length < 2)
                    continue;
                markets.push({ key, ...(state.updatedAt ? { updatedAt: state.updatedAt } : {}), outcomes });
            }
            if (markets.length === 0)
                continue;
            bookmakers.push({ name: bookmakerName, ...(url ? { url } : {}), markets });
        }
        return bookmakers;
    };
    const bookmakers = bookmakersIsArray
        ? parseLegacyBookmakersArray(rawBookmakers)
        : parseBookmakersMap(rawBookmakers);
    if (bookmakers.length === 0) {
        return null;
    }
    return {
        event: {
            id: eventId,
            name: eventName,
            date: eventDate,
            league: eventLeague,
            sport: eventSport
        },
        bookmakers
    };
}
function getMarketMinRoi(config, group) {
    const globalMin = typeof config.minRoi === 'number' && config.minRoi > 0 ? config.minRoi : 0;
    const groupMin = config.marketGroupThresholds?.[group];
    const hasPositiveOverride = typeof groupMin === 'number' && groupMin > 0;
    return hasPositiveOverride ? groupMin : globalMin;
}
function selectBestDistinctPair(quotesA, quotesB) {
    let best = null;
    for (const a of quotesA) {
        for (const b of quotesB) {
            if (a.bookmaker === b.bookmaker)
                continue;
            const roi = (0, calculator_1.calculateTwoLegArbitrageRoi)(a.odds, b.odds);
            if (roi <= 0)
                continue;
            if (!best || roi > best.roi) {
                best = { a, b, roi };
            }
        }
    }
    return best;
}
function buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys) {
    const marketOutcomeQuotes = new Map();
    const marketMetadataByKey = new Map();
    // Story 7.8: Extract bookmaker URLs
    const bookmakerUrls = {};
    for (const bookmaker of payload.bookmakers) {
        if (bookmaker.url) {
            bookmakerUrls[bookmaker.name] = bookmaker.url;
        }
    }
    // Story 7.8: Track most recent market update timestamp
    let mostRecentMarketUpdate = null;
    for (const bookmaker of payload.bookmakers) {
        for (const market of bookmaker.markets) {
            if (market.updatedAt) {
                if (!mostRecentMarketUpdate || market.updatedAt > mostRecentMarketUpdate) {
                    mostRecentMarketUpdate = market.updatedAt;
                }
            }
        }
    }
    const normalizeMarketKeyForLogging = (key) => key.toLowerCase().trim().replace(/([a-z])-([a-z])/g, '$1_$2').replace(/ /g, '_');
    for (const bookmaker of payload.bookmakers) {
        for (const market of bookmaker.markets) {
            const isKnownMarket = (0, types_1.isKnownMarketPattern)(market.key);
            if (!isKnownMarket) {
                if (unknownMarketKeys) {
                    const rawKey = normalizeMarketKeyForLogging(market.key);
                    if (!unknownMarketKeys.has(rawKey)) {
                        unknownMarketKeys.add(rawKey);
                        (0, logger_1.logDebug)('market.unknown', {
                            context: 'service:deepScan',
                            operation: 'inferMarketMetadata',
                            providerId: DEEP_SCAN_PROVIDER_ID,
                            correlationId: undefined,
                            durationMs: null,
                            errorCategory: null,
                            rawMarketKey: market.key,
                            normalizedKey: rawKey,
                            assignedGroup: 'other'
                        });
                    }
                }
                continue;
            }
            const baseMetadata = (0, types_1.inferMarketMetadata)(market.key);
            const baseKey = baseMetadata.key;
            const baseHasLine = baseMetadata.line !== undefined;
            let outcomesMap = marketOutcomeQuotes.get(baseKey);
            if (!outcomesMap) {
                outcomesMap = new Map();
                marketOutcomeQuotes.set(baseKey, outcomesMap);
                marketMetadataByKey.set(baseKey, baseMetadata);
            }
            for (const outcome of market.outcomes) {
                const line = extractLineFromOutcomeName(outcome.name);
                const shouldAppendLine = !baseHasLine && line !== undefined;
                const marketKeyWithLine = shouldAppendLine ? `${baseKey}_${line}` : baseKey;
                if (marketKeyWithLine !== baseKey) {
                    const existing = marketOutcomeQuotes.get(marketKeyWithLine);
                    outcomesMap = existing ?? new Map();
                    marketOutcomeQuotes.set(marketKeyWithLine, outcomesMap);
                    if (!marketMetadataByKey.has(marketKeyWithLine)) {
                        marketMetadataByKey.set(marketKeyWithLine, (0, types_1.inferMarketMetadata)(marketKeyWithLine));
                    }
                }
                else {
                    outcomesMap = marketOutcomeQuotes.get(baseKey);
                }
                const outcomeKey = normalizeOutcomeName(outcome.name);
                const quotes = outcomesMap.get(outcomeKey);
                const quote = { bookmaker: bookmaker.name, outcomeKey, odds: outcome.odds };
                if (quotes) {
                    quotes.push(quote);
                }
                else {
                    outcomesMap.set(outcomeKey, [quote]);
                }
            }
        }
    }
    const opportunities = [];
    for (const [marketKey, outcomesMap] of marketOutcomeQuotes.entries()) {
        if (outcomesMap.size !== 2) {
            continue;
        }
        const metadata = marketMetadataByKey.get(marketKey) ?? (0, types_1.inferMarketMetadata)(marketKey);
        const minRoi = getMarketMinRoi(config, metadata.group);
        const entries = [...outcomesMap.entries()];
        const [outcomeA, quotesARaw] = entries[0];
        const [outcomeB, quotesBRaw] = entries[1];
        const bestByBookmaker = (quotes) => {
            const map = new Map();
            for (const quote of quotes) {
                const existing = map.get(quote.bookmaker);
                if (!existing || quote.odds > existing.odds) {
                    map.set(quote.bookmaker, quote);
                }
            }
            return [...map.values()];
        };
        const quotesA = bestByBookmaker(quotesARaw);
        const quotesB = bestByBookmaker(quotesBRaw);
        const bestPair = selectBestDistinctPair(quotesA, quotesB);
        if (!bestPair || bestPair.roi < minRoi) {
            continue;
        }
        const sortedBooks = [bestPair.a.bookmaker, bestPair.b.bookmaker].sort();
        const sortedOutcomes = [outcomeA, outcomeB].sort();
        const id = [
            'deep',
            payload.event.id,
            metadata.key,
            sortedBooks[0],
            sortedBooks[1],
            sortedOutcomes[0],
            sortedOutcomes[1]
        ].join(':');
        const impliedProbA = Number((1 / bestPair.a.odds * 100).toFixed(2));
        const impliedProbB = Number((1 / bestPair.b.odds * 100).toFixed(2));
        // Story 7.8: Odds movement tracking
        // Get existing history BEFORE updating (to calculate trend against previous data)
        const existingHistory = oddsHistoryBuffer.get(id) || [];
        const oddsTrend = calculateOddsTrend(existingHistory, bestPair.roi);
        // Update history buffer with current snapshot
        const legOdds = [bestPair.a.odds, bestPair.b.odds];
        const oddsHistory = updateOddsHistory(id, bestPair.roi, legOdds, foundAt);
        opportunities.push({
            id,
            providerId: DEEP_SCAN_PROVIDER_ID,
            sport: payload.event.sport,
            event: {
                name: payload.event.name,
                date: payload.event.date,
                league: payload.event.league
            },
            legs: [
                {
                    bookmaker: bestPair.a.bookmaker,
                    market: metadata.key,
                    odds: bestPair.a.odds,
                    outcome: outcomeA,
                    impliedProbability: impliedProbA
                },
                {
                    bookmaker: bestPair.b.bookmaker,
                    market: metadata.key,
                    odds: bestPair.b.odds,
                    outcome: outcomeB,
                    impliedProbability: impliedProbB
                }
            ],
            roi: bestPair.roi,
            foundAt,
            source: 'deepScan',
            // Story 7.8: Include bookmaker URLs if available
            ...(Object.keys(bookmakerUrls).length > 0 && { bookmakerUrls }),
            // Story 7.8: Include most recent market update timestamp if available
            ...(mostRecentMarketUpdate && { marketUpdatedAt: mostRecentMarketUpdate }),
            // Story 7.8: Odds movement tracking
            oddsTrend,
            oddsHistory
        });
    }
    return opportunities;
}
function computeBestOddsComparison(payload, _config) {
    const marketOutcomeQuotes = new Map();
    const marketMetadataByKey = new Map();
    for (const bookmaker of payload.bookmakers) {
        for (const market of bookmaker.markets) {
            const isKnownMarket = (0, types_1.isKnownMarketPattern)(market.key);
            if (!isKnownMarket)
                continue;
            const baseMetadata = (0, types_1.inferMarketMetadata)(market.key);
            const baseKey = baseMetadata.key;
            const baseHasLine = baseMetadata.line !== undefined;
            let outcomesMap = marketOutcomeQuotes.get(baseKey);
            if (!outcomesMap) {
                outcomesMap = new Map();
                marketOutcomeQuotes.set(baseKey, outcomesMap);
                marketMetadataByKey.set(baseKey, baseMetadata);
            }
            for (const outcome of market.outcomes) {
                const line = extractLineFromOutcomeName(outcome.name);
                const shouldAppendLine = !baseHasLine && line !== undefined;
                const marketKeyWithLine = shouldAppendLine ? `${baseKey}_${line}` : baseKey;
                if (marketKeyWithLine !== baseKey) {
                    const existing = marketOutcomeQuotes.get(marketKeyWithLine);
                    outcomesMap = existing ?? new Map();
                    marketOutcomeQuotes.set(marketKeyWithLine, outcomesMap);
                    if (!marketMetadataByKey.has(marketKeyWithLine)) {
                        marketMetadataByKey.set(marketKeyWithLine, (0, types_1.inferMarketMetadata)(marketKeyWithLine));
                    }
                }
                else {
                    outcomesMap = marketOutcomeQuotes.get(baseKey);
                }
                const outcomeKey = normalizeOutcomeName(outcome.name);
                const quotes = outcomesMap.get(outcomeKey);
                const quote = { bookmaker: bookmaker.name, outcomeKey, odds: outcome.odds };
                if (quotes) {
                    quotes.push(quote);
                }
                else {
                    outcomesMap.set(outcomeKey, [quote]);
                }
            }
        }
    }
    const comparisons = [];
    for (const [marketKey, outcomesMap] of marketOutcomeQuotes.entries()) {
        if (outcomesMap.size !== 2)
            continue;
        const metadata = marketMetadataByKey.get(marketKey) ?? (0, types_1.inferMarketMetadata)(marketKey);
        const entries = [...outcomesMap.entries()];
        const outcomeResults = [];
        const bestOddsPerOutcome = [];
        for (const [outcomeName, quotes] of entries) {
            const bookmakerBest = new Map();
            for (const quote of quotes) {
                const existing = bookmakerBest.get(quote.bookmaker);
                if (!existing || quote.odds > existing) {
                    bookmakerBest.set(quote.bookmaker, quote.odds);
                }
            }
            const allBookmakers = [...bookmakerBest.entries()]
                .map(([bookmaker, odds]) => ({ bookmaker, odds }))
                .sort((a, b) => b.odds - a.odds);
            const best = allBookmakers[0];
            bestOddsPerOutcome.push(best.odds);
            outcomeResults.push({
                outcome: outcomeName,
                bestBookmaker: best.bookmaker,
                bestOdds: best.odds,
                allBookmakers
            });
        }
        let hasArbitrage = false;
        let arbitrageRoi;
        if (outcomeResults.length === 2) {
            const [, quotesARaw] = entries[0];
            const [, quotesBRaw] = entries[1];
            const bestByBookmaker = (quotes) => {
                const map = new Map();
                for (const quote of quotes) {
                    const existing = map.get(quote.bookmaker);
                    if (!existing || quote.odds > existing.odds) {
                        map.set(quote.bookmaker, quote);
                    }
                }
                return [...map.values()];
            };
            const quotesA = bestByBookmaker(quotesARaw);
            const quotesB = bestByBookmaker(quotesBRaw);
            const bestPair = selectBestDistinctPair(quotesA, quotesB);
            if (bestPair && bestPair.roi > 0) {
                hasArbitrage = true;
                arbitrageRoi = bestPair.roi;
            }
        }
        comparisons.push({
            eventId: payload.event.id,
            marketKey: metadata.key,
            marketLabel: metadata.label ?? metadata.key,
            marketGroup: metadata.group,
            outcomes: outcomeResults,
            hasArbitrage,
            arbitrageRoi
        });
    }
    return comparisons;
}
// Story 7.7: Best Odds Cache Management Functions
/**
 * Cache best odds for an event.
 * Called when processing odds data during Deep Scan.
 */
function cacheBestOddsForEvent(eventId, comparisons) {
    bestOddsCache.set(eventId, { data: comparisons, cachedAt: nowMs() });
}
/**
 * Get cached best odds for an event.
 * Returns null if cache miss or expired (> 5 minutes old).
 * Story 7.7: Exported for TRPC endpoint.
 */
function getBestOddsForEvent(eventId) {
    // Lazily cleanup expired entries on access to prevent unbounded growth
    cleanupBestOddsCache();
    const entry = bestOddsCache.get(eventId);
    if (!entry)
        return null;
    const age = nowMs() - entry.cachedAt;
    if (age > BEST_ODDS_CACHE_TTL_MS) {
        bestOddsCache.delete(eventId);
        return null;
    }
    return entry.data;
}
/**
 * Cleanup expired best odds cache entries.
 * Called periodically to prevent unbounded growth.
 */
function cleanupBestOddsCache() {
    const now = nowMs();
    for (const [eventId, entry] of bestOddsCache.entries()) {
        if (now - entry.cachedAt > BEST_ODDS_CACHE_TTL_MS) {
            bestOddsCache.delete(eventId);
        }
    }
}
async function fetchOddsWithRetry(fetchOdds, args, options) {
    const maxAttempts = 3;
    let attempt = 0;
    let lastError;
    while (attempt < maxAttempts) {
        if (args.signal.aborted) {
            throw new Error('aborted');
        }
        try {
            if (options.trackAttempts) {
                updateProgress({ requestsMade: (currentScan?.requestsMade ?? 0) + 1 });
                if (currentScanMode === 'continuous') {
                    recordContinuousRequestWithWarnings(args.correlationId);
                }
            }
            return await fetchOdds(args);
        }
        catch (error) {
            lastError = error;
            const status = getStatusCode(error);
            if (status !== 429 || attempt >= maxAttempts - 1) {
                throw error;
            }
            const backoffMs = Math.min(15000, 1000 * 2 ** attempt + Math.floor(Math.random() * 250));
            await sleep(backoffMs, args.signal);
            attempt += 1;
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Deep scan odds fetch failed');
}
async function runScanForEvents(args) {
    const { mode, config, apiKey, signal, correlationId, events, bookmakers, discoverySummary } = args;
    currentScanMode = mode;
    const fetchOdds = oddsFetcherOverride ?? defaultOddsFetcher;
    const trackOddsAttempts = oddsFetcherOverride !== null;
    const scanStartedAtMs = nowMs();
    const operation = mode === 'continuous' ? 'runContinuousScanCycle' : 'runScan';
    const startEventName = mode === 'continuous' ? 'continuousScan.cycle.start' : 'deepScan.start';
    const completeEventName = mode === 'continuous' ? 'continuousScan.cycle.complete' : 'deepScan.complete';
    const perEventEventName = mode === 'continuous' ? 'continuousScan.event' : 'deepScan.event';
    if (mode === 'continuous') {
        continuousResults = [];
    }
    else {
        manualResults = [];
    }
    let totalMarketsRetrieved = 0;
    let eventsWithMarkets = 0;
    const arbMarketKeys = new Set();
    const arbMarketGroups = new Set();
    const unknownMarketKeys = new Set();
    const collectUniqueMarketKeys = (payload) => {
        const keys = new Set();
        for (const bookmaker of payload.bookmakers) {
            for (const market of bookmaker.markets) {
                const key = typeof market.key === 'string' ? market.key.trim() : '';
                if (key) {
                    keys.add(key);
                }
            }
        }
        return [...keys];
    };
    const updateArbTrackingFromOpportunities = (opportunities) => {
        for (const opportunity of opportunities) {
            for (const leg of opportunity.legs) {
                const marketKey = leg.market?.trim();
                if (!marketKey)
                    continue;
                arbMarketKeys.add(marketKey);
                const metadata = (0, types_1.inferMarketMetadata)(marketKey);
                arbMarketGroups.add(metadata.group);
            }
        }
    };
    updateProgress({
        eventsTotal: events.length,
        eventsScanned: 0,
        opportunitiesFound: 0,
        marketsScanned: 0,
        marketGroupsWithArbs: [],
        currentEventName: undefined,
        mode
    });
    const quotaStatus = getHourlyQuotaStatus();
    (0, logger_1.logInfo)(startEventName, {
        context: 'service:deepScan',
        operation,
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        eventCount: events.length,
        bookmakersCount: bookmakers.length,
        requestsMade: currentScan?.requestsMade ?? 0,
        discoverySummary,
        cacheStatus: {
            totalCached: scanCache.size,
            ttlMinutes: getScanCacheTtlMinutes()
        },
        batchConfig: {
            batchSize: continuousScanBatchSize,
            maxEventsPerCycle: continuousScanMaxEventsPerCycle
        },
        quota: {
            hourlyRequestsUsed: quotaStatus.used,
            hourlyRequestLimit: quotaStatus.limit,
            percentUsed: Number((quotaStatus.percentUsed * 100).toFixed(1))
        }
    });
    if (events.length === 0) {
        if (mode === 'continuous') {
            lastContinuousScanAt = nowIso();
        }
        const averageMarketsPerEvent = 0;
        updateProgress({
            status: 'completed',
            currentEventName: undefined,
            lastContinuousScanAt: lastContinuousScanAt ?? undefined,
            mode
        });
        const quotaStatusAfter = getHourlyQuotaStatus();
        (0, logger_1.logInfo)(completeEventName, {
            context: 'service:deepScan',
            operation,
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId,
            durationMs: nowMs() - scanStartedAtMs,
            errorCategory: null,
            eventsScanned: 0,
            eventsTotal: 0,
            opportunitiesFound: 0,
            eventsFailed: 0,
            requestsMade: currentScan?.requestsMade ?? 0,
            cacheHits: discoverySummary?.cacheHits ?? 0,
            cacheMisses: discoverySummary?.cacheMisses ?? 0,
            marketStats: {
                totalMarketsRetrieved,
                marketsWithArbs: arbMarketKeys.size,
                averageMarketsPerEvent
            },
            quota: {
                hourlyRequestsUsed: quotaStatusAfter.used,
                hourlyRequestLimit: quotaStatusAfter.limit,
                percentUsed: Number((quotaStatusAfter.percentUsed * 100).toFixed(1))
            }
        });
        return;
    }
    const concurrency = Math.max(1, Math.min(10, config.maxConcurrentRequests ?? concurrentRequests));
    let eventErrors = 0;
    const batches = mode === 'continuous' ? chunk(events, continuousScanBatchSize) : [events];
    const processEvent = async (event) => {
        if (signal.aborted)
            return;
        updateProgress({ currentEventName: event.name, mode });
        const startedAtMs = nowMs();
        try {
            const resultsBefore = (mode === 'continuous' ? continuousResults : manualResults).length;
            const result = await fetchOddsWithRetry(fetchOdds, { event, apiKey, bookmakers, signal, correlationId }, { trackAttempts: trackOddsAttempts });
            const foundAt = nowIso();
            let marketsRetrievedForEvent = 0;
            const opportunities = isOpportunityArray(result)
                ? result
                : (() => {
                    const oddsSummary = summarizeRawOddsResult(result);
                    const eventSummary = summarizeRawEventResult(result, event, config);
                    const responseShape = summarizeOddsResponseShape(result);
                    const rawSnippet = formatOddsPayloadSnippet(result, 4000);
                    (0, logger_1.logInfo)('deepScan.odds.payload.summary', {
                        context: 'service:deepScan',
                        operation,
                        providerId: DEEP_SCAN_PROVIDER_ID,
                        correlationId,
                        durationMs: null,
                        errorCategory: null,
                        eventId: event.id,
                        eventName: event.name,
                        rawBookmakersCount: oddsSummary.rawBookmakersCount,
                        rawMarketsCount: oddsSummary.rawMarketsCount,
                        rawOutcomesCount: oddsSummary.rawOutcomesCount,
                        validBookmakersCount: oddsSummary.validBookmakersCount,
                        validMarketsCount: oddsSummary.validMarketsCount,
                        validOutcomesCount: oddsSummary.validOutcomesCount,
                        responseType: responseShape.responseType,
                        responseKeys: responseShape.responseKeys,
                        responseLength: responseShape.responseLength,
                        responseError: responseShape.responseError
                    });
                    (0, logger_1.logDebug)('deepScan.odds.payload.raw', {
                        context: 'service:deepScan',
                        operation,
                        providerId: DEEP_SCAN_PROVIDER_ID,
                        correlationId,
                        durationMs: null,
                        errorCategory: null,
                        eventId: eventSummary.eventId,
                        eventName: eventSummary.eventName,
                        eventDate: eventSummary.eventDate,
                        eventLeague: eventSummary.eventLeague,
                        eventSport: eventSummary.eventSport,
                        truncated: rawSnippet.truncated,
                        payloadPreview: rawSnippet.preview
                    });
                    if (oddsSummary.sampleBookmakers.length > 0) {
                        (0, logger_1.logInfo)('deepScan.odds.payload.sample', {
                            context: 'service:deepScan',
                            operation,
                            providerId: DEEP_SCAN_PROVIDER_ID,
                            correlationId,
                            durationMs: null,
                            errorCategory: null,
                            eventId: eventSummary.eventId,
                            eventName: eventSummary.eventName,
                            eventDate: eventSummary.eventDate,
                            eventLeague: eventSummary.eventLeague,
                            eventSport: eventSummary.eventSport,
                            sampleBookmakers: oddsSummary.sampleBookmakers
                        });
                    }
                    const payload = toRawOddsPayload(result, event, config);
                    if (!payload) {
                        (0, logger_1.logWarn)('deepScan.odds.payload.dropped', {
                            context: 'service:deepScan',
                            operation,
                            providerId: DEEP_SCAN_PROVIDER_ID,
                            correlationId,
                            durationMs: null,
                            errorCategory: null,
                            eventId: event.id,
                            eventName: event.name,
                            reason: oddsSummary.dropReason ?? 'parser_returned_null',
                            rawBookmakersCount: oddsSummary.rawBookmakersCount,
                            rawMarketsCount: oddsSummary.rawMarketsCount,
                            validBookmakersCount: oddsSummary.validBookmakersCount,
                            validMarketsCount: oddsSummary.validMarketsCount,
                            responseType: responseShape.responseType,
                            responseKeys: responseShape.responseKeys,
                            responseLength: responseShape.responseLength,
                            responseError: responseShape.responseError
                        });
                        return [];
                    }
                    const uniqueMarketKeys = collectUniqueMarketKeys(payload);
                    marketsRetrievedForEvent = uniqueMarketKeys.length;
                    // Story 7.7: Cache best odds for Odds Comparison View
                    const bestOddsComparisons = computeBestOddsComparison(payload, config);
                    if (bestOddsComparisons.length > 0) {
                        cacheBestOddsForEvent(payload.event.id, bestOddsComparisons);
                    }
                    // Story 8.1: Cache raw odds for Odds Browser
                    cacheRawOdds(payload.event.id, payload);
                    return buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys);
                })();
            if (marketsRetrievedForEvent > 0) {
                totalMarketsRetrieved += marketsRetrievedForEvent;
                eventsWithMarkets += 1;
            }
            if (opportunities.length) {
                updateArbTrackingFromOpportunities(opportunities);
                if (mode === 'continuous') {
                    continuousResults.push(...opportunities);
                    updateProgress({ opportunitiesFound: continuousResults.length, mode });
                }
                else {
                    manualResults.push(...opportunities);
                    updateProgress({ opportunitiesFound: manualResults.length, mode });
                }
            }
            const resultsAfter = (mode === 'continuous' ? continuousResults : manualResults).length;
            const arbsFound = Math.max(0, resultsAfter - resultsBefore);
            updateProgress({
                eventsScanned: (currentScan?.eventsScanned ?? 0) + 1,
                marketsScanned: (currentScan?.marketsScanned ?? 0) + marketsRetrievedForEvent,
                marketGroupsWithArbs: [...arbMarketGroups],
                mode
            });
            if (mode === 'continuous') {
                updateScanCache(event.id, bookmakers);
                recordContinuousEventScanned(1);
                recordContinuousOpportunitiesFound(arbsFound);
            }
            (0, logger_1.logInfo)(perEventEventName, {
                context: 'service:deepScan',
                operation,
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: nowMs() - startedAtMs,
                errorCategory: null,
                eventId: event.id,
                eventName: event.name,
                success: true,
                arbsFound,
                requestsMade: currentScan?.requestsMade ?? 0
            });
        }
        catch (error) {
            if (signal.aborted || isAbortError(error)) {
                updateProgress({ status: 'cancelled', currentEventName: undefined, mode });
                return;
            }
            eventErrors += 1;
            if (mode === 'continuous') {
                recordContinuousEventScanned(1);
            }
            (0, logger_1.logWarn)(perEventEventName, {
                context: 'service:deepScan',
                operation,
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: nowMs() - startedAtMs,
                errorCategory: 'ProviderError',
                eventId: event.id,
                eventName: event.name,
                success: false,
                arbsFound: 0,
                message: error?.message ?? 'Deep scan event error'
            });
            updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode });
        }
    };
    // Story 7.8: Process a batch of events using the batch odds endpoint
    const processBatchWithBatchOdds = async (batchEvents) => {
        if (signal.aborted || batchEvents.length === 0)
            return;
        // Group into API batches of 10 events max
        const apiBatches = chunk(batchEvents, BATCH_SIZE_MAX);
        const batchFetcher = getBatchOddsFetcher();
        for (const apiBatch of apiBatches) {
            if (signal.aborted)
                break;
            updateProgress({ currentEventName: `Batch: ${apiBatch.length} events`, mode });
            const batchStartedAtMs = nowMs();
            try {
                const batchResponse = await batchFetcher({
                    events: apiBatch,
                    apiKey,
                    bookmakers,
                    signal,
                    correlationId
                });
                // Process each event result in the batch
                for (const eventResult of batchResponse.results) {
                    if (signal.aborted)
                        break;
                    const event = apiBatch.find((e) => e.id === eventResult.eventId);
                    if (!event)
                        continue;
                    updateProgress({ currentEventName: event.name, mode });
                    if (!eventResult.success) {
                        // Event failed in batch
                        eventErrors += 1;
                        if (mode === 'continuous') {
                            recordContinuousEventScanned(1);
                        }
                        (0, logger_1.logWarn)(perEventEventName, {
                            context: 'service:deepScan',
                            operation,
                            providerId: DEEP_SCAN_PROVIDER_ID,
                            correlationId,
                            durationMs: null,
                            errorCategory: 'ProviderError',
                            eventId: event.id,
                            eventName: event.name,
                            success: false,
                            arbsFound: 0,
                            message: eventResult.error ?? 'Event failed in batch'
                        });
                        updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode });
                        continue;
                    }
                    // Process successful event result
                    const result = eventResult.data;
                    const foundAt = nowIso();
                    const resultsBefore = (mode === 'continuous' ? continuousResults : manualResults).length;
                    let marketsRetrievedForEvent = 0;
                    const opportunities = isOpportunityArray(result)
                        ? result
                        : (() => {
                            const payload = toRawOddsPayload(result, event, config);
                            if (!payload) {
                                return [];
                            }
                            const uniqueMarketKeys = collectUniqueMarketKeys(payload);
                            marketsRetrievedForEvent = uniqueMarketKeys.length;
                            // Cache best odds and raw odds
                            const bestOddsComparisons = computeBestOddsComparison(payload, config);
                            if (bestOddsComparisons.length > 0) {
                                cacheBestOddsForEvent(payload.event.id, bestOddsComparisons);
                            }
                            cacheRawOdds(payload.event.id, payload);
                            return buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys);
                        })();
                    if (marketsRetrievedForEvent > 0) {
                        totalMarketsRetrieved += marketsRetrievedForEvent;
                        eventsWithMarkets += 1;
                    }
                    if (opportunities.length) {
                        updateArbTrackingFromOpportunities(opportunities);
                        if (mode === 'continuous') {
                            continuousResults.push(...opportunities);
                            updateProgress({ opportunitiesFound: continuousResults.length, mode });
                        }
                        else {
                            manualResults.push(...opportunities);
                            updateProgress({ opportunitiesFound: manualResults.length, mode });
                        }
                    }
                    const resultsAfter = (mode === 'continuous' ? continuousResults : manualResults).length;
                    const arbsFound = Math.max(0, resultsAfter - resultsBefore);
                    updateProgress({
                        eventsScanned: (currentScan?.eventsScanned ?? 0) + 1,
                        marketsScanned: (currentScan?.marketsScanned ?? 0) + marketsRetrievedForEvent,
                        marketGroupsWithArbs: [...arbMarketGroups],
                        mode
                    });
                    if (mode === 'continuous') {
                        updateScanCache(event.id, bookmakers);
                        recordContinuousEventScanned(1);
                        recordContinuousOpportunitiesFound(arbsFound);
                    }
                    (0, logger_1.logInfo)(perEventEventName, {
                        context: 'service:deepScan',
                        operation,
                        providerId: DEEP_SCAN_PROVIDER_ID,
                        correlationId,
                        durationMs: null,
                        errorCategory: null,
                        eventId: event.id,
                        eventName: event.name,
                        success: true,
                        arbsFound,
                        requestsMade: currentScan?.requestsMade ?? 0,
                        batchMode: true
                    });
                }
                (0, logger_1.logInfo)('deepScan.batch.processed', {
                    context: 'service:deepScan',
                    operation,
                    providerId: DEEP_SCAN_PROVIDER_ID,
                    correlationId,
                    durationMs: nowMs() - batchStartedAtMs,
                    errorCategory: null,
                    batchSize: apiBatch.length,
                    successCount: batchResponse.results.filter((r) => r.success).length,
                    failureCount: batchResponse.results.filter((r) => !r.success).length
                });
            }
            catch (error) {
                if (signal.aborted || isAbortError(error)) {
                    updateProgress({ status: 'cancelled', currentEventName: undefined, mode });
                    return;
                }
                // Batch request failed entirely - count all events as errors
                eventErrors += apiBatch.length;
                for (let i = 0; i < apiBatch.length; i++) {
                    if (mode === 'continuous') {
                        recordContinuousEventScanned(1);
                    }
                    updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode });
                }
                (0, logger_1.logWarn)('deepScan.batch.failed', {
                    context: 'service:deepScan',
                    operation,
                    providerId: DEEP_SCAN_PROVIDER_ID,
                    correlationId,
                    durationMs: nowMs() - batchStartedAtMs,
                    errorCategory: 'ProviderError',
                    batchSize: apiBatch.length,
                    message: error?.message ?? 'Batch request failed'
                });
            }
        }
    };
    // Story 7.8: Legacy single-event scan batch (used when batch mode disabled)
    const scanBatch = async (batchEvents) => {
        let nextIndex = 0;
        const worker = async () => {
            while (!signal.aborted) {
                const index = nextIndex;
                nextIndex += 1;
                if (index >= batchEvents.length) {
                    return;
                }
                await processEvent(batchEvents[index]);
            }
        };
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
    };
    // Story 7.8: Choose batch or single-event processing based on setting
    if (useBatchOdds) {
        // Batch mode: process events in batches of 10 using /v3/odds/multi
        // Concurrency: N concurrent batch requests (each batch = 10 events)
        const batchConcurrency = Math.max(1, Math.min(5, concurrency));
        const apiBatches = chunk(events, BATCH_SIZE_MAX);
        (0, logger_1.logInfo)('deepScan.batch.mode', {
            context: 'service:deepScan',
            operation,
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId,
            durationMs: null,
            errorCategory: null,
            totalEvents: events.length,
            totalBatches: apiBatches.length,
            batchSize: BATCH_SIZE_MAX,
            batchConcurrency
        });
        // Process batches with concurrency
        const batchChunks = chunk(apiBatches, batchConcurrency);
        for (const concurrentBatches of batchChunks) {
            if (signal.aborted)
                break;
            // Flatten concurrent batches and process
            const flatEvents = concurrentBatches.flat();
            await processBatchWithBatchOdds(flatEvents);
        }
    }
    else {
        // Legacy mode: single-event processing
        for (const batch of batches) {
            if (signal.aborted)
                break;
            await scanBatch(batch);
        }
    }
    if ((currentScan?.status ?? 'idle') !== 'cancelled') {
        updateProgress({ status: 'completed', currentEventName: undefined, mode });
    }
    if (mode === 'continuous') {
        lastContinuousScanAt = nowIso();
        updateProgress({ lastContinuousScanAt: lastContinuousScanAt ?? undefined, mode });
        recordScanCompletion({
            startedAt: new Date(scanStartedAtMs).toISOString(),
            completedAt: lastContinuousScanAt,
            eventsScanned: currentScan?.eventsScanned ?? 0,
            opportunitiesFound: continuousResults.length,
            durationMs: nowMs() - scanStartedAtMs,
            mode: 'continuous'
        });
    }
    else if (mode === 'manual') {
        recordScanCompletion({
            startedAt: new Date(scanStartedAtMs).toISOString(),
            completedAt: nowIso(),
            eventsScanned: currentScan?.eventsScanned ?? 0,
            opportunitiesFound: manualResults.length,
            durationMs: nowMs() - scanStartedAtMs,
            mode: 'manual'
        });
    }
    const quotaStatusAfter = getHourlyQuotaStatus();
    const averageMarketsPerEvent = eventsWithMarkets > 0 ? Number((totalMarketsRetrieved / eventsWithMarkets).toFixed(2)) : 0;
    (0, logger_1.logInfo)(completeEventName, {
        context: 'service:deepScan',
        operation,
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: nowMs() - scanStartedAtMs,
        errorCategory: null,
        eventsScanned: currentScan?.eventsScanned ?? 0,
        eventsTotal: currentScan?.eventsTotal ?? 0,
        opportunitiesFound: mode === 'continuous' ? continuousResults.length : manualResults.length,
        eventsFailed: eventErrors,
        requestsMade: currentScan?.requestsMade ?? 0,
        cacheHits: discoverySummary?.cacheHits ?? 0,
        cacheMisses: discoverySummary?.cacheMisses ?? 0,
        marketStats: {
            totalMarketsRetrieved,
            marketsWithArbs: arbMarketKeys.size,
            averageMarketsPerEvent,
            unknownMarketsCount: unknownMarketKeys.size
        },
        quota: {
            hourlyRequestsUsed: quotaStatusAfter.used,
            hourlyRequestLimit: quotaStatusAfter.limit,
            percentUsed: Number((quotaStatusAfter.percentUsed * 100).toFixed(1))
        }
    });
}
async function runManualScan(config, apiKey, signal, correlationId) {
    const resolveEvents = eventResolverOverride ?? defaultEventResolver;
    const resolveBookmakers = bookmakersResolverOverride ?? defaultBookmakersResolver;
    const bookmakers = await resolveBookmakers({ config, apiKey });
    // Early validation: odds-api.io /odds endpoint requires bookmakers
    if (!bookmakers.length) {
        throw new Error('No bookmakers configured for Deep Scan. ' +
            'Please select bookmakers in Settings (Odds-API.io bookmaker selection) before running a scan.');
    }
    const events = await resolveEvents({ config, apiKey, signal, correlationId });
    await runScanForEvents({
        mode: 'manual',
        config,
        apiKey,
        signal,
        correlationId,
        events,
        bookmakers
    });
}
function scheduleContinuousStart(waitMs, reason) {
    const safeWaitMs = Math.max(0, waitMs);
    clearMinIntervalTimer();
    minIntervalTimer = setTimeout(() => {
        minIntervalTimer = null;
        if (!continuousScanQueued || !continuousDeepScanEnabled || manualScanInProgress) {
            return;
        }
        void startContinuousDeepScan({ reason, force: true });
    }, safeWaitMs);
    (0, logger_1.logInfo)('continuousScan.scheduled', {
        context: 'service:deepScan',
        operation: 'scheduleContinuousStart',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        waitMs: safeWaitMs,
        reason
    });
}
function cancelContinuousDeepScan(reason) {
    clearMinIntervalTimer();
    continuousScanQueued = false;
    if (continuousAbortController) {
        continuousAbortController.abort();
    }
    isContinuousScanActive = false;
    updateProgress({ status: 'cancelled', currentEventName: undefined, mode: 'continuous' });
    (0, logger_1.logInfo)('continuousScan.cancel', {
        context: 'service:deepScan',
        operation: 'cancelContinuousDeepScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        reason
    });
}
function getContinuousDeepScanEnabled() {
    return continuousDeepScanEnabled;
}
function setContinuousDeepScanEnabled(enabled) {
    const next = Boolean(enabled);
    continuousDeepScanEnabled = next;
    if (!next) {
        cancelContinuousDeepScan('disabled');
    }
    else if (continuousScanQueued && !isContinuousScanActive && !manualScanInProgress) {
        void startContinuousDeepScan({ reason: 'enabled' });
    }
    updateProgress({
        status: currentScan?.status ?? 'idle',
        mode: currentScan?.mode ?? 'manual',
        lastContinuousScanAt: lastContinuousScanAt ?? undefined,
        isContinuousScanActive
    });
    (0, logger_1.logInfo)('continuousScan.enabled', {
        context: 'service:deepScan',
        operation: 'setContinuousDeepScanEnabled',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        enabled: next
    });
}
function normalizeMaxEventsPerCycle(value) {
    const parsed = Number.isFinite(value) ? Math.floor(value) : Number.NaN;
    if (!Number.isFinite(parsed) || parsed < 1) {
        return exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE;
    }
    return Math.min(parsed, 500);
}
function getContinuousScanMaxEventsPerCycle() {
    return continuousScanMaxEventsPerCycle;
}
function setContinuousScanMaxEventsPerCycle(value) {
    continuousScanMaxEventsPerCycle = normalizeMaxEventsPerCycle(value);
    (0, logger_1.logInfo)('continuousScan.maxEvents.set', {
        context: 'service:deepScan',
        operation: 'setContinuousScanMaxEventsPerCycle',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        maxEventsPerCycle: continuousScanMaxEventsPerCycle
    });
}
function getScanCacheTtlMinutes() {
    return Math.round(scanCacheTtlMs / 60_000);
}
function setScanCacheTtl(minutes) {
    const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(60, Math.floor(minutes))) : 5;
    scanCacheTtlMs = normalized * 60_000;
    (0, logger_1.logInfo)('continuousScan.cacheTtl.set', {
        context: 'service:deepScan',
        operation: 'setScanCacheTtl',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        cacheTtlMinutes: normalized
    });
}
function getContinuousScanBatchSize() {
    return continuousScanBatchSize;
}
function setContinuousScanBatchSize(size) {
    const normalized = Number.isFinite(size) ? Math.max(5, Math.min(50, Math.floor(size))) : CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT;
    continuousScanBatchSize = normalized;
    (0, logger_1.logInfo)('continuousScan.batchSize.set', {
        context: 'service:deepScan',
        operation: 'setContinuousScanBatchSize',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        batchSize: normalized
    });
}
function getScanIntervalMinutes() {
    return scanIntervalMinutes;
}
function setScanIntervalMinutes(minutes) {
    const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(30, Math.floor(minutes))) : 5;
    scanIntervalMinutes = normalized;
    (0, logger_1.logInfo)('continuousScan.interval.set', {
        context: 'service:deepScan',
        operation: 'setScanIntervalMinutes',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        intervalMinutes: normalized
    });
}
function getConcurrentRequests() {
    return concurrentRequests;
}
function setConcurrentRequests(value) {
    const normalized = Number.isFinite(value) ? Math.max(1, Math.min(10, Math.floor(value))) : 2;
    concurrentRequests = normalized;
    (0, logger_1.logInfo)('continuousScan.concurrentRequests.set', {
        context: 'service:deepScan',
        operation: 'setConcurrentRequests',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        concurrentRequests: normalized
    });
}
function getScanScope() {
    return scanScope;
}
function setScanScope(value) {
    const validScopes = ['all-sports', 'selected-sports', 'selected-leagues'];
    const normalized = validScopes.includes(value) ? value : 'all-sports';
    scanScope = normalized;
    (0, logger_1.logInfo)('continuousScan.scope.set', {
        context: 'service:deepScan',
        operation: 'setScanScope',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        scanScope: normalized
    });
}
function pauseContinuousScan() {
    continuousScanPaused = true;
    updateProgress({ isPaused: true });
    (0, logger_1.logInfo)('continuousScan.pause', {
        context: 'service:deepScan',
        operation: 'pauseContinuousScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null
    });
}
function resumeContinuousScan() {
    continuousScanPaused = false;
    updateProgress({ isPaused: false });
    (0, logger_1.logInfo)('continuousScan.resume', {
        context: 'service:deepScan',
        operation: 'resumeContinuousScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null
    });
    // Trigger a new scan cycle if conditions are met and interval has elapsed
    if (continuousDeepScanEnabled && !isContinuousScanActive && !manualScanInProgress) {
        const now = nowMs();
        if (lastContinuousScanStartedAtMs !== null) {
            const elapsed = now - lastContinuousScanStartedAtMs;
            const minIntervalMs = Math.max(exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS, scanIntervalMinutes * 60 * 1000);
            if (elapsed >= minIntervalMs) {
                void startContinuousDeepScan({ reason: 'resumed', force: true });
            }
            else {
                // Schedule to start after the interval elapses
                const remainingMs = minIntervalMs - elapsed;
                scheduleContinuousStart(remainingMs, 'resumed-after-interval');
            }
        }
        else {
            void startContinuousDeepScan({ reason: 'resumed', force: true });
        }
    }
}
function isContinuousScanPaused() {
    return continuousScanPaused;
}
function recordScanCompletion(entry) {
    scanHistory.push(entry);
    if (scanHistory.length > MAX_HISTORY_ENTRIES) {
        scanHistory.shift();
    }
}
function getScanHistory() {
    return [...scanHistory];
}
function getDeepScanQuotaStatus() {
    const status = getHourlyQuotaStatus();
    const isThrottled = status.percentUsed >= HOURLY_THROTTLE_THRESHOLD;
    // Calculate when the hourly window resets (throttle resume time)
    let throttleResumeAt;
    if (isThrottled && hourlyWindowStartedAtMs !== null) {
        const windowEndMs = hourlyWindowStartedAtMs + 60 * 60 * 1000; // 1 hour from start
        throttleResumeAt = new Date(windowEndMs).toISOString();
    }
    return {
        hourlyUsed: status.used,
        hourlyLimit: status.limit,
        percentUsed: status.percentUsed,
        isThrottled,
        throttleResumeAt
    };
}
function getCacheStats() {
    const now = nowMs();
    let oldestAgeMs = null;
    for (const entry of scanCache.values()) {
        const age = now - entry.scannedAt;
        if (oldestAgeMs === null || age > oldestAgeMs) {
            oldestAgeMs = age;
        }
    }
    return {
        entries: scanCache.size,
        oldestAgeMs
    };
}
function getAvailableSports() {
    return [...lastDiscoveredSports];
}
function getEnabledSportsFilter() {
    return [...enabledSportsFilter];
}
function setEnabledSportsFilter(sports) {
    const normalized = Array.isArray(sports)
        ? sports.map((s) => s.trim()).filter(Boolean)
        : [];
    enabledSportsFilter = normalized;
    (0, logger_1.logInfo)('continuousScan.sportsFilter.set', {
        context: 'service:deepScan',
        operation: 'setEnabledSportsFilter',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        enabledSports: normalized.length > 0 ? normalized : 'all'
    });
}
function getEnabledLeaguesFilter() {
    return [...enabledLeaguesFilter];
}
function setEnabledLeaguesFilter(leagues) {
    const normalized = Array.isArray(leagues)
        ? leagues.map((l) => l.trim()).filter(Boolean)
        : [];
    enabledLeaguesFilter = normalized;
    (0, logger_1.logInfo)('continuousScan.leaguesFilter.set', {
        context: 'service:deepScan',
        operation: 'setEnabledLeaguesFilter',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        enabledLeagues: normalized.length > 0 ? normalized : 'all'
    });
}
function getContinuousScanStatus() {
    ensureDailyStats(nowMs());
    const cacheStats = getCacheStats();
    return {
        enabled: continuousDeepScanEnabled,
        isActive: isContinuousScanActive,
        isPaused: continuousScanPaused,
        lastContinuousScanAt,
        eventsScannedToday: dailyEventsScanned,
        opportunitiesFoundToday: dailyOpportunitiesFound,
        requestsToday: dailyRequestsMade,
        maxEventsPerCycle: continuousScanMaxEventsPerCycle,
        cacheEntries: cacheStats.entries,
        cacheTtlMinutes: getScanCacheTtlMinutes(),
        batchSize: continuousScanBatchSize,
        cacheOldestEntryAgeMs: cacheStats.oldestAgeMs,
        intervalMinutes: scanIntervalMinutes,
        concurrentRequests,
        scanScope,
        enabledSports: getEnabledSportsFilter(),
        enabledLeagues: getEnabledLeaguesFilter(),
        quotaStatus: getDeepScanQuotaStatus(),
        history: getScanHistory()
    };
}
function setContinuousScanDefaultThresholds(thresholds) {
    if (lastThresholdConfig.minRoi === undefined && lastThresholdConfig.marketGroupThresholds === undefined) {
        lastThresholdConfig = {
            minRoi: thresholds.minRoi,
            marketGroupThresholds: thresholds.marketGroupThresholds,
            maxConcurrentRequests: lastThresholdConfig.maxConcurrentRequests ?? 2
        };
    }
}
async function runContinuousScanCycle(reason) {
    if (!continuousDeepScanEnabled || manualScanInProgress || continuousScanPaused) {
        return;
    }
    if (process.env.NODE_ENV === 'test' && eventsFetcherOverride === null) {
        return;
    }
    const apiKey = await (0, credentials_1.getApiKeyForAdapter)(DEEP_SCAN_PROVIDER_ID);
    if (!apiKey) {
        (0, logger_1.logWarn)('continuousScan.error', {
            context: 'service:deepScan',
            operation: 'runContinuousScanCycle',
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId: continuousCorrelationId ?? undefined,
            durationMs: null,
            errorCategory: 'UserError',
            message: 'API key not configured for provider odds-api-io'
        });
        return;
    }
    continuousCorrelationId = (0, logger_1.createCorrelationId)();
    continuousAbortController = new AbortController();
    const signal = continuousAbortController.signal;
    const correlationId = continuousCorrelationId;
    const startedAt = nowIso();
    isContinuousScanActive = true;
    lastContinuousScanStartedAtMs = nowMs();
    (0, logger_1.logInfo)('continuousScan.trigger', {
        context: 'service:deepScan',
        operation: 'runContinuousScanCycle',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        reason
    });
    updateProgress({
        status: 'scanning',
        eventsScanned: 0,
        eventsTotal: 0,
        requestsMade: 0,
        opportunitiesFound: 0,
        marketsScanned: 0,
        marketGroupsWithArbs: [],
        startedAt,
        elapsedMs: 0,
        mode: 'continuous',
        lastContinuousScanAt: lastContinuousScanAt ?? undefined,
        isContinuousScanActive
    });
    const config = {
        minRoi: lastThresholdConfig.minRoi,
        marketGroupThresholds: lastThresholdConfig.marketGroupThresholds,
        maxConcurrentRequests: lastThresholdConfig.maxConcurrentRequests ?? 2
    };
    try {
        const resolveBookmakers = bookmakersResolverOverride ?? defaultBookmakersResolver;
        const bookmakers = await resolveBookmakers({ config, apiKey });
        // Early validation: odds-api.io /odds endpoint requires bookmakers
        if (!bookmakers.length) {
            throw new Error('No bookmakers configured for Continuous Deep Scan. ' +
                'Please select bookmakers in Settings (Odds-API.io bookmaker selection) before enabling continuous scanning.');
        }
        // Determine sports filter based on scan scope
        let sportsFilter;
        if (scanScope === 'selected-sports' && enabledSportsFilter.length > 0) {
            sportsFilter = enabledSportsFilter;
        }
        else if (scanScope === 'selected-leagues') {
            // For selected-leagues scope, we still need a sport context
            // Use enabled sports if available, otherwise default to football
            sportsFilter = enabledSportsFilter.length > 0 ? enabledSportsFilter : ['football'];
        }
        const events = await discoverAllEvents({
            apiKey,
            signal,
            correlationId,
            sports: sportsFilter
        });
        // Filter by league if 'selected-leagues' scope is active
        let filteredEvents = events;
        if (scanScope === 'selected-leagues' && enabledLeaguesFilter.length > 0) {
            const leagueSet = new Set(enabledLeaguesFilter.map(l => l.toLowerCase()));
            filteredEvents = events.filter(event => {
                if (!event.league)
                    return false;
                return leagueSet.has(event.league.toLowerCase());
            });
        }
        let cacheHits = 0;
        let cacheMisses = 0;
        const eventsToScanRaw = filteredEvents.filter((event) => {
            const shouldScan = shouldScanEvent(event.id, bookmakers);
            if (shouldScan) {
                cacheMisses += 1;
            }
            else {
                cacheHits += 1;
            }
            return shouldScan;
        });
        const budget = computeContinuousEventBudget(eventsToScanRaw.length);
        const eventsToScan = eventsToScanRaw.slice(0, budget);
        if (eventsToScanRaw.length > eventsToScan.length) {
            (0, logger_1.logInfo)('continuousScan.throttle', {
                context: 'service:deepScan',
                operation: 'runContinuousScanCycle',
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: null,
                errorCategory: null,
                requestedEvents: eventsToScanRaw.length,
                allowedEvents: eventsToScan.length,
                budget
            });
        }
        await runScanForEvents({
            mode: 'continuous',
            config,
            apiKey,
            signal,
            correlationId,
            events: eventsToScan,
            bookmakers,
            discoverySummary: {
                eventsDiscovered: events.length,
                eventsToScan: eventsToScan.length,
                cacheHits,
                cacheMisses
            }
        });
    }
    catch (error) {
        if (signal.aborted || isAbortError(error)) {
            updateProgress({ status: 'cancelled', currentEventName: undefined, mode: 'continuous' });
        }
        else {
            updateProgress({
                status: 'error',
                errorMessage: error?.message ?? 'Continuous deep scan failed',
                mode: 'continuous'
            });
            (0, logger_1.logWarn)('continuousScan.error', {
                context: 'service:deepScan',
                operation: 'runContinuousScanCycle',
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: null,
                errorCategory: 'SystemError',
                message: error?.message ?? 'Continuous deep scan failed'
            });
        }
    }
    finally {
        isContinuousScanActive = false;
        continuousAbortController = null;
        updateProgress({
            isContinuousScanActive,
            lastContinuousScanAt: lastContinuousScanAt ?? undefined,
            mode: 'continuous'
        });
    }
}
async function startContinuousDeepScan(args) {
    const { reason, force } = args;
    if (!continuousDeepScanEnabled) {
        return;
    }
    if (manualScanInProgress) {
        continuousScanQueued = true;
        return;
    }
    if (continuousScanPromise) {
        continuousScanQueued = true;
        return;
    }
    const now = nowMs();
    if (!force && lastContinuousScanStartedAtMs !== null) {
        const elapsed = now - lastContinuousScanStartedAtMs;
        // Respect user's scan interval setting (converted to ms), but ensure at least minimum
        const minIntervalMs = Math.max(exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS, scanIntervalMinutes * 60 * 1000);
        if (elapsed < minIntervalMs) {
            continuousScanQueued = true;
            const remainingMs = minIntervalMs - elapsed;
            scheduleContinuousStart(remainingMs, 'scan-interval-elapsed');
            return;
        }
    }
    continuousScanQueued = false;
    clearMinIntervalTimer();
    continuousScanPromise = runContinuousScanCycle(reason)
        .catch((error) => {
        (0, logger_1.logWarn)('continuousScan.error', {
            context: 'service:deepScan',
            operation: 'startContinuousDeepScan',
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId: continuousCorrelationId ?? undefined,
            durationMs: null,
            errorCategory: 'SystemError',
            message: error?.message ?? 'Continuous deep scan failed to start'
        });
    })
        .finally(() => {
        continuousScanPromise = null;
        if (continuousScanQueued && continuousDeepScanEnabled && !manualScanInProgress) {
            const nowAfter = nowMs();
            if (lastContinuousScanStartedAtMs !== null) {
                const elapsed = nowAfter - lastContinuousScanStartedAtMs;
                const minIntervalMs = Math.max(exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS, scanIntervalMinutes * 60 * 1000);
                if (elapsed < minIntervalMs) {
                    const remaining = minIntervalMs - elapsed;
                    scheduleContinuousStart(remaining, 'queued-after-cycle');
                    return;
                }
            }
            void startContinuousDeepScan({ reason: 'queued-after-cycle', force: true });
        }
    });
}
async function startDeepScan(config) {
    const parsed = schemas_1.deepScanConfigSchema.parse(config);
    ensureScope(parsed);
    const currentMode = currentScan?.mode ?? 'manual';
    if (currentScan?.status === 'scanning' && currentMode === 'manual') {
        throw new Error('A deep scan is already in progress');
    }
    if (isContinuousScanActive || continuousScanPromise) {
        cancelContinuousDeepScan('manual_override');
    }
    const apiKey = await (0, credentials_1.getApiKeyForAdapter)(DEEP_SCAN_PROVIDER_ID);
    if (!apiKey) {
        throw new Error('API key not configured for provider odds-api-io');
    }
    lastThresholdConfig = {
        minRoi: parsed.minRoi,
        marketGroupThresholds: parsed.marketGroupThresholds,
        maxConcurrentRequests: parsed.maxConcurrentRequests
    };
    manualCorrelationId = (0, logger_1.createCorrelationId)();
    manualAbortController = new AbortController();
    manualResults = [];
    manualScanInProgress = true;
    currentScanMode = 'manual';
    const startedAt = nowIso();
    currentScan = {
        status: 'scanning',
        eventsScanned: 0,
        eventsTotal: 0,
        requestsMade: 0,
        opportunitiesFound: 0,
        marketsScanned: 0,
        marketGroupsWithArbs: [],
        startedAt,
        elapsedMs: 0,
        mode: 'manual',
        lastContinuousScanAt: lastContinuousScanAt ?? undefined,
        isContinuousScanActive
    };
    (0, logger_1.logInfo)('deepScan.start', {
        context: 'service:deepScan',
        operation: 'startDeepScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: manualCorrelationId,
        durationMs: null,
        errorCategory: null,
        configSummary: {
            eventIds: parsed.eventIds?.length ?? 0,
            hasLeagueId: Boolean(parsed.leagueId),
            hasSportSlug: Boolean(parsed.sportSlug),
            maxConcurrentRequests: parsed.maxConcurrentRequests ?? 2
        },
        requestedEventCount: parsed.eventIds?.length ?? null
    });
    const signal = manualAbortController.signal;
    const correlationId = manualCorrelationId;
    manualScanPromise = runManualScan(parsed, apiKey, signal, correlationId)
        .catch((error) => {
        if (signal.aborted || isAbortError(error)) {
            return;
        }
        updateProgress({ status: 'error', errorMessage: error?.message ?? 'Deep scan failed', mode: 'manual' });
        (0, logger_1.logWarn)('deepScan.error', {
            context: 'service:deepScan',
            operation: 'startDeepScan',
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId,
            durationMs: null,
            errorCategory: 'SystemError',
            message: error?.message ?? 'Deep scan failed'
        });
    })
        .finally(() => {
        manualAbortController = null;
        manualScanInProgress = false;
        if (continuousDeepScanEnabled && continuousScanQueued && !isContinuousScanActive) {
            void startContinuousDeepScan({ reason: 'resume-after-manual', force: true });
        }
    });
}
function cancelDeepScan() {
    const currentMode = currentScan?.mode ?? 'manual';
    if (manualAbortController && currentScan?.status === 'scanning' && currentMode === 'manual') {
        manualAbortController.abort();
        updateProgress({ status: 'cancelled', currentEventName: undefined, mode: 'manual' });
        (0, logger_1.logInfo)('deepScan.cancel', {
            context: 'service:deepScan',
            operation: 'cancelDeepScan',
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId: manualCorrelationId ?? undefined,
            durationMs: null,
            errorCategory: null,
            eventsCompleted: currentScan?.eventsScanned ?? 0,
            opportunitiesFound: manualResults.length,
            requestsMade: currentScan?.requestsMade ?? 0,
            reason: 'user_cancel'
        });
        return;
    }
    if (isContinuousScanActive || continuousScanPromise) {
        cancelContinuousDeepScan('user_cancel');
    }
}
function getDeepScanProgress() {
    const base = currentScan ?? idleProgress();
    if (base.status === 'scanning') {
        return {
            ...base,
            elapsedMs: computeElapsedMs(base.startedAt),
            lastContinuousScanAt: lastContinuousScanAt ?? base.lastContinuousScanAt,
            isContinuousScanActive
        };
    }
    return {
        ...base,
        lastContinuousScanAt: lastContinuousScanAt ?? base.lastContinuousScanAt,
        isContinuousScanActive
    };
}
function getDeepScanResults() {
    const combined = [...manualResults, ...continuousResults];
    return combined.map((opp) => ({
        ...opp,
        source: 'deepScan'
    }));
}
exports.__test = {
    resetState() {
        currentScan = null;
        manualResults = [];
        continuousResults = [];
        manualAbortController = null;
        continuousAbortController = null;
        manualCorrelationId = null;
        continuousCorrelationId = null;
        manualScanPromise = null;
        continuousScanPromise = null;
        manualScanInProgress = false;
        continuousDeepScanEnabled = true;
        isContinuousScanActive = false;
        continuousScanQueued = false;
        lastContinuousScanAt = null;
        lastContinuousScanStartedAtMs = null;
        currentScanMode = 'manual';
        clearMinIntervalTimer();
        lastThresholdConfig = {};
        continuousScanMaxEventsPerCycle = exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE;
        scanCacheTtlMs = exports.SCAN_CACHE_TTL_MS_DEFAULT;
        continuousScanBatchSize = CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT;
        scanCache.clear();
        timeOffsetMs = 0;
        hourlyWindowStartedAtMs = null;
        hourlyRequestsUsed = 0;
        hourlyWarnLogged = false;
        dailyStatsKey = null;
        dailyEventsScanned = 0;
        dailyOpportunitiesFound = 0;
        dailyRequestsMade = 0;
        lastDiscoveredSports = [];
        enabledSportsFilter = [];
        enabledLeaguesFilter = [];
        eventResolverOverride = null;
        eventsFetcherOverride = null;
        oddsFetcherOverride = null;
        bookmakersResolverOverride = null;
        // Story 7.8: Reset batch/live/incremental fetcher overrides
        batchOddsFetcherOverride = null;
        liveEventsFetcherOverride = null;
        incrementalOddsFetcherOverride = null;
        // Story 7.8: Reset efficiency settings
        useBatchOdds = true;
        useIncrementalUpdates = true;
        scanHorizonHours = DEFAULT_SCAN_HORIZON_HOURS;
        scanMode = 'all';
        marketFreshnessThresholdMinutes = 5;
        lastIncrementalFetchTimestamp = null;
        // Story 7.8: Clear odds history buffer
        oddsHistoryBuffer.clear();
    },
    setEventResolver(resolver) {
        eventResolverOverride = resolver;
    },
    setEventsFetcher(fetcher) {
        eventsFetcherOverride = fetcher;
    },
    setOddsFetcher(fetcher) {
        oddsFetcherOverride = fetcher;
    },
    setBookmakersResolver(resolver) {
        bookmakersResolverOverride = resolver;
    },
    // Story 7.8: Test helpers for batch, live, and incremental fetchers
    setBatchOddsFetcher(fetcher) {
        batchOddsFetcherOverride = fetcher;
    },
    setLiveEventsFetcher(fetcher) {
        liveEventsFetcherOverride = fetcher;
    },
    setIncrementalOddsFetcher(fetcher) {
        incrementalOddsFetcherOverride = fetcher;
    },
    getLastIncrementalFetchTimestamp() {
        return lastIncrementalFetchTimestamp;
    },
    setLastIncrementalFetchTimestamp(timestamp) {
        lastIncrementalFetchTimestamp = timestamp;
    },
    async waitForScanCompletion() {
        if (!manualScanPromise)
            return;
        await manualScanPromise;
    },
    async waitForContinuousScanCompletion() {
        if (!continuousScanPromise)
            return;
        await continuousScanPromise;
    },
    shouldScanEvent(eventId, bookmakers) {
        return shouldScanEvent(eventId, bookmakers);
    },
    markEventScanned(eventId, bookmakers) {
        updateScanCache(eventId, bookmakers);
    },
    advanceScanCacheClock(deltaMs) {
        timeOffsetMs += deltaMs;
    },
    buildOpportunitiesFromRawOdds(payload, config, foundAt) {
        const unknownMarketKeys = new Set();
        return buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys);
    },
    computeBestOddsComparison(payload, config) {
        return computeBestOddsComparison(payload, config);
    },
    SCAN_CACHE_TTL_MS: exports.SCAN_CACHE_TTL_MS_DEFAULT,
    getContinuousStatus() {
        return getContinuousScanStatus();
    },
    getScanCacheTtlMs() {
        return scanCacheTtlMs;
    },
    getContinuousScanBatchSize() {
        return continuousScanBatchSize;
    },
    // Story 7.8: Test helpers for API efficiency settings
    getUseBatchOdds() {
        return useBatchOdds;
    },
    setUseBatchOdds(value) {
        useBatchOdds = value;
    },
    getUseIncrementalUpdates() {
        return useIncrementalUpdates;
    },
    setUseIncrementalUpdates(value) {
        useIncrementalUpdates = value;
    },
    getScanHorizonHours() {
        return scanHorizonHours;
    },
    setScanHorizonHours(value) {
        scanHorizonHours = value;
    },
    getScanMode() {
        return scanMode;
    },
    setScanMode(value) {
        scanMode = value;
    },
    getMarketFreshnessThresholdMinutes() {
        return marketFreshnessThresholdMinutes;
    },
    setMarketFreshnessThresholdMinutes(value) {
        marketFreshnessThresholdMinutes = value;
    },
    parseBatchOddsResponse(body, requestedEvents) {
        return parseBatchOddsResponse(body, requestedEvents);
    },
    toRawOddsPayload(result, event, config) {
        return toRawOddsPayload(result, event, config);
    },
    BATCH_SIZE_MAX,
    // Story 7.8: Test helpers for odds movement tracking
    getOddsHistoryBuffer() {
        return oddsHistoryBuffer;
    },
    clearOddsHistoryBuffer() {
        oddsHistoryBuffer.clear();
    },
    setOddsHistory(opportunityId, history) {
        oddsHistoryBuffer.set(opportunityId, history);
    },
    ODDS_HISTORY_MAX_SNAPSHOTS,
    ODDS_TREND_THRESHOLD
};
