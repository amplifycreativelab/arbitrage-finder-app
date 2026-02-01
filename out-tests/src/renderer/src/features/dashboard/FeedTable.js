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
exports.FeedTable = FeedTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const date_fns_1 = require("date-fns");
const button_1 = require("../../components/ui/button");
const utils_1 = require("../../lib/utils");
const copyAndAdvance_1 = require("./copyAndAdvance");
const sortOpportunities_1 = require("./sortOpportunities");
const feedStore_1 = require("./stores/feedStore");
const calculatorStore_1 = require("./stores/calculatorStore");
const staleness_1 = require("./staleness");
const CardRulesWarningIcon_1 = require("./CardRulesWarningIcon");
const CardRulesWarningModal_1 = require("./CardRulesWarningModal");
const isServerEnvironment = typeof document === 'undefined';
const ROW_HEIGHT_PX = 40;
const VIRTUALIZATION_THRESHOLD = 50;
const VISIBLE_WINDOW_ROWS = 40;
const OVERSCAN_ROWS = 8;
function formatTime(opportunity) {
    const source = opportunity.event.date || opportunity.foundAt;
    try {
        const date = (0, date_fns_1.parseISO)(source);
        return (0, date_fns_1.format)(date, 'HH:mm');
    }
    catch {
        return source;
    }
}
function formatRoi(roi) {
    return `${(roi * 100).toFixed(1)}%`;
}
/**
 * Story 7.8: Get trend indicator for odds movement
 */
