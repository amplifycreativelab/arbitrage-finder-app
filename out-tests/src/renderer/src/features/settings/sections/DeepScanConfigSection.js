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
exports.DeepScanConfigSection = DeepScanConfigSection;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const SportLeagueFilter_1 = require("../../dashboard/SportLeagueFilter");
const deepScanStore_1 = require("../../dashboard/stores/deepScanStore");
const feedFiltersStore_1 = require("../../dashboard/stores/feedFiltersStore");
function DeepScanConfigSection() {
    const continuousStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.continuousStatus);
    const refreshContinuousStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.refreshContinuousStatus);
    const setContinuousEnabledRemote = (0, deepScanStore_1.useDeepScanStore)((state) => state.setContinuousEnabled);
    const setMaxEventsRemote = (0, deepScanStore_1.useDeepScanStore)((state) => state.setMaxEventsPerCycle);
    const continuousEnabled = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.continuousDeepScanEnabled);
    const setContinuousEnabledLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setContinuousDeepScanEnabled);
    const continuousMaxEvents = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.continuousDeepScanMaxEventsPerCycle);
    const setContinuousMaxEventsLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setContinuousDeepScanMaxEventsPerCycle);
    const cacheTtl = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanCacheTtlMinutes);
    const setCacheTtlLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanCacheTtlMinutes);
    const intervalMinutes = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanIntervalMinutes);
    const setIntervalMinutesLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanIntervalMinutes);
    const concurrentRequests = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanConcurrentRequests);
    const setConcurrentRequestsLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanConcurrentRequests);
    const scanScope = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanScope);
    const setScanScopeLocal = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanScope);
    const [maxEventsInput, setMaxEventsInput] = React.useState(() => String(continuousMaxEvents));
    const [cacheTtlInput, setCacheTtlInput] = React.useState(() => String(cacheTtl));
    const [intervalInput, setIntervalInput] = React.useState(() => String(intervalMinutes));
    const [concurrentRequestsInput, setConcurrentRequestsInput] = React.useState(() => String(concurrentRequests));
    const [enabledSports, setEnabledSports] = React.useState([]);
    const [enabledLeagues, setEnabledLeagues] = React.useState([]);
    React.useEffect(() => {
        void refreshContinuousStatus();
        void (async () => {
            try {
                const [sports, leagues] = await Promise.all([
                    window.api.deepScan.getEnabledSportsFilter(),
                    window.api.deepScan.getEnabledLeaguesFilter()
                ]);
                setEnabledSports(sports);
                setEnabledLeagues(leagues);
            }
            catch {
                // Silent fail
            }
        })();
    }, [refreshContinuousStatus]);
    React.useEffect(() => {
        setMaxEventsInput(String(continuousMaxEvents));
    }, [continuousMaxEvents]);
    React.useEffect(() => {
        setCacheTtlInput(String(cacheTtl));
    }, [cacheTtl]);
    React.useEffect(() => {
        setIntervalInput(String(intervalMinutes));
    }, [intervalMinutes]);
    React.useEffect(() => {
        setConcurrentRequestsInput(String(concurrentRequests));
    }, [concurrentRequests]);
    const handleContinuousToggle = (enabled) => {
        setContinuousEnabledLocal(enabled);
        void setContinuousEnabledRemote(enabled);
    };
    const handleNumericInputKeyDown = (event, commit) => {
        if (event.key !== 'Enter')
            return;
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
            // Best-effort
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
    const handleIntervalChange = async (value) => {
        setIntervalMinutesLocal(value);
        try {
            await window.api.deepScan.setIntervalMinutes(value);
        }
        catch {
            // Best-effort
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
            // Best-effort
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
            // Best-effort
        }
    };
    const handleSportsChange = async (sports) => {
        setEnabledSports(sports);
        try {
            await window.api.deepScan.setEnabledSportsFilter(sports);
        }
        catch {
            // Best-effort
        }
    };
    const handleLeaguesChange = async (leagues) => {
        setEnabledLeagues(leagues);
        try {
            await window.api.deepScan.setEnabledLeaguesFilter(leagues);
        }
        catch {
            // Best-effort
        }
    };
    const handleApplyPreset = async (presetId) => {
        try {
            const result = await window.api.deepScan.applyPreset(presetId);
            setScanScopeLocal(result.scanScope);
            setEnabledSports(result.enabledSports);
            setEnabledLeagues(result.enabledLeagues);
        }
        catch {
            // Best-effort
        }
    };
    // Quota warning calculation - estimate hourly requests
    const estimatedHourlyRequests = Math.ceil(60 / intervalMinutes) * continuousMaxEvents * concurrentRequests;
    const showBudgetWarning = estimatedHourlyRequests > 5000;
    const quotaPercent = continuousStatus.quotaStatus?.percentUsed ?? 0;
    const showQuotaWarning = quotaPercent >= 0.8;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between", children: (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Configure continuous deep scan for comprehensive arbitrage detection." }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: "Continuous Deep Scan" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "Automatically scan after each poll cycle" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "inline-flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", role: "switch", "aria-checked": continuousEnabled, checked: continuousEnabled, onChange: (event) => handleContinuousToggle(event.target.checked), className: "h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent" }), continuousEnabled ? 'On' : 'Off'] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Scan Interval" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Minutes between scans" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 30, value: intervalInput, onChange: (e) => setIntervalInput(e.target.value), onBlur: commitIntervalInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitIntervalInput), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Scan interval in minutes" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Max Events" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Per cycle (max: 200)" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 200, value: maxEventsInput, onChange: (e) => setMaxEventsInput(e.target.value), onBlur: commitMaxEventsInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitMaxEventsInput), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Max events per cycle" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Concurrent Requests" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Parallel API calls (max: 10)" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 10, value: concurrentRequestsInput, onChange: (e) => setConcurrentRequestsInput(e.target.value), onBlur: commitConcurrentRequestsInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitConcurrentRequestsInput), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Concurrent requests" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Cache TTL" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Minutes" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 60, value: cacheTtlInput, onChange: (e) => setCacheTtlInput(e.target.value), onBlur: commitCacheTtlInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitCacheTtlInput), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Cache TTL in minutes" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Scan Scope" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Events to include" }), (0, jsx_runtime_1.jsxs)("select", { value: scanScope, onChange: (e) => void handleScanScopeChange(e.target.value), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Scan scope selection", children: [(0, jsx_runtime_1.jsx)("option", { value: "all-sports", children: "All Sports" }), (0, jsx_runtime_1.jsx)("option", { value: "selected-sports", children: "Selected Sports" }), (0, jsx_runtime_1.jsx)("option", { value: "selected-leagues", children: "Selected Leagues" })] })] })] }), (0, jsx_runtime_1.jsx)(SportLeagueFilter_1.SportLeagueFilter, { scanScope: scanScope, enabledSports: enabledSports, enabledLeagues: enabledLeagues, onSportsChange: (sports) => void handleSportsChange(sports), onLeaguesChange: (leagues) => void handleLeaguesChange(leagues), onApplyPreset: (presetId) => void handleApplyPreset(presetId) }), showBudgetWarning && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "h-4 w-4", children: [(0, jsx_runtime_1.jsx)("path", { d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })] }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: "Budget Warning" })] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 pl-6", children: ["Current settings estimate ~", estimatedHourlyRequests.toLocaleString(), " requests/hour. This exceeds the typical 5,000 req/hour budget. Consider reducing settings."] })] })), showQuotaWarning && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-red-500/40 bg-red-500/10 p-3 text-[11px] text-red-200", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2", children: (0, jsx_runtime_1.jsxs)("span", { className: "font-medium", children: ["API Quota: ", Math.round(quotaPercent * 100), "% used"] }) }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1 h-1.5 w-full rounded-full bg-ot-border", children: (0, jsx_runtime_1.jsx)("div", { className: "h-1.5 rounded-full bg-red-400 transition-all", style: { width: `${Math.min(quotaPercent * 100, 100)}%` } }) })] })), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-muted/70", children: "Deep scan fetches detailed odds for each event, consuming more API requests. Adjust settings based on your API plan limits." })] }));
}
exports.default = DeepScanConfigSection;
