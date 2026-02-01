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
exports.AggressiveScanSettingsSection = AggressiveScanSettingsSection;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Story 8.7: Aggressive Pre-Match Scanning Settings
 *
 * UI for configuring aggressive scan mode settings including:
 * - Enable/disable aggressive mode
 * - Quota target percentage
 * - Scan horizon
 * - Imminent poll rate
 * - Tier weights (advanced)
 */
const React = __importStar(require("react"));
const feedFiltersStore_1 = require("../../dashboard/stores/feedFiltersStore");
function AggressiveScanSettingsSection() {
    // Local state from store
    const aggressiveScanEnabled = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanEnabled);
    const setAggressiveScanEnabled = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanEnabled);
    const quotaTargetPercent = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanQuotaTargetPercent);
    const setQuotaTargetPercent = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanQuotaTargetPercent);
    const horizonHours = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanHorizonHours);
    const setHorizonHours = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanHorizonHours);
    const imminentIntervalSeconds = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanImminentIntervalSeconds);
    const setImminentIntervalSeconds = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanImminentIntervalSeconds);
    const tierWeights = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanTierWeights);
    const setTierWeights = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanTierWeights);
    const boostDurationMinutes = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanBoostDurationMinutes);
    const setBoostDurationMinutes = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanBoostDurationMinutes);
    const maxBoostedEvents = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.aggressiveScanMaxBoostedEvents);
    const setMaxBoostedEvents = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setAggressiveScanMaxBoostedEvents);
    // Local input states
    const [quotaInput, setQuotaInput] = React.useState(String(quotaTargetPercent));
    const [horizonInput, setHorizonInput] = React.useState(String(horizonHours));
    const [imminentInput, setImminentInput] = React.useState(String(imminentIntervalSeconds));
    const [boostDurationInput, setBoostDurationInput] = React.useState(String(boostDurationMinutes));
    const [maxBoostedInput, setMaxBoostedInput] = React.useState(String(maxBoostedEvents));
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    // Sync inputs with store values
    React.useEffect(() => {
        setQuotaInput(String(quotaTargetPercent));
    }, [quotaTargetPercent]);
    React.useEffect(() => {
        setHorizonInput(String(horizonHours));
    }, [horizonHours]);
    React.useEffect(() => {
        setImminentInput(String(imminentIntervalSeconds));
    }, [imminentIntervalSeconds]);
    React.useEffect(() => {
        setBoostDurationInput(String(boostDurationMinutes));
    }, [boostDurationMinutes]);
    React.useEffect(() => {
        setMaxBoostedInput(String(maxBoostedEvents));
    }, [maxBoostedEvents]);
    // Handle enable toggle
    const handleToggle = (enabled) => {
        setAggressiveScanEnabled(enabled);
        // Sync with main process
        try {
            void window.api.deepScan.setAggressiveScanConfig({ enabled });
        }
        catch {
            // Best-effort
        }
    };
    // Numeric input handlers
    const handleNumericInputKeyDown = (event, commit) => {
        if (event.key !== 'Enter')
            return;
        event.preventDefault();
        commit();
        event.currentTarget.blur();
    };
    // Quota target commit
    const commitQuotaInput = () => {
        const parsed = Number(quotaInput);
        if (!Number.isFinite(parsed)) {
            setQuotaInput(String(quotaTargetPercent));
            return;
        }
        setQuotaTargetPercent(parsed);
        try {
            void window.api.deepScan.setAggressiveScanConfig({ quotaTargetPercent: parsed });
        }
        catch {
            // Best-effort
        }
    };
    // Horizon hours commit (used with select dropdown, but kept for consistency)
    // @ts-expect-error - defined for potential future use
    const commitHorizonInput = () => {
        const parsed = Number(horizonInput);
        if (!Number.isFinite(parsed)) {
            setHorizonInput(String(horizonHours));
            return;
        }
        setHorizonHours(parsed);
        try {
            void window.api.deepScan.setAggressiveScanConfig({ scanHorizonHours: parsed });
        }
        catch {
            // Best-effort
        }
    };
    // Imminent interval commit (used with select dropdown, but kept for consistency)
    // @ts-expect-error - defined for potential future use
    const commitImminentInput = () => {
        const parsed = Number(imminentInput);
        if (!Number.isFinite(parsed)) {
            setImminentInput(String(imminentIntervalSeconds));
            return;
        }
        setImminentIntervalSeconds(parsed);
        try {
            void window.api.deepScan.setAggressiveScanConfig({ imminentPollIntervalSeconds: parsed });
        }
        catch {
            // Best-effort
        }
    };
    // Boost duration commit
    const commitBoostDurationInput = () => {
        const parsed = Number(boostDurationInput);
        if (!Number.isFinite(parsed)) {
            setBoostDurationInput(String(boostDurationMinutes));
            return;
        }
        setBoostDurationMinutes(parsed);
        try {
            void window.api.deepScan.setAggressiveScanConfig({ arbBoostDurationMinutes: parsed });
        }
        catch {
            // Best-effort
        }
    };
    // Max boosted events commit
    const commitMaxBoostedInput = () => {
        const parsed = Number(maxBoostedInput);
        if (!Number.isFinite(parsed)) {
            setMaxBoostedInput(String(maxBoostedEvents));
            return;
        }
        setMaxBoostedEvents(parsed);
        try {
            void window.api.deepScan.setAggressiveScanConfig({ maxBoostedEvents: parsed });
        }
        catch {
            // Best-effort
        }
    };
    // Handle tier weight change
    const handleTierWeightChange = (tier, value) => {
        const newWeights = { ...tierWeights, [tier]: Math.max(1, Math.min(100, value)) };
        setTierWeights(newWeights);
        try {
            void window.api.deepScan.setAggressiveScanConfig({ tierWeights: newWeights });
        }
        catch {
            // Best-effort
        }
    };
    // Calculate estimated quota usage
    const estimatedRequestsPerHour = Math.floor(5000 * (quotaTargetPercent / 100));
    const scanHorizonDisplay = horizonHours >= 24
        ? `${Math.floor(horizonHours / 24)}d ${horizonHours % 24}h`
        : `${horizonHours}h`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between", children: (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Aggressive mode maximizes API quota usage for faster arbitrage detection on imminent matches." }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: "Aggressive Pre-Match Mode" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "Use 70-80% of API quota for aggressive scanning" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "inline-flex cursor-pointer items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", role: "switch", "aria-checked": aggressiveScanEnabled, checked: aggressiveScanEnabled, onChange: (event) => handleToggle(event.target.checked), className: "h-4 w-4 cursor-pointer rounded border border-ot-border/80 bg-ot-surface accent-ot-accent" }), aggressiveScanEnabled ? 'On' : 'Off'] })] }), aggressiveScanEnabled && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Quota Target" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "% of 5,000/hour limit" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 50, max: 90, value: quotaInput, onChange: (e) => setQuotaInput(e.target.value), onBlur: commitQuotaInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitQuotaInput), className: "h-8 w-20 rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Quota target percentage" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: "%" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1 text-[9px] text-ot-accent", children: ["~", estimatedRequestsPerHour.toLocaleString(), " req/hr"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Scan Horizon" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Hours to look ahead" }), (0, jsx_runtime_1.jsxs)("select", { value: horizonHours, onChange: (e) => {
                                            const value = Number(e.target.value);
                                            setHorizonHours(value);
                                            try {
                                                void window.api.deepScan.setAggressiveScanConfig({ scanHorizonHours: value });
                                            }
                                            catch {
                                                // Best-effort
                                            }
                                        }, className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Scan horizon", children: [(0, jsx_runtime_1.jsx)("option", { value: 12, children: "12 hours" }), (0, jsx_runtime_1.jsx)("option", { value: 24, children: "24 hours" }), (0, jsx_runtime_1.jsx)("option", { value: 48, children: "48 hours" }), (0, jsx_runtime_1.jsx)("option", { value: 72, children: "72 hours" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Imminent Poll Rate" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Events <30 min to kickoff" }), (0, jsx_runtime_1.jsxs)("select", { value: imminentIntervalSeconds, onChange: (e) => {
                                            const value = Number(e.target.value);
                                            setImminentIntervalSeconds(value);
                                            try {
                                                void window.api.deepScan.setAggressiveScanConfig({ imminentPollIntervalSeconds: value });
                                            }
                                            catch {
                                                // Best-effort
                                            }
                                        }, className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Imminent poll rate", children: [(0, jsx_runtime_1.jsx)("option", { value: 15, children: "15 seconds" }), (0, jsx_runtime_1.jsx)("option", { value: 30, children: "30 seconds" }), (0, jsx_runtime_1.jsx)("option", { value: 45, children: "45 seconds" }), (0, jsx_runtime_1.jsx)("option", { value: 60, children: "60 seconds" }), (0, jsx_runtime_1.jsx)("option", { value: 90, children: "90 seconds" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Boost Duration" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Minutes when arb detected" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 30, value: boostDurationInput, onChange: (e) => setBoostDurationInput(e.target.value), onBlur: commitBoostDurationInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitBoostDurationInput), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Boost duration minutes" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-semibold text-ot-foreground", children: "Max Boosted Events" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted mb-1", children: "Concurrent boosted events" }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 50, value: maxBoostedInput, onChange: (e) => setMaxBoostedInput(e.target.value), onBlur: commitMaxBoostedInput, onKeyDown: (e) => handleNumericInputKeyDown(e, commitMaxBoostedInput), className: "h-8 w-full rounded border border-ot-border bg-ot-surface px-2 text-[11px] text-ot-foreground", "aria-label": "Max boosted events" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowAdvanced(!showAdvanced), className: "flex w-full items-center justify-between text-left", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: "Advanced: Tier Weights" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: "Configure quota allocation per tier" })] }), (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: `h-4 w-4 text-ot-muted transition-transform ${showAdvanced ? 'rotate-180' : ''}`, children: (0, jsx_runtime_1.jsx)("polyline", { points: "6 9 12 15 18 9" }) })] }), showAdvanced && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 grid grid-cols-2 gap-2 border-t border-ot-border/40 pt-3 sm:grid-cols-3", children: Object.keys(tierWeights).map((tier) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded bg-ot-surface/50 px-2 py-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] capitalize text-ot-foreground", children: tier }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 1, max: 100, value: tierWeights[tier], onChange: (e) => handleTierWeightChange(tier, Number(e.target.value)), className: "h-6 w-12 rounded border border-ot-border bg-ot-surface px-1 text-[10px] text-ot-foreground text-center" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[9px] text-ot-muted", children: "%" })] })] }, tier))) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/40 bg-ot-surface/30 p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground mb-2", children: "Estimated Usage" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 gap-2 text-[9px] text-ot-muted sm:grid-cols-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-accent", children: scanHorizonDisplay }), " scan horizon"] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-ot-accent", children: ["~", estimatedRequestsPerHour.toLocaleString()] }), " req/hour"] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-ot-accent", children: [imminentIntervalSeconds, "s"] }), " imminent polling"] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-ot-accent", children: [tierWeights.imminent, "%"] }), " to imminent tier"] })] })] })] })), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-muted/70", children: "Aggressive mode increases API usage significantly. Monitor your quota to avoid hitting limits. Recommended for paid API plans only." })] }));
}
exports.default = AggressiveScanSettingsSection;
