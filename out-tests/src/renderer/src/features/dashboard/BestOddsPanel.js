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
exports.BestOddsPanel = BestOddsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const feedStore_1 = require("./stores/feedStore");
const deepScanStore_1 = require("./stores/deepScanStore");
const BestOddsView_1 = __importDefault(require("./BestOddsView"));
const utils_1 = require("../../lib/utils");
/**
 * Story 7.7 Task 5: Container component for Best Odds Comparison View
 *
 * Provides event selection and integrates BestOddsView into the dashboard.
 * Events are sourced from arbitrage opportunities in the feed.
 *
 * Note: Since ArbitrageOpportunity.event doesn't have an ID field, we use
 * event names as identifiers. This is a fallback mechanism - the BestOddsView
 * component will attempt to find matching data in the cache.
 */
function BestOddsPanel() {
    // Get events from feed store (arbitrage opportunities contain event info)
    const opportunities = (0, feedStore_1.useFeedStore)((state) => state.opportunities);
    const selectedOpportunityId = (0, feedStore_1.useFeedStore)((state) => state.selectedOpportunityId);
    const setSelectedOpportunityId = (0, feedStore_1.useFeedStore)((state) => state.setSelectedOpportunityId);
    // Get deep scan status to show when scanning is in progress
    const continuousStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.continuousStatus);
    const progress = (0, deepScanStore_1.useDeepScanStore)((state) => state.progress);
    // Extract unique events from opportunities (using event name as key since no ID available)
    const events = React.useMemo(() => {
        const eventMap = new Map();
        for (const opp of opportunities) {
            if (opp.event?.name && !eventMap.has(opp.event.name)) {
                eventMap.set(opp.event.name, {
                    key: opp.event.name, // Use name as the key
                    name: opp.event.name
                });
            }
        }
        return Array.from(eventMap.values());
    }, [opportunities]);
    // Selected event key from selected opportunity
    const selectedEventKey = React.useMemo(() => {
        if (!selectedOpportunityId)
            return null;
        const opp = opportunities.find((o) => o.id === selectedOpportunityId);
        return opp?.event?.name ?? null;
    }, [selectedOpportunityId, opportunities]);
    // State for manual event selection (separate from the opportunity selection)
    const [manualEventKey, setManualEventKey] = React.useState(null);
    // Use manual selection if set, otherwise use selected opportunity's event
    const activeEventKey = manualEventKey ?? selectedEventKey;
    const handleEventChange = (eventKey) => {
        setManualEventKey(eventKey || null);
        // Optionally sync with opportunity selection
        if (eventKey) {
            const matchingOpp = opportunities.find((o) => o.event?.name === eventKey);
            if (matchingOpp) {
                setSelectedOpportunityId(matchingOpp.id);
            }
        }
    };
    // Status indicator - DeepScanStatus type is 'idle' | 'scanning' | 'completed' | 'cancelled' | 'error'
    const isScanning = progress.status === 'scanning' || continuousStatus.isActive;
    // Empty state when no events
    if (events.length === 0) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", children: [(0, jsx_runtime_1.jsxs)("header", { className: "mb-2 flex items-center justify-between gap-2 border-b border-ot-border pb-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[11px] font-semibold uppercase tracking-[0.12em] text-ot-muted", children: "Best Odds Comparison" }), isScanning && ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5 text-[9px] text-cyan-400", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" }), "Scanning"] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-1 items-center justify-center text-center text-[11px] text-ot-muted", "data-testid": "best-odds-empty", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-[200px] space-y-2", children: [(0, jsx_runtime_1.jsx)("p", { children: "No events available." }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-muted/70", children: "Run Deep Scan to discover events, or wait for arbitrage opportunities to appear in the feed." })] }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", "data-testid": "best-odds-panel", children: [(0, jsx_runtime_1.jsxs)("header", { className: "mb-2 flex items-center gap-3 border-b border-ot-border pb-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[11px] font-semibold uppercase tracking-[0.12em] text-ot-muted", children: "Best Odds" }), (0, jsx_runtime_1.jsxs)("select", { value: activeEventKey ?? '', onChange: (e) => handleEventChange(e.target.value), className: (0, utils_1.cn)('h-7 min-w-0 flex-1 truncate rounded border border-ot-border bg-ot-card', 'px-2 text-[11px] text-ot-foreground outline-none', 'focus:border-ot-accent'), "data-testid": "best-odds-event-selector", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select an event..." }), events.map((event) => ((0, jsx_runtime_1.jsx)("option", { value: event.key, children: event.name }, event.key)))] }), isScanning && ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5 text-[9px] text-cyan-400", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" }), "Live"] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-hidden", children: activeEventKey ? ((0, jsx_runtime_1.jsx)(BestOddsView_1.default, { eventId: activeEventKey })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-muted", "data-testid": "best-odds-no-selection", children: "Select an event to see best odds comparison." })) })] }));
}
exports.default = BestOddsPanel;
