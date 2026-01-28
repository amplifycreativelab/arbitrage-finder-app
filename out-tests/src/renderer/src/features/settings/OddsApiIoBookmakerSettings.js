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
exports.OddsApiIoBookmakerSettings = OddsApiIoBookmakerSettings;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../components/ui/button");
const checkbox_1 = require("../../components/ui/checkbox");
const InlineError_1 = require("../../components/ui/InlineError");
const input_1 = require("../../components/ui/input");
const select_1 = require("../../components/ui/select");
const oddsApiIoBookmakerRegions_1 = require("./oddsApiIoBookmakerRegions");
function parseBookmakersInput(value) {
    return Array.from(new Set(value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)));
}
function inferRegion(name) {
    const fromMap = oddsApiIoBookmakerRegions_1.ODDS_API_IO_BOOKMAKER_REGION_BY_NAME[name];
    if (typeof fromMap === 'string' && fromMap.length)
        return fromMap;
    const match = name.match(/\\s([A-Z]{2})$/);
    const suffix = match?.[1] ?? null;
    if (!suffix)
        return 'International';
    const suffixMap = {
        AU: 'Australia',
        BR: 'Brazil',
        CA: 'Canada',
        CZ: 'Czech Republic',
        DE: 'Germany',
        DK: 'Denmark',
        ES: 'Spain',
        FR: 'France',
        IT: 'Italy',
        LT: 'Lithuania',
        MX: 'Mexico',
        NL: 'Netherlands',
        NJ: 'United States',
        PE: 'Peru',
        PL: 'Poland',
        PT: 'Portugal',
        SE: 'Sweden',
        UK: 'United Kingdom',
        ZA: 'South Africa'
    };
    return suffixMap[suffix] ?? 'International';
}
function OddsApiIoBookmakerSettings({ enabled, hasKey }) {
    const getOddsApiIoApi = () => {
        return window.api
            ?.oddsApiIo ?? null;
    };
    const [supported, setSupported] = React.useState([]);
    const [selected, setSelected] = React.useState([]);
    const [input, setInput] = React.useState('');
    const [pickerValue, setPickerValue] = React.useState('');
    const [supportedSearch, setSupportedSearch] = React.useState('');
    const [regionFilter, setRegionFilter] = React.useState('All regions');
    const [sortDirection, setSortDirection] = React.useState('asc');
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(null);
    const refresh = React.useCallback(async () => {
        const oddsApiIo = getOddsApiIoApi();
        if (!oddsApiIo) {
            setError('Odds-API.io API bridge is not available. Restart the app (or rebuild) and try again.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        // Use Promise.allSettled to handle partial failures gracefully
        // (e.g., rate limit on getSelectedBookmakers shouldn't block getSupportedBookmakers)
        const [supportedResult, selectedResult] = await Promise.allSettled([
            oddsApiIo.getSupportedBookmakers(),
            oddsApiIo.getSelectedBookmakers()
        ]);
        if (supportedResult.status === 'fulfilled') {
            setSupported(supportedResult.value);
        }
        else {
            setError(supportedResult.reason instanceof Error
                ? supportedResult.reason.message
                : 'Failed to load supported bookmakers.');
        }
        if (selectedResult.status === 'fulfilled') {
            setSelected(selectedResult.value);
        }
        else {
            // Don't overwrite error if supported also failed
            if (supportedResult.status === 'fulfilled') {
                setError(selectedResult.reason instanceof Error
                    ? selectedResult.reason.message
                    : 'Failed to load selected bookmakers.');
            }
        }
        setIsLoading(false);
    }, []);
    const supportedWithRegion = React.useMemo(() => {
        return supported.map((b) => ({ ...b, region: inferRegion(b.name) }));
    }, [supported]);
    const regionOptions = React.useMemo(() => {
        const unique = new Set();
        for (const b of supportedWithRegion)
            unique.add(b.region);
        return ['All regions', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
    }, [supportedWithRegion]);
    const filteredSupported = React.useMemo(() => {
        const query = supportedSearch.trim().toLowerCase();
        const region = regionFilter;
        const items = supportedWithRegion.filter((b) => {
            if (activeOnly && !b.active)
                return false;
            if (region !== 'All regions' && b.region !== region)
                return false;
            if (!query)
                return true;
            return b.name.toLowerCase().includes(query) || b.region.toLowerCase().includes(query);
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        if (sortDirection === 'desc')
            items.reverse();
        return items;
    }, [activeOnly, regionFilter, sortDirection, supportedSearch, supportedWithRegion]);
    React.useEffect(() => {
        if (!enabled || !hasKey)
            return;
        void refresh();
    }, [enabled, hasKey, refresh]);
    if (!enabled)
        return null;
    const appendToInput = (name) => {
        setInput((prev) => {
            const next = parseBookmakersInput(prev);
            next.push(name);
            return Array.from(new Set(next)).join(',');
        });
    };
    const handleAdd = async () => {
        const oddsApiIo = getOddsApiIoApi();
        if (!oddsApiIo) {
            setError('Odds-API.io API bridge is not available. Restart the app (or rebuild) and try again.');
            return;
        }
        const bookmakers = parseBookmakersInput(input);
        if (!bookmakers.length) {
            setError('Enter at least one bookmaker name (comma-separated).');
            return;
        }
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await oddsApiIo.selectBookmakers(bookmakers);
            setSuccess('Bookmakers updated. Refreshing selection…');
            const selectedList = await oddsApiIo.getSelectedBookmakers();
            setSelected(selectedList);
            setSuccess('Bookmakers updated.');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update bookmakers.');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleClear = async () => {
        const oddsApiIo = getOddsApiIoApi();
        if (!oddsApiIo) {
            setError('Odds-API.io API bridge is not available. Restart the app (or rebuild) and try again.');
            return;
        }
        const ok = window.confirm('Clear your Odds-API.io selected bookmakers?\n\nNote: Odds-API.io limits clearing to once every 12 hours.');
        if (!ok)
            return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await oddsApiIo.clearSelectedBookmakers();
            // Clear succeeded - optimistically set selected to empty
            // (avoids rate limit issues when fetching selected list)
            setSelected([]);
            setSuccess('Selection cleared. You can now select new bookmakers.');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to clear selection.');
        }
        finally {
            setIsSaving(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 rounded-md border border-ot-border bg-ot-surface p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] font-semibold text-ot-foreground", children: "Odds-API.io bookmaker selection" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1 text-[10px] text-ot-muted", children: "Free plan uses 2 bookmakers. Use \u201CClear\u201D to swap (limited to once every 12 hours)." })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-6 px-2 text-[10px]", onClick: () => void refresh(), disabled: !hasKey || isLoading || isSaving, children: isLoading ? 'Loading…' : 'Refresh' })] }), !hasKey && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2", children: (0, jsx_runtime_1.jsx)(InlineError_1.InlineError, { message: "Configure your Odds-API.io API key to manage bookmakers.", guidance: "Enable the provider and save the API key above, then refresh." }) })), hasKey && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mt-3 text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground/80", children: "Currently selected:" }), ' ', selected.length ? selected.join(', ') : '(none)'] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 rounded-md border border-ot-border/60 bg-ot-background/30 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { value: supportedSearch, onChange: (e) => setSupportedSearch(e.target.value), placeholder: "Search supported bookmakers or region...", className: "h-8 text-[11px]", disabled: isSaving || isLoading }), (0, jsx_runtime_1.jsx)(select_1.Select, { value: regionFilter, onChange: (e) => setRegionFilter(e.target.value), disabled: isSaving || isLoading || regionOptions.length === 0, className: "h-8 py-0 px-2", children: regionOptions.map((r) => ((0, jsx_runtime_1.jsx)("option", { value: r, children: r }, r))) }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: sortDirection, onChange: (e) => setSortDirection(e.target.value), disabled: isSaving || isLoading, className: "h-8 py-0 px-2", children: [(0, jsx_runtime_1.jsx)("option", { value: "asc", children: "A \u2192 Z" }), (0, jsx_runtime_1.jsx)("option", { value: "desc", children: "Z \u2192 A" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, { checked: activeOnly, onCheckedChange: (v) => setActiveOnly(Boolean(v)), disabled: isSaving || isLoading }), "Active only"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 text-[10px] text-ot-muted/80", children: ["Showing ", filteredSupported.length, " bookmaker", filteredSupported.length === 1 ? '' : 's'] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 grid grid-cols-1 gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { value: input, onChange: (e) => setInput(e.target.value), placeholder: "Bookmaker names (e.g. Bet365,SingBet)", className: "flex-1 text-[11px]", disabled: isSaving }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", onClick: () => void handleAdd(), disabled: isSaving || !input.trim(), className: "h-8 px-3 text-[11px]", children: isSaving ? 'Saving…' : 'Add' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsxs)(select_1.Select, { value: pickerValue, onChange: (e) => setPickerValue(e.target.value), disabled: isSaving || isLoading || filteredSupported.length === 0, className: "flex-1 h-8 py-0 px-2", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: filteredSupported.length
                                                    ? 'Pick a supported bookmaker…'
                                                    : 'No supported bookmakers loaded' }), filteredSupported.map((b) => {
                                                const label = b.region && b.region !== 'International' ? `${b.name} (${b.region})` : b.name;
                                                return ((0, jsx_runtime_1.jsx)("option", { value: b.name, children: label }, b.name));
                                            })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-8 px-3 text-[11px]", disabled: isSaving || !pickerValue, onClick: () => {
                                            appendToInput(pickerValue);
                                            setPickerValue('');
                                        }, children: "Add to list" }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-8 px-3 text-[11px] border-red-500/40 text-red-200 hover:bg-red-500/10", disabled: isSaving, onClick: () => void handleClear(), children: "Clear" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 rounded-md border border-ot-border/60 bg-ot-background/30 p-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-[10px] font-medium text-ot-foreground/70", children: "Supported bookmakers (click to add)" }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-[200px] overflow-y-auto", children: filteredSupported.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "No bookmakers match your filters." })) : (filteredSupported.slice(0, 200).map((b) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] hover:bg-ot-muted/10", onClick: () => appendToInput(b.name), disabled: isSaving, title: "Add to input", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground/90", children: b.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-ot-muted", children: [b.region, !b.active ? ' • inactive' : ''] })] }, b.name)))) }), filteredSupported.length > 200 && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 text-[10px] text-ot-muted/70", children: "Showing first 200 results. Use search to narrow down." }))] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2", children: (0, jsx_runtime_1.jsx)(InlineError_1.InlineError, { message: error }) })), success && (0, jsx_runtime_1.jsx)("div", { className: "mt-2 text-[10px] text-emerald-400", children: success })] }))] }));
}
