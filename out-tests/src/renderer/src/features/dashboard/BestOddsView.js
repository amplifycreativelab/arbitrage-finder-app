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
exports.BestOddsView = BestOddsView;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const utils_1 = require("../../lib/utils");
const button_1 = require("../../components/ui/button");
// Story 7.7: Available market groups for filtering
const MARKET_GROUPS = [
    { value: 'all', label: 'All Markets' },
    { value: 'goals', label: 'Goals' },
    { value: 'corners', label: 'Corners' },
    { value: 'cards', label: 'Cards' },
    { value: 'shots', label: 'Shots' },
    { value: 'other', label: 'Other' }
];
function BestOddsView({ eventId, marketGroup: marketGroupProp, onCopy }) {
    const [bestOddsData, setBestOddsData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [copyState, setCopyState] = React.useState(new Map());
    // Story 7.7 Task 2: Internal market group filter state
    const [selectedMarketGroup, setSelectedMarketGroup] = React.useState('all');
    // Story 7.7 Task 7.3: Debounced filter state for performance
    const [debouncedMarketGroup, setDebouncedMarketGroup] = React.useState('all');
    // Story 7.7 Task 4.4: Track selected outcome for keyboard shortcut
    const [selectedOutcomeKey, setSelectedOutcomeKey] = React.useState(null);
    // Use prop if provided, otherwise use debounced internal state
    const activeMarketGroup = marketGroupProp ?? debouncedMarketGroup;
    // Story 7.7 Task 7.3: Debounce filter changes (100ms)
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedMarketGroup(selectedMarketGroup);
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [selectedMarketGroup]);
    // Fetch best odds from TRPC endpoint
    React.useEffect(() => {
        if (!eventId)
            return;
        setIsLoading(true);
        window.api
            .deepScanGetBestOdds({ eventId })
            .then((result) => {
            // Cast marketGroup strings to MarketGroup type
            const data = result.bestOdds?.map((market) => ({
                ...market,
                marketGroup: market.marketGroup
            })) ?? null;
            setBestOddsData(data);
        })
            .catch((error) => {
            console.error('Failed to fetch best odds:', error);
            setBestOddsData(null);
        })
            .finally(() => {
            setIsLoading(false);
        });
    }, [eventId]);
    // Story 7.7 Task 7.1: Memoize filtered market data
    const filteredData = React.useMemo(() => {
        if (!bestOddsData)
            return [];
        if (activeMarketGroup === 'all')
            return bestOddsData;
        return bestOddsData.filter((market) => market.marketGroup === activeMarketGroup);
    }, [bestOddsData, activeMarketGroup]);
    // Story 7.7 Task 7.1: Memoize sorted bookmaker lists for each outcome
    const sortedOutcomesMap = React.useMemo(() => {
        const map = new Map();
        for (const market of filteredData) {
            for (const outcome of market.outcomes) {
                const key = `${market.marketKey}:${outcome.outcome}`;
                // Sort by odds descending (best first) and exclude best bookmaker from secondary list
                const sorted = [...outcome.allBookmakers]
                    .filter(bm => bm.bookmaker !== outcome.bestBookmaker)
                    .sort((a, b) => b.odds - a.odds)
                    .slice(0, 5); // Limit to 5 for performance
                map.set(key, sorted);
            }
        }
        return map;
    }, [filteredData]);
    // Story 7.7 Task 4.4: Keyboard shortcut (Ctrl+C) to copy selected outcome
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'c' && selectedOutcomeKey && filteredData.length > 0) {
                e.preventDefault();
                // Find the selected outcome in filtered data
                for (const market of filteredData) {
                    for (const outcome of market.outcomes) {
                        const key = `${market.marketKey}:${outcome.outcome}`;
                        if (key === selectedOutcomeKey) {
                            handleCopy(outcome, market.marketLabel);
                            return;
                        }
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedOutcomeKey, filteredData]);
    const handleCopy = (outcome, marketLabel) => {
        const text = `${outcome.outcome}: ${outcome.bestOdds} @ ${outcome.bestBookmaker} (${marketLabel})`;
        if (window.api?.copySignalToClipboard) {
            void window.api.copySignalToClipboard({ text });
        }
        if (onCopy) {
            onCopy(text);
        }
        const key = `${marketLabel}-${outcome.outcome}`;
        setCopyState(new Map(copyState.set(key, 'copied')));
        setTimeout(() => {
            setCopyState((prev) => {
                const next = new Map(prev);
                next.delete(key);
                return next;
            });
        }, 1200);
    };
    if (isLoading) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-muted", children: "Loading best odds..." }));
    }
    if (!bestOddsData || filteredData.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-muted", children: !bestOddsData
                ? 'No odds data available. Run Deep Scan to populate.'
                : 'No markets match selected filter.' }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col overflow-auto", children: [!marketGroupProp && ((0, jsx_runtime_1.jsxs)("div", { className: "sticky top-0 z-10 flex items-center gap-2 border-b border-ot-border bg-ot-background p-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: "Filter:" }), (0, jsx_runtime_1.jsx)("select", { value: activeMarketGroup, onChange: (e) => setSelectedMarketGroup(e.target.value), className: "h-7 rounded border border-ot-border bg-ot-card px-2 text-[11px] text-ot-foreground outline-none focus:border-ot-accent", children: MARKET_GROUPS.map((group) => ((0, jsx_runtime_1.jsx)("option", { value: group.value, children: group.label }, group.value))) }), (0, jsx_runtime_1.jsxs)("span", { className: "ml-auto text-[9px] text-ot-muted", children: [filteredData.length, " market", filteredData.length !== 1 ? 's' : ''] })] })), (0, jsx_runtime_1.jsx)("div", { className: "space-y-4 p-2", children: filteredData.map((market) => ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border bg-ot-card p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-semibold text-ot-foreground", children: market.marketLabel }), market.hasArbitrage && market.arbitrageRoi !== undefined && ((0, jsx_runtime_1.jsxs)("span", { className: "rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400", children: ["ARB ", (market.arbitrageRoi * 100).toFixed(1), "%"] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: market.outcomes.map((outcome) => {
                                const copyKey = `${market.marketLabel}-${outcome.outcome}`;
                                const isCopied = copyState.get(copyKey) === 'copied';
                                // Story 7.7 Task 7.1: Use memoized sorted bookmakers
                                const sortedKey = `${market.marketKey}:${outcome.outcome}`;
                                const sortedBookmakers = sortedOutcomesMap.get(sortedKey) ?? [];
                                const isSelected = selectedOutcomeKey === sortedKey;
                                return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)("space-y-1 cursor-pointer rounded p-1 transition-colors", isSelected && "bg-ot-accent/5 ring-1 ring-ot-accent/30"), onClick: () => setSelectedOutcomeKey(sortedKey), role: "button", tabIndex: 0, onKeyDown: (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedOutcomeKey(sortedKey);
                                        }
                                    }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between rounded bg-ot-accent/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-medium text-ot-muted", children: outcome.outcome }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[13px] font-bold text-ot-accent", children: [outcome.bestOdds.toFixed(2), " @ ", outcome.bestBookmaker] })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", className: (0, utils_1.cn)('h-6 px-2 text-[9px]', isCopied && 'bg-emerald-500 text-black hover:bg-emerald-400'), onClick: () => handleCopy(outcome, market.marketLabel), children: isCopied ? '✓ COPIED' : 'COPY' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-0.5 pl-2", children: [sortedBookmakers.map((bm) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-24 truncate", children: bm.bookmaker }), (0, jsx_runtime_1.jsx)("span", { className: "ml-auto font-mono", children: bm.odds.toFixed(2) })] }, bm.bookmaker))), outcome.allBookmakers.length > 6 && ((0, jsx_runtime_1.jsxs)("div", { className: "text-[9px] text-ot-muted", children: ["+", outcome.allBookmakers.length - 6, " more bookmakers"] }))] })] }, outcome.outcome));
                            }) })] }, market.marketKey))) })] }));
}
exports.default = BestOddsView;
