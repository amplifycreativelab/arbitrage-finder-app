"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test = void 0;
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
let currentScan = null;
let currentResults = [];
let currentAbortController = null;
let currentCorrelationId = null;
let scanPromise = null;
let eventResolverOverride = null;
let oddsFetcherOverride = null;
let bookmakersResolverOverride = null;
function idleProgress() {
    return {
        status: 'idle',
        eventsScanned: 0,
        eventsTotal: 0,
        requestsMade: 0,
        opportunitiesFound: 0,
        startedAt: null,
        elapsedMs: 0
    };
}
function computeElapsedMs(startedAt) {
    if (!startedAt)
        return 0;
    const started = new Date(startedAt).getTime();
    if (!Number.isFinite(started))
        return 0;
    const diff = Date.now() - started;
    return diff > 0 ? diff : 0;
}
function updateProgress(patch) {
    const base = currentScan ?? idleProgress();
    const next = {
        ...base,
        ...patch
    };
    next.elapsedMs = computeElapsedMs(next.startedAt);
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
async function trackedRequest(fn, correlationId) {
    updateProgress({ requestsMade: (currentScan?.requestsMade ?? 0) + 1 });
    return (0, poller_1.scheduleProviderRequest)(DEEP_SCAN_PROVIDER_ID, () => fn({ correlationId }));
}
function extractEvents(payload, config) {
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
            config.leagueId;
        const league = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : undefined;
        const rawSport = item.sport ?? config.sportSlug;
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
    const response = await trackedRequest(async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }), correlationId);
    if (!response.ok) {
        const message = await response.text().catch(() => `Events request failed with status ${response.status}`);
        throw createHttpError(response.status, message || `Events request failed with status ${response.status}`);
    }
    const body = (await response.json());
    return extractEvents(body, config);
};
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
function normalizeOutcomeName(name) {
    const normalized = name.toLowerCase().trim();
    if (!normalized)
        return 'unknown';
    if (normalized === 'yes' || normalized === 'y')
        return 'yes';
    if (normalized === 'no' || normalized === 'n')
        return 'no';
    if (normalized === 'home' || normalized === '1')
        return 'home';
    if (normalized === 'away' || normalized === '2')
        return 'away';
    if (normalized === 'over' || normalized.startsWith('over ')) {
        return normalized.replace(/\s+/g, '_');
    }
    if (normalized === 'under' || normalized.startsWith('under ')) {
        return normalized.replace(/\s+/g, '_');
    }
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
function buildOpportunitiesFromRawOdds(payload, config, foundAt) {
    const marketOutcomeQuotes = new Map();
    const marketMetadataByKey = new Map();
    for (const bookmaker of payload.bookmakers) {
        for (const market of bookmaker.markets) {
            const baseMetadata = (0, types_1.inferMarketMetadata)(market.key);
            let baseKey = baseMetadata.key;
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
        const id = [
            'deep',
            payload.event.id,
            metadata.key,
            bestPair.a.bookmaker,
            bestPair.b.bookmaker,
            outcomeA,
            outcomeB
        ].join(':');
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
                    outcome: outcomeA
                },
                {
                    bookmaker: bestPair.b.bookmaker,
                    market: metadata.key,
                    odds: bestPair.b.odds,
                    outcome: outcomeB
                }
            ],
            roi: bestPair.roi,
            foundAt,
            source: 'deepScan'
        });
    }
    return opportunities;
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
async function runScan(config, apiKey, signal, correlationId) {
    const resolveEvents = eventResolverOverride ?? defaultEventResolver;
    const resolveBookmakers = bookmakersResolverOverride ?? defaultBookmakersResolver;
    const fetchOdds = oddsFetcherOverride ?? defaultOddsFetcher;
    const trackOddsAttempts = oddsFetcherOverride !== null;
    const scanStartedAt = Date.now();
    const bookmakers = await resolveBookmakers({ config, apiKey });
    const events = await resolveEvents({ config, apiKey, signal, correlationId });
    updateProgress({ eventsTotal: events.length });
    let eventErrors = 0;
    (0, logger_1.logInfo)('deepScan.start', {
        context: 'service:deepScan',
        operation: 'runScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        eventCount: events.length,
        bookmakersCount: bookmakers.length,
        requestsMade: currentScan?.requestsMade ?? 0
    });
    if (events.length === 0) {
        updateProgress({ status: 'completed', currentEventName: undefined });
        (0, logger_1.logInfo)('deepScan.complete', {
            context: 'service:deepScan',
            operation: 'runScan',
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId,
            durationMs: Date.now() - scanStartedAt,
            errorCategory: null,
            eventsScanned: 0,
            eventsTotal: 0,
            opportunitiesFound: 0,
            eventsFailed: 0,
            requestsMade: currentScan?.requestsMade ?? 0
        });
        return;
    }
    const concurrency = Math.max(1, Math.min(10, config.maxConcurrentRequests ?? 2));
    let nextIndex = 0;
    const processEvent = async (event) => {
        if (signal.aborted)
            return;
        updateProgress({ currentEventName: event.name });
        const startedAt = Date.now();
        try {
            const resultsBefore = currentResults.length;
            const result = await fetchOddsWithRetry(fetchOdds, { event, apiKey, bookmakers, signal, correlationId }, { trackAttempts: trackOddsAttempts });
            const foundAt = new Date().toISOString();
            const opportunities = isOpportunityArray(result)
                ? result
                : (() => {
                    const payload = toRawOddsPayload(result, event, config);
                    return payload ? buildOpportunitiesFromRawOdds(payload, config, foundAt) : [];
                })();
            if (opportunities.length) {
                currentResults.push(...opportunities);
                updateProgress({ opportunitiesFound: currentResults.length });
            }
            const arbsFound = Math.max(0, currentResults.length - resultsBefore);
            updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1 });
            (0, logger_1.logInfo)('deepScan.event', {
                context: 'service:deepScan',
                operation: 'runScan',
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: Date.now() - startedAt,
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
                updateProgress({ status: 'cancelled', currentEventName: undefined });
                return;
            }
            eventErrors += 1;
            (0, logger_1.logWarn)('deepScan.event', {
                context: 'service:deepScan',
                operation: 'runScan',
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: Date.now() - startedAt,
                errorCategory: 'ProviderError',
                eventId: event.id,
                eventName: event.name,
                success: false,
                arbsFound: 0,
                message: error?.message ?? 'Deep scan event error'
            });
            updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1 });
        }
    };
    const worker = async () => {
        while (!signal.aborted) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= events.length) {
                return;
            }
            await processEvent(events[index]);
        }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    if ((currentScan?.status ?? 'idle') !== 'cancelled') {
        updateProgress({ status: 'completed', currentEventName: undefined });
    }
    (0, logger_1.logInfo)('deepScan.complete', {
        context: 'service:deepScan',
        operation: 'runScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: Date.now() - scanStartedAt,
        errorCategory: null,
        eventsScanned: currentScan?.eventsScanned ?? 0,
        eventsTotal: currentScan?.eventsTotal ?? 0,
        opportunitiesFound: currentResults.length,
        eventsFailed: eventErrors,
        requestsMade: currentScan?.requestsMade ?? 0
    });
}
async function startDeepScan(config) {
    const parsed = schemas_1.deepScanConfigSchema.parse(config);
    ensureScope(parsed);
    if (currentScan?.status === 'scanning') {
        throw new Error('A deep scan is already in progress');
    }
    const apiKey = await (0, credentials_1.getApiKeyForAdapter)(DEEP_SCAN_PROVIDER_ID);
    if (!apiKey) {
        throw new Error('API key not configured for provider odds-api-io');
    }
    currentCorrelationId = (0, logger_1.createCorrelationId)();
    currentAbortController = new AbortController();
    currentResults = [];
    const startedAt = new Date().toISOString();
    currentScan = {
        status: 'scanning',
        eventsScanned: 0,
        eventsTotal: 0,
        requestsMade: 0,
        opportunitiesFound: 0,
        startedAt,
        elapsedMs: 0
    };
    (0, logger_1.logInfo)('deepScan.start', {
        context: 'service:deepScan',
        operation: 'startDeepScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: currentCorrelationId,
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
    const signal = currentAbortController.signal;
    const correlationId = currentCorrelationId;
    scanPromise = runScan(parsed, apiKey, signal, correlationId)
        .catch((error) => {
        if (signal.aborted || isAbortError(error)) {
            return;
        }
        updateProgress({ status: 'error', errorMessage: error?.message ?? 'Deep scan failed' });
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
        currentAbortController = null;
    });
}
function cancelDeepScan() {
    if (!currentAbortController || currentScan?.status !== 'scanning') {
        return;
    }
    currentAbortController.abort();
    updateProgress({ status: 'cancelled', currentEventName: undefined });
    (0, logger_1.logInfo)('deepScan.cancel', {
        context: 'service:deepScan',
        operation: 'cancelDeepScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: currentCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        eventsCompleted: currentScan?.eventsScanned ?? 0,
        opportunitiesFound: currentResults.length,
        requestsMade: currentScan?.requestsMade ?? 0,
        reason: 'user_cancel'
    });
}
function getDeepScanProgress() {
    const base = currentScan ?? idleProgress();
    if (base.status === 'scanning') {
        return {
            ...base,
            elapsedMs: computeElapsedMs(base.startedAt)
        };
    }
    return base;
}
function getDeepScanResults() {
    return currentResults.map((opp) => ({
        ...opp,
        source: 'deepScan'
    }));
}
exports.__test = {
    resetState() {
        currentScan = null;
        currentResults = [];
        currentAbortController = null;
        currentCorrelationId = null;
        scanPromise = null;
        eventResolverOverride = null;
        oddsFetcherOverride = null;
        bookmakersResolverOverride = null;
    },
    setEventResolver(resolver) {
        eventResolverOverride = resolver;
    },
    setOddsFetcher(fetcher) {
        oddsFetcherOverride = fetcher;
    },
    setBookmakersResolver(resolver) {
        bookmakersResolverOverride = resolver;
    },
    async waitForScanCompletion() {
        if (!scanPromise)
            return;
        await scanPromise;
    }
};
