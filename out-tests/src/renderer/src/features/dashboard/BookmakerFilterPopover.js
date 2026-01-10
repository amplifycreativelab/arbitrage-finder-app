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
exports.BookmakerFilterPopover = BookmakerFilterPopover;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const popover_1 = require("../../components/ui/popover");
const command_1 = require("../../components/ui/command");
const checkbox_1 = require("../../components/ui/checkbox");
const badge_1 = require("../../components/ui/badge");
const utils_1 = require("../../lib/utils");
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
/**
 * Bookmaker filter popover component for Story 6.3.
 * Provides a cascading, searchable interface for filtering bookmakers.
 */
function BookmakerFilterPopover({ availableBookmakers }) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    // Store access
    const selectedBookmakers = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.bookmakers);
    const toggleBookmaker = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.toggleBookmaker);
    const setBookmakers = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setBookmakers);
    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.toLowerCase().trim());
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    // Filter bookmakers based on search
    const filteredBookmakers = React.useMemo(() => {
        if (!debouncedSearch) {
            return availableBookmakers;
        }
        return availableBookmakers.filter((bookmaker) => bookmaker.toLowerCase().includes(debouncedSearch));
    }, [availableBookmakers, debouncedSearch]);
    // Count logic
    // "Selected" means effectively filtering the list.
    // If selectedBookmakers is empty, it usually implies "All" (implied).
    // BUT the store tracks explicit selection.
    // The Story says: "When no bookmakers are explicitly selected, all bookmakers... are included."
    // So visually, if empty, we might show "All Bookmakers".
    // However, `handleSelectAll` sets explicit list.
    // `handleClearAll` sets empty list.
    // The logic in `toggleBookmaker` (store) adds/removes from explicit list.
    // UI needs to reflect this "Empty = All" behavior?
    // Let's look at AC #4: "When no bookmakers are explicitly selected... all are included."
    // AC #5: "Select All" / "Clear All".
    // If I click "Select All", I set list to [...]
    // If I click "Clear All", I set list to [] (which means All implies).
    // Wait, if "Clear All" means "All", then how do I select NONE? (Usually rarely needed in arbitrage).
    // So Empty == All is standard.
    // Selected Count Display: if empty, "All Bookmakers". If list has items, "X Selected".
    const isExplicitlyEmpty = selectedBookmakers.length === 0;
    // Handlers
    const handleSelectAll = () => {
        // Select all CURRENTLY AVAILABLE
        setBookmakers([...availableBookmakers]);
    };
    const handleClearAll = () => {
        // Reset to empty (Implies All)
        setBookmakers([]);
    };
    const handleToggleBookmaker = (bookmaker) => {
        // If currently empty (All), and we toggle one, we essentially start a filter.
        // Toggling one in "All" mode usually means "Select this one" OR "Deselect this one"?
        // User expectation: Only Bookie A selected? Or All except Bookie A?
        // Standard Facet Filter: Empty = All. Clicking one starts the specialized selection.
        // So if Empty, clicking 'Bookie A' -> setBookmakers(['Bookie A']).
        // Wait, if I want to exclude just one?
        // "select specific bookmakers... so that I can focus on bookmakers I actually use"
        // Usually means positive selection.
        // Logic:
        // If empty (All), clicking 'A' => selected = ['A'].
        // If selected = ['A'], clicking 'A' => selected = []. (Back to All).
        // If selected = ['A'], clicking 'B' => selected = ['A', 'B'].
        // There is an edge case: If I want to select ALL except one?
        // Current "positive selection" model makes "All except one" tedious (select all then deselect one).
        // If handleSelectAll sets explicit list, then deselecting one removes it from explicit list.
        // So:
        // 1. Empty -> Click 'A' -> ['A']
        // 2. Select All -> Click 'A' -> [All - 'A']
        // Store `toggleBookmaker` logic:
        // if includes -> remove. else -> add.
        // But if currently empty, `includes` is false. So it adds. Result: ['A']. Correct.
        toggleBookmaker(bookmaker);
    };
    const isBookmakerSelected = (bookmaker) => {
        // Usually in "All" mode (Empty list), individual items are NOT checked to indicate "No filter applied".
        // OR they are ALL checked to indicate "All included".
        // If I show them all checked, user might think they are explicitly selected.
        // Better pattern:
        // If Empty: Show "All Bookmakers" in trigger, list items UNCHECKED (or maybe specific "All" item checked).
        // BUT common pattern (e.g. Excel): "Select All" checked, all items checked.
        // If I represent "Empty" as "All Checked", then clicking one should UNCHECK it?
        // No, if I click one in Excel "Select All" mode, it enters customized mode.
        // Let's stick to: Empty = No explicit filter. Items Unchecked. "All Bookmakers" badge.
        // Clicking an item SELECTS it (positive filter).
        // Clicking "Select All" SELECTS ALL explicitly.
        // Clicking "Clear All" DESELECTS ALL (back to Empty).
        // Wait, if Empty means All, then "Clear All" is effectively "Reset to All".
        // Let's follow Story 6.2 pattern?
        // 6.2 `MarketFilterPopover.tsx`:
        // `const isGroupSelected = (group) => marketGroups.includes(group)`
        // And `marketGroups` defaults to `ALL_MARKET_GROUPS` if undefined/empty?
        // `useFeedFiltersStore((state) => state.marketGroups ?? ALL_MARKET_GROUPS)`
        // Ah! 6.2 Store returns `ALL` if `undefined`?
        // Let's check `feedFiltersStore.ts` read.
        // `marketGroups` in `defaultState` is `ALL_MARKET_GROUPS`.
        // So 6.2 uses EXPLICIT FULL LIST as default.
        // 6.3 uses EMPTY LIST as default (to handle large dynamic lists, saving space).
        // If 6.3 `bookmakers` default is `[]`, then:
        // `isExplicitlyEmpty` means "All".
        // VISUALLY: I should probably NOT check the boxes if empty, to distinguish "All (implicit)" vs "Specific Selection".
        // OR I treat empty as "All", so `isBookmakerSelected` returns true?
        // If I return true, and user clicks it, `toggleBookmaker` will REMOVE it?
        // If `bookmakers` is `[]`, `toggle` adds it. So it becomes `['A']`.
        // If I visualised it as Checked (True), user expects clicking it to Uncheck (Remove).
        // But logic adds. So visual state mismatch.
        // THEREFORE: If empty, items must appear UNCHECKED.
        // Trigger text says "All Bookmakers".
        return selectedBookmakers.includes(bookmaker);
    };
    // Visual text for chips
    const MAX_VISIBLE_CHIPS = 3;
    const visibleBookmakers = isExplicitlyEmpty
        ? []
        : selectedBookmakers.filter(b => availableBookmakers.includes(b)).slice(0, MAX_VISIBLE_CHIPS);
    const hiddenCount = Math.max(0, selectedBookmakers.length - MAX_VISIBLE_CHIPS);
    const getSummaryText = () => {
        if (isExplicitlyEmpty) {
            return 'All Bookmakers';
        }
        return `${selectedBookmakers.length} Selected`;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsxs)(popover_1.Popover, { open: open, onOpenChange: setOpen, children: [(0, jsx_runtime_1.jsx)(popover_1.PopoverTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "combobox", "aria-expanded": open, "aria-haspopup": "listbox", "aria-label": "Select bookmakers", disabled: availableBookmakers.length === 0, className: (0, utils_1.cn)('flex h-7 w-full items-center justify-between rounded-md border px-2 py-1 text-[10px]', 'border-white/20 bg-transparent text-ot-foreground/80', 'hover:border-ot-accent/60 hover:text-ot-accent', 'focus:outline-none focus:ring-1 focus:ring-ot-accent', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-white/20 disabled:hover:text-ot-foreground/80', open && 'border-ot-accent text-ot-accent'), "data-testid": "bookmaker-filter-trigger", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 opacity-60", children: (0, jsx_runtime_1.jsx)("path", { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" }) }), (0, jsx_runtime_1.jsx)("span", { children: "Bookmakers" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-ot-foreground/50", children: ["(", availableBookmakers.length === 0 ? 'None' : getSummaryText(), ")"] })] }), (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)('h-3 w-3 shrink-0 opacity-50 transition-transform', open && 'rotate-180'), children: (0, jsx_runtime_1.jsx)("path", { d: "m6 9 6 6 6-6" }) })] }) }), (0, jsx_runtime_1.jsx)(popover_1.PopoverContent, { className: "w-[320px] p-0", align: "start", sideOffset: 4, "data-testid": "bookmaker-filter-popover", children: (0, jsx_runtime_1.jsxs)(command_1.Command, { shouldFilter: false, children: [(0, jsx_runtime_1.jsx)(command_1.CommandInput, { placeholder: "Search bookmakers...", value: searchQuery, onValueChange: setSearchQuery, "data-testid": "bookmaker-filter-search" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-white/10 px-3 py-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] font-medium text-ot-foreground/60", children: [isExplicitlyEmpty ? 'All' : selectedBookmakers.length, " of ", availableBookmakers.length, " selected"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-[10px] text-ot-accent hover:underline disabled:opacity-50 disabled:no-underline", onClick: handleSelectAll, disabled: availableBookmakers.length === 0, "data-testid": "bookmaker-filter-select-all", children: "Select All" }), (0, jsx_runtime_1.jsx)("span", { className: "text-white/20", children: "|" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-[10px] text-ot-accent hover:underline disabled:opacity-50 disabled:no-underline", onClick: handleClearAll, disabled: isExplicitlyEmpty, "data-testid": "bookmaker-filter-clear-all", children: "Clear All" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "max-h-[300px] overflow-y-auto overflow-x-hidden p-1", role: "listbox", "aria-label": "Bookmakers", children: [filteredBookmakers.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "py-6 text-center text-sm text-ot-foreground/60", children: "No bookmakers found." })), filteredBookmakers.map((bookmaker, index) => ((0, jsx_runtime_1.jsxs)(React.Fragment, { children: [index > 0 && (0, jsx_runtime_1.jsx)("div", { className: "-mx-1 h-px bg-white/10" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "option", "aria-selected": isBookmakerSelected(bookmaker), onClick: () => handleToggleBookmaker(bookmaker), className: (0, utils_1.cn)('flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none', 'hover:bg-ot-accent/20 hover:text-ot-accent', 'focus:bg-ot-accent/20 focus:text-ot-accent', isBookmakerSelected(bookmaker) && 'bg-ot-accent/10'), "data-testid": `bookmaker-filter-item-${bookmaker}`, children: [(0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, { checked: isBookmakerSelected(bookmaker), tabIndex: -1, "aria-hidden": "true", className: "pointer-events-none" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-col gap-0.5", children: (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium", children: bookmaker }) })] })] }, bookmaker)))] })] }) })] }), !isExplicitlyEmpty && ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-1", "data-testid": "bookmaker-filter-chips", children: [visibleBookmakers.map((bookmaker) => ((0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: "accent", className: "flex items-center gap-1 px-1.5 py-0 text-[9px]", children: [bookmaker, (0, jsx_runtime_1.jsx)("button", { type: "button", className: "ml-0.5 rounded-full hover:bg-white/10", onClick: () => handleToggleBookmaker(bookmaker), "aria-label": `Remove ${bookmaker} filter`, children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-2.5 w-2.5", children: [(0, jsx_runtime_1.jsx)("path", { d: "M18 6 6 18" }), (0, jsx_runtime_1.jsx)("path", { d: "m6 6 12 12" })] }) })] }, bookmaker))), hiddenCount > 0 && ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "text-[9px] text-ot-accent hover:underline", onClick: () => setOpen(true), "data-testid": "bookmaker-filter-show-more", children: ["+", hiddenCount, " more"] }))] }))] }));
}
