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
exports.OddsBrowserTable = OddsBrowserTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const date_fns_1 = require("date-fns");
const utils_1 = require("../../../lib/utils");
// Story 8.2: Keyboard shortcut constants
const SELECTION_KEYS = ['Enter', ' '];
const ROW_HEIGHT_PX = 40;
const VIRTUALIZATION_THRESHOLD = 50;
const VISIBLE_WINDOW_ROWS = 40;
const OVERSCAN_ROWS = 8;
function formatTimeAgo(timestamp) {
    try {
        const date = (0, date_fns_1.parseISO)(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1)
            return 'now';
        if (diffMins < 60)
            return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24)
            return `${diffHours}h`;
        return `${Math.floor(diffHours / 24)}d`;
    }
    catch {
        return '-';
    }
}
function formatOdds(odds) {
    return odds.toFixed(2);
}
function formatEventTime(startTime) {
    try {
        const date = (0, date_fns_1.parseISO)(startTime);
        return (0, date_fns_1.format)(date, 'MMM d HH:mm');
    }
    catch {
        return '-';
    }
}
function getAriaSort(column, currentColumn, direction) {
    if (column !== currentColumn)
        return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
}
function OddsBrowserTable({ rows, selectedOutcomeId, onSelectOutcome, sortColumn, sortDirection, onSort }) {
    const [scrollOffset, setScrollOffset] = React.useState(0);
    const scrollContainerRef = React.useRef(null);
    const totalCount = rows.length;
    const virtualizationEnabled = totalCount > VIRTUALIZATION_THRESHOLD;
    const baseWindow = virtualizationEnabled ? VISIBLE_WINDOW_ROWS : totalCount;
    const visibleWindow = Math.max(0, baseWindow);
    const startIndex = virtualizationEnabled
        ? Math.max(0, Math.min(totalCount - visibleWindow, Math.floor(scrollOffset / ROW_HEIGHT_PX)))
        : 0;
    const endIndex = virtualizationEnabled
        ? Math.min(totalCount, startIndex + visibleWindow + OVERSCAN_ROWS)
        : totalCount;
    const visibleRows = rows.slice(startIndex, endIndex);
    const totalHeight = virtualizationEnabled ? totalCount * ROW_HEIGHT_PX : undefined;
    const offsetY = virtualizationEnabled ? startIndex * ROW_HEIGHT_PX : 0;
    const handleRowSelect = (id) => {
        onSelectOutcome(id);
    };
    const handleSort = (column) => {
        onSort(column);
    };
    const handleScroll = (event) => {
        if (!virtualizationEnabled)
            return;
        setScrollOffset(event.currentTarget.scrollTop);
    };
    const handleKeyDown = (event) => {
        if (!rows.length)
            return;
        const currentIndex = selectedOutcomeId ? rows.findIndex((r) => r.id === selectedOutcomeId) : -1;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : currentIndex;
            if (nextIndex >= 0) {
                onSelectOutcome(rows[nextIndex].id);
            }
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
            if (nextIndex >= 0) {
                onSelectOutcome(rows[nextIndex].id);
            }
        }
        else if (SELECTION_KEYS.includes(event.key)) {
            // Story 8.2: Enter or Space opens comparison for selected row
            event.preventDefault();
            if (selectedOutcomeId) {
                // Re-select to trigger comparison panel (idempotent but signals intent)
                onSelectOutcome(selectedOutcomeId);
            }
            else if (currentIndex >= 0) {
                onSelectOutcome(rows[currentIndex].id);
            }
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", "data-testid": "odds-browser-table", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center border-b border-ot-border pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-2 flex items-center gap-1 text-left', sortColumn === 'sport' ? 'text-ot-foreground' : 'text-ot-muted'), onClick: () => handleSort('sport'), "aria-sort": getAriaSort('sport', sortColumn, sortDirection), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-16", children: "Sport" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortColumn === 'sport' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-2 flex items-center gap-1 text-left', sortColumn === 'league' ? 'text-ot-foreground' : 'text-ot-muted'), onClick: () => handleSort('league'), "aria-sort": getAriaSort('league', sortColumn, sortDirection), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-20", children: "League" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortColumn === 'league' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-2 flex flex-1 items-center gap-1 text-left', sortColumn === 'eventTime' ? 'text-ot-foreground' : 'text-ot-muted'), onClick: () => handleSort('eventTime'), "aria-sort": getAriaSort('eventTime', sortColumn, sortDirection), children: [(0, jsx_runtime_1.jsx)("span", { children: "Event" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortColumn === 'eventTime' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-2 flex items-center gap-1 text-left', sortColumn === 'marketType' ? 'text-ot-foreground' : 'text-ot-muted'), onClick: () => handleSort('marketType'), "aria-sort": getAriaSort('marketType', sortColumn, sortDirection), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-24", children: "Market" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortColumn === 'marketType' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] }), (0, jsx_runtime_1.jsx)("div", { className: "mr-2 w-20 text-left", children: "Bookmaker" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('mr-2 flex items-center gap-1 text-right', sortColumn === 'odds' ? 'text-ot-foreground' : 'text-ot-muted'), onClick: () => handleSort('odds'), "aria-sort": getAriaSort('odds', sortColumn, sortDirection), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-12", children: "Odds" }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: sortColumn === 'odds' ? (sortDirection === 'asc' ? '▲' : '▼') : '' })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-12 text-right", children: "Age" })] }), (0, jsx_runtime_1.jsxs)("div", { ref: scrollContainerRef, className: "relative flex-1 overflow-y-auto outline-none", "data-testid": "odds-browser-scroll-container", tabIndex: totalCount > 0 ? 0 : -1, role: "listbox", "aria-label": "Odds browser", onKeyDown: handleKeyDown, onScroll: handleScroll, children: [totalCount === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-muted", children: "No odds data available. Run a Deep Scan to populate." })), totalCount > 0 && virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { style: { height: totalHeight }, children: (0, jsx_runtime_1.jsx)("div", { className: "absolute left-0 right-0", style: { transform: `translateY(${offsetY}px)` }, children: visibleRows.map((row) => ((0, jsx_runtime_1.jsx)(OddsBrowserRowComponent, { row: row, isSelected: row.id === selectedOutcomeId, onSelect: () => handleRowSelect(row.id) }, row.id))) }) })), totalCount > 0 && !virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { children: visibleRows.map((row) => ((0, jsx_runtime_1.jsx)(OddsBrowserRowComponent, { row: row, isSelected: row.id === selectedOutcomeId, onSelect: () => handleRowSelect(row.id) }, row.id))) }))] })] }));
}
function OddsBrowserRowComponent({ row, isSelected, onSelect }) {
    const timeAgo = formatTimeAgo(row.lastUpdated);
    const eventTime = formatEventTime(row.event.startTime);
    const oddsFormatted = formatOdds(row.odds);
    const eventDisplay = `${row.event.home} vs ${row.event.away}`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)(
        // Story 8.2: Enhanced selection styling with accent border/ring
        'flex cursor-pointer items-center border-b border-ot-border py-2 text-[11px] transition-colors', isSelected
            ? 'bg-ot-accent/10 ring-1 ring-inset ring-ot-accent'
            : 'hover:bg-black/5'), "data-testid": "odds-browser-row", "data-selected": isSelected ? 'true' : 'false', onClick: onSelect, role: "option", "aria-selected": isSelected ? 'true' : 'false', children: [(0, jsx_runtime_1.jsx)("div", { className: "w-16 shrink-0 truncate text-ot-muted", title: row.sport, children: row.sport }), (0, jsx_runtime_1.jsx)("div", { className: "w-20 shrink-0 truncate text-ot-muted", title: row.league, children: row.league }), (0, jsx_runtime_1.jsxs)("div", { className: "mr-2 min-w-0 flex-1 truncate", title: eventDisplay, children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground", children: eventDisplay }), (0, jsx_runtime_1.jsxs)("span", { className: "ml-2 text-ot-muted", children: ["(", eventTime, ")"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-24 shrink-0 truncate", title: row.marketType, children: row.marketType }), (0, jsx_runtime_1.jsx)("div", { className: "w-20 shrink-0 text-ot-muted", title: row.bookmaker, children: row.bookmaker }), (0, jsx_runtime_1.jsx)("div", { className: "mr-2 w-12 shrink-0 text-right font-semibold text-ot-accent", children: oddsFormatted }), (0, jsx_runtime_1.jsx)("div", { className: "w-12 shrink-0 text-right text-ot-muted text-[10px]", children: timeAgo })] }));
}
exports.default = OddsBrowserTable;
