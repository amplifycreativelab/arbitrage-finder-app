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
exports.MarketFilterPopover = MarketFilterPopover;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const popover_1 = require("../../components/ui/popover");
const command_1 = require("../../components/ui/command");
const checkbox_1 = require("../../components/ui/checkbox");
const badge_1 = require("../../components/ui/badge");
const utils_1 = require("../../lib/utils");
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
const filters_1 = require("./filters");
const types_1 = require("../../../../../shared/types");
/**
 * Market filter popover component for Story 6.2.
 * Provides a searchable, grouped interface for filtering markets.
 */
function MarketFilterPopover() {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    // Store access
    const marketGroups = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.marketGroups ?? filters_1.ALL_MARKET_GROUPS);
    const toggleMarketGroup = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.toggleMarketGroup);
    const setMarketGroups = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setMarketGroups);
    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.toLowerCase().trim());
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    // Filter groups based on search
    const filteredGroups = React.useMemo(() => {
        if (!debouncedSearch) {
            return types_1.MARKET_GROUP_DISPLAYS;
        }
        return types_1.MARKET_GROUP_DISPLAYS.filter((display) => {
            const matchesLabel = display.label.toLowerCase().includes(debouncedSearch);
            const matchesDescription = display.description.toLowerCase().includes(debouncedSearch);
            const matchesGroup = display.group.toLowerCase().includes(debouncedSearch);
            return matchesLabel || matchesDescription || matchesGroup;
        });
    }, [debouncedSearch]);
    // Count selected groups
    const selectedCount = marketGroups.length;
    const totalCount = filters_1.ALL_MARKET_GROUPS.length;
    const allSelected = selectedCount === totalCount;
    // Handlers
    const handleSelectAll = () => {
        setMarketGroups([...filters_1.ALL_MARKET_GROUPS]);
    };
    const handleClearAll = () => {
        setMarketGroups([]);
    };
    const handleToggleGroup = (group) => {
        toggleMarketGroup(group);
    };
    const isGroupSelected = (group) => {
        return marketGroups.includes(group);
    };
    // Get display chips for selected groups (max 3 visible)
    const MAX_VISIBLE_CHIPS = 3;
    const visibleGroups = types_1.MARKET_GROUP_DISPLAYS.filter((d) => marketGroups.includes(d.group)).slice(0, MAX_VISIBLE_CHIPS);
    const hiddenCount = Math.max(0, selectedCount - MAX_VISIBLE_CHIPS);
    // Summary text for trigger
    const getSummaryText = () => {
        if (selectedCount === 0) {
            return 'No markets';
        }
        if (allSelected) {
            return 'All markets';
        }
        return `${selectedCount} of ${totalCount} groups`;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsxs)(popover_1.Popover, { open: open, onOpenChange: setOpen, children: [(0, jsx_runtime_1.jsx)(popover_1.PopoverTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "combobox", "aria-expanded": open, "aria-haspopup": "listbox", "aria-label": "Select market groups", className: (0, utils_1.cn)('flex h-7 w-full items-center justify-between rounded-md border px-2 py-1 text-[10px]', 'border-white/20 bg-transparent text-ot-foreground/80', 'hover:border-ot-accent/60 hover:text-ot-accent', 'focus:outline-none focus:ring-1 focus:ring-ot-accent', open && 'border-ot-accent text-ot-accent'), "data-testid": "market-filter-trigger", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 opacity-60", children: [(0, jsx_runtime_1.jsx)("path", { d: "M3 3v18h18" }), (0, jsx_runtime_1.jsx)("path", { d: "m19 9-5 5-4-4-3 3" })] }), (0, jsx_runtime_1.jsx)("span", { children: "Markets" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-ot-foreground/50", children: ["(", getSummaryText(), ")"] })] }), (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)('h-3 w-3 shrink-0 opacity-50 transition-transform', open && 'rotate-180'), children: (0, jsx_runtime_1.jsx)("path", { d: "m6 9 6 6 6-6" }) })] }) }), (0, jsx_runtime_1.jsx)(popover_1.PopoverContent, { className: "w-[320px] p-0", align: "start", sideOffset: 4, "data-testid": "market-filter-popover", children: (0, jsx_runtime_1.jsxs)(command_1.Command, { shouldFilter: false, children: [(0, jsx_runtime_1.jsx)(command_1.CommandInput, { placeholder: "Search markets...", value: searchQuery, onValueChange: setSearchQuery, "data-testid": "market-filter-search" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-white/10 px-3 py-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] font-medium text-ot-foreground/60", children: [selectedCount, " of ", totalCount, " selected"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-[10px] text-ot-accent hover:underline disabled:opacity-50 disabled:no-underline", onClick: handleSelectAll, disabled: allSelected, "data-testid": "market-filter-select-all", children: "Select All" }), (0, jsx_runtime_1.jsx)("span", { className: "text-white/20", children: "|" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-[10px] text-ot-accent hover:underline disabled:opacity-50 disabled:no-underline", onClick: handleClearAll, disabled: selectedCount === 0, "data-testid": "market-filter-clear-all", children: "Clear All" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "max-h-[300px] overflow-y-auto overflow-x-hidden p-1", role: "listbox", "aria-label": "Market groups", children: [filteredGroups.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "py-6 text-center text-sm text-ot-foreground/60", children: "No markets found." })), filteredGroups.map((display, index) => ((0, jsx_runtime_1.jsxs)(React.Fragment, { children: [index > 0 && (0, jsx_runtime_1.jsx)("div", { className: "-mx-1 h-px bg-white/10" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "option", "aria-selected": isGroupSelected(display.group), onClick: () => handleToggleGroup(display.group), className: (0, utils_1.cn)('flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none', 'hover:bg-ot-accent/20 hover:text-ot-accent', 'focus:bg-ot-accent/20 focus:text-ot-accent', isGroupSelected(display.group) && 'bg-ot-accent/10'), "data-testid": `market-filter-group-${display.group}`, children: [(0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, { checked: isGroupSelected(display.group), tabIndex: -1, "aria-hidden": "true", className: "pointer-events-none" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-0.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium", children: display.label }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/50", children: display.description })] })] })] }, display.group)))] })] }) })] }), selectedCount > 0 && !allSelected && ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1", "data-testid": "market-filter-chips", children: [visibleGroups.map((display) => ((0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: "accent", className: "flex items-center gap-1 px-1.5 py-0 text-[9px]", children: [display.label, (0, jsx_runtime_1.jsx)("button", { type: "button", className: "ml-0.5 rounded-full hover:bg-white/10", onClick: () => handleToggleGroup(display.group), "aria-label": `Remove ${display.label} filter`, children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-2.5 w-2.5", children: [(0, jsx_runtime_1.jsx)("path", { d: "M18 6 6 18" }), (0, jsx_runtime_1.jsx)("path", { d: "m6 6 12 12" })] }) })] }, display.group))), hiddenCount > 0 && ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "text-[9px] text-ot-accent hover:underline", onClick: () => setOpen(true), "data-testid": "market-filter-show-more", children: ["+", hiddenCount, " more"] }))] }))] }));
}
exports.default = MarketFilterPopover;
