"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppSettingsStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const DEFAULT_RATES = {
    USD: 1,
    AUD: 1.5,
    EUR: 0.85
};
exports.useAppSettingsStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    // Auto-refresh settings
    autoRefreshEnabled: false,
    refreshIntervalMs: 30000, // Default 30s
    setAutoRefreshEnabled: (enabled) => set({ autoRefreshEnabled: enabled }),
    setRefreshIntervalMs: (ms) => set({ refreshIntervalMs: ms }),
    // Currency settings (Story 8.4)
    baseCurrency: 'USD',
    exchangeRates: DEFAULT_RATES,
    ratesLastFetched: null,
    setBaseCurrency: (currency) => set({ baseCurrency: currency }),
    setExchangeRates: (rates, timestamp) => set({ exchangeRates: rates, ratesLastFetched: timestamp })
}), {
    name: 'app-settings-storage',
    storage: (0, middleware_1.createJSONStorage)(() => localStorage)
}));
