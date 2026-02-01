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
// Story 8.x: Improved visual design with proper icons
const TrendUpIcon = ({ className }) => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: [(0, jsx_runtime_1.jsx)("polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17" }), (0, jsx_runtime_1.jsx)("polyline", { points: "16 7 22 7 22 13" })] }));
const SortIcon = ({ direction, active }) => ((0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)('h-3 w-3 transition-opacity', active ? 'opacity-100' : 'opacity-30'), children: direction === 'asc' ? ((0, jsx_runtime_1.jsx)("path", { d: "m5 12 7-7 7 7" })) : ((0, jsx_runtime_1.jsx)("path", { d: "m19 12-7 7-7-7" })) }));
// Story 8.x: Enhanced keyboard shortcuts
const SELECTION_KEYS = ['Enter', ' '];
const ROW_HEIGHT_PX = 44;
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
            return { text: 'just now', isStale: false };
        if (diffMins < 5)
            return { text: `${diffMins}m ago`, isStale: false };
        if (diffMins < 60)
            return { text: `${diffMins}m ago`, isStale: diffMins > 10 };
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24)
            return { text: `${diffHours}h ago`, isStale: true };
        return { text: `${Math.floor(diffHours / 24)}d ago`, isStale: true };
    }
    catch {
        return { text: '-', isStale: false };
    }
}
function formatOdds(odds) {
    return odds.toFixed(2);
}
function formatEventTime(startTime) {
    try {
        const date = (0, date_fns_1.parseISO)(startTime);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const isLive = diffMs < 0 && diffMs > -3 * 60 * 60 * 1000; // Started within last 3h
        return {
            date: (0, date_fns_1.format)(date, 'MMM d'),
            time: (0, date_fns_1.format)(date, 'HH:mm'),
            isLive
        };
    }
    catch {
        return { date: '-', time: '-', isLive: false };
    }
}
function getAriaSort(column, currentColumn, direction) {
    if (column !== currentColumn)
        return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
}
// Sport badge colors
const SPORT_COLORS = {
    soccer: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    football: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    basketball: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    tennis: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    baseball: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    hockey: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    default: { bg: 'bg-ot-accent/10', text: 'text-ot-accent', border: 'border-ot-accent/30' }
};
function getSportColor(sport) {
    const key = sport.toLowerCase();
    return SPORT_COLORS[key] || SPORT_COLORS.default;
}
function OddsBrowserTable({ rows, selectedOutcomeId, onSelectOutcome, sortColumn, sortDirection, onSort }) {
    const [scrollOffset, setScrollOffset] = React.useState(0);
    const [hoveredRowId, setHoveredRowId] = React.useState(null);
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
            event.preventDefault();
            if (selectedOutcomeId) {
                onSelectOutcome(selectedOutcomeId);
            }
            else if (currentIndex >= 0) {
                onSelectOutcome(rows[currentIndex].id);
            }
        }
    };
    // Enhanced header button component
    const HeaderButton = ({ column, label, width }) => {
        const isActive = sortColumn === column;
        return ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, utils_1.cn)('group flex items-center gap-1.5 rounded px-2 py-1 text-left transition-all', 'hover:bg-ot-accent/5', isActive ? 'text-ot-foreground' : 'text-ot-muted'), onClick: () => handleSort(column), "aria-sort": getAriaSort(column, sortColumn, sortDirection), children: [(0, jsx_runtime_1.jsx)("span", { className: width, children: label }), (0, jsx_runtime_1.jsx)(SortIcon, { direction: isActive ? sortDirection : 'desc', active: isActive })] }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", "data-testid": "odds-browser-table", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-1 flex items-center rounded-lg bg-gradient-to-r from-ot-surface via-ot-surface to-transparent px-1 py-2", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center text-[9px] font-bold uppercase tracking-[0.16em]", children: [(0, jsx_runtime_1.jsx)(HeaderButton, { column: "sport", label: "Sport", width: "w-[70px]" }), (0, jsx_runtime_1.jsx)(HeaderButton, { column: "league", label: "League", width: "w-[100px]" }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: (0, jsx_runtime_1.jsx)(HeaderButton, { column: "eventTime", label: "Event", width: "flex-1" }) }), (0, jsx_runtime_1.jsx)(HeaderButton, { column: "marketType", label: "Market", width: "w-[100px]" }), (0, jsx_runtime_1.jsx)("div", { className: "w-[80px] px-2 text-ot-muted", children: "Bookmaker" }), (0, jsx_runtime_1.jsx)(HeaderButton, { column: "odds", label: "Odds", width: "w-[60px] text-right" }), (0, jsx_runtime_1.jsx)("div", { className: "w-[70px] px-2 text-right text-ot-muted", children: "Updated" })] }) }), (0, jsx_runtime_1.jsxs)("div", { ref: scrollContainerRef, className: (0, utils_1.cn)('relative flex-1 overflow-y-auto outline-none', 
                // Custom scrollbar styling
                'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-ot-border/50', 'hover:scrollbar-thumb-ot-border'), "data-testid": "odds-browser-scroll-container", tabIndex: totalCount > 0 ? 0 : -1, role: "listbox", "aria-label": "Odds browser", onKeyDown: handleKeyDown, onScroll: handleScroll, children: [totalCount === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)(TrendUpIcon, { className: "mx-auto mb-3 h-8 w-8 text-ot-muted/50" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "No odds data available." }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[10px] text-ot-muted/70", children: "Run a Deep Scan to populate the browser." })] }) })), totalCount > 0 && virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { style: { height: totalHeight }, children: (0, jsx_runtime_1.jsx)("div", { className: "absolute left-0 right-0", style: { transform: `translateY(${offsetY}px)` }, children: visibleRows.map((row, idx) => ((0, jsx_runtime_1.jsx)(OddsBrowserRowEnhanced, { row: row, isSelected: row.id === selectedOutcomeId, isHovered: row.id === hoveredRowId, onSelect: () => handleRowSelect(row.id), onHover: () => setHoveredRowId(row.id), onLeave: () => setHoveredRowId(null), index: startIndex + idx }, row.id))) }) })), totalCount > 0 && !virtualizationEnabled && ((0, jsx_runtime_1.jsx)("div", { className: "space-y-0.5", children: visibleRows.map((row, idx) => ((0, jsx_runtime_1.jsx)(OddsBrowserRowEnhanced, { row: row, isSelected: row.id === selectedOutcomeId, isHovered: row.id === hoveredRowId, onSelect: () => handleRowSelect(row.id), onHover: () => setHoveredRowId(row.id), onLeave: () => setHoveredRowId(null), index: idx }, row.id))) }))] })] }));
}
function OddsBrowserRowEnhanced({ row, isSelected, isHovered, onSelect, onHover, onLeave, index }) {
    const timeAgo = formatTimeAgo(row.lastUpdated);
    const eventTime = formatEventTime(row.event.startTime);
    const oddsFormatted = formatOdds(row.odds);
    const eventDisplay = `${row.event.home} vs ${row.event.away}`;
    const sportColor = getSportColor(row.sport);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)(
        // Base styles
        'group flex cursor-pointer items-center rounded-lg px-2 py-2.5 transition-all duration-150', 
        // Alternating background
        index % 2 === 0 ? 'bg-transparent' : 'bg-ot-surface/30', 
        // Selection and hover states
        isSelected && 'bg-ot-accent/10 ring-1 ring-inset ring-ot-accent shadow-sm', !isSelected && isHovered && 'bg-ot-accent/5 translate-x-0.5', !isSelected && !isHovered && 'hover:bg-ot-surface/50'), "data-testid": "odds-browser-row", "data-selected": isSelected ? 'true' : 'false', onClick: onSelect, onMouseEnter: onHover, onMouseLeave: onLeave, role: "option", "aria-selected": isSelected ? 'true' : 'false', style: { minHeight: `${ROW_HEIGHT_PX}px` }, children: [(0, jsx_runtime_1.jsx)("div", { className: "w-[70px] shrink-0 px-1", children: (0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium', sportColor.bg, sportColor.text, sportColor.border), title: row.sport, children: row.sport.slice(0, 6) }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-[100px] shrink-0 px-1", children: (0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[10px] text-ot-muted", title: row.league, children: row.league }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 flex-1 items-center gap-2 px-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "shrink-0", children: eventTime.isLive ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400", children: [(0, jsx_runtime_1.jsx)("span", { className: "h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" }), "LIVE"] })) : ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex flex-col items-center rounded bg-ot-surface px-1.5 py-0.5 text-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[8px] font-medium text-ot-muted", children: eventTime.date }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold text-ot-foreground", children: eventTime.time })] })) }), (0, jsx_runtime_1.jsx)("div", { className: "min-w-0 flex-1", children: (0, jsx_runtime_1.jsxs)("span", { className: (0, utils_1.cn)('block truncate text-[11px] font-medium transition-colors', isSelected ? 'text-ot-accent' : 'text-ot-foreground group-hover:text-ot-accent'), title: eventDisplay, children: [row.event.home, (0, jsx_runtime_1.jsx)("span", { className: "mx-1 text-ot-muted", children: "vs" }), row.event.away] }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-[100px] shrink-0 px-1", children: (0, jsx_runtime_1.jsx)("span", { className: "block truncate rounded bg-ot-border/30 px-1.5 py-0.5 text-center text-[9px] font-medium text-ot-foreground", title: row.marketType, children: row.marketType }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-[80px] shrink-0 px-1", children: (0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[10px] text-ot-muted", title: row.bookmaker, children: row.bookmaker }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-[60px] shrink-0 px-1 text-right", children: (0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('inline-block rounded-md px-2 py-1 text-[12px] font-bold tabular-nums transition-all', isSelected
                        ? 'bg-ot-accent text-ot-background'
                        : 'bg-ot-accent/10 text-ot-accent group-hover:bg-ot-accent group-hover:text-ot-background'), children: oddsFormatted }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-[70px] shrink-0 px-1 text-right", children: (0, jsx_runtime_1.jsxs)("span", { className: (0, utils_1.cn)('inline-flex items-center gap-1 text-[9px]', timeAgo.isStale ? 'text-amber-400' : 'text-ot-muted'), title: `Last updated: ${row.lastUpdated}`, children: [timeAgo.isStale && ((0, jsx_runtime_1.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-amber-400" })), timeAgo.text] }) })] }));
}
exports.default = OddsBrowserTable;
