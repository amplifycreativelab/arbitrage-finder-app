"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppSettingsStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useAppSettingsStore = (0, zustand_1.create)()((0, middleware_1.persist)((set) => ({
    autoRefreshEnabled: false,
    refreshIntervalMs: 30000, // Default 30s
    setAutoRefreshEnabled: (enabled) => set({ autoRefreshEnabled: enabled }),
    setRefreshIntervalMs: (ms) => set({ refreshIntervalMs: ms })
}), {
    name: 'app-settings-storage',
    storage: (0, middleware_1.createJSONStorage)(() => localStorage)
}));
