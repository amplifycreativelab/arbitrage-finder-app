"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const server_1 = require("@trpc/server");
const zod_1 = require("zod");
const currencyService_1 = require("./currencyService");
const storage_1 = require("./storage");
const schemas_1 = require("../../../shared/schemas");
const poller_1 = require("./poller");
const credentials_1 = require("../credentials");
const clipboard_1 = require("./clipboard");
const logs_1 = require("./logs");
const odds_api_io_1 = require("../adapters/odds-api-io");
const the_odds_api_1 = require("../adapters/the-odds-api");
const calculator_1 = require("./calculator");
const logger_1 = require("./logger");
const odds_api_io_bookmakers_1 = require("./odds-api-io-bookmakers");
const deepScan_1 = require("./deepScan");
const t = server_1.initTRPC.create();
(0, poller_1.registerAdapters)([new odds_api_io_1.OddsApiIoAdapter(), new the_odds_api_1.TheOddsApiAdapter()]);
// Initialize with enabled providers (multi-provider mode)
const initialEnabledProviders = (0, storage_1.getEnabledProviders)();
(0, poller_1.notifyEnabledProvidersChanged)(initialEnabledProviders);
(0, poller_1.registerPollCompleteListener)(() => {
    void (0, deepScan_1.startContinuousDeepScan)({ reason: 'poll-complete' });
});
function buildFeedMergeKey(opportunity) {
    const legsKey = opportunity.legs
        .map((leg) => `${leg.bookmaker}|${leg.market}|${leg.outcome}`)
        .sort()
        .join('|');
    return `${opportunity.event.name}|${opportunity.event.date}|${opportunity.event.league}|${legsKey}`;
}
function mergeDeepScanIntoFeed(feedOpportunities) {
    const deepScanResults = (0, deepScan_1.getDeepScanResults)();
    if (deepScanResults.length === 0) {
        return {
            merged: feedOpportunities,
            stats: {
                feedCount: feedOpportunities.length,
                deepScanCount: 0,
                deepScanMergedCount: 0,
                mergedTotal: feedOpportunities.length
            }
        };
    }
    const feedKeys = new Set(feedOpportunities.map(buildFeedMergeKey));
    const deepScanKeys = new Set();
    const deepScanMerged = [];
    for (const opportunity of deepScanResults) {
        const key = buildFeedMergeKey(opportunity);
        if (feedKeys.has(key) || deepScanKeys.has(key)) {
            continue;
        }
        deepScanKeys.add(key);
        deepScanMerged.push(opportunity);
    }
    const merged = [...feedOpportunities, ...deepScanMerged];
    return {
        merged,
        stats: {
            feedCount: feedOpportunities.length,
            deepScanCount: deepScanResults.length,
            deepScanMergedCount: deepScanMerged.length,
            mergedTotal: merged.length
        }
    };
}
exports.appRouter = t.router({
    saveApiKey: t.procedure
        .input(schemas_1.saveApiKeyInputSchema)
        .mutation(async ({ input }) => {
        await (0, credentials_1.saveApiKey)(input.providerId, input.apiKey);
        return { ok: true };
    }),
    isProviderConfigured: t.procedure
        .input(schemas_1.providerIdParamSchema)
        .query(async ({ input }) => {
        const configured = await (0, credentials_1.isProviderConfigured)(input.providerId);
        return { isConfigured: configured };
    }),
    // Legacy getActiveProvider/setActiveProvider removed in Story 5.1 cleanup
    // ============================================================
    // Multi-provider procedures (Story 5.1)
    // ============================================================
    /**
     * Get all enabled providers.
     */
    getEnabledProviders: t.procedure.query(async () => {
        const enabledProviders = (0, storage_1.getEnabledProviders)();
        return { enabledProviders };
    }),
    /**
     * Toggle a provider's enabled state.
     */
    setProviderEnabled: t.procedure
        .input(schemas_1.setProviderEnabledInputSchema)
        .mutation(async ({ input }) => {
        const providerId = input.providerId;
        const newState = (0, storage_1.toggleProvider)(providerId, input.enabled);
        // Notify poller of configuration change
        const enabledProviders = (0, storage_1.getEnabledProviders)();
        (0, poller_1.notifyEnabledProvidersChanged)(enabledProviders);
        return { providerId, enabled: newState };
    }),
    /**
     * Get all providers with their status (enabled, hasKey).
     */
    getAllProvidersStatus: t.procedure.query(async () => {
        const providers = (0, storage_1.getAllProvidersWithStatus)();
        return { providers };
    }),
    // ============================================================
    // Storage status procedures
    // ============================================================
    getStorageStatus: t.procedure.query(async () => {
        return (0, credentials_1.getStorageStatus)();
    }),
    acknowledgeFallbackWarning: t.procedure.mutation(async () => {
        await (0, credentials_1.acknowledgeFallbackWarning)();
        return { ok: true };
    }),
    // ============================================================
    // Feed procedures (updated for multi-provider)
    // ============================================================
    /**
     * Get current feed snapshot from all enabled providers.
     */
    getFeedSnapshot: t.procedure.query(async () => {
        const enabledProviderIds = (0, storage_1.getEnabledProviders)();
        const status = await (0, poller_1.getDashboardStatusSnapshot)();
        // Concatenate opportunities from all enabled providers
        const rawOpportunities = [];
        let latestFetchedAt = null;
        for (const providerId of enabledProviderIds) {
            const snapshot = (0, poller_1.getLatestSnapshotForProvider)(providerId);
            rawOpportunities.push(...snapshot.opportunities);
            // Track most recent fetch time
            if (snapshot.fetchedAt) {
                if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
                    latestFetchedAt = snapshot.fetchedAt;
                }
            }
        }
        // Deduplicate opportunities across providers (Story 5.2)
        const opportunities = (0, calculator_1.deduplicateOpportunities)(rawOpportunities);
        const { merged, stats: mergeStats } = mergeDeepScanIntoFeed(opportunities);
        // Log deduplication stats for observability (MED-002 fix: parity with pollAndGetFeedSnapshot)
        const stats = (0, calculator_1.getDeduplicationStats)(rawOpportunities.length, opportunities.length);
        if (stats.duplicatesRemoved > 0) {
            (0, logger_1.logInfo)('feed.deduplication', {
                context: 'service:router',
                operation: 'getFeedSnapshot',
                correlationId: undefined,
                durationMs: null,
                errorCategory: null,
                ...stats
            });
        }
        (0, logger_1.logInfo)('feed.merge', {
            context: 'service:router',
            operation: 'getFeedSnapshot',
            correlationId: undefined,
            durationMs: null,
            errorCategory: null,
            ...mergeStats
        });
        return {
            enabledProviderIds,
            // Legacy field for backward compatibility
            providerId: enabledProviderIds[0] ?? null,
            opportunities: merged,
            fetchedAt: latestFetchedAt,
            status
        };
    }),
    /**
     * Poll all enabled providers and return merged feed snapshot.
     */
    pollAndGetFeedSnapshot: t.procedure.mutation(async () => {
        const enabledProviderIds = (0, storage_1.getEnabledProviders)();
        // Poll all enabled providers
        await (0, poller_1.pollOnceForEnabledProviders)();
        const status = await (0, poller_1.getDashboardStatusSnapshot)();
        // Concatenate opportunities from all enabled providers
        const rawOpportunities = [];
        let latestFetchedAt = null;
        for (const providerId of enabledProviderIds) {
            const snapshot = (0, poller_1.getLatestSnapshotForProvider)(providerId);
            rawOpportunities.push(...snapshot.opportunities);
            if (snapshot.fetchedAt) {
                if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
                    latestFetchedAt = snapshot.fetchedAt;
                }
            }
        }
        // Deduplicate opportunities across providers (Story 5.2)
        const opportunities = (0, calculator_1.deduplicateOpportunities)(rawOpportunities);
        const { merged, stats: mergeStats } = mergeDeepScanIntoFeed(opportunities);
        // Log deduplication stats
        const stats = (0, calculator_1.getDeduplicationStats)(rawOpportunities.length, opportunities.length);
        if (stats.duplicatesRemoved > 0) {
            (0, logger_1.logInfo)('feed.deduplication', {
                context: 'service:router',
                operation: 'pollAndGetFeedSnapshot',
                correlationId: undefined,
                durationMs: null,
                errorCategory: null,
                ...stats
            });
        }
        (0, logger_1.logInfo)('feed.merge', {
            context: 'service:router',
            operation: 'pollAndGetFeedSnapshot',
            correlationId: undefined,
            durationMs: null,
            errorCategory: null,
            ...mergeStats
        });
        return {
            enabledProviderIds,
            // Legacy field for backward compatibility
            providerId: enabledProviderIds[0] ?? null,
            opportunities: merged,
            fetchedAt: latestFetchedAt,
            status
        };
    }),
    // ============================================================
    // Deep Scan procedures (Story 7.1)
    // ============================================================
    deepScanStart: t.procedure
        .input(schemas_1.deepScanConfigSchema)
        .mutation(async ({ input }) => {
        await (0, deepScan_1.startDeepScan)(input);
        return { ok: true };
    }),
    deepScanCancel: t.procedure.mutation(async () => {
        (0, deepScan_1.cancelDeepScan)();
        return { ok: true };
    }),
    deepScanStatus: t.procedure.query(async () => {
        return (0, deepScan_1.getDeepScanProgress)();
    }),
    deepScanResults: t.procedure.query(async () => {
        return { opportunities: (0, deepScan_1.getDeepScanResults)() };
    }),
    deepScanGetContinuousEnabled: t.procedure.query(() => {
        return { enabled: (0, deepScan_1.getContinuousDeepScanEnabled)() };
    }),
    deepScanSetContinuousEnabled: t.procedure
        .input(zod_1.z.object({ enabled: zod_1.z.boolean() }))
        .mutation(({ input }) => {
        (0, deepScan_1.setContinuousDeepScanEnabled)(input.enabled);
        return { ok: true };
    }),
    deepScanSetMaxEventsPerCycle: t.procedure
        .input(zod_1.z.object({ maxEvents: zod_1.z.number().int().min(1).max(500) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setContinuousScanMaxEventsPerCycle)(input.maxEvents);
        return { ok: true, maxEvents: (0, deepScan_1.getContinuousScanMaxEventsPerCycle)() };
    }),
    deepScanGetContinuousStatus: t.procedure.query(() => {
        return (0, deepScan_1.getContinuousScanStatus)();
    }),
    deepScanClearCache: t.procedure
        .input(zod_1.z.object({ reason: zod_1.z.string().trim().min(1) }).optional())
        .mutation(({ input }) => {
        (0, deepScan_1.clearScanCache)(input?.reason ?? 'renderer_settings_change');
        return { ok: true };
    }),
    deepScanSetDefaultThresholds: t.procedure
        .input(zod_1.z.object({
        minRoi: zod_1.z.number().min(0).optional(),
        marketGroupThresholds: zod_1.z.record(zod_1.z.string(), zod_1.z.number().min(0)).optional()
    }))
        .mutation(({ input }) => {
        (0, deepScan_1.setContinuousScanDefaultThresholds)(input);
        return { ok: true };
    }),
    deepScanGetCacheTtl: t.procedure.query(() => {
        return { ttlMinutes: (0, deepScan_1.getScanCacheTtlMinutes)() };
    }),
    deepScanSetCacheTtl: t.procedure
        .input(zod_1.z.object({ ttlMinutes: zod_1.z.number().int().min(1).max(60) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setScanCacheTtl)(input.ttlMinutes);
        return { ok: true, ttlMinutes: (0, deepScan_1.getScanCacheTtlMinutes)() };
    }),
    deepScanGetBatchSize: t.procedure.query(() => {
        return { batchSize: (0, deepScan_1.getContinuousScanBatchSize)() };
    }),
    deepScanSetBatchSize: t.procedure
        .input(zod_1.z.object({ batchSize: zod_1.z.number().int().min(5).max(50) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setContinuousScanBatchSize)(input.batchSize);
        return { ok: true, batchSize: (0, deepScan_1.getContinuousScanBatchSize)() };
    }),
    deepScanGetAvailableSports: t.procedure.query(() => {
        return { sports: (0, deepScan_1.getAvailableSports)() };
    }),
    deepScanGetEnabledSportsFilter: t.procedure.query(() => {
        return { sports: (0, deepScan_1.getEnabledSportsFilter)() };
    }),
    deepScanSetEnabledSportsFilter: t.procedure
        .input(zod_1.z.object({ sports: zod_1.z.array(zod_1.z.string()) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setEnabledSportsFilter)(input.sports);
        return { ok: true, sports: (0, deepScan_1.getEnabledSportsFilter)() };
    }),
    deepScanGetEnabledLeaguesFilter: t.procedure.query(() => {
        return { leagues: (0, deepScan_1.getEnabledLeaguesFilter)() };
    }),
    deepScanSetEnabledLeaguesFilter: t.procedure
        .input(zod_1.z.object({ leagues: zod_1.z.array(zod_1.z.string()) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setEnabledLeaguesFilter)(input.leagues);
        return { ok: true, leagues: (0, deepScan_1.getEnabledLeaguesFilter)() };
    }),
    deepScanGetIntervalMinutes: t.procedure.query(() => {
        return { intervalMinutes: (0, deepScan_1.getScanIntervalMinutes)() };
    }),
    deepScanSetIntervalMinutes: t.procedure
        .input(zod_1.z.object({ intervalMinutes: zod_1.z.number().int().min(1).max(30) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setScanIntervalMinutes)(input.intervalMinutes);
        return { ok: true, intervalMinutes: (0, deepScan_1.getScanIntervalMinutes)() };
    }),
    deepScanGetConcurrentRequests: t.procedure.query(() => {
        return { concurrentRequests: (0, deepScan_1.getConcurrentRequests)() };
    }),
    deepScanSetConcurrentRequests: t.procedure
        .input(zod_1.z.object({ concurrentRequests: zod_1.z.number().int().min(1).max(10) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setConcurrentRequests)(input.concurrentRequests);
        return { ok: true, concurrentRequests: (0, deepScan_1.getConcurrentRequests)() };
    }),
    deepScanGetScope: t.procedure.query(() => {
        return { scanScope: (0, deepScan_1.getScanScope)() };
    }),
    deepScanSetScope: t.procedure
        .input(zod_1.z.object({ scanScope: zod_1.z.enum(['all-sports', 'selected-sports', 'selected-leagues']) }))
        .mutation(({ input }) => {
        (0, deepScan_1.setScanScope)(input.scanScope);
        return { ok: true, scanScope: (0, deepScan_1.getScanScope)() };
    }),
    // Story 7.6: Pause/Resume functionality
    deepScanPauseContinuous: t.procedure.mutation(() => {
        (0, deepScan_1.pauseContinuousScan)();
        return { ok: true, isPaused: true };
    }),
    deepScanResumeContinuous: t.procedure.mutation(() => {
        (0, deepScan_1.resumeContinuousScan)();
        return { ok: true, isPaused: false };
    }),
    deepScanGetHistory: t.procedure.query(() => {
        return { history: (0, deepScan_1.getScanHistory)() };
    }),
    deepScanGetQuotaStatus: t.procedure.query(() => {
        return (0, deepScan_1.getDeepScanQuotaStatus)();
    }),
    // Story 7.7: Best Odds Comparison View
    deepScanGetBestOdds: t.procedure
        .input(zod_1.z.object({ eventId: zod_1.z.string() }))
        .query(({ input }) => {
        const bestOdds = (0, deepScan_1.getBestOddsForEvent)(input.eventId);
        return { bestOdds, cachedAt: bestOdds ? Date.now() : null };
    }),
    // Story 8.1: Odds Browser - Raw Odds Data
    deepScanGetRawOdds: t.procedure.query(() => {
        const rawOdds = (0, deepScan_1.getAllRawOdds)();
        return { rawOdds, count: rawOdds.length, cachedAt: Date.now() };
    }),
    deepScanClearRawOddsCache: t.procedure.mutation(() => {
        (0, deepScan_1.clearRawOddsCache)();
        return { ok: true };
    }),
    // Story 7.9: Sports and Leagues Discovery
    deepScanFetchSports: t.procedure.mutation(async () => {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)('odds-api-io');
        if (!apiKey) {
            throw new Error('API key not configured for provider odds-api-io');
        }
        const sports = await (0, deepScan_1.fetchAvailableSports)({ apiKey });
        return { sports };
    }),
    deepScanGetSportsDetails: t.procedure.query(() => {
        return { sports: (0, deepScan_1.getAvailableSportsDetails)() };
    }),
    deepScanFetchLeagues: t.procedure
        .input(zod_1.z.object({ sport: zod_1.z.string().min(1) }))
        .mutation(async ({ input }) => {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)('odds-api-io');
        if (!apiKey) {
            throw new Error('API key not configured for provider odds-api-io');
        }
        const leagues = await (0, deepScan_1.fetchAvailableLeagues)({ apiKey, sport: input.sport });
        return { leagues };
    }),
    deepScanGetLeagues: t.procedure.query(() => {
        return { leagues: (0, deepScan_1.getAvailableLeagues)() };
    }),
    deepScanGetLeaguePresets: t.procedure.query(() => {
        return { presets: (0, deepScan_1.getLeaguePresets)() };
    }),
    deepScanApplyPreset: t.procedure
        .input(zod_1.z.object({ presetId: zod_1.z.string().min(1) }))
        .mutation(({ input }) => {
        const result = (0, deepScan_1.applyLeaguePreset)(input.presetId);
        if (!result.success) {
            throw new Error(result.error ?? 'Failed to apply preset');
        }
        return {
            ok: true,
            scanScope: (0, deepScan_1.getScanScope)(),
            enabledSports: (0, deepScan_1.getEnabledSportsFilter)(),
            enabledLeagues: (0, deepScan_1.getEnabledLeaguesFilter)()
        };
    }),
    // ============================================================
    // Utility procedures
    // ============================================================
    copySignalToClipboard: t.procedure
        .input(schemas_1.copySignalToClipboardInputSchema)
        .mutation(async ({ input }) => {
        (0, clipboard_1.copyTextToClipboard)(input.text);
        return { ok: true };
    }),
    openLogDirectory: t.procedure.mutation(async () => {
        const result = (0, logs_1.openLogDirectory)();
        return result;
    }),
    // ============================================================
    // Odds-API.io bookmaker management
    // ============================================================
    oddsApiIoGetSupportedBookmakers: t.procedure.query(async () => {
        const bookmakers = await (0, odds_api_io_bookmakers_1.getSupportedBookmakers)();
        return { bookmakers };
    }),
    oddsApiIoGetSelectedBookmakers: t.procedure.query(async () => {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)('odds-api-io');
        if (!apiKey) {
            throw new Error('API key not configured for provider odds-api-io');
        }
        const bookmakers = await (0, odds_api_io_bookmakers_1.getSelectedBookmakers)(apiKey);
        return { bookmakers };
    }),
    oddsApiIoSelectBookmakers: t.procedure
        .input(schemas_1.oddsApiIoSelectBookmakersInputSchema)
        .mutation(async ({ input }) => {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)('odds-api-io');
        if (!apiKey) {
            throw new Error('API key not configured for provider odds-api-io');
        }
        await (0, odds_api_io_bookmakers_1.selectBookmakers)(apiKey, input.bookmakers);
        (0, deepScan_1.clearScanCache)('bookmakers_changed');
        return { ok: true };
    }),
    oddsApiIoClearSelectedBookmakers: t.procedure.mutation(async () => {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)('odds-api-io');
        if (!apiKey) {
            throw new Error('API key not configured for provider odds-api-io');
        }
        await (0, odds_api_io_bookmakers_1.clearSelectedBookmakers)(apiKey);
        (0, deepScan_1.clearScanCache)('bookmakers_cleared');
        return { ok: true };
    }),
    // ============================================================
    // Currency Exchange Rate Procedures (Story 8.4)
    // ============================================================
    /**
     * Fetch fresh exchange rates from Frankfurter API
     */
    currencyFetchRates: t.procedure.mutation(async () => {
        const rates = await (0, currencyService_1.fetchRatesFromAPI)();
        return {
            rates: rates.rates,
            base: rates.base,
            date: rates.date,
            fetchedAt: new Date().toISOString()
        };
    }),
    /**
     * Get cached exchange rates
     */
    currencyGetRates: t.procedure.query(() => {
        const rates = (0, currencyService_1.getCachedRates)();
        return {
            rates: rates?.rates ?? null,
            base: rates?.base ?? 'USD',
            date: rates?.date ?? null
        };
    }),
    /**
     * Get last fetch timestamp
     */
    currencyGetLastFetchTime: t.procedure.query(() => {
        const timestamp = (0, currencyService_1.getLastFetchTimestamp)();
        return { timestamp };
    }),
    /**
     * Convert amount between currencies
     */
    currencyConvert: t.procedure
        .input(zod_1.z.object({
        amount: zod_1.z.number().positive(),
        from: zod_1.z.enum(['USD', 'AUD', 'EUR']),
        to: zod_1.z.enum(['USD', 'AUD', 'EUR'])
    }))
        .query(({ input }) => {
        // Zod enum validation ensures input.from/input.to are valid Currency values
        const result = (0, currencyService_1.convert)(input.amount, input.from, input.to);
        return {
            amount: input.amount,
            from: input.from,
            to: input.to,
            result
        };
    })
});
