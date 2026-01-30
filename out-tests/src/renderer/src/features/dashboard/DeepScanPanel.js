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
    const isPausing = (0, deepScanStore_1.useDeepScanStore)((state) => state.isPausing);
    const setDialogOpen = (0, deepScanStore_1.useDeepScanStore)((state) => state.setDialogOpen);
    const startScan = (0, deepScanStore_1.useDeepScanStore)((state) => state.startScan);
    const refreshStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.refreshStatus);
    const setContinuousEnabledRemote = (0, deepScanStore_1.useDeepScanStore)((state) => state.setContinuousEnabled);
    const setMaxEventsRemote = (0, deepScanStore_1.useDeepScanStore)((state) => state.setMaxEventsPerCycle);
    const pauseContinuous = (0, deepScanStore_1.useDeepScanStore)((state) => state.pauseContinuous);
    const resumeContinuous = (0, deepScanStore_1.useDeepScanStore)((state) => state.resumeContinuous);
    const continuousEnabled = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.continuousDeepScanEnabled);
    const setContinuousEnabledLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setContinuousDeepScanEnabled);
    const continuousMaxEvents = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.continuousDeepScanMaxEventsPerCycle);
    const setContinuousMaxEventsLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setContinuousDeepScanMaxEventsPerCycle);
    const cacheTtl = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanCacheTtlMinutes);
    const setCacheTtlLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanCacheTtlMinutes);
    const batchSize = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanBatchSize);
    const setBatchSizeLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanBatchSize);
    const intervalMinutes = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanIntervalMinutes);
    const setIntervalMinutesLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanIntervalMinutes);
    const concurrentRequests = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanConcurrentRequests);
    const setConcurrentRequestsLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanConcurrentRequests);
    const scanScope = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanScope);
    const setScanScopeLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanScope);
    const [now, setNow] = React.useState(() => Date.now());
    const [maxEventsInput, setMaxEventsInput] = React.useState(() => String(continuousMaxEvents));
    const [cacheTtlInput, setCacheTtlInput] = React.useState(() => String(cacheTtl));
    const [batchSizeInput, setBatchSizeInput] = React.useState(() => String(batchSize));
    const [intervalInput, setIntervalInput] = React.useState(() => String(intervalMinutes));
    const [concurrentRequestsInput, setConcurrentRequestsInput] = React.useState(() => String(concurrentRequests));
    const [isClearingBookmakers, setIsClearingBookmakers] = React.useState(false);
    const [selectedBookmakers, setSelectedBookmakers] = React.useState([]);
    const [isLoadingBookmakers, setIsLoadingBookmakers] = React.useState(false);
    const [bookmakersExpanded, setBookmakersExpanded] = React.useState(false);
    // Fetch selected bookmakers on mount and after clearing
    const fetchSelectedBookmakers = React.useCallback(async () => {
        const oddsApiIo = window.api?.oddsApiIo;
        if (!oddsApiIo)
            return;
        setIsLoadingBookmakers(true);
        try {
            const bookmakers = await oddsApiIo.getSelectedBookmakers();
            setSelectedBookmakers(bookmakers ?? []);
        }
        catch {
            // Silently fail - don't block the UI
        }
        finally {
            setIsLoadingBookmakers(false);
        }
    }, []);
    React.useEffect(() => {
        void refreshStatus();
        void fetchSelectedBookmakers();
    }, [refreshStatus, fetchSelectedBookmakers]);
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
        if (continuousStatus.cacheTtlMinutes !== undefined && continuousStatus.cacheTtlMinutes !== cacheTtl) {
            setCacheTtlLocal(continuousStatus.cacheTtlMinutes);
        }
    }, [continuousStatus.cacheTtlMinutes, cacheTtl, setCacheTtlLocal]);
    React.useEffect(() => {
        if (continuousStatus.batchSize !== undefined && continuousStatus.batchSize !== batchSize) {
            setBatchSizeLocal(continuousStatus.batchSize);
        }
    }, [continuousStatus.batchSize, batchSize, setBatchSizeLocal]);
    React.useEffect(() => {
        if (continuousStatus.intervalMinutes !== undefined && continuousStatus.intervalMinutes !== intervalMinutes) {
            setIntervalMinutesLocal(continuousStatus.intervalMinutes);
        }
    }, [continuousStatus.intervalMinutes, intervalMinutes, setIntervalMinutesLocal]);
    React.useEffect(() => {
        if (continuousStatus.concurrentRequests !== undefined && continuousStatus.concurrentRequests !== concurrentRequests) {
            setConcurrentRequestsLocal(continuousStatus.concurrentRequests);
        }
    }, [continuousStatus.concurrentRequests, concurrentRequests, setConcurrentRequestsLocal]);
    React.useEffect(() => {
        if (continuousStatus.scanScope !== undefined && continuousStatus.scanScope !== scanScope) {
            setScanScopeLocal(continuousStatus.scanScope);
        }
    }, [continuousStatus.scanScope, scanScope, setScanScopeLocal]);
    React.useEffect(() => {
        setMaxEventsInput(String(continuousMaxEvents));
    }, [continuousMaxEvents]);
    React.useEffect(() => {
        setCacheTtlInput(String(cacheTtl));
    }, [cacheTtl]);
    React.useEffect(() => {
        setBatchSizeInput(String(batchSize));
    }, [batchSize]);
    React.useEffect(() => {
        setIntervalInput(String(intervalMinutes));
    }, [intervalMinutes]);
    React.useEffect(() => {
        setConcurrentRequestsInput(String(concurrentRequests));
    }, [concurrentRequests]);
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
    const handleNumericInputKeyDown = (event, commit) => {
        if (event.key !== 'Enter') {
            return;
        }
        event.preventDefault();
        commit();
        event.currentTarget.blur();
    };
    const handleMaxEventsChange = (value) => {
        setContinuousMaxEventsLocal(value);
        void setMaxEventsRemote(value);
    };
    const commitMaxEventsInput = () => {
        const parsed = Number(maxEventsInput);
        if (!Number.isFinite(parsed)) {
            setMaxEventsInput(String(continuousMaxEvents));
            return;
        }
        handleMaxEventsChange(parsed);
    };
    const handleCacheTtlChange = async (value) => {
        setCacheTtlLocal(value);
        try {
            await window.api.deepScan.setCacheTtl(value);
        }
        catch {
            // Best-effort sync
        }
    };
    const commitCacheTtlInput = () => {
        const parsed = Number(cacheTtlInput);
        if (!Number.isFinite(parsed)) {
            setCacheTtlInput(String(cacheTtl));
            return;
        }
        void handleCacheTtlChange(parsed);
    };
    const handleBatchSizeChange = async (value) => {
        setBatchSizeLocal(value);
        try {
            await window.api.deepScan.setBatchSize(value);
        }
        catch {
            // Best-effort sync
        }
    };
    const commitBatchSizeInput = () => {
        const parsed = Number(batchSizeInput);
        if (!Number.isFinite(parsed)) {
            setBatchSizeInput(String(batchSize));
            return;
        }
        void handleBatchSizeChange(parsed);
    };
    const handleIntervalChange = async (value) => {
        setIntervalMinutesLocal(value);
        try {
            await window.api.deepScan.setIntervalMinutes(value);
        }
        catch {
            // Best-effort sync
        }
    };
    const commitIntervalInput = () => {
        const parsed = Number(intervalInput);
        if (!Number.isFinite(parsed)) {
            setIntervalInput(String(intervalMinutes));
            return;
        }
        void handleIntervalChange(parsed);
    };
    const handleConcurrentRequestsChange = async (value) => {
        setConcurrentRequestsLocal(value);
        try {
            await window.api.deepScan.setConcurrentRequests(value);
        }
        catch {
            // Best-effort sync
        }
    };
    const commitConcurrentRequestsInput = () => {
        const parsed = Number(concurrentRequestsInput);
        if (!Number.isFinite(parsed)) {
            setConcurrentRequestsInput(String(concurrentRequests));
            return;
        }
        void handleConcurrentRequestsChange(parsed);
    };
    const handleScanScopeChange = async (value) => {
        setScanScopeLocal(value);
        try {
            await window.api.deepScan.setScanScope(value);
        }
        catch {
            // Best-effort sync
        }
    };
    const handleClearCache = async () => {
        try {
            await window.api.deepScan.clearCache('user_request');
            void refreshStatus();
        }
        catch {
            // Best-effort
        }
    };
    const getOddsApiIoApi = () => {
        return window.api
            ?.oddsApiIo ?? null;
    };
    const handleClearSelectedBookmakers = async () => {
        const oddsApiIo = getOddsApiIoApi();
        if (!oddsApiIo) {
            window.alert('Odds-API.io API bridge is not available. Restart the app and try again.');
            return;
        }
        const ok = window.confirm('Clear your Odds-API.io selected bookmakers?\n\nNote: Odds-API.io limits clearing to once every 12 hours.');
        if (!ok)
            return;
        setIsClearingBookmakers(true);
        try {
            await oddsApiIo.clearSelectedBookmakers();
            setSelectedBookmakers([]);
            void refreshStatus();
        }
        catch (error) {
            window.alert(error instanceof Error ? error.message : 'Failed to clear selected bookmakers.');
        }
        finally {
            setIsClearingBookmakers(false);
        }
    };
    const handlePauseResume = async () => {
        if (continuousStatus.isPaused) {
            await resumeContinuous();
        }
        else {
            await pauseContinuous();
        }
    };
    // Quota warning calculation
    const quotaPercent = continuousStatus.quotaStatus?.percentUsed ?? 0;
    const showQuotaWarning = quotaPercent >= 0.8;
    const showQuotaDanger = quotaPercent >= 0.9;
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-md border border-ot-border bg-ot-background/60 p-3", "data-testid": "deep-scan-panel", "aria-label": "Deep scan panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Deep Scan" }), (0, jsx_runtime_1.jsx)("span", { className: `rounded-full border px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] ${statusPillClass(progress.status)}`, children: progress.status }), isContinuousMode && ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full border border-sky-400/60 bg-sky-400/10 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-200", children: "Continuous" }))] }), (0, jsx_runtime_1.jsx)(DeepScanButton_1.default, {})] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Continuous Deep Scan" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Automatically scan after each poll" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "inline-flex cursor-pointer items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", role: "switch", "aria-checked": continuousEnabled, checked: continuousEnabled, onChange: (event) => handleContinuousToggle(event.target.checked), onKeyDown: (event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                handleContinuousToggle(!continuousEnabled);
                                            }
                                        }, className: "h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent" }), continuousEnabled ? 'On' : 'Off'] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Scan Scope" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Which events to scan" })] }), (0, jsx_runtime_1.jsxs)("select", { value: scanScope, onChange: (event) => void handleScanScopeChange(event.target.value), className: "h-7 rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Scan scope selection", children: [(0, jsx_runtime_1.jsx)("option", { value: "all-sports", children: "All Sports" }), (0, jsx_runtime_1.jsx)("option", { value: "selected-sports", children: "Selected Sports" }), (0, jsx_runtime_1.jsx)("option", { value: "selected-leagues", children: "Selected Leagues" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Scan Interval" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Minutes" })] }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 30, value: intervalInput, onChange: (event) => setIntervalInput(event.target.value), onBlur: commitIntervalInput, onKeyDown: (event) => handleNumericInputKeyDown(event, commitIntervalInput), className: "h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground", "aria-label": "Scan interval in minutes" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Max Events" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Per cycle" })] }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 500, value: maxEventsInput, onChange: (event) => setMaxEventsInput(event.target.value), onBlur: commitMaxEventsInput, onKeyDown: (event) => handleNumericInputKeyDown(event, commitMaxEventsInput), className: "h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground", "aria-label": "Max events per continuous scan cycle" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Concurrency" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Parallel" })] }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 10, value: concurrentRequestsInput, onChange: (event) => setConcurrentRequestsInput(event.target.value), onBlur: commitConcurrentRequestsInput, onKeyDown: (event) => handleNumericInputKeyDown(event, commitConcurrentRequestsInput), className: "h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground", "aria-label": "Concurrent requests for scanning" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Cache TTL" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Minutes" })] }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 60, value: cacheTtlInput, onChange: (event) => setCacheTtlInput(event.target.value), onBlur: commitCacheTtlInput, onKeyDown: (event) => handleNumericInputKeyDown(event, commitCacheTtlInput), className: "h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground", "aria-label": "Cache TTL in minutes" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Batch Size" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Events/batch" })] }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 5, max: 50, value: batchSizeInput, onChange: (event) => setBatchSizeInput(event.target.value), onBlur: commitBatchSizeInput, onKeyDown: (event) => handleNumericInputKeyDown(event, commitBatchSizeInput), className: "h-7 w-14 rounded border border-ot-border bg-ot-surface px-2 text-right text-[11px] text-ot-foreground", "aria-label": "Batch size for continuous scan" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Events" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: [progress.eventsScanned, "/", eventsTotalSafe] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Requests" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: progress.requestsMade })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Arbs" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: progress.opportunitiesFound })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Elapsed" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: formatElapsed(elapsedMs) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-2 text-[10px] text-ot-muted sm:grid-cols-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Last scan" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: formatMinutesAgo(continuousStatus.lastContinuousScanAt) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Today events" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: continuousStatus.eventsScannedToday })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Today arbs" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: continuousStatus.opportunitiesFoundToday })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Today requests" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: continuousStatus.requestsToday })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Cache" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: [continuousStatus.cacheEntries, " events"] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void handleClearCache(), className: "rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent", title: "Clear scan cache", children: "Clear" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "col-span-2 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] uppercase tracking-[0.12em]", children: "Odds-API.io Bookmakers" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: isLoadingBookmakers ? 'Loading...' : selectedBookmakers.length > 0 ? `${selectedBookmakers.length} selected` : 'None selected' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void fetchSelectedBookmakers(), disabled: isLoadingBookmakers, className: "rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent disabled:opacity-60", title: "Refresh selected bookmakers", children: "\u21BB" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setBookmakersExpanded(!bookmakersExpanded), className: "rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent", title: bookmakersExpanded ? 'Hide bookmakers' : 'Show bookmakers', children: bookmakersExpanded ? '▲' : '▼' }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void handleClearSelectedBookmakers(), disabled: isClearingBookmakers || selectedBookmakers.length === 0, className: "rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-red-400 hover:text-red-400 disabled:opacity-60", title: "Clear Odds-API.io selected bookmakers (12h limit)", children: isClearingBookmakers ? '...' : 'Reset' })] })] }), bookmakersExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 border-t border-ot-border/40 pt-2", children: selectedBookmakers.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "No bookmakers selected. Go to Provider Settings \u2192 Odds-API.io to select bookmakers." })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: selectedBookmakers.map((name) => ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full border border-ot-accent/30 bg-ot-accent/10 px-2 py-0.5 text-[9px] font-medium text-ot-accent", children: name }, name))) })) }))] })] }), continuousEnabled && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void handlePauseResume(), disabled: isPausing, className: `rounded border px-3 py-1 text-[10px] font-semibold transition-colors ${continuousStatus.isPaused
                            ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                            : 'border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'} disabled:opacity-50`, children: isPausing ? '...' : continuousStatus.isPaused ? '▶ Resume' : '⏸ Pause' }), continuousStatus.isPaused && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-amber-300", children: "Continuous scan is paused" }))] })), showQuotaWarning && ((0, jsx_runtime_1.jsxs)("div", { className: `mt-2 rounded border px-2 py-1 text-[10px] ${showQuotaDanger
                    ? 'border-red-400/60 bg-red-400/10 text-red-200'
                    : 'border-amber-400/60 bg-amber-400/10 text-amber-200'}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u26A0\uFE0F" }), (0, jsx_runtime_1.jsxs)("span", { children: ["API Quota: ", Math.round(quotaPercent * 100), "% used (", continuousStatus.quotaStatus?.hourlyUsed ?? 0, "/", continuousStatus.quotaStatus?.hourlyLimit ?? 5000, " requests)", continuousStatus.quotaStatus?.isThrottled && continuousStatus.quotaStatus?.throttleResumeAt && ((0, jsx_runtime_1.jsxs)("span", { className: "ml-1", children: ["- Resuming ", formatMinutesAgo(continuousStatus.quotaStatus.throttleResumeAt).replace(' ago', '')] }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1 h-1.5 w-full rounded-full bg-ot-border", children: (0, jsx_runtime_1.jsx)("div", { className: `h-1.5 rounded-full transition-all ${showQuotaDanger ? 'bg-red-400' : 'bg-amber-400'}`, style: { width: `${Math.min(quotaPercent * 100, 100)}%` } }) }), continuousStatus.quotaStatus?.isThrottled && ((0, jsx_runtime_1.jsx)("div", { className: "mt-1 text-[9px] opacity-80", children: "Scan throttled - will resume when hourly quota resets" }))] })), continuousStatus.history && continuousStatus.history.length > 0 && ((0, jsx_runtime_1.jsxs)("details", { className: "mt-2", children: [(0, jsx_runtime_1.jsxs)("summary", { className: "cursor-pointer text-[10px] text-ot-muted hover:text-ot-foreground", children: ["Scan History (last ", continuousStatus.history.length, " cycles)"] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1 space-y-1", children: continuousStatus.history.map((entry, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded border border-ot-border/60 bg-ot-border/10 px-2 py-1 text-[9px]", children: [(0, jsx_runtime_1.jsx)("span", { className: entry.mode === 'continuous' ? 'text-sky-300' : 'text-ot-foreground', children: entry.mode === 'continuous' ? 'Auto' : 'Manual' }), (0, jsx_runtime_1.jsxs)("span", { className: "text-ot-muted", children: [entry.eventsScanned, " events, ", entry.opportunitiesFound, " arbs"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-ot-muted", children: formatElapsed(entry.durationMs) })] }, index))) })] })), progress.currentEventName && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 rounded border border-ot-border/60 bg-ot-border/10 px-2 py-1 text-[10px] text-ot-foreground", children: ["Scanning: ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: progress.currentEventName })] })), progress.errorMessage && progress.status === 'error' && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 rounded border border-red-400/60 bg-red-400/10 px-2 py-1 text-[10px] text-red-200", children: progress.errorMessage })), (0, jsx_runtime_1.jsx)(DeepScanConfigDialog_1.default, { open: isDialogOpen, initialConfig: lastConfig, onClose: () => setDialogOpen(false), onStart: (config) => void startScan(config) })] }));
}
exports.default = DeepScanPanel;
