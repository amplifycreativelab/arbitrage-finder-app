"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveApiKey = saveApiKey;
exports.getApiKeyForAdapter = getApiKeyForAdapter;
exports.isProviderConfigured = isProviderConfigured;
exports.getStorageStatus = getStorageStatus;
exports.acknowledgeFallbackWarning = acknowledgeFallbackWarning;
const storage_1 = require("./services/storage");
async function saveApiKey(providerId, apiKey) {
    await (0, storage_1.saveApiKey)(providerId, apiKey);
}
async function getApiKeyForAdapter(providerId) {
    return (0, storage_1.getApiKey)(providerId);
}
async function isProviderConfigured(providerId) {
    const apiKey = await (0, storage_1.getApiKey)(providerId);
    return typeof apiKey === 'string' && apiKey.length > 0;
}
function getStorageStatus() {
    return {
        isUsingFallbackStorage: (0, storage_1.isUsingFallbackStorage)(),
        fallbackWarningShown: (0, storage_1.getFallbackWarningShown)()
    };
}
async function acknowledgeFallbackWarning() {
    (0, storage_1.markFallbackWarningShown)();
}
