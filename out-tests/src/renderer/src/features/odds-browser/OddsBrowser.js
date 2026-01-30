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
exports.OddsBrowser = OddsBrowser;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const utils_1 = require("../../lib/utils");
const OddsBrowserFilters_1 = require("./components/OddsBrowserFilters");
const OddsBrowserTable_1 = require("./components/OddsBrowserTable");
const OddsComparisonPanel_1 = require("./components/OddsComparisonPanel");
const oddsBrowserStore_1 = require("./stores/oddsBrowserStore");
const useDeepScanOdds_1 = require("./hooks/useDeepScanOdds");
function OddsBrowser({ className }) {
    // Connect to Deep Scan data
    const { isLoading: isLoadingOdds, error: oddsError } = (0, useDeepScanOdds_1.useDeepScanOdds)();
    // Subscribe to store state
    const { selectedSports, selectedLeagues, searchQuery, selectedMarketTypes, selectedBookmakers, sortColumn, sortDirection, selectedOutcomeId, rawOddsRows, isComparisonPinned, comparisonDisplayMode, setSelectedSports, setSelectedLeagues, setSearchQuery, setSelectedMarketTypes, setSelectedBookmakers, setSortColumn, selectOutcome, toggleComparisonPin, setComparisonDisplayMode, closeComparison, clearAllFilters, availableLeagues, availableSports, availableMarketTypes, availableBookmakers, filteredRows } = (0, oddsBrowserStore_1.useOddsBrowserStore)();
    // Get computed values
    const sports = availableSports();
    const leagues = availableLeagues();
    const marketTypes = availableMarketTypes();
    const bookmakers = availableBookmakers();
    const rows = filteredRows();
    // Handle sort column change
    const handleSort = (column) => {
        setSortColumn(column);
    };
    // Story 8.2: Handle outcome selection with pin behavior
    const [_pendingSelection, setPendingSelection] = React.useState(null);
    const handleSelectOutcome = React.useCallback((id) => {
        // If not pinned and there's an existing selection, close first then open new
        if (!isComparisonPinned && selectedOutcomeId && id && id !== selectedOutcomeId) {
            closeComparison();
            // Small delay for animation
            setPendingSelection(id);
            setTimeout(() => {
                setPendingSelection(null);
                selectOutcome(id);
            }, 150);
        }
        else {
            selectOutcome(id);
        }
    }, [isComparisonPinned, selectedOutcomeId, closeComparison, selectOutcome]);
    // Story 8.2: Get selected row data
    const selectedRow = React.useMemo(() => {
        if (!selectedOutcomeId)
            return null;
        return rawOddsRows.find(row => row.id === selectedOutcomeId) || null;
    }, [selectedOutcomeId, rawOddsRows]);
    // Story 8.2: Check if we have data
    const hasData = rawOddsRows.length > 0;
    const hasFilteredData = rows.length > 0;
    const hasSelection = selectedOutcomeId !== null && selectedRow !== null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: className, "data-testid": "odds-browser", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4", children: (0, jsx_runtime_1.jsx)(OddsBrowserFilters_1.OddsBrowserFilters, { filters: {
                        selectedSports,
                        selectedLeagues,
                        searchQuery,
                        selectedMarketTypes,
                        selectedBookmakers
                    }, availableSports: sports, availableLeagues: leagues, availableMarketTypes: marketTypes, availableBookmakers: bookmakers, onSportsChange: setSelectedSports, onLeaguesChange: setSelectedLeagues, onSearchChange: setSearchQuery, onMarketTypesChange: setSelectedMarketTypes, onBookmakersChange: setSelectedBookmakers, onClearAll: clearAllFilters }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0", children: isLoadingOdds && !hasData ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center", "data-testid": "odds-browser-loading-state", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4 rounded-full bg-ot-accent/10 p-4", children: (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 animate-spin text-ot-accent", children: (0, jsx_runtime_1.jsx)("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }) }), (0, jsx_runtime_1.jsx)("h3", { className: "mb-2 text-sm font-semibold text-ot-foreground", children: "Loading Odds Data..." }), (0, jsx_runtime_1.jsx)("p", { className: "max-w-xs text-[11px] text-ot-muted", children: "Connecting to Deep Scan and retrieving available odds from your configured bookmakers." })] })) : oddsError ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center", "data-testid": "odds-browser-error-state", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4 rounded-full bg-red-500/10 p-4", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-red-500", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", x2: "12", y1: "8", y2: "12" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })] }) }), (0, jsx_runtime_1.jsx)("h3", { className: "mb-2 text-sm font-semibold text-ot-foreground", children: "Error Loading Odds" }), (0, jsx_runtime_1.jsx)("p", { className: "max-w-xs text-[11px] text-ot-muted", children: oddsError })] })) : !hasData ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center", "data-testid": "odds-browser-empty-state", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4 rounded-full bg-ot-accent/10 p-4", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-ot-accent", children: [(0, jsx_runtime_1.jsx)("path", { d: "M3 3v18h18" }), (0, jsx_runtime_1.jsx)("path", { d: "M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" })] }) }), (0, jsx_runtime_1.jsx)("h3", { className: "mb-2 text-sm font-semibold text-ot-foreground", children: "No Odds Data Available" }), (0, jsx_runtime_1.jsx)("p", { className: "max-w-xs text-[11px] text-ot-muted", children: "The odds browser displays data from Deep Scan. Run a scan to populate the browser with available odds from your configured bookmakers." })] })) : !hasFilteredData ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center", "data-testid": "odds-browser-no-filtered-results", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4 rounded-full bg-ot-muted/10 p-4", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 text-ot-muted", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "8" }), (0, jsx_runtime_1.jsx)("path", { d: "m21 21-4.3-4.3" })] }) }), (0, jsx_runtime_1.jsx)("h3", { className: "mb-2 text-sm font-semibold text-ot-foreground", children: "No Matching Results" }), (0, jsx_runtime_1.jsx)("p", { className: "max-w-xs text-[11px] text-ot-muted", children: "No odds match your current filter criteria. Try clearing some filters to see more results." }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: clearAllFilters, className: "mt-4 rounded-md bg-ot-accent/10 px-4 py-2 text-[11px] font-medium text-ot-accent hover:bg-ot-accent/20", children: "Clear All Filters" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "relative h-full min-h-[400px] overflow-hidden rounded-lg border border-ot-border bg-ot-surface", children: [(0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('h-full transition-all duration-200', hasSelection && comparisonDisplayMode === 'docked' && 'pr-[350px]'), children: (0, jsx_runtime_1.jsx)("div", { className: "h-full p-3", children: (0, jsx_runtime_1.jsx)(OddsBrowserTable_1.OddsBrowserTable, { rows: rows, selectedOutcomeId: selectedOutcomeId, onSelectOutcome: handleSelectOutcome, sortColumn: sortColumn, sortDirection: sortDirection, onSort: handleSort }) }) }), hasSelection && comparisonDisplayMode === 'docked' && selectedRow && ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('absolute right-0 top-0 h-full w-[350px] border-l border-ot-border', 'transform transition-transform duration-200 ease-out'), "data-testid": "odds-comparison-panel-docked", children: (0, jsx_runtime_1.jsx)(OddsComparisonPanel_1.OddsComparisonPanel, { selectedRow: selectedRow, isPinned: isComparisonPinned, displayMode: comparisonDisplayMode, onTogglePin: toggleComparisonPin, onChangeDisplayMode: setComparisonDisplayMode, onClose: closeComparison }) }))] })) }), hasData && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex items-center justify-between text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Showing ", rows.length, " of ", rawOddsRows.length, " odds"] }), (0, jsx_runtime_1.jsxs)("span", { children: [sports.length, " sports \u00B7 ", leagues.length, " leagues \u00B7 ", bookmakers.length, " bookmakers"] })] })), hasSelection && comparisonDisplayMode === 'floating' && selectedRow && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm", "data-testid": "odds-comparison-panel-floating", onClick: (e) => {
                    // Close when clicking backdrop (outside panel)
                    if (e.target === e.currentTarget) {
                        closeComparison();
                    }
                }, children: (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('w-[500px] max-h-[85vh] overflow-hidden', 'animate-in fade-in zoom-in-95 duration-200'), children: (0, jsx_runtime_1.jsx)(OddsComparisonPanel_1.OddsComparisonPanel, { selectedRow: selectedRow, isPinned: isComparisonPinned, displayMode: comparisonDisplayMode, onTogglePin: toggleComparisonPin, onChangeDisplayMode: setComparisonDisplayMode, onClose: closeComparison }) }) }))] }));
}
exports.default = OddsBrowser;
