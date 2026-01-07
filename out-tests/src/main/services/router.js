"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const server_1 = require("@trpc/server");
const storage_1 = require("./storage");
const schemas_1 = require("../../../shared/schemas");
const poller_1 = require("./poller");
const credentials_1 = require("../credentials");
const clipboard_1 = require("./clipboard");
const logs_1 = require("./logs");
const odds_api_io_1 = require("../adapters/odds-api-io");
const the_odds_api_1 = require("../adapters/the-odds-api");
const t = server_1.initTRPC.create();
(0, poller_1.registerAdapters)([new odds_api_io_1.OddsApiIoAdapter(), new the_odds_api_1.TheOddsApiAdapter()]);
// Initialize with enabled providers (multi-provider mode)
const initialEnabledProviders = (0, storage_1.getEnabledProviders)();
(0, poller_1.notifyEnabledProvidersChanged)(initialEnabledProviders);
// Legacy: also set active provider for backward compatibility
const initialProviderId = (0, storage_1.getActiveProviderId)();
(0, poller_1.notifyActiveProviderChanged)(initialProviderId);
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
    // ============================================================
    // Legacy single-provider procedures (backward compatible)
    // ============================================================
    getActiveProvider: t.procedure.query(async () => {
        const providerId = (0, storage_1.getActiveProviderId)();
        return { providerId };
    }),
    setActiveProvider: t.procedure
        .input(schemas_1.activeProviderSchema)
        .mutation(async ({ input }) => {
        const providerId = input.providerId;
        (0, storage_1.setActiveProviderId)(providerId);
        (0, poller_1.notifyActiveProviderChanged)(providerId);
        return { ok: true };
    }),
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
        const opportunities = [];
        let latestFetchedAt = null;
        for (const providerId of enabledProviderIds) {
            const snapshot = (0, poller_1.getLatestSnapshotForProvider)(providerId);
            opportunities.push(...snapshot.opportunities);
            // Track most recent fetch time
            if (snapshot.fetchedAt) {
                if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
                    latestFetchedAt = snapshot.fetchedAt;
                }
            }
        }
        return {
            enabledProviderIds,
            // Legacy field for backward compatibility
            providerId: enabledProviderIds[0] ?? null,
            opportunities,
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
        const opportunities = [];
        let latestFetchedAt = null;
        for (const providerId of enabledProviderIds) {
            const snapshot = (0, poller_1.getLatestSnapshotForProvider)(providerId);
            opportunities.push(...snapshot.opportunities);
            if (snapshot.fetchedAt) {
                if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
                    latestFetchedAt = snapshot.fetchedAt;
                }
            }
        }
        return {
            enabledProviderIds,
            // Legacy field for backward compatibility
            providerId: enabledProviderIds[0] ?? null,
            opportunities,
            fetchedAt: latestFetchedAt,
            status
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
    })
});
