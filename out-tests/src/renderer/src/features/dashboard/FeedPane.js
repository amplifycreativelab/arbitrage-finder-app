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
const types_1 = require("../../../../../shared/types");
const input_1 = require("../../components/ui/input");
const utils_1 = require("../../lib/utils");
const StatusBar_1 = __importDefault(require("./StatusBar"));
const staleness_1 = require("./staleness");
function FeedFilters({ totalCount, filteredCount, availableBookmakers }) {
    const [filterState, setFilterState] = React.useState(() => feedFiltersStore_1.useFeedFiltersStore.getState());
    React.useEffect(() => {
        const unsubscribe = feedFiltersStore_1.useFeedFiltersStore.subscribe((nextState) => {
            setFilterState(nextState);
        });
        return () => {
            unsubscribe();
        };
    }, []);
    const { regions, sports, markets, bookmakers, minRoi, toggleRegion, toggleSport, toggleMarket, toggleBookmaker, setMinRoi, resetFilters } = filterState;
    const hasActiveRoi = minRoi > 0;
    const hasNonDefaultRegions = regions.length !== filters_1.ALL_REGION_CODES.length ||
        !filters_1.ALL_REGION_CODES.every((code) => regions.includes(code));
    const hasNonDefaultSports = sports.length !== filters_1.ALL_SPORT_FILTERS.length ||
        !filters_1.ALL_SPORT_FILTERS.every((sport) => sports.includes(sport));
    const hasNonDefaultMarkets = markets.length !== filters_1.ALL_MARKET_FILTERS.length ||
        !filters_1.ALL_MARKET_FILTERS.every((market) => markets.includes(market));
    const hasBookmakerFilters = Array.isArray(bookmakers) && bookmakers.length > 0;
    const hasActiveFilters = hasNonDefaultRegions ||
        hasNonDefaultSports ||
        hasNonDefaultMarkets ||
        hasBookmakerFilters ||
        hasActiveRoi;
    const handleToggleRegion = (region) => {
        toggleRegion(region);
    };
    const handleToggleSport = (sport) => {
        toggleSport(sport);
    };
    const handleToggleMarket = (market) => {
        toggleMarket(market);
    };
    const handleToggleBookmaker = (bookmaker) => {
        toggleBookmaker(bookmaker);
    };
    const handleMinRoiChange = (event) => {
        const value = event.target.value.trim();
        if (!value) {
            setMinRoi(0);
            return;
        }
        const numeric = Number.parseFloat(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            setMinRoi(0);
            return;
        }
        setMinRoi(numeric / 100);
    };
    const minRoiPercent = hasActiveRoi ? (minRoi * 100).toFixed(1) : '';
    const renderFilterChip = (label, active, onClick, testId) => {
        return ((0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, utils_1.cn)('rounded-full border px-2 py-[2px] text-[9px] font-medium', active
                ? 'border-ot-accent bg-ot-accent/20 text-ot-accent'
                : 'border-white/20 text-ot-foreground/60 hover:border-ot-accent/60 hover:text-ot-accent'), "data-testid": testId, "aria-pressed": active ? 'true' : 'false', onClick: onClick, children: label }, testId));
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "mb-2 space-y-2 border-b border-white/10 pb-2 text-[10px]", "aria-label": "Feed filters", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60", children: "Filters" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-ot-foreground/60", children: [filteredCount, " of ", totalCount, " shown"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Region" }), ['AU', 'UK', 'IT', 'RO'].map((code) => renderFilterChip(code, regions.includes(code), () => handleToggleRegion(code), `feed-filters-region-${code}`))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Sport" }), ['soccer', 'tennis'].map((sport) => renderFilterChip(sport === 'soccer' ? 'Soccer' : 'Tennis', sports.includes(sport), () => handleToggleSport(sport), `feed-filters-sport-${sport}`))] }), availableBookmakers.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Bookmaker" }), availableBookmakers.map((name) => renderFilterChip(name, bookmakers.includes(name), () => handleToggleBookmaker(name), `feed-filters-bookmaker-${name.replace(/[^a-zA-Z0-9]/g, '_')}`))] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Market" }), ['moneyline', 'draw-no-bet', 'totals'].map((market) => renderFilterChip(market === 'moneyline'
                                ? 'Moneyline'
                                : market === 'draw-no-bet'
                                    ? 'Draw No Bet'
                                    : 'Totals', markets.includes(market), () => handleToggleMarket(market), `feed-filters-market-${market}`))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Min ROI" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { type: "number", className: "h-6 w-16 px-1 py-0 text-[10px]", value: minRoiPercent, onChange: handleMinRoiChange, placeholder: "0.0", min: "0", step: "0.5", "data-testid": "feed-filters-min-roi" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "%" })] })] })] }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2 text-[10px] text-ot-foreground/60", children: [(0, jsx_runtime_1.jsx)("span", { children: "Active filters applied." }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-[10px] text-ot-accent hover:underline", onClick: () => resetFilters(), "data-testid": "feed-filters-reset", children: "Reset" })] }))] }));
}
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mb-2 space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[10px] text-yellow-100", "data-testid": "provider-failure-banner", "aria-label": "Provider health issues", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold uppercase tracking-[0.14em]", children: "Provider issues" }), (0, jsx_runtime_1.jsx)("ul", { className: "space-y-1", children: problematic.map((entry) => ((0, jsx_runtime_1.jsxs)("li", { className: "leading-snug", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: providerLabelById.get(entry.providerId) ?? entry.providerId }), (0, jsx_runtime_1.jsxs)("span", { className: "mx-1", children: ["- ", entry.status] }), (0, jsx_runtime_1.jsxs)("span", { className: "mx-1", children: ["Last success: ", formatLastSuccess(entry.lastSuccessfulFetchAt, stalenessNow)] }), (0, jsx_runtime_1.jsxs)("span", { className: "block text-[9px] text-yellow-200/90", children: ["Recommended action: ", getProviderRecommendedAction(entry.status)] })] }, entry.providerId))) })] }));
}
function FeedPane() {
    const [feedState, setFeedState] = React.useState(() => feedStore_1.useFeedStore.getState());
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
    const syncSelectionWithVisibleIds = (0, feedStore_1.useFeedStore)((state) => state.syncSelectionWithVisibleIds);
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
        const seen = new Set();
        const result = [];
        const hasRegionFilter = regions.length !== filters_1.ALL_REGION_CODES.length ||
            !filters_1.ALL_REGION_CODES.every((code) => regions.includes(code));
        for (const opportunity of safeOpportunities) {
            const region = (0, filters_1.inferRegionFromOpportunity)(opportunity);
            if (hasRegionFilter) {
                if (!region || !regions.includes(region)) {
                    continue;
                }
            }
            for (const leg of opportunity.legs) {
                const name = leg.bookmaker;
                if (!seen.has(name)) {
                    seen.add(name);
                    result.push(name);
                }
            }
        }
        return result.sort((a, b) => a.localeCompare(b));
    }, [safeOpportunities, regions]);
    const filteredOpportunities = React.useMemo(() => (0, filters_1.applyDashboardFilters)(safeOpportunities, {
        regions,
        sports,
        markets,
        bookmakers,
        minRoi
    }), [safeOpportunities, regions, sports, markets, bookmakers, minRoi]);
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
    let content;
    if (error && noUnderlyingData) {
        content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full items-center justify-center text-[11px] text-red-400", role: "status", "data-testid": "feed-error", children: ["Unable to load opportunities. ", error] }));
    }
    else if (isLoading && !hasUnderlyingData) {
        content = ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-foreground/60", role: "status", "data-testid": "feed-loading", children: "Loading opportunities..." }));
    }
    else if (hasUnderlyingData && filteredCount === 0) {
        content = ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-foreground/60", "data-testid": "feed-empty-filters", children: "No opportunities match the current filters." }));
    }
    else if (noUnderlyingData) {
        if (hasUnhealthyStatus) {
            const lastUpdatedLabel = fetchedAt != null
                ? (0, staleness_1.getStalenessInfo)({ foundAt: fetchedAt }, stalenessNow).label || ''
                : '';
            content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center space-y-1 text-center text-[11px] text-yellow-100", "data-testid": "feed-empty-unhealthy", children: [(0, jsx_runtime_1.jsx)("p", { children: "Data unavailable or stale. System health is degraded." }), (0, jsx_runtime_1.jsxs)("p", { children: ["Current status: ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: systemStatus }), lastUpdatedLabel && ((0, jsx_runtime_1.jsxs)("span", { className: "ml-1 text-[10px] text-yellow-200/90", children: ["(last update ", lastUpdatedLabel, ")"] }))] })] }));
        }
        else {
            const lastUpdatedLabel = fetchedAt != null
                ? (0, staleness_1.getStalenessInfo)({ foundAt: fetchedAt }, stalenessNow).label || ''
                : '';
            content = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center space-y-1 text-center text-[11px] text-ot-foreground/60", "data-testid": "feed-empty-healthy", children: [(0, jsx_runtime_1.jsx)("p", { children: "No current surebets. System and providers are healthy." }), lastUpdatedLabel && ((0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] text-ot-foreground/50", children: ["Last update ", lastUpdatedLabel, "."] }))] }));
        }
    }
    else {
        content = (0, jsx_runtime_1.jsx)(FeedTable_1.FeedTable, { opportunities: filteredOpportunities, stalenessNow: stalenessNow });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", children: [(0, jsx_runtime_1.jsx)(StatusBar_1.default, { stalenessNow: stalenessNow, statusSnapshot: status ?? null, fetchedAt: fetchedAt }), (0, jsx_runtime_1.jsx)(ProviderFailureBanner, { statusSnapshot: status ?? null, stalenessNow: stalenessNow }), (0, jsx_runtime_1.jsx)(FeedFilters, { totalCount: totalCount, filteredCount: filteredCount, availableBookmakers: availableBookmakersForRegions }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: content })] }));
}
exports.default = FeedPane;
