"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROVIDER_ID = exports.PROVIDERS = exports.PROVIDER_IDS = void 0;
exports.isProviderId = isProviderId;
exports.PROVIDER_IDS = ['odds-api-io', 'the-odds-api'];
exports.PROVIDERS = [
    {
        id: 'odds-api-io',
        label: 'Production (Odds-API.io)',
        kind: 'production',
        displayName: 'Odds-API.io'
    },
    {
        id: 'the-odds-api',
        label: 'Test (The-Odds-API.com)',
        kind: 'test',
        displayName: 'The-Odds-API.com'
    }
];
exports.DEFAULT_PROVIDER_ID = 'the-odds-api';
function isProviderId(value) {
    return typeof value === 'string' && exports.PROVIDER_IDS.includes(value);
}
