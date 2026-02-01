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
exports.AutoRefreshSection = AutoRefreshSection;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../../components/ui/button");
const select_1 = require("../../../components/ui/select");
const appSettingsStore_1 = require("../stores/appSettingsStore");
const feedStore_1 = require("../../dashboard/stores/feedStore");
function AutoRefreshSection() {
    const autoRefreshEnabled = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.autoRefreshEnabled);
    const refreshIntervalMs = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.refreshIntervalMs);
    const setAutoRefreshEnabled = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.setAutoRefreshEnabled);
    const setRefreshIntervalMs = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.setRefreshIntervalMs);
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
    const [isFetching, setIsFetching] = React.useState(false);
    const [lastRefreshTime, setLastRefreshTime] = React.useState(null);
    const [nextRefreshCountdown, setNextRefreshCountdown] = React.useState(null);
    // Track last refresh time
    React.useEffect(() => {
        if (autoRefreshEnabled && lastRefreshTime === null) {
            setLastRefreshTime(new Date());
        }
    }, [autoRefreshEnabled, lastRefreshTime]);
    // Countdown timer
    React.useEffect(() => {
        if (!autoRefreshEnabled || !lastRefreshTime) {
            setNextRefreshCountdown(null);
            return;
        }
        const interval = setInterval(() => {
            const elapsed = Date.now() - lastRefreshTime.getTime();
            const remaining = Math.max(0, refreshIntervalMs - elapsed);
            setNextRefreshCountdown(Math.ceil(remaining / 1000));
            if (remaining <= 0) {
                setLastRefreshTime(new Date());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [autoRefreshEnabled, lastRefreshTime, refreshIntervalMs]);
    const handleManualRefresh = React.useCallback(async () => {
        setIsFetching(true);
        try {
            await refreshSnapshot();
            setLastRefreshTime(new Date());
        }
        finally {
            setIsFetching(false);
        }
    }, [refreshSnapshot]);
    const handleToggle = (enabled) => {
        setAutoRefreshEnabled(enabled);
        if (enabled) {
            setLastRefreshTime(new Date());
        }
    };
    const formatCountdown = (seconds) => {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };
    const formatInterval = (ms) => {
        if (ms < 60000) {
            return `${ms / 1000}s`;
        }
        return `${ms / 60000}m`;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between", children: (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Configure automatic data refresh for live opportunity detection." }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded-md border border-ot-border/60 bg-ot-background/30 p-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: "Auto-Refresh" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "Automatically poll for new opportunities" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsxs)(select_1.Select, { value: refreshIntervalMs.toString(), onChange: (e) => setRefreshIntervalMs(Number(e.target.value)), disabled: !autoRefreshEnabled, className: "h-8 w-24 py-0 px-2 text-[11px]", children: [(0, jsx_runtime_1.jsx)("option", { value: "15000", children: "15s" }), (0, jsx_runtime_1.jsx)("option", { value: "30000", children: "30s" }), (0, jsx_runtime_1.jsx)("option", { value: "60000", children: "1m" }), (0, jsx_runtime_1.jsx)("option", { value: "300000", children: "5m" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", role: "switch", "aria-checked": autoRefreshEnabled, onClick: () => handleToggle(!autoRefreshEnabled), className: `relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ot-accent/50 ${autoRefreshEnabled ? 'bg-ot-accent' : 'bg-ot-muted/30'}`, children: (0, jsx_runtime_1.jsx)("span", { className: `absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoRefreshEnabled ? 'left-[18px]' : 'left-0.5'}` }) })] })] }), autoRefreshEnabled && nextRefreshCountdown !== null && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded-md border border-ot-accent/30 bg-ot-accent/5 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-2 w-2 animate-pulse rounded-full bg-ot-accent" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-foreground", children: "Auto-refresh active" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-ot-muted", children: ["Next refresh in: ", (0, jsx_runtime_1.jsx)("span", { className: "font-mono text-ot-accent", children: formatCountdown(nextRefreshCountdown) })] })] })), !autoRefreshEnabled && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-ot-border/40 bg-ot-background/30 p-3", children: (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-muted", children: "Auto-refresh is disabled. Use manual refresh to update data." }) })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-medium text-ot-foreground", children: "Manual Refresh" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "Trigger an immediate data refresh" })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", onClick: () => void handleManualRefresh(), disabled: isFetching, className: "h-8 px-4 text-[11px]", children: isFetching ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsxs)("svg", { className: "h-3 w-3 animate-spin", viewBox: "0 0 24 24", fill: "none", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), "Refreshing..."] })) : ('Refresh Now') })] }), (0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-3 text-[10px]", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-muted", children: "Status:" }), ' ', (0, jsx_runtime_1.jsx)("span", { className: autoRefreshEnabled ? 'text-emerald-400' : 'text-ot-muted', children: autoRefreshEnabled ? 'Active' : 'Inactive' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-muted", children: "Interval:" }), ' ', (0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground", children: formatInterval(refreshIntervalMs) })] })] }) }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-muted/70", children: "Auto-refresh polls the enabled providers at the specified interval. Each refresh may consume API quota based on your provider plan." })] }));
}
exports.default = AutoRefreshSection;
