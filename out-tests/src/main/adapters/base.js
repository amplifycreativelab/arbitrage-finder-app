"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseArbitrageAdapter = void 0;
const credentials_1 = require("../credentials");
const poller_1 = require("../services/poller");
class BaseArbitrageAdapter {
    __usesCentralRateLimiter = true;
    async fetchOpportunities() {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)(this.id);
        if (!apiKey) {
            throw new Error(`API key not configured for provider ${this.id}`);
        }
        return (0, poller_1.scheduleProviderRequest)(this.id, () => this.fetchWithApiKey(apiKey));
    }
}
exports.BaseArbitrageAdapter = BaseArbitrageAdapter;
