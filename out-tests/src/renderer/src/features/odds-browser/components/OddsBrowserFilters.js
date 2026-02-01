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
exports.OddsBrowserFilters = OddsBrowserFilters;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const FilterDropdown_1 = require("../../../components/ui/FilterDropdown");
const input_1 = require("../../../components/ui/input");
const utils_1 = require("../../../lib/utils");
// Collapsible section icons
const ChevronDown = ({ className }) => ((0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: (0, jsx_runtime_1.jsx)("path", { d: "m6 9 6 6 6-6" }) }));
const Search = ({ className }) => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "8" }), (0, jsx_runtime_1.jsx)("path", { d: "m21 21-4.3-4.3" })] }));
const Filter = ({ className }) => ((0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: (0, jsx_runtime_1.jsx)("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
const RotateCcw = ({ className }) => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: [(0, jsx_runtime_1.jsx)("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), (0, jsx_runtime_1.jsx)("path", { d: "M3 3v5h5" })] }));
function OddsBrowserFilters({ filters, availableSports, availableLeagues, availableMarketTypes, availableBookmakers, onSportsChange, onLeaguesChange, onSearchChange, onMarketTypesChange, onBookmakersChange, onClearAll }) {
    const { selectedSports, selectedLeagues, searchQuery, selectedMarketTypes, selectedBookmakers } = filters;
    // Collapsible section states
    const [expandedSections, setExpandedSections] = React.useState(() => new Set(['sports']));
    const toggleSection = (section) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            }
            else {
                next.add(section);
            }
            return next;
        });
    };
    const hasActiveFilters = selectedSports.length > 0 ||
        selectedLeagues.length > 0 ||
        searchQuery.trim().length > 0 ||
        selectedMarketTypes.length > 0 ||
        selectedBookmakers.length > 0;
    const totalActiveFilters = selectedSports.length +
        selectedLeagues.length +
        selectedMarketTypes.length +
        selectedBookmakers.length +
        (searchQuery.trim() ? 1 : 0);
    // Build options from available values
    const sportOptions = availableSports.map((sport) => ({
        value: sport,
        label: sport.charAt(0).toUpperCase() + sport.slice(1)
    }));
    const leagueOptions = availableLeagues.map((league) => ({
        value: league,
        label: league
    }));
    const marketTypeOptions = availableMarketTypes.map((type) => ({
        value: type,
        label: type
    }));
    const bookmakerOptions = availableBookmakers.map((bookmaker) => ({
        value: bookmaker,
        label: bookmaker
    }));
    // Toggle functions for multi-select
    const toggleSport = (sport) => {
        const newSports = selectedSports.includes(sport)
            ? selectedSports.filter((s) => s !== sport)
            : [...selectedSports, sport];
        onSportsChange(newSports);
    };
    const toggleLeague = (league) => {
        const newLeagues = selectedLeagues.includes(league)
            ? selectedLeagues.filter((l) => l !== league)
            : [...selectedLeagues, league];
        onLeaguesChange(newLeagues);
    };
    const toggleMarketType = (type) => {
        const newTypes = selectedMarketTypes.includes(type)
            ? selectedMarketTypes.filter((t) => t !== type)
            : [...selectedMarketTypes, type];
        onMarketTypesChange(newTypes);
    };
    const toggleBookmaker = (bookmaker) => {
        const newBookmakers = selectedBookmakers.includes(bookmaker)
            ? selectedBookmakers.filter((b) => b !== bookmaker)
            : [...selectedBookmakers, bookmaker];
        onBookmakersChange(newBookmakers);
    };
    // Collapsible section component
    const CollapsibleSection = ({ id, title, count, children }) => {
        const isExpanded = expandedSections.has(id);
        return ((0, jsx_runtime_1.jsxs)("div", { className: "border-b border-ot-border/40 last:border-b-0", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggleSection(id), className: (0, utils_1.cn)('flex w-full items-center justify-between px-3 py-2 text-left transition-colors', 'hover:bg-ot-accent/5', isExpanded && 'bg-ot-surface/50'), children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.12em] text-ot-foreground", children: title }), count !== undefined && count > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ot-accent px-1 text-[9px] font-bold text-ot-background", children: count }))] }), (0, jsx_runtime_1.jsx)(ChevronDown, { className: (0, utils_1.cn)('h-3.5 w-3.5 text-ot-muted transition-transform duration-200', isExpanded && 'rotate-180') })] }), (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('overflow-hidden transition-all duration-200', isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'), children: (0, jsx_runtime_1.jsx)("div", { className: "px-3 pb-3", children: children }) })] }));
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "overflow-hidden rounded-lg border border-ot-border bg-gradient-to-b from-ot-surface via-ot-surface/80 to-ot-background shadow-sm", "aria-label": "Odds browser filters", "data-testid": "odds-browser-filters", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-ot-border bg-ot-surface p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(Filter, { className: "h-3.5 w-3.5 text-ot-accent" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-[11px] font-bold uppercase tracking-[0.14em] text-ot-foreground", children: "Filters" }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-full bg-ot-accent/10 px-2 py-0.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-ot-accent" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[9px] font-medium text-ot-accent", children: [totalActiveFilters, " active"] })] }))] }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onClearAll, className: "group flex items-center gap-1.5 rounded-full border border-ot-border px-2.5 py-1 text-[9px] font-medium text-ot-muted transition-all hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400", "data-testid": "odds-browser-filters-clear", children: [(0, jsx_runtime_1.jsx)(RotateCcw, { className: "h-3 w-3 transition-transform group-hover:-rotate-180" }), "Clear"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative mt-3", children: [(0, jsx_runtime_1.jsx)(Search, { className: "absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ot-muted" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "odds-browser-search", type: "text", placeholder: "Search events...", value: searchQuery, onChange: (e) => onSearchChange(e.target.value), className: (0, utils_1.cn)('h-8 w-full pl-8 pr-8 text-[11px]', searchQuery.trim() && 'border-ot-accent/50 bg-ot-accent/5 ring-1 ring-ot-accent/20'), "data-testid": "odds-browser-search" }), searchQuery && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onSearchChange(''), className: "absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ot-muted transition-colors hover:bg-ot-border hover:text-ot-foreground", "aria-label": "Clear search", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3", children: [(0, jsx_runtime_1.jsx)("path", { d: "M18 6 6 18" }), (0, jsx_runtime_1.jsx)("path", { d: "m6 6 12 12" })] }) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "max-h-[400px] overflow-y-auto", children: [sportOptions.length > 0 && ((0, jsx_runtime_1.jsx)(CollapsibleSection, { id: "sports", title: "Sports", count: selectedSports.length, children: (0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "", options: sportOptions, selected: selectedSports, onToggle: toggleSport, testIdPrefix: "odds-browser-sport" }) })), leagueOptions.length > 0 && (selectedSports.length > 0 || leagueOptions.length <= 15) && ((0, jsx_runtime_1.jsx)(CollapsibleSection, { id: "leagues", title: selectedSports.length > 0 ? 'Leagues (filtered)' : 'Leagues', count: selectedLeagues.length, children: (0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "", options: leagueOptions, selected: selectedLeagues, onToggle: toggleLeague, testIdPrefix: "odds-browser-league" }) })), marketTypeOptions.length > 0 && ((0, jsx_runtime_1.jsx)(CollapsibleSection, { id: "markets", title: "Markets", count: selectedMarketTypes.length, children: (0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "", options: marketTypeOptions, selected: selectedMarketTypes, onToggle: toggleMarketType, testIdPrefix: "odds-browser-market" }) })), bookmakerOptions.length > 0 && ((0, jsx_runtime_1.jsx)(CollapsibleSection, { id: "bookmakers", title: "Bookmakers", count: selectedBookmakers.length, children: (0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "", options: bookmakerOptions, selected: selectedBookmakers, onToggle: toggleBookmaker, testIdPrefix: "odds-browser-bookmaker" }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-t border-ot-border/40 bg-ot-surface/30 px-3 py-2 text-[9px] text-ot-muted", children: [(0, jsx_runtime_1.jsxs)("span", { children: [sportOptions.length, " sports"] }), (0, jsx_runtime_1.jsxs)("span", { children: [leagueOptions.length, " leagues"] }), (0, jsx_runtime_1.jsxs)("span", { children: [marketTypeOptions.length, " markets"] }), (0, jsx_runtime_1.jsxs)("span", { children: [bookmakerOptions.length, " books"] })] })] }));
}
exports.default = OddsBrowserFilters;
