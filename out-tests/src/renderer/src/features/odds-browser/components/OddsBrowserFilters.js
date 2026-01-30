"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OddsBrowserFilters = OddsBrowserFilters;
const jsx_runtime_1 = require("react/jsx-runtime");
const FilterDropdown_1 = require("../../../components/ui/FilterDropdown");
const input_1 = require("../../../components/ui/input");
const utils_1 = require("../../../lib/utils");
function OddsBrowserFilters({ filters, availableSports, availableLeagues, availableMarketTypes, availableBookmakers, onSportsChange, onLeaguesChange, onSearchChange, onMarketTypesChange, onBookmakersChange, onClearAll }) {
    const { selectedSports, selectedLeagues, searchQuery, selectedMarketTypes, selectedBookmakers } = filters;
    const hasActiveFilters = selectedSports.length > 0 ||
        selectedLeagues.length > 0 ||
        searchQuery.trim().length > 0 ||
        selectedMarketTypes.length > 0 ||
        selectedBookmakers.length > 0;
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
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-lg border border-ot-border bg-gradient-to-b from-ot-surface to-ot-background p-3", "aria-label": "Odds browser filters", "data-testid": "odds-browser-filters", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-3 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-[11px] font-bold uppercase tracking-[0.16em] text-ot-foreground", children: "Filters" }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onClearAll, className: "group flex items-center gap-1 rounded-full border border-ot-border px-2 py-0.5 text-[9px] font-medium text-ot-muted transition-all hover:border-red-300/50 hover:bg-red-50 hover:text-red-500", "data-testid": "odds-browser-filters-clear", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 transition-transform group-hover:rotate-180", children: [(0, jsx_runtime_1.jsx)("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), (0, jsx_runtime_1.jsx)("path", { d: "M3 3v5h5" })] }), "Clear All"] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-3", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "odds-browser-search", className: "mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: "Search Events" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { id: "odds-browser-search", type: "text", placeholder: "Team name...", value: searchQuery, onChange: (e) => onSearchChange(e.target.value), className: (0, utils_1.cn)('h-8 w-full px-3 text-[11px]', searchQuery.trim() && 'border-ot-accent/50 bg-ot-accent/5'), "data-testid": "odds-browser-search" }), searchQuery && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onSearchChange(''), className: "absolute right-2 top-1/2 -translate-y-1/2 text-ot-muted hover:text-ot-foreground", "aria-label": "Clear search", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4", children: [(0, jsx_runtime_1.jsx)("path", { d: "M18 6 6 18" }), (0, jsx_runtime_1.jsx)("path", { d: "m6 6 12 12" })] }) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [sportOptions.length > 0 && ((0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "Sports", options: sportOptions, selected: selectedSports, onToggle: toggleSport, testIdPrefix: "odds-browser-sport" })), leagueOptions.length > 0 && (selectedSports.length > 0 || leagueOptions.length <= 10) && ((0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: selectedSports.length > 0 ? 'Leagues (filtered by sport)' : 'Leagues', options: leagueOptions, selected: selectedLeagues, onToggle: toggleLeague, testIdPrefix: "odds-browser-league" })), marketTypeOptions.length > 0 && ((0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "Market Types", options: marketTypeOptions, selected: selectedMarketTypes, onToggle: toggleMarketType, testIdPrefix: "odds-browser-market" })), bookmakerOptions.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-ot-border/60 pt-3", children: (0, jsx_runtime_1.jsx)(FilterDropdown_1.MultiFilterChipGroup, { label: "Bookmakers", options: bookmakerOptions, selected: selectedBookmakers, onToggle: toggleBookmaker, testIdPrefix: "odds-browser-bookmaker" }) }))] }), hasActiveFilters && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex items-center gap-2 rounded-md bg-ot-accent/5 px-2 py-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-ot-accent" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[9px] font-medium text-ot-accent", children: [selectedSports.length +
                                selectedLeagues.length +
                                selectedMarketTypes.length +
                                selectedBookmakers.length +
                                (searchQuery.trim() ? 1 : 0), ' ', "filter(s) active"] })] }))] }));
}
exports.default = OddsBrowserFilters;
