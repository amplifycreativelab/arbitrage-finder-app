"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdapter = registerAdapter;
exports.registerAdapters = registerAdapters;
exports.notifyActiveProviderChanged = notifyActiveProviderChanged;
exports.getActiveProviderForPolling = getActiveProviderForPolling;
exports.getRegisteredAdapter = getRegisteredAdapter;
exports.pollOnceForActiveProvider = pollOnceForActiveProvider;
exports.getLatestSnapshotForProvider = getLatestSnapshotForProvider;
const schemas_1 = require("../../../shared/schemas");
let activeProviderIdForPolling = null;
const adaptersByProviderId = {};
const latestSnapshotByProviderId = {};
const latestSnapshotTimestampByProviderId = {};
function registerAdapter(adapter) {
    adaptersByProviderId[adapter.id] = adapter;
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
