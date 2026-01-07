"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setSafeStorageForTests = __setSafeStorageForTests;
exports.__resetMigrationForTests = __resetMigrationForTests;
exports.isUsingFallbackStorage = isUsingFallbackStorage;
exports.getFallbackWarningShown = getFallbackWarningShown;
exports.markFallbackWarningShown = markFallbackWarningShown;
exports.getActiveProviderId = getActiveProviderId;
exports.setActiveProviderId = setActiveProviderId;
exports.getEnabledProviders = getEnabledProviders;
exports.setEnabledProviders = setEnabledProviders;
exports.isProviderEnabled = isProviderEnabled;
exports.toggleProvider = toggleProvider;
exports.getAllProvidersWithStatus = getAllProvidersWithStatus;
exports.saveApiKey = saveApiKey;
exports.getApiKey = getApiKey;
const electron_store_1 = __importDefault(require("electron-store"));
const electron_1 = require("electron");
const types_1 = require("../../../shared/types");
const StoreCtor = electron_store_1.default.default ?? electron_store_1.default;
const store = new StoreCtor({
    name: 'credentials',
    defaults: {
        providerSecrets: {}
    },
    projectName: 'arbitrage-finder'
});
let safeStorageOverride = null;
let migrationCompleted = false;
function getEffectiveSafeStorage() {
    return safeStorageOverride ?? electron_1.safeStorage;
}
function __setSafeStorageForTests(override) {
    safeStorageOverride = override;
}
function __resetMigrationForTests() {
    migrationCompleted = false;
}
function isSafeStorageAvailable() {
    try {
        const effectiveSafeStorage = getEffectiveSafeStorage();
        return Boolean(effectiveSafeStorage &&
            typeof effectiveSafeStorage.isEncryptionAvailable === 'function' &&
            effectiveSafeStorage.isEncryptionAvailable());
    }
    catch {
        return false;
    }
}
function isUsingFallbackStorage() {
    const secrets = store.get('providerSecrets') ?? {};
    return Object.values(secrets).some((value) => typeof value === 'string' && value.startsWith('b64:'));
}
function getFallbackWarningShown() {
    return store.get('fallbackWarningShown') === true;
}
function markFallbackWarningShown() {
    store.set('fallbackWarningShown', true);
}
// ============================================================
// Legacy single-provider functions (backward compatible)
// ============================================================
function getActiveProviderId() {
    const stored = store.get('activeProviderId');
    if ((0, types_1.isProviderId)(stored)) {
        return stored;
    }
    return types_1.DEFAULT_PROVIDER_ID;
}
function setActiveProviderId(providerId) {
    if (!(0, types_1.isProviderId)(providerId)) {
        throw new Error('Unsupported providerId');
    }
    store.set('activeProviderId', providerId);
}
// ============================================================
// Multi-provider functions (Story 5.1)
// ============================================================
/**
 * Checks if a provider has an API key configured (synchronous check based on stored secrets).
 * This is a sync helper for migration; for async checks use credentials.isProviderConfigured.
 */
function hasProviderKey(providerId) {
    const secrets = store.get('providerSecrets') ?? {};
    const stored = secrets[providerId];
    return typeof stored === 'string' && stored.length > 0;
}
/**
 * Perform one-time migration from activeProviderId to enabledProviders.
 * Called on first access to multi-provider functions.
 */
function migrateToMultiProvider() {
    if (migrationCompleted)
        return;
    const enabledProviders = store.get('enabledProviders');
    if (enabledProviders === undefined) {
        const legacyActive = store.get('activeProviderId');
        if (legacyActive && (0, types_1.isProviderId)(legacyActive) && hasProviderKey(legacyActive)) {
            // Migrate: single active provider with key becomes the only enabled provider
            store.set('enabledProviders', [legacyActive]);
        }
        else {
            // No legacy config or no key: start with empty enabled list
            store.set('enabledProviders', []);
        }
    }
    migrationCompleted = true;
}
/**
 * Get all enabled providers. Performs migration on first call.
 */
function getEnabledProviders() {
    migrateToMultiProvider();
    const enabled = store.get('enabledProviders');
    if (!Array.isArray(enabled)) {
        return [];
    }
    // Filter to only valid provider IDs
    return enabled.filter((id) => (0, types_1.isProviderId)(id));
}
/**
 * Set the list of enabled providers.
 */
function setEnabledProviders(providers) {
    migrateToMultiProvider();
    // Validate all provider IDs
    const validProviders = providers.filter((id) => (0, types_1.isProviderId)(id));
    store.set('enabledProviders', validProviders);
}
/**
 * Check if a specific provider is enabled.
 */
function isProviderEnabled(providerId) {
    if (!(0, types_1.isProviderId)(providerId)) {
        return false;
    }
    const enabled = getEnabledProviders();
    return enabled.includes(providerId);
}
/**
 * Toggle a provider's enabled state.
 * Returns the new enabled state.
 */
function toggleProvider(providerId, enabled) {
    if (!(0, types_1.isProviderId)(providerId)) {
        throw new Error('Unsupported providerId');
    }
    const currentEnabled = getEnabledProviders();
    if (enabled) {
        // Add if not already present
        if (!currentEnabled.includes(providerId)) {
            setEnabledProviders([...currentEnabled, providerId]);
        }
    }
    else {
        // Remove if present
        setEnabledProviders(currentEnabled.filter((id) => id !== providerId));
    }
    return isProviderEnabled(providerId);
}
/**
 * Get all providers with their enabled status (for UI).
 */
function getAllProvidersWithStatus() {
    migrateToMultiProvider();
    return types_1.PROVIDER_IDS.map((providerId) => ({
        providerId,
        enabled: isProviderEnabled(providerId),
        hasKey: hasProviderKey(providerId)
    }));
}
// ============================================================
// API Key functions
// ============================================================
async function saveApiKey(providerId, apiKey) {
    if (!providerId) {
        throw new Error('providerId is required');
    }
    const secrets = { ...(store.get('providerSecrets') ?? {}) };
    if (!apiKey) {
        delete secrets[providerId];
        store.set('providerSecrets', secrets);
        return;
    }
    if (isSafeStorageAvailable()) {
        const effectiveSafeStorage = getEffectiveSafeStorage();
        const encrypted = effectiveSafeStorage.encryptString(apiKey);
        secrets[providerId] = `enc:${encrypted.toString('base64')}`;
        store.set('providerSecrets', secrets);
        store.set('fallbackWarningShown', false);
        return;
    }
    const buffer = Buffer.from(apiKey, 'utf8');
    secrets[providerId] = `b64:${buffer.toString('base64')}`;
    store.set('providerSecrets', secrets);
}
async function getApiKey(providerId) {
    if (!providerId) {
        throw new Error('providerId is required');
    }
    const secrets = store.get('providerSecrets') ?? {};
    const stored = secrets[providerId];
    if (!stored) {
        return null;
    }
    if (stored.startsWith('enc:') && isSafeStorageAvailable()) {
        const encryptedBuf = Buffer.from(stored.slice(4), 'base64');
        const effectiveSafeStorage = getEffectiveSafeStorage();
        return effectiveSafeStorage.decryptString(encryptedBuf);
    }
    if (stored.startsWith('b64:')) {
        return Buffer.from(stored.slice(4), 'base64').toString('utf8');
    }
    return null;
}
