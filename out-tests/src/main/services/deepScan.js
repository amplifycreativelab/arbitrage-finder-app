"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test = exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS = exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE = exports.SCAN_CACHE_TTL_MS_DEFAULT = void 0;
exports.clearScanCache = clearScanCache;
exports.shouldScanEvent = shouldScanEvent;
exports.discoverAllEvents = discoverAllEvents;
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
const DEEP_SCAN_PROVIDER_ID = 'odds-api-io';
exports.SCAN_CACHE_TTL_MS_DEFAULT = 5 * 60 * 1000;
exports.CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE = 50;
exports.CONTINUOUS_SCAN_MIN_INTERVAL_MS = 60_000;
const CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT = 10;
let scanCacheTtlMs = exports.SCAN_CACHE_TTL_MS_DEFAULT;
let continuousScanBatchSize = CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT;
let scanIntervalMinutes = 5;
let concurrentRequests = 2;
let scanScope = 'all-sports';
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
        const rawId = item.id;
        const id = rawId != null ? String(rawId) : '';
        if (!id || seen.has(id))
            continue;
        const rawName = item.name ??
            item.event?.name ??
            id;
        const name = typeof rawName === 'string' && rawName.trim().length ? rawName : id;
        const rawDate = item.date ??
            item.commence_time ??
            item.event?.date;
        const date = typeof rawDate === 'string' && rawDate.trim().length ? rawDate : undefined;
        const rawLeague = item.league ??
            item.event?.league ??
            defaults.league;
        const league = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : undefined;
        const rawSport = item.sport ?? defaults.sport;
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
const defaultEventsFetcher = async ({ apiKey, signal, correlationId, page, sport }) => {
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_EVENTS_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    if (sport) {
        url.searchParams.set('sport', sport);
    }
    if (typeof page === 'number' && Number.isFinite(page) && page > 0) {
        url.searchParams.set('page', String(Math.floor(page)));
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
    for (const sport of requestedSportsDeduped) {
        let page = null;
        let pageGuard = 0;
        do {
            const payload = await fetchEvents({ apiKey, signal, correlationId, page: page ?? undefined, sport });
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
    const httpFetch = getHttpFetch();
    const url = new URL(ODDS_API_IO_ODDS_PATH, ODDS_API_IO_BASE_URL);
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('eventId', event.id);
    if (bookmakers.length) {
        url.searchParams.set('bookmakers', bookmakers.join(','));
    }
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId);
    if (!response.ok) {
        const message = await response.text().catch(() => `Odds request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Odds request failed with status ${response.status}`);
    }
    return response.json();
};
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
    if (!Array.isArray(rawBookmakers)) {
        return { ...emptySummary, dropReason: 'missing_bookmakers_array' };
    }
    if (rawBookmakers.length === 0) {
        return { ...emptySummary, dropReason: 'empty_bookmakers_array' };
    }
    let rawMarketsCount = 0;
    let rawOutcomesCount = 0;
    let validBookmakersCount = 0;
    let validMarketsCount = 0;
    let validOutcomesCount = 0;
    const sampleBookmakers = [];
    for (const book of rawBookmakers) {
        if (!book || typeof book !== 'object') {
            continue;
        }
        const nameCandidate = book.name ??
            book.key ??
            book.bookmaker;
        const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate : null;
        const marketsRaw = Array.isArray(book.markets)
            ? book.markets
            : [];
        rawMarketsCount += marketsRaw.length;
        const validMarketsForBook = [];
        for (const market of marketsRaw) {
            if (!market || typeof market !== 'object') {
                continue;
            }
            const keyCandidate = market.key ??
                market.name ??
                market.market;
            const key = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate : null;
            const outcomesRaw = Array.isArray(market.outcomes)
                ? market.outcomes
                : [];
            rawOutcomesCount += outcomesRaw.length;
            if (!key) {
                continue;
            }
            const validOutcomesForMarket = [];
            for (const outcome of outcomesRaw) {
                if (!outcome || typeof outcome !== 'object') {
                    continue;
                }
                const nameRaw = outcome.name;
                const outcomeName = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw : null;
                if (!outcomeName) {
                    continue;
                }
                const oddsRaw = outcome.odds ??
                    outcome.price ??
                    outcome.decimal;
                const odds = typeof oddsRaw === 'number'
                    ? oddsRaw
                    : typeof oddsRaw === 'string'
                        ? Number.parseFloat(oddsRaw)
                        : Number.NaN;
                if (!Number.isFinite(odds) || odds <= 0) {
                    continue;
                }
                validOutcomesForMarket.push({ name: outcomeName, odds });
            }
            validOutcomesCount += validOutcomesForMarket.length;
            if (validOutcomesForMarket.length < 2) {
                continue;
            }
            validMarketsCount += 1;
            if (validMarketsForBook.length < 3) {
                validMarketsForBook.push({
                    key,
                    outcomes: validOutcomesForMarket.slice(0, 3)
                });
            }
        }
        if (!name || validMarketsForBook.length === 0) {
            continue;
        }
        validBookmakersCount += 1;
        if (sampleBookmakers.length < 2) {
            sampleBookmakers.push({
                name,
                markets: validMarketsForBook.slice(0, 3)
            });
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
        rawBookmakersCount: rawBookmakers.length,
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
    const rawEvent = result.event;
    const rawBookmakers = result.bookmakers;
    if (!Array.isArray(rawBookmakers)) {
        return null;
    }
    const eventId = rawEvent && typeof rawEvent === 'object' && rawEvent.id != null
        ? String(rawEvent.id)
        : event.id;
    const eventName = rawEvent && typeof rawEvent === 'object' && typeof rawEvent.name === 'string'
        ? (rawEvent.name || event.name)
        : event.name;
    const rawDate = rawEvent && typeof rawEvent === 'object'
        ? rawEvent.date ??
            rawEvent.commence_time
        : undefined;
    const eventDate = typeof rawDate === 'string' && rawDate.trim().length
        ? rawDate
        : event.date ?? new Date().toISOString();
    const rawLeague = rawEvent && typeof rawEvent === 'object' ? rawEvent.league : undefined;
    const eventLeague = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : event.league ?? '';
    const rawSport = rawEvent && typeof rawEvent === 'object' ? rawEvent.sport : undefined;
    const eventSport = typeof rawSport === 'string' && rawSport.trim().length ? rawSport : event.sport ?? config.sportSlug ?? 'soccer';
    const bookmakers = rawBookmakers
        .map((book) => {
        if (!book || typeof book !== 'object')
            return null;
        const nameCandidate = book.name ??
            book.key ??
            book.bookmaker;
        const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate : null;
        if (!name)
            return null;
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
            const key = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate : null;
            if (!key)
                return null;
            const outcomesRaw = Array.isArray(market.outcomes)
                ? market.outcomes
                : [];
            const outcomes = outcomesRaw
                .map((outcome) => {
                if (!outcome || typeof outcome !== 'object')
                    return null;
                const nameRaw = outcome.name;
                const name = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw : null;
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
            return { key, outcomes };
        })
            .filter((m) => m !== null);
        if (markets.length === 0)
            return null;
        return { name, markets };
    })
        .filter((b) => b !== null);
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
            source: 'deepScan'
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
    for (const batch of batches) {
        if (signal.aborted)
            break;
        await scanBatch(batch);
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
    }
};