function getTrendIndicator(trend) {
    switch (trend) {
        case 'improving':
            return { icon: '↑', label: 'Improving', colorClass: 'text-emerald-400' };
        case 'worsening':
            return { icon: '↓', label: 'Worsening', colorClass: 'text-rose-400' };
        case 'stable':
        default:
            return { icon: '→', label: 'Stable', colorClass: 'text-ot-muted' };
    }
}
function getAriaSort(sortBy, current, direction) {
    if (sortBy !== current)
        return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
}
function FeedTable({ opportunities = [], initialSortBy = 'time', initialSortDirection = 'asc', stalenessNow }) {
    const [sortBy, setSortBy] = React.useState(initialSortBy);
    const [sortDirection, setSortDirection] = React.useState(initialSortDirection);
    const [scrollOffset, setScrollOffset] = React.useState(0);
    const scrollContainerRef = React.useRef(null);
    const effectiveNow = stalenessNow ?? Date.now();
    const selectedOpportunityId = (0, feedStore_1.useFeedStore)((state) => state.selectedOpportunityId);
    const selectedOpportunityIndex = (0, feedStore_1.useFeedStore)((state) => state.selectedOpportunityIndex);
    const processedFromStore = (0, feedStore_1.useFeedStore)((state) => state.processedOpportunityIds);
    const processedOpportunityIds = isServerEnvironment
        ? feedStore_1.useFeedStore.getState().processedOpportunityIds
        : processedFromStore;
    const setSelectedOpportunityId = (0, feedStore_1.useFeedStore)((state) => state.setSelectedOpportunityId);
    const moveSelectionByOffset = (0, feedStore_1.useFeedStore)((state) => state.moveSelectionByOffset);
    const setSortGlobal = (0, feedStore_1.useFeedStore)((state) => state.setSort);
    const sorted = React.useMemo(() => (0, sortOpportunities_1.sortOpportunities)(opportunities, sortBy, sortDirection), [opportunities, sortBy, sortDirection]);
    const totalCount = sorted.length;
    const virtualizationEnabled = totalCount > VIRTUALIZATION_THRESHOLD;
    const baseWindow = virtualizationEnabled ? VISIBLE_WINDOW_ROWS : totalCount;
    const visibleWindow = Math.max(0, baseWindow);
    const startIndex = virtualizationEnabled
        ? Math.max(0, Math.min(totalCount - visibleWindow, Math.floor(scrollOffset / ROW_HEIGHT_PX)))
        : 0;
    const endIndex = virtualizationEnabled
        ? Math.min(totalCount, startIndex + visibleWindow + OVERSCAN_ROWS)
        : totalCount;
    const visibleOpportunities = sorted.slice(startIndex, endIndex);
    const totalHeight = virtualizationEnabled ? totalCount * ROW_HEIGHT_PX : undefined;
    const offsetY = virtualizationEnabled ? startIndex * ROW_HEIGHT_PX : 0;
    const effectiveSelectedId = React.useMemo(() => {
        if (sorted.length === 0) {
            return null;
        }
        if (selectedOpportunityId) {
            const found = sorted.find((opportunity) => opportunity.id === selectedOpportunityId);
            if (found) {
                return selectedOpportunityId;
            }
        }
        if (selectedOpportunityIndex != null &&
            selectedOpportunityIndex >= 0 &&
            selectedOpportunityIndex < sorted.length) {
            const candidate = sorted[selectedOpportunityIndex];
            if (candidate) {
                return candidate.id;
            }
        }
        return sorted[0]?.id ?? null;
    }, [sorted, selectedOpportunityId, selectedOpportunityIndex]);
    const handleRowSelect = (id, index) => {
        setSelectedOpportunityId(id, index);
    };
    const handleSortChange = (key) => {
        setSortGlobal(key);
        setSortBy((currentSort) => {
            if (currentSort === key) {
                setSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc');
                return currentSort;
            }
            setSortDirection(key === 'roi' ? 'desc' : 'asc');
            return key;
        });
    };
    const handleScroll = (event) => {
        if (!virtualizationEnabled)
            return;
        setScrollOffset(event.currentTarget.scrollTop);
    };
    const ensureIndexVisible = React.useCallback((index) => {
        const container = scrollContainerRef.current;
        if (!container)
            return;
        if (index == null || index < 0 || index >= sorted.length)
            return;
        const rowTop = index * ROW_HEIGHT_PX;
        const rowBottom = rowTop + ROW_HEIGHT_PX;
        const { scrollTop, clientHeight } = container;
        let nextScrollTop = scrollTop;
        if (rowTop < scrollTop) {
            nextScrollTop = rowTop;
        }
        else if (rowBottom > scrollTop + clientHeight) {
            nextScrollTop = rowBottom - clientHeight;
        }
        if (nextScrollTop !== scrollTop) {
            container.scrollTop = nextScrollTop;
        }
    }, [sorted.length]);
    const openCalculator = (0, calculatorStore_1.useCalculatorStore)((state) => state.openCalculator);
    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!Array.isArray(sorted) || sorted.length === 0) {
                return;
            }
            event.preventDefault();
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            const visibleIds = sorted.map((opportunity) => opportunity.id);
            moveSelectionByOffset(offset, visibleIds);
            const { selectedOpportunityIndex: nextIndex } = feedStore_1.useFeedStore.getState();
            ensureIndexVisible(nextIndex ?? null);
            return;
        }
        if (event.key === 'Enter') {
            if (!Array.isArray(sorted) || sorted.length === 0) {
                return;
            }
            event.preventDefault();
            void (0, copyAndAdvance_1.copyAndAdvanceCurrentOpportunity)().then(() => {
                const { selectedOpportunityIndex: nextIndex } = feedStore_1.useFeedStore.getState();
                ensureIndexVisible(nextIndex ?? null);
            });
            return;
        }
        // Story 8.3: Calculator keyboard shortcut (only if no modifier keys)
        if ((event.key === 'c' || event.key === 'C') && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (!Array.isArray(sorted) || sorted.length === 0) {
                return;
            }
            event.preventDefault();
            const { selectedOpportunityId } = feedStore_1.useFeedStore.getState();
            if (selectedOpportunityId) {
                const opportunity = sorted.find((o) => o.id === selectedOpportunityId);
                if (opportunity) {
                    openCalculator(opportunity);
                }
            }
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", "data-testid": "feed-table", "data-virtualized": virtualizationEnabled ? 'true' : 'false', children: [(0, jsx_runtime_1.jsxs)("div", { className: "feed-table-header mb-3", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-3 flex items-center gap-1.5 text-left transition-colors duration-150', sortBy === 'time' ? 'text-ot-foreground' : 'text-ot-muted hover:text-ot-foreground-secondary'), "aria-label": "Sort by time", "aria-sort": getAriaSort(sortBy, 'time', sortDirection), "data-testid": "feed-header-time", onClick: () => handleSortChange('time'), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-12", children: "Time" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, utils_1.cn)('transition-transform duration-150', sortBy === 'time' ? 'opacity-100' : 'opacity-0'), children: sortBy === 'time' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲' })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "mr-3 flex flex-1 items-center gap-1 text-left text-ot-muted", "aria-disabled": "true", "data-testid": "feed-header-event", children: (0, jsx_runtime_1.jsx)("span", { children: "Event" }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-3 flex items-center gap-1.5 text-right transition-colors duration-150', sortBy === 'trend' ? 'text-ot-foreground' : 'text-ot-muted hover:text-ot-foreground-secondary'), "aria-label": "Sort by trend", "aria-sort": getAriaSort(sortBy, 'trend', sortDirection), "data-testid": "feed-header-trend", onClick: () => handleSortChange('trend'), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-16", children: "Move" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, utils_1.cn)('transition-transform duration-150', sortBy === 'trend' ? 'opacity-100' : 'opacity-0'), children: sortBy === 'trend' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲' })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('ml-auto flex items-center gap-1.5 text-right transition-colors duration-150', sortBy === 'roi' ? 'text-ot-accent' : 'text-ot-muted hover:text-ot-foreground-secondary'), "aria-label": "Sort by ROI", "aria-sort": getAriaSort(sortBy, 'roi', sortDirection), "data-testid": "feed-header-roi", onClick: () => handleSortChange('roi'), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-14", children: "ROI" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: (0, utils_1.cn)('transition-transform duration-150', sortBy === 'roi' ? 'opacity-100' : 'opacity-0'), children: sortBy === 'roi' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲' })] })] }), (0, jsx_runtime_1.jsxs)("div", { ref: scrollContainerRef, className: "relative flex-1 overflow-y-auto outline-none", "data-testid": "feed-scroll-container", tabIndex: totalCount > 0 ? 0 : -1, role: "listbox", "aria-label": "Arbitrage opportunities", "aria-activedescendant": effectiveSelectedId != null ? `feed-row-${effectiveSelectedId}` : undefined, onKeyDown: handleKeyDown, onScroll: handleScroll, children: [totalCount === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-3 text-ot-muted animate-fade-in", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "h-10 w-10 opacity-50", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm", children: "No opportunities yet" }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs opacity-70", children: "Configure a provider to start the feed" })] })), totalCount > 0 && virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { style: { height: totalHeight }, children: (0, jsx_runtime_1.jsx)("div", { className: "absolute left-0 right-0", style: { transform: `translateY(${offsetY}px)` }, children: visibleOpportunities.map((opportunity, index) => {
                                const rowIndex = startIndex + index;
                                const isSelected = opportunity.id === effectiveSelectedId;
                                const isProcessed = processedOpportunityIds.has(opportunity.id);
                                return ((0, jsx_runtime_1.jsx)(FeedRow, { opportunity: opportunity, stalenessNow: effectiveNow, isSelected: isSelected, isProcessed: isProcessed, onSelect: () => handleRowSelect(opportunity.id, rowIndex) }, opportunity.id));
                            }) }) })), totalCount > 0 && !virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { children: visibleOpportunities.map((opportunity, index) => {
                            const isSelected = opportunity.id === effectiveSelectedId;
                            const isProcessed = processedOpportunityIds.has(opportunity.id);
                            return ((0, jsx_runtime_1.jsx)(FeedRow, { opportunity: opportunity, stalenessNow: effectiveNow, isSelected: isSelected, isProcessed: isProcessed, onSelect: () => handleRowSelect(opportunity.id, index) }, opportunity.id));
                        }) }))] })] }));
}
/**
 * Get short display label for provider in badge.
 */
