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
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const feedStore_1 = require("./stores/feedStore");
const FeedTable_1 = require("./FeedTable");
const filters_1 = require("./filters");
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
const useStalenessTicker_1 = require("./useStalenessTicker");
const useAutoRefresh_1 = require("./hooks/useAutoRefresh");
const types_1 = require("../../../../../shared/types");
const StatusBar_1 = __importDefault(require("./StatusBar"));
const staleness_1 = require("./staleness");
const FilterBar_1 = require("./FilterBar");
function getProviderRecommendedAction(status) {
    switch (status) {
        case 'QuotaLimited':
            return 'Quota reached or approaching; reduce polling frequency or check API quota dashboard.';
        case 'Degraded':
            return 'Provider responding slowly or with partial failures; inspect logs and consider temporary fallbacks.';
        case 'ConfigMissing':
            return 'Config missing: set or update API key in Provider Settings.';
        case 'Down':
            return 'Provider is unreachable or failing; check provider status page and network connectivity.';
        case 'OK':
        default:
            return 'No action required.';
    }
}
function formatLastSuccess(timestamp, stalenessNow) {
    if (!timestamp) {
        return 'No successful fetch yet';
    }
    const info = (0, staleness_1.getStalenessInfo)({ foundAt: timestamp }, stalenessNow);
    return info.label ? `${info.label}` : 'Just now';
}
function ProviderFailureBanner({ statusSnapshot, stalenessNow }) {
    if (!statusSnapshot?.providers?.length) {
        return null;
    }
    const problematic = statusSnapshot.providers.filter((entry) => ['Down', 'QuotaLimited', 'ConfigMissing'].includes(entry.status));
    if (problematic.length === 0) {
        return null;
    }
    const providerLabelById = new Map(types_1.PROVIDERS.map((provider) => [provider.id, provider.displayName]));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3 space-y-1 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-3 text-[10px] text-amber-100", "data-testid": "provider-failure-banner", "aria-label": "Provider health issues", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 text-amber-400", children: [(0, jsx_runtime_1.jsx)("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })] }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold uppercase tracking-[0.14em]", children: "Provider Issues" })] }), (0, jsx_runtime_1.jsx)("ul", { className: "mt-2 space-y-1.5 pl-6", children: problematic.map((entry) => ((0, jsx_runtime_1.jsxs)("li", { className: "leading-snug", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-amber-200", children: providerLabelById.get(entry.providerId) ?? entry.providerId }), (0, jsx_runtime_1.jsx)("span", { className: "mx-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium", children: entry.status }), (0, jsx_runtime_1.jsxs)("span", { className: "text-amber-100/70", children: ["\u00B7 Last success: ", formatLastSuccess(entry.lastSuccessfulFetchAt, stalenessNow)] }), (0, jsx_runtime_1.jsxs)("span", { className: "mt-0.5 block text-[9px] text-amber-200/70", children: ["\u2192 ", getProviderRecommendedAction(entry.status)] })] }, entry.providerId))) })] }));
}
/**
 * Apply source filtering to opportunities
 */
function applySourceFilter(opportunities, sourceFilter) {
    if (sourceFilter === 'all') {
        return opportunities;
    }
    return opportunities.filter((opp) => {
        switch (sourceFilter) {
            case 'live':
                return opp.source !== 'deepScan';
            case 'deepScan':
                return opp.source === 'deepScan';
            case 'crossProvider':
                return opp.isCrossProvider === true;
            default:
                return true;
        }
    });
}
/**
 * Parse sort option into key and direction
 */
function parseSortOption(sortOption) {
    const [key, direction] = sortOption.split('-');
    return { key, direction };
}
function FeedPane() {
    const [feedState, setFeedState] = React.useState(() => feedStore_1.useFeedStore.getState());
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
    const syncSelectionWithVisibleIds = (0, feedStore_1.useFeedStore)((state) => state.syncSelectionWithVisibleIds);
    // Local filter state
    const [sourceFilter, setSourceFilter] = React.useState('all');
    const [sortOption, setSortOption] = React.useState('roi-desc');
    // Enable auto-refresh polling
    (0, useAutoRefresh_1.useAutoRefresh)();
    React.useEffect(() => {
        const unsubscribe = feedStore_1.useFeedStore.subscribe((nextState) => {
            setFeedState(nextState);
        });
        return () => {
            unsubscribe();
        };
    }, []);
    const { opportunities, fetchedAt, isLoading, error, status } = feedState;
    const [filterStateForTable, setFilterStateForTable] = React.useState(() => feedFiltersStore_1.useFeedFiltersStore.getState());
    React.useEffect(() => {
        const unsubscribeFilters = feedFiltersStore_1.useFeedFiltersStore.subscribe((nextState) => {
            setFilterStateForTable(nextState);
        });
        return () => {
            unsubscribeFilters();
        };
    }, []);
    const { regions, sports, markets, bookmakers, minRoi } = filterStateForTable;
    const stalenessNow = (0, useStalenessTicker_1.useStalenessTicker)();
    React.useEffect(() => {
        void refreshSnapshot();
    }, [refreshSnapshot]);
    const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
    const availableBookmakersForRegions = React.useMemo(() => {
        return (0, filters_1.getAvailableBookmakers)(safeOpportunities, regions);
    }, [safeOpportunities, regions]);
    // Apply dashboard filters first
    const dashboardFiltered = React.useMemo(() => (0, filters_1.applyDashboardFilters)(safeOpportunities, {
        regions,
        sports,
        markets,
        bookmakers,
        minRoi
    }), [safeOpportunities, regions, sports, markets, bookmakers, minRoi]);
    // Then apply source filter
    const filteredOpportunities = React.useMemo(() => applySourceFilter(dashboardFiltered, sourceFilter), [dashboardFiltered, sourceFilter]);
    React.useEffect(() => {
        const visibleIds = Array.isArray(filteredOpportunities)
            ? filteredOpportunities.map((opportunity) => opportunity.id)
            : [];
        syncSelectionWithVisibleIds(visibleIds);
    }, [filteredOpportunities, syncSelectionWithVisibleIds]);
    const totalCount = safeOpportunities.length;
    const filteredCount = Array.isArray(filteredOpportunities)
        ? filteredOpportunities.length
        : 0;
    const hasUnderlyingData = totalCount > 0;
    const noUnderlyingData = !hasUnderlyingData;
    const systemStatus = status?.systemStatus ?? 'OK';
    const hasUnhealthyProvider = status?.providers?.some((entry) => ['Degraded', 'Down', 'QuotaLimited', 'ConfigMissing'].includes(entry.status)) ?? false;
    const isSystemUnhealthy = systemStatus === 'Degraded' || systemStatus === 'Error' || systemStatus === 'Stale';
    const hasUnhealthyStatus = hasUnhealthyProvider || isSystemUnhealthy;
    // Parse sort option for FeedTable
    const { key: sortBy, direction: sortDirection } = parseSortOption(sortOption);
    let content;
    if (error && noUnderlyingData) {
        content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-red-300/30 bg-red-50/50 p-6 text-center", role: "status", "data-testid": "feed-error", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-red-400", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-[12px] font-medium text-red-600", children: "Unable to load opportunities" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] text-red-500/80", children: error })] }));
    }
    else if (isLoading && !hasUnderlyingData) {
        content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-3 p-6", role: "status", "data-testid": "feed-loading", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-ot-border border-t-ot-accent" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] text-ot-muted", children: "Loading opportunities..." })] }));
    }
    else if (hasUnderlyingData && filteredCount === 0) {
        content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-ot-border/60 bg-ot-surface p-6 text-center", "data-testid": "feed-empty-filters", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-ot-muted", children: (0, jsx_runtime_1.jsx)("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }), (0, jsx_runtime_1.jsx)("div", { className: "text-[12px] font-medium text-ot-foreground", children: "No matches found" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-ot-muted", children: [totalCount, " opportunities available, but none match current filters"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "mt-2 rounded-md border border-ot-accent/30 bg-ot-accent/10 px-3 py-1.5 text-[10px] font-medium text-ot-accent transition-colors hover:bg-ot-accent/20", onClick: () => feedFiltersStore_1.useFeedFiltersStore.getState().resetFilters(), children: "Reset All Filters" })] }));
    }
    else if (noUnderlyingData) {
        if (hasUnhealthyStatus) {
            const lastUpdatedLabel = fetchedAt != null
                ? (0, staleness_1.getStalenessInfo)({ foundAt: fetchedAt }, stalenessNow).label || ''
                : '';
            content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-amber-400/30 bg-amber-50/50 p-6 text-center", "data-testid": "feed-empty-unhealthy", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-amber-500", children: [(0, jsx_runtime_1.jsx)("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-[12px] font-medium text-amber-700", children: "System Health Degraded" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-amber-600/80", children: ["Status: ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: systemStatus }), lastUpdatedLabel && ((0, jsx_runtime_1.jsxs)("span", { className: "ml-1", children: ["\u00B7 Last update ", lastUpdatedLabel] }))] })] }));
        }
        else {
            const lastUpdatedLabel = fetchedAt != null
                ? (0, staleness_1.getStalenessInfo)({ foundAt: fetchedAt }, stalenessNow).label || ''
                : '';
            content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-emerald-300/30 bg-emerald-50/30 p-6 text-center", "data-testid": "feed-empty-healthy", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-emerald-500", children: [(0, jsx_runtime_1.jsx)("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), (0, jsx_runtime_1.jsx)("polyline", { points: "22 4 12 14.01 9 11.01" })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-[12px] font-medium text-emerald-700", children: "All Systems Healthy" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] text-ot-muted", children: "No arbitrage opportunities detected at this time" }), lastUpdatedLabel && ((0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] text-ot-muted/70", children: ["Last checked ", lastUpdatedLabel] }))] }));
        }
    }
    else {
        content = ((0, jsx_runtime_1.jsx)(FeedTable_1.FeedTable, { opportunities: filteredOpportunities, stalenessNow: stalenessNow, initialSortBy: sortBy, initialSortDirection: sortDirection }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col gap-3", children: [(0, jsx_runtime_1.jsx)(StatusBar_1.default, { stalenessNow: stalenessNow, statusSnapshot: status ?? null, fetchedAt: fetchedAt }), (0, jsx_runtime_1.jsx)(ProviderFailureBanner, { statusSnapshot: status ?? null, stalenessNow: stalenessNow }), (0, jsx_runtime_1.jsx)(FilterBar_1.FilterBar, { totalCount: totalCount, filteredCount: filteredCount, availableBookmakers: availableBookmakersForRegions, sourceFilter: sourceFilter, onSourceFilterChange: setSourceFilter, sortBy: sortOption, onSortChange: setSortOption }), (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 flex-1 overflow-hidden rounded-lg border border-ot-border bg-ot-surface p-3", children: content })] }));
}
exports.default = FeedPane;
