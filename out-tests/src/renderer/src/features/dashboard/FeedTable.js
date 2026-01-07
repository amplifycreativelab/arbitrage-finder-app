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
const utils_1 = require("../../lib/utils");
const copyAndAdvance_1 = require("./copyAndAdvance");
const sortOpportunities_1 = require("./sortOpportunities");
const feedStore_1 = require("./stores/feedStore");
const staleness_1 = require("./staleness");
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
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", "data-testid": "feed-table", "data-virtualized": virtualizationEnabled ? 'true' : 'false', children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center border-b border-white/10 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-3 flex items-center gap-1 text-left', sortBy === 'time' ? 'text-ot-foreground' : 'text-ot-foreground/70'), "aria-label": "Sort by time", "aria-sort": getAriaSort(sortBy, 'time', sortDirection), "data-testid": "feed-header-time", onClick: () => handleSortChange('time'), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-12", children: "Time" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortBy === 'time' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, utils_1.cn)('mr-3 flex flex-1 items-center gap-1 text-left', sortBy === 'time' ? 'text-ot-foreground' : 'text-ot-foreground/70'), "aria-disabled": "true", "data-testid": "feed-header-event", children: (0, jsx_runtime_1.jsx)("span", { children: "Event" }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('ml-auto flex items-center gap-1 text-right', sortBy === 'roi' ? 'text-ot-foreground' : 'text-ot-foreground/70'), "aria-label": "Sort by ROI", "aria-sort": getAriaSort(sortBy, 'roi', sortDirection), "data-testid": "feed-header-roi", onClick: () => handleSortChange('roi'), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-14", children: "ROI" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortBy === 'roi' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] })] }), (0, jsx_runtime_1.jsxs)("div", { ref: scrollContainerRef, className: "relative flex-1 overflow-y-auto outline-none", "data-testid": "feed-scroll-container", tabIndex: totalCount > 0 ? 0 : -1, role: "listbox", "aria-label": "Arbitrage opportunities", "aria-activedescendant": effectiveSelectedId != null ? `feed-row-${effectiveSelectedId}` : undefined, onKeyDown: handleKeyDown, onScroll: handleScroll, children: [totalCount === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-foreground/50", children: "No opportunities yet. Configure a provider to start the feed." })), totalCount > 0 && virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { style: { height: totalHeight }, children: (0, jsx_runtime_1.jsx)("div", { className: "absolute left-0 right-0", style: { transform: `translateY(${offsetY}px)` }, children: visibleOpportunities.map((opportunity, index) => {
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
function FeedRow({ opportunity, stalenessNow, isSelected, isProcessed, onSelect }) {
    const timeLabel = formatTime(opportunity);
    const eventLabel = opportunity.event.name;
    const roiLabel = formatRoi(opportunity.roi);
    const nowMs = stalenessNow ?? Date.now();
    const { label: stalenessLabel, isStale } = (0, staleness_1.getStalenessInfo)(opportunity, nowMs);
    const combinedTimeLabel = stalenessLabel.length > 0 ? `${timeLabel} · ${stalenessLabel}` : timeLabel;
    // Provider source badge (Story 5.1)
    const providerBadge = getProviderBadgeLabel(opportunity.providerId);
    return ((0, jsx_runtime_1.jsxs)("div", { id: `feed-row-${opportunity.id}`, className: (0, utils_1.cn)('flex cursor-pointer items-center justify-between border-b border-white/5 py-1.5 text-[11px]', isStale || isProcessed ? 'opacity-50' : '', isSelected ? 'bg-ot-accent/10' : 'hover:bg-white/5'), "data-testid": "feed-row", "data-staleness": isStale ? 'stale' : 'fresh', "data-state": isSelected ? 'selected' : 'idle', "data-processed": isProcessed ? 'true' : 'false', "data-provider": opportunity.providerId ?? 'unknown', onClick: onSelect, role: "option", "aria-selected": isSelected ? 'true' : 'false', children: [(0, jsx_runtime_1.jsx)("div", { className: "w-[72px] shrink-0 text-ot-foreground/70", "data-testid": "feed-cell-time", children: combinedTimeLabel }), isProcessed && ((0, jsx_runtime_1.jsx)("div", { className: "mx-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/80 text-[9px] font-semibold text-black", "data-testid": "feed-row-processed-badge", "aria-label": "Processed", children: "\u2713" })), providerBadge && ((0, jsx_runtime_1.jsx)("div", { className: "mx-1 rounded-full border border-ot-accent/30 bg-ot-accent/10 px-1.5 py-0.5 text-[8px] font-medium text-ot-accent/80", "data-testid": "feed-row-provider-badge", "aria-label": `Source: ${opportunity.providerId}`, children: providerBadge })), (0, jsx_runtime_1.jsx)("div", { className: "mx-2 min-w-0 flex-1 truncate text-ot-foreground", "data-testid": "feed-cell-event", title: eventLabel, children: eventLabel }), (0, jsx_runtime_1.jsx)("div", { className: "w-[64px] shrink-0 text-right font-semibold text-ot-accent", "data-testid": "feed-cell-roi", children: roiLabel })] }));
}
exports.default = FeedTable;
