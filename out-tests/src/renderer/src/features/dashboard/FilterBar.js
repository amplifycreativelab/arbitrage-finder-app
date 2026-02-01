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
exports.SORT_OPTIONS = exports.SOURCE_OPTIONS = void 0;
exports.FilterBar = FilterBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
const MarketFilterPopover_1 = require("./MarketFilterPopover");
const BookmakerFilterPopover_1 = require("./BookmakerFilterPopover");
const FilterDropdown_1 = require("../../components/ui/FilterDropdown");
const input_1 = require("../../components/ui/input");
const utils_1 = require("../../lib/utils");
const filters_1 = require("./filters");
// Source/Provider filter options
const SOURCE_OPTIONS = [
    { value: 'all', label: 'All Sources' },
    { value: 'live', label: 'Live Feed Only' },
    { value: 'deepScan', label: 'Deep Scan Only' },
    { value: 'crossProvider', label: 'Cross-Provider Only' }
];
exports.SOURCE_OPTIONS = SOURCE_OPTIONS;
// Region display options
const REGION_OPTIONS = [
    { value: 'AU', label: 'AU', description: 'Australia' },
    { value: 'UK', label: 'UK', description: 'United Kingdom' },
    { value: 'IT', label: 'IT', description: 'Italy' },
    { value: 'RO', label: 'RO', description: 'Romania' }
];
// Sport display options
const SPORT_OPTIONS = [
    { value: 'soccer', label: 'Soccer', icon: '⚽' },
    { value: 'tennis', label: 'Tennis', icon: '🎾' }
];
// Sort options for the feed
const SORT_OPTIONS = [
    { value: 'time-asc', label: 'Time (earliest first)' },
    { value: 'time-desc', label: 'Time (latest first)' },
    { value: 'roi-desc', label: 'ROI (highest first)' },
    { value: 'roi-asc', label: 'ROI (lowest first)' }
];
exports.SORT_OPTIONS = SORT_OPTIONS;
function FilterBar({ totalCount, filteredCount, availableBookmakers, sourceFilter, onSourceFilterChange, sortBy, onSortChange, onSettingsClick }) {
    const [filterState, setFilterState] = React.useState(() => feedFiltersStore_1.useFeedFiltersStore.getState());
    React.useEffect(() => {
        const unsubscribe = feedFiltersStore_1.useFeedFiltersStore.subscribe((nextState) => {
            setFilterState(nextState);
        });
        return () => {
            unsubscribe();
        };
    }, []);
    const { regions, sports, marketGroups, bookmakers, minRoi, toggleRegion, toggleSport, setMinRoi, resetFilters } = filterState;
    const hasActiveRoi = minRoi > 0;
    const hasActiveSource = sourceFilter !== 'all';
    const hasNonDefaultRegions = regions.length !== filters_1.ALL_REGION_CODES.length ||
        !filters_1.ALL_REGION_CODES.every((code) => regions.includes(code));
    const hasNonDefaultSports = sports.length !== filters_1.ALL_SPORT_FILTERS.length ||
        !filters_1.ALL_SPORT_FILTERS.every((sport) => sports.includes(sport));
    const hasNonDefaultMarkets = (marketGroups?.length ?? filters_1.ALL_MARKET_GROUPS.length) !== filters_1.ALL_MARKET_GROUPS.length ||
        !(marketGroups ?? filters_1.ALL_MARKET_GROUPS).every((group) => filters_1.ALL_MARKET_GROUPS.includes(group));
    const hasBookmakerFilters = Array.isArray(bookmakers) && bookmakers.length > 0;
    const hasActiveFilters = hasNonDefaultRegions ||
        hasNonDefaultSports ||
        hasNonDefaultMarkets ||
        hasBookmakerFilters ||
        hasActiveRoi ||
        hasActiveSource;
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
    const handleReset = () => {
        resetFilters();
        onSourceFilterChange('all');
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "ot-card p-4 animate-fade-in", "aria-label": "Feed filters", "data-testid": "filter-bar", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-3 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-xs font-bold uppercase tracking-wider text-ot-foreground flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 text-ot-accent", children: (0, jsx_runtime_1.jsx)("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }), "Filters"] }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded-full bg-ot-accent-subtle px-2.5 py-1 text-xs font-bold text-ot-accent border border-ot-accent/20", children: [filteredCount, " / ", totalCount] })] }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleReset, className: "ot-btn ot-btn-ghost ot-btn-sm group text-ot-error hover:text-ot-error hover:bg-ot-error-dim", "data-testid": "filter-bar-reset", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3.5 w-3.5 transition-transform group-hover:-rotate-180 duration-300", children: [(0, jsx_runtime_1.jsx)("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), (0, jsx_runtime_1.jsx)("path", { d: "M3 3v5h5" })] }), "Reset All"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-end gap-4", children: [(0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "Region", options: REGION_OPTIONS, selected: regions, onToggle: (value) => toggleRegion(value), testIdPrefix: "filter-region" }), (0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "Sport", options: SPORT_OPTIONS, selected: sports, onToggle: (value) => toggleSport(value), testIdPrefix: "filter-sport" }), (0, jsx_runtime_1.jsx)("div", { className: "ml-auto", children: (0, jsx_runtime_1.jsx)(FilterDropdown_1.FilterDropdown, { label: "Sort By", options: SORT_OPTIONS, value: sortBy, onChange: onSortChange, testId: "filter-sort-by" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-end gap-3 border-t border-ot-border-subtle pt-3", children: [(0, jsx_runtime_1.jsx)(FilterDropdown_1.FilterDropdown, { label: "Source", options: SOURCE_OPTIONS, value: sourceFilter, onChange: onSourceFilterChange, testId: "filter-source" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: "Market" }), (0, jsx_runtime_1.jsx)(MarketFilterPopover_1.MarketFilterPopover, {})] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: "Bookmaker" }), (0, jsx_runtime_1.jsx)(BookmakerFilterPopover_1.BookmakerFilterPopover, { availableBookmakers: availableBookmakers })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "min-roi-input", className: "text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: "Min ROI" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { id: "min-roi-input", type: "number", className: (0, utils_1.cn)('h-8 w-20 px-2.5 text-[11px]', hasActiveRoi && 'border-ot-accent/50 bg-ot-accent/5'), value: minRoiPercent, onChange: handleMinRoiChange, placeholder: "0.0", min: "0", step: "0.5", "data-testid": "filter-min-roi" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-medium text-ot-muted", children: "%" })] })] }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 rounded-full bg-ot-accent-subtle px-3 py-1.5 border border-ot-accent/20 animate-pulse-live", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-2 w-2 rounded-full bg-ot-accent" }), (0, jsx_runtime_1.jsx)("span", { className: "text-xs font-semibold text-ot-accent", children: "Filters Active" })] })), onSettingsClick && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onSettingsClick, className: "ot-btn ot-btn-secondary ot-btn-sm ml-auto", "data-testid": "settings-shortcut", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3.5 w-3.5", children: [(0, jsx_runtime_1.jsx)("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0-2-2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), (0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "3" })] }), "Settings"] }))] })] })] }));
}
exports.default = FilterBar;
