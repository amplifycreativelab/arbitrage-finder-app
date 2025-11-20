"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setSafeStorageForTests = __setSafeStorageForTests;
exports.isUsingFallbackStorage = isUsingFallbackStorage;
exports.getFallbackWarningShown = getFallbackWarningShown;
exports.markFallbackWarningShown = markFallbackWarningShown;
exports.saveApiKey = saveApiKey;
exports.getApiKey = getApiKey;
const electron_store_1 = __importDefault(require("electron-store"));
const electron_1 = require("electron");
const StoreCtor = electron_store_1.default.default ?? electron_store_1.default;
const store = new StoreCtor({
    name: 'credentials',
    defaults: {
        providerSecrets: {}
    },
    projectName: 'arbitrage-finder'
});
let safeStorageOverride = null;
function getEffectiveSafeStorage() {
    return safeStorageOverride ?? electron_1.safeStorage;
}
function __setSafeStorageForTests(override) {
    safeStorageOverride = override;
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
    return Object.values(secrets).some((value) => value.startsWith('b64:'));
}
function getFallbackWarningShown() {
    return store.get('fallbackWarningShown') === true;
}
function markFallbackWarningShown() {
    store.set('fallbackWarningShown', true);
}
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
