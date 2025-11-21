"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseArbitrageAdapter = void 0;
const credentials_1 = require("../credentials");
class BaseArbitrageAdapter {
    async fetchOpportunities() {
        const apiKey = await (0, credentials_1.getApiKeyForAdapter)(this.id);
        if (!apiKey) {
            throw new Error(`API key not configured for provider ${this.id}`);
        }
        return this.fetchWithApiKey(apiKey);
    }
}
exports.BaseArbitrageAdapter = BaseArbitrageAdapter;
