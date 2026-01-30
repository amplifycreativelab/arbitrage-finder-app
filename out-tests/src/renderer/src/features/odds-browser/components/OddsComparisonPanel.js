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
exports.OddsComparisonPanel = OddsComparisonPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
// Story 8.2: Icon components (emoji fallbacks for now, lucide-react can be added later)
const Pin = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\uD83D\uDCCC" });
const X = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\u2715" });
const PanelLeft = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\u25C0" });
const Maximize2 = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\u26F6" });
const Copy = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\uD83D\uDCCB" });
const Loader2 = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\u27F3" });
const RefreshCw = ({ className }) => (0, jsx_runtime_1.jsx)("span", { className: className, children: "\u21BB" });
const utils_1 = require("../../../lib/utils");
const button_1 = require("../../../components/ui/button");
/**
 * Story 8.2: Odds Comparison Panel Component
 *
 * Displays a comparison of odds across all bookmakers for a selected market.
 * Supports docked (sidebar) and floating (modal) display modes.
 * Includes pin functionality, real-time updates, and copy-to-clipboard.
 */
function OddsComparisonPanel({ selectedRow, isPinned, displayMode, onTogglePin, onChangeDisplayMode, onClose, onCopyBestOdds }) {
    const [state, setState] = React.useState({
        data: null,
        isLoading: true,
        isUpdating: false,
        error: null,
        lastUpdated: null
    });
    const [copyState, setCopyState] = React.useState('idle');
    // Story 8.2: Extract event ID from selected row's composite ID
    // Row ID format: `${eventId}:${marketKey}:${bookmaker}:${outcome}`
    const eventId = React.useMemo(() => {
        return selectedRow.id.split(':')[0] || selectedRow.event.home + '-' + selectedRow.event.away;
    }, [selectedRow]);
    // Story 8.2: Fetch best odds data
    const fetchBestOdds = React.useCallback(async (isBackgroundUpdate = false) => {
        if (!isBackgroundUpdate) {
            setState(prev => ({ ...prev, isLoading: true, error: null }));
        }
        else {
            setState(prev => ({ ...prev, isUpdating: true }));
        }
        try {
            const result = await window.api.deepScanGetBestOdds({ eventId });
            // Transform the data to include isBest flag
            const transformedData = result.bestOdds?.map((market) => ({
                eventId: market.eventId,
                marketKey: market.marketKey,
                marketLabel: market.marketLabel,
                outcomes: market.outcomes.map((outcome) => ({
                    outcome: outcome.outcome,
                    bestBookmaker: outcome.bestBookmaker,
                    bestOdds: outcome.bestOdds,
                    allBookmakers: outcome.allBookmakers
                        .map(bm => ({ ...bm, isBest: bm.bookmaker === outcome.bestBookmaker }))
                        .sort((a, b) => b.odds - a.odds)
                }))
            })) ?? [];
            setState({
                data: transformedData,
                isLoading: false,
                isUpdating: false,
                error: null,
                lastUpdated: new Date()
            });
        }
        catch (err) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                isUpdating: false,
                error: err instanceof Error ? err.message : 'Failed to load comparison data',
                lastUpdated: prev.lastUpdated
            }));
        }
    }, [eventId]);
    // Story 8.2: Initial fetch
    React.useEffect(() => {
        void fetchBestOdds(false);
    }, [fetchBestOdds]);
    // Story 8.2: Real-time updates - subscribe to deep scan updates
    React.useEffect(() => {
        // Poll for updates every 5 seconds when data is stale
        const intervalId = setInterval(() => {
            if (state.lastUpdated && Date.now() - state.lastUpdated.getTime() > 5000) {
                void fetchBestOdds(true);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }, [fetchBestOdds, state.lastUpdated]);
    // Story 8.2: Handle ESC key to close
    React.useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);
    // Story 8.2: Calculate rank of selected bookmaker for selected outcome
    const selectedOddsRank = React.useMemo(() => {
        if (!state.data)
            return null;
        // Find the market matching the selected row's market key
        const market = state.data.find(m => m.marketKey === selectedRow.marketKey);
        if (!market)
            return null;
        // Find the outcome matching the selected row's outcome
        const outcome = market.outcomes.find(o => o.outcome === selectedRow.outcome);
        if (!outcome)
            return null;
        // Find the rank of the selected bookmaker
        const rank = outcome.allBookmakers.findIndex(bm => bm.bookmaker === selectedRow.bookmaker);
        return rank >= 0 ? rank + 1 : null;
    }, [state.data, selectedRow]);
    // Story 8.2: Get total bookmakers count
    const totalBookmakers = React.useMemo(() => {
        if (!state.data)
            return 0;
        const market = state.data.find(m => m.marketKey === selectedRow.marketKey);
        const outcome = market?.outcomes.find(o => o.outcome === selectedRow.outcome);
        return outcome?.allBookmakers.length ?? 0;
    }, [state.data, selectedRow]);
    // Story 8.2: Handle copy best odds
    const handleCopyBestOdds = React.useCallback(() => {
        if (!state.data)
            return;
        // Format: "{Event} - {Market}: Best {OutcomeA} @ {BookmakerA} ({OddsA}), Best {OutcomeB} @ {BookmakerB} ({OddsB})"
        const market = state.data.find(m => m.marketKey === selectedRow.marketKey);
        if (!market)
            return;
        const eventName = `${selectedRow.event.home} vs ${selectedRow.event.away}`;
        const outcomesText = market.outcomes.map(o => `Best ${o.outcome} @ ${o.bestBookmaker} (${o.bestOdds.toFixed(2)})`).join(', ');
        const text = `${eventName} - ${market.marketLabel}: ${outcomesText}`;
        // Copy to clipboard
        void window.api.copySignalToClipboard({ text });
        if (onCopyBestOdds) {
            onCopyBestOdds();
        }
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 1500);
    }, [state.data, selectedRow, onCopyBestOdds]);
    // Story 8.2: Format rank display (e.g., "1st", "2nd", "3rd")
    const formatRank = (rank) => {
        if (rank === 1)
            return '1st';
        if (rank === 2)
            return '2nd';
        if (rank === 3)
            return '3rd';
        return `${rank}th`;
    };
    // Story 8.2: Check if data is stale (>5 min old)
    const isDataStale = React.useMemo(() => {
        if (!state.lastUpdated)
            return false;
        return Date.now() - state.lastUpdated.getTime() > 5 * 60 * 1000;
    }, [state.lastUpdated]);
    // Story 8.2: Render header
    const renderHeader = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-ot-border bg-ot-surface p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-semibold text-ot-foreground", children: "Odds Comparison" }), state.isUpdating && ((0, jsx_runtime_1.jsx)(Loader2, { className: "h-3 w-3 animate-spin text-ot-accent" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "ghost", size: "sm", className: (0, utils_1.cn)('h-7 px-2 text-[10px]', copyState === 'copied' && 'text-emerald-400'), onClick: handleCopyBestOdds, disabled: !state.data || state.isLoading, title: "Copy best odds to clipboard", children: copyState === 'copied' ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "mr-1", children: "\u2713" }), " Copied"] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Copy, { className: "mr-1 h-3 w-3" }), " Copy"] })) }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "ghost", size: "icon", className: "h-7 w-7", onClick: () => onChangeDisplayMode(displayMode === 'docked' ? 'floating' : 'docked'), title: displayMode === 'docked' ? 'Switch to floating mode' : 'Switch to docked mode', children: displayMode === 'docked' ? ((0, jsx_runtime_1.jsx)(Maximize2, { className: "h-3.5 w-3.5 text-ot-muted" })) : ((0, jsx_runtime_1.jsx)(PanelLeft, { className: "h-3.5 w-3.5 text-ot-muted" })) }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "ghost", size: "icon", className: (0, utils_1.cn)('h-7 w-7', isPinned && 'text-ot-accent'), onClick: onTogglePin, title: isPinned ? 'Unpin panel' : 'Pin panel', children: (0, jsx_runtime_1.jsx)(Pin, { className: (0, utils_1.cn)('h-3.5 w-3.5', isPinned && 'fill-current') }) }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "ghost", size: "icon", className: "h-7 w-7", onClick: onClose, title: "Close panel (ESC)", children: (0, jsx_runtime_1.jsx)(X, { className: "h-3.5 w-3.5 text-ot-muted" }) })] })] }));
    // Story 8.2: Render event context
    const renderEventContext = () => ((0, jsx_runtime_1.jsxs)("div", { className: "border-b border-ot-border bg-ot-background p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-sm font-semibold text-ot-foreground", children: [selectedRow.event.home, " vs ", selectedRow.event.away] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1 flex items-center gap-2 text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("span", { children: selectedRow.league }), (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { children: selectedRow.marketType }), (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { children: selectedRow.outcome })] }), selectedOddsRank && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: (0, utils_1.cn)('rounded px-1.5 py-0.5 text-[10px] font-medium', selectedOddsRank === 1
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-ot-accent/10 text-ot-accent'), children: [formatRank(selectedOddsRank), " best"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-ot-muted", children: ["out of ", totalBookmakers, " bookmakers"] })] }))] }));
    // Story 8.2: Render loading state
    const renderLoading = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 flex-col items-center justify-center p-8", children: [(0, jsx_runtime_1.jsx)(Loader2, { className: "mb-3 h-6 w-6 animate-spin text-ot-accent" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-muted", children: "Loading comparison data..." })] }));
    // Story 8.2: Render error state
    const renderError = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 flex-col items-center justify-center p-8 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-3 rounded-full bg-red-500/10 p-3", children: (0, jsx_runtime_1.jsx)(X, { className: "h-5 w-5 text-red-500" }) }), (0, jsx_runtime_1.jsx)("span", { className: "mb-2 text-[11px] font-medium text-ot-foreground", children: "Failed to load comparison" }), (0, jsx_runtime_1.jsx)("span", { className: "mb-4 max-w-[200px] text-[10px] text-ot-muted", children: state.error }), (0, jsx_runtime_1.jsxs)(button_1.Button, { type: "button", variant: "outline", size: "sm", className: "h-7 text-[10px]", onClick: () => void fetchBestOdds(false), children: [(0, jsx_runtime_1.jsx)(RefreshCw, { className: "mr-1 h-3 w-3" }), " Retry"] })] }));
    // Story 8.2: Render empty state
    const renderEmpty = () => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 flex-col items-center justify-center p-8 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-3 rounded-full bg-ot-muted/10 p-3", children: (0, jsx_runtime_1.jsx)("span", { className: "text-lg text-ot-muted", children: "\uD83D\uDCCA" }) }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-muted", children: "No comparison data available" })] }));
    // Story 8.2: Render stale state overlay
    const renderStaleOverlay = () => {
        if (!isDataStale)
            return null;
        return ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-x-0 top-0 z-10 bg-amber-500/10 px-3 py-2 text-center", children: (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-amber-400", children: "Data is stale (>5 min old). Waiting for refresh..." }) }));
    };
    // Story 8.2: Render comparison content
    const renderContent = () => {
        if (state.isLoading && !state.data)
            return renderLoading();
        if (state.error)
            return renderError();
        if (!state.data || state.data.length === 0)
            return renderEmpty();
        // Find the specific market for this selection
        const market = state.data.find(m => m.marketKey === selectedRow.marketKey);
        if (!market)
            return renderEmpty();
        return ((0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1 overflow-auto p-3", children: [renderStaleOverlay(), (0, jsx_runtime_1.jsx)("div", { className: "mb-3 text-xs font-medium text-ot-foreground", children: market.marketLabel }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: market.outcomes.map((outcome) => ((0, jsx_runtime_1.jsxs)("div", { className: "rounded border border-ot-border bg-ot-card p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-medium text-ot-muted", children: outcome.outcome }), outcome.outcome === selectedRow.outcome && ((0, jsx_runtime_1.jsx)("span", { className: "text-[9px] text-ot-accent", children: "Your selection" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('mb-2 flex items-center justify-between rounded p-2', outcome.bestBookmaker === selectedRow.bookmaker
                                    ? 'bg-emerald-500/10'
                                    : 'bg-ot-accent/10'), children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[13px] font-bold text-ot-accent", children: outcome.bestOdds.toFixed(2) }), (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: outcome.bestBookmaker })] }), outcome.bestBookmaker === selectedRow.bookmaker && ((0, jsx_runtime_1.jsx)("span", { className: "rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400", children: "Best" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-0.5", children: [outcome.allBookmakers.slice(0, 6).map((bm) => ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex items-center justify-between text-[10px]', bm.bookmaker === selectedRow.bookmaker
                                            ? 'font-medium text-ot-foreground'
                                            : 'text-ot-muted'), children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1", children: [bm.bookmaker === selectedRow.bookmaker && ((0, jsx_runtime_1.jsx)("span", { className: "text-ot-accent", children: "\u2192" })), bm.bookmaker] }), (0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('font-mono', bm.isBest && 'font-semibold text-ot-accent'), children: bm.odds.toFixed(2) })] }, bm.bookmaker))), outcome.allBookmakers.length > 6 && ((0, jsx_runtime_1.jsxs)("div", { className: "text-[9px] text-ot-muted", children: ["+", outcome.allBookmakers.length - 6, " more bookmakers"] }))] })] }, outcome.outcome))) })] }));
    };
    // Story 8.2: Main render
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex flex-col bg-ot-background', displayMode === 'floating' && 'h-full rounded-lg shadow-xl'), "data-testid": "odds-comparison-panel", children: [renderHeader(), renderEventContext(), renderContent()] }));
}
exports.default = OddsComparisonPanel;
