"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const preload_1 = require("@electron-toolkit/preload");
const client_1 = require("@trpc/client");
const renderer_1 = require("electron-trpc/renderer");
// Electron-TRPC bridge: attach to both preload globalThis and renderer via contextBridge
const exposeElectronTRPC = () => {
    const handler = {
        sendMessage: (operation) => electron_1.ipcRenderer.send(renderer_1.ELECTRON_TRPC_CHANNEL, operation),
        onMessage: (callback) => electron_1.ipcRenderer.on(renderer_1.ELECTRON_TRPC_CHANNEL, (_event, payload) => callback(payload))
    };
    globalThis.electronTRPC = handler;
    if (process.contextIsolated) {
        try {
            electron_1.contextBridge.exposeInMainWorld('electronTRPC', handler);
        }
        catch {
            // no-op if already exposed
        }
    }
    else {
        // @ts-ignore - electronTRPC is injected on window in non-isolated mode
        window.electronTRPC = handler;
    }
};
// Register the TRPC bridge immediately so renderer and preload can find it before creating clients.
exposeElectronTRPC();
const trpcClient = (0, client_1.createTRPCProxyClient)({
    links: [(0, renderer_1.ipcLink)()]
});
const credentialsApi = {
    async saveApiKey(providerId, apiKey) {
        await trpcClient.saveApiKey.mutate({ providerId, apiKey });
    },
    async isProviderConfigured(providerId) {
        const result = await trpcClient.isProviderConfigured.query({ providerId });
        return result.isConfigured;
    },
    async getStorageStatus() {
        return trpcClient.getStorageStatus.query();
    },
    async acknowledgeFallbackWarning() {
        await trpcClient.acknowledgeFallbackWarning.mutate();
    },
    // Multi-provider methods (Story 5.1)
    async getEnabledProviders() {
        const result = await trpcClient.getEnabledProviders.query();
        return result.enabledProviders;
    },
    async setProviderEnabled(providerId, enabled) {
        const result = await trpcClient.setProviderEnabled.mutate({ providerId, enabled });
        return result;
    },
    async getAllProvidersStatus() {
        const result = await trpcClient.getAllProvidersStatus.query();
        return result.providers;
    }
};
const oddsApiIoApi = {
    async getSupportedBookmakers() {
        const result = await trpcClient.oddsApiIoGetSupportedBookmakers.query();
        return result.bookmakers;
    },
    async getSelectedBookmakers() {
        const result = await trpcClient.oddsApiIoGetSelectedBookmakers.query();
        return result.bookmakers;
    },
    async selectBookmakers(bookmakers) {
        await trpcClient.oddsApiIoSelectBookmakers.mutate({ bookmakers });
    },
    async clearSelectedBookmakers() {
        await trpcClient.oddsApiIoClearSelectedBookmakers.mutate();
    }
};
const cardRulesApi = {
    async getAllRules() {
        const result = await trpcClient.getBookmakerCardRules.query();
        return result.rules;
    },
    async getRule(bookmaker) {
        const result = await trpcClient.getBookmakerCardRule.query({ bookmaker });
        return result.rule;
    },
    async setRule(bookmaker, rule) {
        await trpcClient.setBookmakerCardRule.mutate({ bookmaker, rule });
    },
    async removeRule(bookmaker) {
        await trpcClient.removeBookmakerCardRule.mutate({ bookmaker });
    },
    async getConfiguredBookmakers() {
        const result = await trpcClient.getConfiguredBookmakers.query();
        return result.bookmakers;
    }
};
const deepScanApi = {
    async startDeepScan(config) {
        await trpcClient.deepScanStart.mutate(config);
    },
    async cancelDeepScan() {
        await trpcClient.deepScanCancel.mutate();
    },
    async getStatus() {
        return trpcClient.deepScanStatus.query();
    },
    async getResults() {
        const result = await trpcClient.deepScanResults.query();
        return result.opportunities;
    },
    async getContinuousEnabled() {
        const result = await trpcClient.deepScanGetContinuousEnabled.query();
        return result.enabled;
    },
    async setContinuousEnabled(enabled) {
        await trpcClient.deepScanSetContinuousEnabled.mutate({ enabled: Boolean(enabled) });
    },
    async getContinuousStatus() {
        return trpcClient.deepScanGetContinuousStatus.query();
    },
    async setMaxEventsPerCycle(maxEvents) {
        await trpcClient.deepScanSetMaxEventsPerCycle.mutate({ maxEvents });
    },
    async getCacheTtl() {
        const result = await trpcClient.deepScanGetCacheTtl.query();
        return result.ttlMinutes;
    },
    async setCacheTtl(ttlMinutes) {
        await trpcClient.deepScanSetCacheTtl.mutate({ ttlMinutes });
    },
    async getBatchSize() {
        const result = await trpcClient.deepScanGetBatchSize.query();
        return result.batchSize;
    },
    async setBatchSize(batchSize) {
        await trpcClient.deepScanSetBatchSize.mutate({ batchSize });
    },
    async clearCache(reason) {
        await trpcClient.deepScanClearCache.mutate(reason ? { reason } : undefined);
    },
    async getIntervalMinutes() {
        const result = await trpcClient.deepScanGetIntervalMinutes.query();
        return result.intervalMinutes;
    },
    async setIntervalMinutes(intervalMinutes) {
        await trpcClient.deepScanSetIntervalMinutes.mutate({ intervalMinutes });
    },
    async getConcurrentRequests() {
        const result = await trpcClient.deepScanGetConcurrentRequests.query();
        return result.concurrentRequests;
    },
    async setConcurrentRequests(concurrentRequests) {
        await trpcClient.deepScanSetConcurrentRequests.mutate({ concurrentRequests });
    },
    async getScanScope() {
        const result = await trpcClient.deepScanGetScope.query();
        return result.scanScope;
    },
    async setScanScope(scanScope) {
        await trpcClient.deepScanSetScope.mutate({ scanScope });
    },
    // Story 7.9: Sport/League filter methods
    async getEnabledSportsFilter() {
        const result = await trpcClient.deepScanGetEnabledSportsFilter.query();
        return result.sports;
    },
    async setEnabledSportsFilter(sports) {
        await trpcClient.deepScanSetEnabledSportsFilter.mutate({ sports });
    },
    async getEnabledLeaguesFilter() {
        const result = await trpcClient.deepScanGetEnabledLeaguesFilter.query();
        return result.leagues;
    },
    async setEnabledLeaguesFilter(leagues) {
        await trpcClient.deepScanSetEnabledLeaguesFilter.mutate({ leagues });
    },
    async fetchSports() {
        const result = await trpcClient.deepScanFetchSports.mutate();
        return result.sports;
    },
    async getSportsDetails() {
        const result = await trpcClient.deepScanGetSportsDetails.query();
        return result.sports;
    },
    async fetchLeagues(sport) {
        const result = await trpcClient.deepScanFetchLeagues.mutate({ sport });
        return result.leagues;
    },
    async getLeagues() {
        const result = await trpcClient.deepScanGetLeagues.query();
        return result.leagues;
    },
    async getLeaguePresets() {
        const result = await trpcClient.deepScanGetLeaguePresets.query();
        return result.presets;
    },
    async applyPreset(presetId) {
        const result = await trpcClient.deepScanApplyPreset.mutate({ presetId });
        return {
            scanScope: result.scanScope,
            enabledSports: result.enabledSports,
            enabledLeagues: result.enabledLeagues
        };
    },
    // Story 8.7: Aggressive scan methods
    async setAggressiveScanConfig(config) {
        await trpcClient.setAggressiveScanConfig.mutate(config);
    },
    async getAggressiveScanConfig() {
        return trpcClient.getAggressiveScanConfig.query();
    },
    async getAggressiveScanStats() {
        return trpcClient.getAggressiveScanStats.query();
    },
    async startAggressiveScan() {
        await trpcClient.startAggressiveScan.mutate();
    },
    async stopAggressiveScan() {
        await trpcClient.stopAggressiveScan.mutate();
    }
};
// Custom APIs for renderer
const api = {
    credentials: credentialsApi,
    oddsApiIo: oddsApiIoApi,
    deepScan: deepScanApi,
    cardRules: cardRulesApi,
    feed: {
        async runManualFetch() {
            await trpcClient.pollAndGetFeedSnapshot.mutate();
        }
    },
    // Story 7.7: Best Odds Comparison API
    async deepScanGetBestOdds(input) {
        return trpcClient.deepScanGetBestOdds.query(input);
    },
    async copySignalToClipboard(input) {
        await trpcClient.copySignalToClipboard.mutate(input);
    }
};
if (process.contextIsolated) {
    try {
        electron_1.contextBridge.exposeInMainWorld('electron', preload_1.electronAPI);
        electron_1.contextBridge.exposeInMainWorld('api', api);
    }
    catch (error) {
        console.error(error);
    }
}
else {
    // @ts-ignore (define in dts)
    window.electron = preload_1.electronAPI;
    // @ts-ignore (define in dts)
    window.api = api;
}
