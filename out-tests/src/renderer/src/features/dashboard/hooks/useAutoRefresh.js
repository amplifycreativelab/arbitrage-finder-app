"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAutoRefresh = useAutoRefresh;
const React = __importStar(require("react"));
const feedStore_1 = require("../stores/feedStore");
const appSettingsStore_1 = require("../../settings/stores/appSettingsStore");
function useAutoRefresh() {
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
    const autoRefreshEnabled = (0, appSettingsStore_1.useAppSettingsStore)((state) => state.autoRefreshEnabled);
    const refreshIntervalMs = (0, appSettingsStore_1.useAppSettingsStore)((state) => state.refreshIntervalMs);
    React.useEffect(() => {
        if (!autoRefreshEnabled || refreshIntervalMs <= 0) {
            return;
        }
        const intervalId = setInterval(() => {
            void refreshSnapshot();
        }, refreshIntervalMs);
        return () => {
            clearInterval(intervalId);
        };
    }, [autoRefreshEnabled, refreshIntervalMs, refreshSnapshot]);
}