function getProviderBadgeLabel(providerId) {
    if (!providerId)
        return null;
    switch (providerId) {
        case 'odds-api-io':
            return 'OA.io';
        case 'the-odds-api':
            return 'TOA';
        default:
            return providerId.slice(0, 4);
    }
}
/**
 * Get human-friendly display name for provider (used in accessibility labels).
 */
function getProviderDisplayName(providerId) {
    switch (providerId) {
        case 'odds-api-io':
            return 'Odds-API.io';
        case 'the-odds-api':
            return 'The-Odds-API.com';
        default:
            return providerId;
    }
}
function FeedRow({ opportunity, stalenessNow, isSelected, isProcessed, onSelect }) {
    const timeLabel = formatTime(opportunity);
    const eventLabel = opportunity.event.name;
    const roiLabel = formatRoi(opportunity.roi);
    const nowMs = stalenessNow ?? Date.now();
    const { label: stalenessLabel, isStale } = (0, staleness_1.getStalenessInfo)(opportunity, nowMs);
    const combinedTimeLabel = stalenessLabel.length > 0 ? `${timeLabel} · ${stalenessLabel}` : timeLabel;
    // Provider source badge (Story 5.1)
    const providerBadge = getProviderBadgeLabel(opportunity.providerId);
    // Merged provider badge (Story 5.2)
    const isMerged = opportunity.mergedFrom && opportunity.mergedFrom.length > 1;
    const mergedBadgeLabel = isMerged
        ? opportunity.mergedFrom.map(getProviderBadgeLabel).filter(Boolean).join('+')
        : null;
    // Cross-provider badge (Story 5.4)
    const isCrossProvider = opportunity.isCrossProvider === true;
    const isDeepScan = opportunity.source === 'deepScan';
    // Story 6.5: Card rules warning
    const hasCardRulesWarning = opportunity.cardRulesWarning?.mismatch === true;
    const [cardRulesModalOpen, setCardRulesModalOpen] = React.useState(false);
    const openCalculator = (0, calculatorStore_1.useCalculatorStore)((state) => state.openCalculator);
    const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
    const handleContextMenu = (e) => {
        e.preventDefault();
        setContextMenuOpen(true);
    };
    const handleCalculateClick = (e) => {
        e.stopPropagation();
        openCalculator(opportunity);
    };
    const handleContextMenuCalculate = () => {
        openCalculator(opportunity);
        setContextMenuOpen(false);
    };
    const handleCardRulesWarningClick = () => {
        setCardRulesModalOpen(true);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { id: `feed-row-${opportunity.id}`, className: (0, utils_1.cn)('feed-row', isStale && 'stale', isProcessed && 'processed', isSelected && 'selected'), "data-testid": "feed-row", "data-staleness": isStale ? 'stale' : 'fresh', "data-state": isSelected ? 'selected' : 'idle', "data-processed": isProcessed ? 'true' : 'false', "data-provider": opportunity.providerId ?? 'unknown', "data-merged": isMerged ? 'true' : 'false', "data-cross-provider": isCrossProvider ? 'true' : 'false', "data-deep-scan": isDeepScan ? 'true' : 'false', "data-card-rules-warning": hasCardRulesWarning ? 'true' : 'false', onClick: onSelect, onContextMenu: handleContextMenu, role: "option", "aria-selected": isSelected ? 'true' : 'false', children: [(0, jsx_runtime_1.jsx)("div", { className: "w-[72px] shrink-0 text-ot-muted font-mono text-xs", "data-testid": "feed-cell-time", children: combinedTimeLabel }), isProcessed && ((0, jsx_runtime_1.jsx)("div", { className: "mx-1 flex h-5 w-5 items-center justify-center rounded-full bg-ot-success text-white shadow-sm", "data-testid": "feed-row-processed-badge", "aria-label": "Processed", children: (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3", children: (0, jsx_runtime_1.jsx)("polyline", { points: "20 6 9 17 4 12" }) }) })), isCrossProvider && ((0, jsx_runtime_1.jsxs)("div", { className: "ot-badge ot-badge-cross-provider animate-slide-in", "data-testid": "feed-row-cross-provider-badge", "aria-label": "Cross-provider arbitrage combining odds from multiple feeds", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 mr-1", children: (0, jsx_runtime_1.jsx)("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) }), "Cross-Feed"] })), !isCrossProvider && isDeepScan && ((0, jsx_runtime_1.jsxs)("div", { className: "ot-badge ot-badge-deep-scan animate-slide-in", "data-testid": "feed-row-deep-scan-badge", "aria-label": "Deep scan result", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 mr-1", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "8" }), (0, jsx_runtime_1.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), "Deep Scan"] })), !isCrossProvider && !isDeepScan && isMerged && mergedBadgeLabel && ((0, jsx_runtime_1.jsxs)("div", { className: "ot-badge ot-badge-merged", "data-testid": "feed-row-merged-badge", "aria-label": `Merged from: ${opportunity.mergedFrom?.map(id => getProviderDisplayName(id)).join(' + ')}`, children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 mr-1", children: (0, jsx_runtime_1.jsx)("path", { d: "M12 5v14M5 12h14" }) }), mergedBadgeLabel] })), !isCrossProvider && !isDeepScan && !isMerged && providerBadge && ((0, jsx_runtime_1.jsx)("div", { className: "ot-badge ot-badge-provider", "data-testid": "feed-row-provider-badge", "aria-label": `Source: ${opportunity.providerId}`, children: providerBadge })), hasCardRulesWarning && opportunity.cardRulesWarning && ((0, jsx_runtime_1.jsx)("div", { className: "mx-1", "data-testid": "feed-row-card-rules-warning", children: (0, jsx_runtime_1.jsx)(CardRulesWarningIcon_1.CardRulesWarningIcon, { warning: opportunity.cardRulesWarning, onClick: handleCardRulesWarningClick }) })), (0, jsx_runtime_1.jsx)("div", { className: "mx-2 min-w-0 flex-1 truncate text-ot-foreground font-medium", "data-testid": "feed-cell-event", title: eventLabel, children: eventLabel }), (0, jsx_runtime_1.jsx)("div", { className: "w-[64px] shrink-0 text-right", "data-testid": "feed-cell-trend", "aria-label": `Odds trend: ${getTrendIndicator(opportunity.oddsTrend).label}`, children: (0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold transition-all duration-200', getTrendIndicator(opportunity.oddsTrend).colorClass, opportunity.oddsTrend === 'improving' && 'bg-ot-success-dim', opportunity.oddsTrend === 'worsening' && 'bg-ot-error-dim', opportunity.oddsTrend === 'stable' && 'bg-ot-surface-hover'), children: getTrendIndicator(opportunity.oddsTrend).icon }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-[64px] shrink-0 text-right font-mono font-bold text-ot-accent text-sm", "data-testid": "feed-cell-roi", children: roiLabel }), (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('absolute right-[70px] top-1/2 -translate-y-1/2 opacity-0 transition-opacity', (isSelected || contextMenuOpen) && 'opacity-100', 'group-hover:opacity-100'), children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "primary", size: "sm", onClick: handleCalculateClick, className: "h-7 px-3 text-[10px] font-semibold shadow-ot-glow", "data-testid": "calculate-stakes-button", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 mr-1", children: [(0, jsx_runtime_1.jsx)("rect", { x: "4", y: "2", width: "16", height: "20", rx: "2" }), (0, jsx_runtime_1.jsx)("line", { x1: "8", y1: "6", x2: "16", y2: "6" }), (0, jsx_runtime_1.jsx)("line", { x1: "16", y1: "14", x2: "16", y2: "14.01" }), (0, jsx_runtime_1.jsx)("path", { d: "M8 14h.01" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 14h.01" }), (0, jsx_runtime_1.jsx)("path", { d: "M8 18h.01" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 18h.01" })] }), "Calc"] }) }), contextMenuOpen && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-40", onClick: () => setContextMenuOpen(false) }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute right-2 top-full z-50 mt-1 w-44 rounded-lg border border-ot-border bg-ot-surface-elevated py-1 shadow-ot-lg animate-slide-in", "data-testid": "context-menu", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleContextMenuCalculate, className: "w-full px-3 py-2 text-left text-xs text-ot-foreground hover:bg-ot-surface-hover flex items-center gap-2 transition-colors", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 text-ot-accent", children: [(0, jsx_runtime_1.jsx)("rect", { x: "4", y: "2", width: "16", height: "20", rx: "2" }), (0, jsx_runtime_1.jsx)("line", { x1: "8", y1: "6", x2: "16", y2: "6" }), (0, jsx_runtime_1.jsx)("line", { x1: "16", y1: "14", x2: "16", y2: "14.01" }), (0, jsx_runtime_1.jsx)("path", { d: "M8 14h.01" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 14h.01" })] }), "Calculate Stakes"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                                    onSelect();
                                    void (0, copyAndAdvance_1.copyAndAdvanceCurrentOpportunity)();
                                    setContextMenuOpen(false);
                                }, className: "w-full px-3 py-2 text-left text-xs text-ot-foreground hover:bg-ot-surface-hover flex items-center gap-2 transition-colors", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 text-ot-success", children: [(0, jsx_runtime_1.jsx)("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }), "Copy Signal"] })] })] })), (0, jsx_runtime_1.jsx)(CardRulesWarningModal_1.CardRulesWarningModal, { warning: opportunity.cardRulesWarning ?? null, isOpen: cardRulesModalOpen, onClose: () => setCardRulesModalOpen(false) })] }));
}
exports.default = FeedTable;
