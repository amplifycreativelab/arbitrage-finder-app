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
exports.BookmakerSelectionSection = BookmakerSelectionSection;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../../components/ui/button");
const checkbox_1 = require("../../../components/ui/checkbox");
const InlineError_1 = require("../../../components/ui/InlineError");
const input_1 = require("../../../components/ui/input");
const select_1 = require("../../../components/ui/select");
const oddsApiIoBookmakerRegions_1 = require("../oddsApiIoBookmakerRegions");
function inferRegion(name) {
    const fromMap = oddsApiIoBookmakerRegions_1.ODDS_API_IO_BOOKMAKER_REGION_BY_NAME[name];
    if (typeof fromMap === 'string' && fromMap.length)
        return fromMap;
    const match = name.match(/\s([A-Z]{2})$/);
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
function BookmakerSelectionSection() {
    const getOddsApiIoApi = () => {
        return window.api
            ?.oddsApiIo ?? null;
    };
    const [supported, setSupported] = React.useState([]);
    const [selected, setSelected] = React.useState([]);
    const [input, setInput] = React.useState('');
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
            setError('Odds-API.io API bridge is not available. Restart the app and try again.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
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
            setSelected(selectedResult.value ?? []);
        }
        else if (supportedResult.status === 'fulfilled') {
            setError(selectedResult.reason instanceof Error
                ? selectedResult.reason.message
                : 'Failed to load selected bookmakers.');
        }
        setIsLoading(false);
    }, []);
    const supportedWithRegion = React.useMemo(() => {
        return (supported ?? []).map((b) => ({ ...b, region: inferRegion(b.name) }));
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
        void refresh();
    }, [refresh]);
    const appendToInput = (name) => {
        setInput((prev) => {
            const next = prev
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean);
            next.push(name);
            return Array.from(new Set(next)).join(', ');
        });
    };
    const handleSelectAll = () => {
        const allNames = filteredSupported.map((b) => b.name);
        setInput(allNames.join(', '));
    };
    const handleDeselectAll = () => {
        setInput('');
    };
    const handleAdd = async () => {
        const oddsApiIo = getOddsApiIoApi();
        if (!oddsApiIo) {
            setError('Odds-API.io API bridge is not available.');
            return;
        }
        const bookmakers = input
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
        if (!bookmakers.length) {
            setError('Enter at least one bookmaker name.');
            return;
        }
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await oddsApiIo.selectBookmakers(bookmakers);
            setSuccess('Bookmakers updated.');
            const selectedList = await oddsApiIo.getSelectedBookmakers();
            setSelected(selectedList);
            setInput('');
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
            setError('Odds-API.io API bridge is not available.');
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
    const handleResetToDefaults = async () => {
        const ok = window.confirm('Reset bookmaker selection to defaults?');
        if (!ok)
            return;
        await handleClear();
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Select bookmakers for odds comparison. Free plan uses 2 bookmakers." }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent", children: [(selected ?? []).length, " selected"] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-7 px-2 text-[10px]", onClick: () => void refresh(), disabled: isLoading || isSaving, children: isLoading ? 'Loading...' : 'Refresh' })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-[10px] text-ot-muted mb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground/80", children: "Currently selected:" }), ' ', (selected ?? []).length ? (selected ?? []).join(', ') : '(none)'] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { value: supportedSearch, onChange: (e) => setSupportedSearch(e.target.value), placeholder: "Search bookmakers...", className: "h-8 text-[11px]", disabled: isSaving || isLoading }), (0, jsx_runtime_1.jsx)(select_1.Select, { value: regionFilter, onChange: (e) => setRegionFilter(e.target.value), disabled: isSaving || isLoading, className: "h-8 py-0 px-2", children: regionOptions.map((r) => ((0, jsx_runtime_1.jsx)("option", { value: r, children: r }, r))) }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: sortDirection, onChange: (e) => setSortDirection(e.target.value), disabled: isSaving || isLoading, className: "h-8 py-0 px-2", children: [(0, jsx_runtime_1.jsx)("option", { value: "asc", children: "A \u2192 Z" }), (0, jsx_runtime_1.jsx)("option", { value: "desc", children: "Z \u2192 A" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-2 text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, { checked: activeOnly, onCheckedChange: (v) => setActiveOnly(Boolean(v)), disabled: isSaving || isLoading }), "Active only"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 text-[10px] text-ot-muted/80", children: ["Showing ", filteredSupported.length, " bookmaker", filteredSupported.length === 1 ? '' : 's'] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-7 px-3 text-[10px]", onClick: handleSelectAll, disabled: isSaving || filteredSupported.length === 0, children: "Select All" }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-7 px-3 text-[10px]", onClick: handleDeselectAll, disabled: isSaving || !input.trim(), children: "Deselect All" }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-7 px-3 text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10", onClick: () => void handleResetToDefaults(), disabled: isSaving, children: "Reset to Defaults" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { value: input, onChange: (e) => setInput(e.target.value), placeholder: "Bookmaker names (e.g. Bet365, SingBet)", className: "flex-1 text-[11px]", disabled: isSaving }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", onClick: () => void handleAdd(), disabled: isSaving || !input.trim(), className: "h-8 px-3 text-[11px]", children: isSaving ? 'Saving...' : 'Add' }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "h-8 px-3 text-[11px] border-red-500/40 text-red-200 hover:bg-red-500/10", onClick: () => void handleClear(), disabled: isSaving, children: "Clear" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-[10px] font-medium text-ot-foreground/70", children: "Supported bookmakers (click to add)" }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-[250px] overflow-y-auto", children: filteredSupported.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-ot-muted", children: "No bookmakers match your filters." })) : (filteredSupported.slice(0, 200).map((b) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11px] hover:bg-ot-muted/10", onClick: () => appendToInput(b.name), disabled: isSaving, title: "Add to input", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground/90", children: b.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] text-ot-muted", children: [b.region, !b.active ? ' • inactive' : ''] })] }, b.name)))) }), filteredSupported.length > 200 && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 text-[10px] text-ot-muted/70", children: "Showing first 200 results. Use search to narrow down." }))] }), error && ((0, jsx_runtime_1.jsx)(InlineError_1.InlineError, { message: error, onDismiss: () => setError(null) })), success && (0, jsx_runtime_1.jsx)("div", { className: "text-[10px] text-emerald-400", children: success })] }));
}
exports.default = BookmakerSelectionSection;
