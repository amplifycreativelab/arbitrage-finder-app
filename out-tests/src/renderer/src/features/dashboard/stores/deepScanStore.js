"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDeepScanStore = void 0;
const zustand_1 = require("zustand");
const trpc_1 = require("../../../lib/trpc");
const feedFiltersStore_1 = require("./feedFiltersStore");
const feedStore_1 = require("./feedStore");
const POLL_INTERVAL_MS = 1500;
const idleProgress = {
    status: 'idle',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    startedAt: null,
    elapsedMs: 0
};
let pollHandle = null;
let lastStatus = 'idle';
function clearPolling() {
    if (pollHandle) {
        clearInterval(pollHandle);
        pollHandle = null;
    }
}
function triggerFeedRefresh() {
    void feedStore_1.useFeedStore.getState().refreshSnapshot();
}
exports.useDeepScanStore = (0, zustand_1.create)((set, get) => ({
    progress: idleProgress,
    isDialogOpen: false,
    isStarting: false,
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
    }
}));
