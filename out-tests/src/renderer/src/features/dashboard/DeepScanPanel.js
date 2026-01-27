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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepScanPanel = DeepScanPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const DeepScanButton_1 = __importDefault(require("./DeepScanButton"));
const DeepScanConfigDialog_1 = __importDefault(require("./DeepScanConfigDialog"));
const deepScanStore_1 = require("./stores/deepScanStore");
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
function formatElapsed(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}
function statusPillClass(status) {
    switch (status) {
        case 'scanning':
            return 'border-ot-accent/60 bg-ot-accent/10 text-ot-accent';
        case 'completed':
            return 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300';
        case 'cancelled':
            return 'border-amber-400/60 bg-amber-400/10 text-amber-300';
        case 'error':
            return 'border-red-400/60 bg-red-400/10 text-red-300';
        case 'idle':
        default:
            return 'border-ot-border bg-ot-border/40 text-ot-muted';
    }
}
function formatMinutesAgo(timestamp) {
    if (!timestamp)
        return 'Never';
    const ms = new Date(timestamp).getTime();
    if (!Number.isFinite(ms))
        return 'Unknown';
    const diffMs = Math.max(0, Date.now() - ms);
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 1)
        return 'Just now';
    if (diffMinutes === 1)
        return '1m ago';
    if (diffMinutes < 60)
        return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours === 1)
        return '1h ago';
    return `${hours}h ago`;
}
function DeepScanPanel() {
    const progress = (0, deepScanStore_1.useDeepScanStore)((state) => state.progress);
    const continuousStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.continuousStatus);
    const isDialogOpen = (0, deepScanStore_1.useDeepScanStore)((state) => state.isDialogOpen);
    const lastConfig = (0, deepScanStore_1.useDeepScanStore)((state) => state.lastConfig);
    const setDialogOpen = (0, deepScanStore_1.useDeepScanStore)((state) => state.setDialogOpen);
    const startScan = (0, deepScanStore_1.useDeepScanStore)((state) => state.startScan);
    const refreshStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.refreshStatus);
    const setContinuousEnabledRemote = (0, deepScanStore_1.useDeepScanStore)((state) => state.setContinuousEnabled);
    const setMaxEventsRemote = (0, deepScanStore_1.useDeepScanStore)((state) => state.setMaxEventsPerCycle);
    const continuousEnabled = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.continuousDeepScanEnabled);
    const setContinuousEnabledLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setContinuousDeepScanEnabled);
    const continuousMaxEvents = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.continuousDeepScanMaxEventsPerCycle);
    const setContinuousMaxEventsLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setContinuousDeepScanMaxEventsPerCycle);
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
        void refreshStatus();
    }, [refreshStatus]);
    React.useEffect(() => {
        if (continuousStatus.enabled !== continuousEnabled) {
            setContinuousEnabledLocal(continuousStatus.enabled);
        }
    }, [continuousStatus.enabled, continuousEnabled, setContinuousEnabledLocal]);
    React.useEffect(() => {
        if (continuousStatus.maxEventsPerCycle !== continuousMaxEvents) {
            setContinuousMaxEventsLocal(continuousStatus.maxEventsPerCycle);
        }
    }, [continuousStatus.maxEventsPerCycle, continuousMaxEvents, setContinuousMaxEventsLocal]);
    React.useEffect(() => {
        if (progress.status !== 'scanning' || !progress.startedAt) {
            return;
        }
        const handle = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(handle);
    }, [progress.status, progress.startedAt]);
    const startedAtMs = progress.startedAt ? new Date(progress.startedAt).getTime() : 0;
    const elapsedMs = progress.status === 'scanning' && startedAtMs > 0
        ? Math.max(0, now - startedAtMs)
        : progress.elapsedMs;
    const eventsTotalSafe = progress.eventsTotal > 0 ? progress.eventsTotal : progress.eventsScanned;
    const isContinuousMode = progress.mode === 'continuous';
    const handleContinuousToggle = (enabled) => {
        setContinuousEnabledLocal(enabled);
        void setContinuousEnabledRemote(enabled);
    };
    const handleMaxEventsChange = (value) => {
        setContinuousMaxEventsLocal(value);
        void setMaxEventsRemote(value);
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-md border border-ot-border bg-ot-background/60 p-3", "data-testid": "deep-scan-panel", "aria-label": "Deep scan panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Deep Scan" }), (0, jsx_runtime_1.jsx)("span", { className: `rounded-full border px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(progress.status)}`, children: progress.status }), isContinuousMode && ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full border border-sky-400/60 bg-sky-400/10 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-200", children: "Continuous" }))] }), (0, jsx_runtime_1.jsx)(DeepScanButton_1.default, {})] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Continuous Deep Scan" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Automatically scan all events after each poll" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "inline-flex cursor-pointer items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", role: "switch", "aria-checked": continuousEnabled, checked: continuousEnabled, onChange: (event) => handleContinuousToggle(event.target.checked), onKeyDown: (event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleContinuousToggle(!continuousEnabled);
                                    }
                                }, className: "h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent" }), continuousEnabled ? 'On' : 'Off'] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Max Events Per Cycle" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Advanced guardrail for API quota" })] }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 500, value: continuousMaxEvents, onChange: (event) => handleMaxEventsChange(Number(event.target.value)), className: "h-7 w-20 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground", "aria-label": "Max events per continuous scan cycle" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Events" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: [progress.eventsScanned, "/", eventsTotalSafe] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Requests" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: progress.requestsMade })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Arbs" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: progress.opportunitiesFound })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Elapsed" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: formatElapsed(elapsedMs) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Last scan" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: formatMinutesAgo(continuousStatus.lastContinuousScanAt) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Today events" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: continuousStatus.eventsScannedToday })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Today arbs" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: continuousStatus.opportunitiesFoundToday })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Today requests" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: continuousStatus.requestsToday })] })] }), progress.currentEventName && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 rounded border border-ot-border/60 bg-ot-border/10 px-2 py-1 text-[10px] text-ot-foreground", children: ["Scanning: ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: progress.currentEventName })] })), progress.errorMessage && progress.status === 'error' && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 rounded border border-red-400/60 bg-red-400/10 px-2 py-1 text-[10px] text-red-200", children: progress.errorMessage })), (0, jsx_runtime_1.jsx)(DeepScanConfigDialog_1.default, { open: isDialogOpen, initialConfig: lastConfig, onClose: () => setDialogOpen(false), onStart: (config) => void startScan(config) })] }));
}
exports.default = DeepScanPanel;
