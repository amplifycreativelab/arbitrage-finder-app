"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDeepScanStore = void 0;
const zustand_1 = require("zustand");
const trpc_1 = require("../../../lib/trpc");
const feedFiltersStore_1 = require("./feedFiltersStore");
const feedStore_1 = require("./feedStore");
const POLL_INTERVAL_MS = 1500;
const DEFAULT_MAX_EVENTS_PER_CYCLE = 50;
const idleProgress = {
    status: 'idle',
    mode: 'manual',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    marketsScanned: 0,
    marketGroupsWithArbs: [],
    startedAt: null,
    elapsedMs: 0
};
let pollHandle = null;
let lastStatus = 'idle';
const idleContinuousStatus = {
    enabled: true,
    isActive: false,
    isPaused: false,
    lastContinuousScanAt: null,
    eventsScannedToday: 0,
    opportunitiesFoundToday: 0,
    requestsToday: 0,
    maxEventsPerCycle: DEFAULT_MAX_EVENTS_PER_CYCLE,
    cacheEntries: 0,
    cacheTtlMinutes: 5,
    batchSize: 10,
    cacheOldestEntryAgeMs: null,
    intervalMinutes: 5,
    concurrentRequests: 2,
    scanScope: 'all-sports',
    enabledSports: [],
    enabledLeagues: [],
    quotaStatus: {
        hourlyUsed: 0,
        hourlyLimit: 5000,
        percentUsed: 0,
        isThrottled: false
    },
    history: []
};
function clearPolling() {
    if (pollHandle) {
        clearInterval(pollHandle);
        pollHandle = null;
    }
}
function triggerFeedRefresh() {
    void feedStore_1.useFeedStore.getState().refreshSnapshot();
}
function computeFilterSignature(state) {
    const regionsKey = (state.regions ?? []).slice().sort().join(',');
    const bookmakersKey = (state.bookmakers ?? []).slice().sort().join(',');
    return `${regionsKey}|${bookmakersKey}`;
}
let filtersSubscribed = false;
function ensureFilterCacheInvalidationSubscription() {
    if (filtersSubscribed)
        return;
    filtersSubscribed = true;
    let previousSignature = computeFilterSignature(feedFiltersStore_1.useFeedFiltersStore.getState());
    feedFiltersStore_1.useFeedFiltersStore.subscribe((state) => {
        const nextSignature = computeFilterSignature(state);
        if (nextSignature === previousSignature) {
            return;
        }
        previousSignature = nextSignature;
        const clearCacheMutation = trpc_1.trpcClient.deepScanClearCache;
        if (!clearCacheMutation || typeof clearCacheMutation.mutate !== 'function') {
            return;
        }
        void clearCacheMutation.mutate({ reason: 'filters_changed' }).catch(() => {
            // Cache invalidation is best-effort and should not surface to the user.
        });
    });
}
ensureFilterCacheInvalidationSubscription();
let startupSyncCompleted = false;
async function syncPersistedSettingsToMain() {
    if (startupSyncCompleted)
        return;
    startupSyncCompleted = true;
    const { continuousDeepScanEnabled, continuousDeepScanMaxEventsPerCycle, deepScanCacheTtlMinutes, deepScanBatchSize, deepScanRoiThresholds, deepScanIntervalMinutes, deepScanConcurrentRequests, deepScanScope } = feedFiltersStore_1.useFeedFiltersStore.getState();
    try {
        await trpc_1.trpcClient.deepScanSetContinuousEnabled.mutate({ enabled: continuousDeepScanEnabled });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetMaxEventsPerCycle.mutate({ maxEvents: continuousDeepScanMaxEventsPerCycle });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetCacheTtl.mutate({ ttlMinutes: deepScanCacheTtlMinutes });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetBatchSize.mutate({ batchSize: deepScanBatchSize });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetDefaultThresholds.mutate({
            minRoi: deepScanRoiThresholds.globalMinRoi,
            marketGroupThresholds: deepScanRoiThresholds.marketGroupMinRoi
        });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetIntervalMinutes.mutate({ intervalMinutes: deepScanIntervalMinutes });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetConcurrentRequests.mutate({ concurrentRequests: deepScanConcurrentRequests });
    }
    catch {
        // Best-effort sync; ignore errors
    }
    try {
        await trpc_1.trpcClient.deepScanSetScope.mutate({ scanScope: deepScanScope });
    }
    catch {
        // Best-effort sync; ignore errors
    }
}
exports.useDeepScanStore = (0, zustand_1.create)((set, get) => ({
    progress: idleProgress,
    continuousStatus: idleContinuousStatus,
    isDialogOpen: false,
    isStarting: false,
    isContinuousUpdating: false,
    isPausing: false,
    lastConfig: null,
    setDialogOpen: (open) => {
        set({ isDialogOpen: open });
    },
    startScan: async (config) => {
        if (get().progress.status === 'scanning' || get().isStarting) {
            return;
        }
        const { deepScanRoiThresholds } = feedFiltersStore_1.useFeedFiltersStore.getState();
        const thresholdOverrides = deepScanRoiThresholds.marketGroupMinRoi;
        const definedOverrides = Object.entries(thresholdOverrides).filter(([, value]) => typeof value === 'number' && value > 0);
        const marketGroupThresholds = definedOverrides.length > 0
            ? Object.fromEntries(definedOverrides)
            : undefined;
        const finalConfig = {
            ...config,
            minRoi: typeof config.minRoi === 'number'
                ? config.minRoi
                : deepScanRoiThresholds.globalMinRoi,
            marketGroupThresholds
        };
        const optimisticStartedAt = new Date().toISOString();
        set({
            isStarting: true,
            isDialogOpen: false,
            lastConfig: finalConfig,
            progress: {
                ...idleProgress,
                status: 'scanning',
                startedAt: optimisticStartedAt
            }
        });
        try {
            await trpc_1.trpcClient.deepScanStart.mutate(finalConfig);
            await get().refreshStatus();
            clearPolling();
            pollHandle = setInterval(() => {
                void get().refreshStatus();
            }, POLL_INTERVAL_MS);
        }
        catch (error) {
            clearPolling();
            const message = error?.message ?? 'Unable to start deep scan';
            lastStatus = 'error';
            set({
                isStarting: false,
                progress: {
                    ...idleProgress,
                    status: 'error',
                    errorMessage: message,
                    startedAt: optimisticStartedAt
                }
            });
        }
        finally {
            set({ isStarting: false });
        }
    },
    cancelScan: async () => {
        try {
            await trpc_1.trpcClient.deepScanCancel.mutate();
        }
        catch {
            // Ignore cancel errors; we still attempt to stop local polling.
        }
        finally {
            clearPolling();
            lastStatus = 'cancelled';
            set((state) => ({
                progress: {
                    ...state.progress,
                    status: 'cancelled'
                }
            }));
            triggerFeedRefresh();
        }
    },
    refreshStatus: async () => {
        try {
            const status = await trpc_1.trpcClient.deepScanStatus.query();
            const previous = lastStatus;
            lastStatus = status.status;
            set((state) => ({
                progress: {
                    ...state.progress,
                    ...status
                }
            }));
            await get().refreshContinuousStatus();
            if (previous === 'scanning' && status.status !== 'scanning') {
                clearPolling();
                triggerFeedRefresh();
            }
        }
        catch (error) {
            clearPolling();
            const message = error?.message ?? 'Unable to refresh deep scan status';
            lastStatus = 'error';
            set((state) => ({
                progress: {
                    ...state.progress,
                    status: 'error',
                    errorMessage: message
                }
            }));
        }
    },
    refreshContinuousStatus: async () => {
        set({ isContinuousUpdating: true });
        try {
            // Sync persisted settings from renderer to main on first refresh
            await syncPersistedSettingsToMain();
            const status = await trpc_1.trpcClient.deepScanGetContinuousStatus.query();
            set({ continuousStatus: status });
        }
        catch (error) {
            const message = error?.message ?? 'Unable to refresh continuous deep scan status';
            set((state) => ({
                progress: {
                    ...state.progress,
                    errorMessage: message
                }
            }));
        }
        finally {
            set({ isContinuousUpdating: false });
        }
    },
    setContinuousEnabled: async (enabled) => {
        const normalized = Boolean(enabled);
        set((state) => ({
            continuousStatus: {
                ...state.continuousStatus,
                enabled: normalized
            }
        }));
        try {
            await trpc_1.trpcClient.deepScanSetContinuousEnabled.mutate({ enabled: normalized });
            await get().refreshContinuousStatus();
        }
        catch (error) {
            const message = error?.message ?? 'Unable to update continuous deep scan setting';
            set((state) => ({
                progress: {
                    ...state.progress,
                    errorMessage: message
                }
            }));
        }
    },
    setMaxEventsPerCycle: async (maxEvents) => {
        const normalized = Number.isFinite(maxEvents) ? Math.max(1, Math.floor(maxEvents)) : DEFAULT_MAX_EVENTS_PER_CYCLE;
        set((state) => ({
            continuousStatus: {
                ...state.continuousStatus,
                maxEventsPerCycle: normalized
            }
        }));
        try {
            await trpc_1.trpcClient.deepScanSetMaxEventsPerCycle.mutate({ maxEvents: normalized });
            await get().refreshContinuousStatus();
        }
        catch (error) {
            const message = error?.message ?? 'Unable to update max events per cycle';
            set((state) => ({
                progress: {
                    ...state.progress,
                    errorMessage: message
                }
            }));
        }
    },
    pauseContinuous: async () => {
        set({ isPausing: true });
        try {
            await trpc_1.trpcClient.deepScanPauseContinuous.mutate();
            set((state) => ({
                continuousStatus: {
                    ...state.continuousStatus,
                    isPaused: true
                }
            }));
        }
        catch (error) {
            const message = error?.message ?? 'Unable to pause continuous scan';
            set((state) => ({
                progress: {
                    ...state.progress,
                    errorMessage: message
                }
            }));
        }
        finally {
            set({ isPausing: false });
        }
    },
    resumeContinuous: async () => {
        set({ isPausing: true });
        try {
            await trpc_1.trpcClient.deepScanResumeContinuous.mutate();
            set((state) => ({
                continuousStatus: {
                    ...state.continuousStatus,
                    isPaused: false
                }
            }));
        }
        catch (error) {
            const message = error?.message ?? 'Unable to resume continuous scan';
            set((state) => ({
                progress: {
                    ...state.progress,
                    errorMessage: message
                }
            }));
        }
        finally {
            set({ isPausing: false });
        }
    }
}));
