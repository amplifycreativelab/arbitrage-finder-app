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
exports.CurrencyDisplaySection = CurrencyDisplaySection;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../../components/ui/button");
const InlineError_1 = require("../../../components/ui/InlineError");
const appSettingsStore_1 = require("../stores/appSettingsStore");
const trpc_1 = require("../../../lib/trpc");
const currency_1 = require("../../../../../../shared/lib/currency");
function RateAgeBadge({ lastFetched }) {
    const { status, hoursSince } = (0, currency_1.getRateAgeStatus)(lastFetched);
    const colorClass = (0, currency_1.getRateStatusColor)(status);
    const label = (0, currency_1.getRateStatusLabel)(status);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5 rounded-full bg-ot-surface px-2 py-0.5 text-[10px]", title: hoursSince !== null ? `${Math.round(hoursSince)} hours since last update` : 'Never fetched', children: [(0, jsx_runtime_1.jsx)("span", { className: `h-2 w-2 rounded-full ${colorClass}` }), (0, jsx_runtime_1.jsx)("span", { className: status === 'expired' ? 'text-red-400' : status === 'stale' ? 'text-yellow-400' : 'text-green-400', children: label })] }));
}
function RatesTable({ rates }) {
    const inverseRates = (0, currency_1.getInverseRates)(rates);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border bg-ot-surface/50 p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-[10px] font-medium text-ot-muted", children: "Current Rates (1 USD =)" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-1.5", children: currency_1.CURRENCIES.filter((c) => c !== 'USD').map((currency) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-[11px]", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-ot-foreground", children: [currency, " (", currency_1.CURRENCY_DETAILS[currency].symbol, ")"] }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono text-ot-accent", children: rates[currency].toFixed(4) })] }, currency))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border bg-ot-surface/50 p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-2 text-[10px] font-medium text-ot-muted", children: "Inverse Rates (to USD)" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-1.5", children: currency_1.CURRENCIES.filter((c) => c !== 'USD').map((currency) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-[11px]", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-ot-foreground", children: ["1 ", currency, " = ", currency_1.CURRENCY_DETAILS.USD.symbol] }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-ot-accent", children: [inverseRates[currency].toFixed(4), " USD"] })] }, `inv-${currency}`))) })] })] }));
}
function BaseCurrencySelector({ value, onChange }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[11px] font-medium text-ot-foreground", children: "Base Currency" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: currency_1.CURRENCIES.map((currency) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange(currency), className: `flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] transition-colors ${value === currency
                        ? 'border-ot-accent bg-ot-accent/10 text-ot-accent'
                        : 'border-ot-border bg-ot-surface text-ot-muted hover:text-ot-foreground'}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: currency_1.CURRENCY_DETAILS[currency].symbol }), (0, jsx_runtime_1.jsx)("span", { children: currency }), (0, jsx_runtime_1.jsxs)("span", { className: "text-ot-muted/60", children: ["- ", currency_1.CURRENCY_DETAILS[currency].name] })] }, currency))) })] }));
}
// ============================================================================
// Main Currency Display Section Component
// ============================================================================
function CurrencyDisplaySection() {
    const baseCurrency = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.baseCurrency);
    const exchangeRates = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.exchangeRates);
    const ratesLastFetched = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.ratesLastFetched);
    const setBaseCurrency = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.setBaseCurrency);
    const setExchangeRates = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.setExchangeRates);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [successMessage, setSuccessMessage] = React.useState(null);
    const isStale = ratesLastFetched ? (0, currency_1.getRateAgeStatus)(ratesLastFetched).status !== 'fresh' : true;
    const handleFetchRates = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await trpc_1.trpcClient.currencyFetchRates.mutate();
            setExchangeRates(result.rates, result.fetchedAt);
            setSuccessMessage('Rates updated successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch rates';
            setError(message);
        }
        finally {
            setIsLoading(false);
        }
    }, [setExchangeRates]);
    const handleBaseCurrencyChange = React.useCallback((currency) => {
        setBaseCurrency(currency);
    }, [setBaseCurrency]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Configure exchange rates for multi-currency calculations." }), (0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent", children: baseCurrency })] }), (0, jsx_runtime_1.jsx)(BaseCurrencySelector, { value: baseCurrency, onChange: handleBaseCurrencyChange }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", onClick: () => void handleFetchRates(), disabled: isLoading, className: "h-8 px-4 text-[11px]", children: isLoading ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsxs)("svg", { className: "h-3 w-3 animate-spin", viewBox: "0 0 24 24", fill: "none", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), "Fetching..."] })) : ('Fetch Rates') }), (0, jsx_runtime_1.jsx)(RateAgeBadge, { lastFetched: ratesLastFetched })] }), error && ((0, jsx_runtime_1.jsx)(InlineError_1.InlineError, { message: error, guidance: "Check your internet connection and try again.", onDismiss: () => setError(null) })), successMessage && ((0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-emerald-400", role: "status", children: successMessage })), (0, jsx_runtime_1.jsx)(RatesTable, { rates: exchangeRates }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 text-[10px] text-ot-muted", children: [(0, jsx_runtime_1.jsxs)("div", { children: ["Last updated: ", (0, currency_1.formatRelativeTime)(ratesLastFetched)] }), (0, jsx_runtime_1.jsx)("div", { className: "text-ot-muted/70", children: "Rates from Frankfurter API (api.frankfurter.app). No API key required." })] }), isStale && ratesLastFetched && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-[11px] text-yellow-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "h-3.5 w-3.5", children: [(0, jsx_runtime_1.jsx)("path", { d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })] }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: "Exchange rates are stale" })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 pl-5 text-yellow-200/80", children: "Consider refreshing for accurate calculations." })] })), !ratesLastFetched && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "h-3.5 w-3.5", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "16", x2: "12", y2: "12" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })] }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: "No exchange rates fetched yet" })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 pl-5 text-amber-200/80", children: "Click \"Fetch Rates\" to get the latest exchange rates." })] }))] }));
}
exports.default = CurrencyDisplaySection;
