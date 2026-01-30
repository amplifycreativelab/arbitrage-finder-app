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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const ProviderSettings_1 = __importDefault(require("../settings/ProviderSettings"));
const FeedPane_1 = __importDefault(require("./FeedPane"));
const SignalPreview_1 = __importDefault(require("./SignalPreview"));
const BestOddsPanel_1 = __importDefault(require("./BestOddsPanel"));
const DeepScanPanel_1 = __importDefault(require("./DeepScanPanel"));
const CalculatorPanel_1 = __importDefault(require("./components/CalculatorPanel"));
const OddsBrowser_1 = require("../odds-browser/OddsBrowser");
const SystemErrorBar_1 = require("../../components/ui/SystemErrorBar");
const ErrorBanner_1 = require("../../components/ui/ErrorBanner");
const dashboardErrorStore_1 = require("./stores/dashboardErrorStore");
const feedStore_1 = require("./stores/feedStore");
const calculatorStore_1 = require("./stores/calculatorStore");
const trpc_1 = require("../../lib/trpc");
const utils_1 = require("../../lib/utils");
// Story 7.7 Task 6.3: Persist user's right pane view preference
const STORAGE_KEY_RIGHT_PANE = 'arb-finder-right-pane-view';
function loadRightPanePreference() {
    if (typeof localStorage === 'undefined')
        return 'signal-preview';
    const saved = localStorage.getItem(STORAGE_KEY_RIGHT_PANE);
    return saved === 'best-odds' ? 'best-odds' : 'signal-preview';
}
/** Maps error codes to ProviderStatus for banner rendering */
function errorCodeToProviderStatus(code) {
    switch (code) {
        case 'PROVIDER_RATE_LIMITED':
        case 'QUOTA_EXCEEDED':
            return 'QuotaLimited';
        case 'PROVIDER_UNAVAILABLE':
            return 'Down';
        case 'PROVIDER_TIMEOUT':
        case 'PROVIDER_RESPONSE_INVALID':
            return 'Degraded';
        case 'MISSING_API_KEY':
        case 'INVALID_API_KEY':
            return 'ConfigMissing';
        default:
            return 'Down';
    }
}
function DashboardLayout({ feed, signalPreview }) {
    const [activeTab, setActiveTab] = React.useState('arbitrage');
    // Story 7.7 Task 6: State for right pane view (Signal Preview vs Best Odds)
    const [rightPaneView, setRightPaneView] = React.useState(loadRightPanePreference);
    // Story 7.7 Task 6.3: Persist right pane preference
    const handleRightPaneChange = (view) => {
        setRightPaneView(view);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_RIGHT_PANE, view);
        }
    };
    const systemError = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.systemError);
    const providerErrors = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.providerErrors);
    const dismissSystemError = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.dismissSystemError);
    const dismissProviderError = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.dismissProviderError);
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
    const isCalculatorOpen = (0, calculatorStore_1.useCalculatorStore)((state) => state.isOpen);
    const calculatorDisplayMode = (0, calculatorStore_1.useCalculatorStore)((state) => state.displayMode);
    const handleRetry = React.useCallback(() => {
        dismissSystemError();
        void refreshSnapshot();
    }, [dismissSystemError, refreshSnapshot]);
    const handleViewLogs = React.useCallback(() => {
        void trpc_1.trpcClient.openLogDirectory.mutate().catch((err) => {
            console.error('Failed to open log directory:', err);
        });
    }, []);
    const handleProviderRetry = React.useCallback(() => {
        void refreshSnapshot();
    }, [refreshSnapshot]);
    const showSystemError = systemError && !systemError.dismissed;
    const activeProviderErrors = Array.from(providerErrors.entries()).filter(([, error]) => !error.dismissed);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 flex-col overflow-hidden", children: [showSystemError && ((0, jsx_runtime_1.jsx)(SystemErrorBar_1.SystemErrorBar, { message: systemError.mappedError.message, correlationId: systemError.mappedError.originalError.correlationId, onRetry: handleRetry, onViewLogs: handleViewLogs, onDismiss: dismissSystemError })), activeProviderErrors.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col gap-1 px-4 py-2", "data-testid": "provider-error-banners", children: activeProviderErrors.map(([providerId, error]) => ((0, jsx_runtime_1.jsx)(ErrorBanner_1.ErrorBanner, { providerName: providerId, status: errorCodeToProviderStatus(error.mappedError.originalError.code), errorSummary: error.mappedError.message, actionText: error.mappedError.actionText, onAction: handleProviderRetry, onDismiss: () => dismissProviderError(providerId), testId: `provider-error-${providerId}` }, error.id))) })), (0, jsx_runtime_1.jsxs)("div", { className: "flex border-b border-ot-border bg-ot-surface px-4", "data-testid": "dashboard-tabs", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActiveTab('arbitrage'), className: (0, utils_1.cn)('relative px-4 py-2 text-[11px] font-medium transition-colors', activeTab === 'arbitrage'
                            ? 'text-ot-accent'
                            : 'text-ot-muted hover:text-ot-foreground'), "data-testid": "tab-arbitrage", "aria-selected": activeTab === 'arbitrage', role: "tab", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3.5 w-3.5", children: (0, jsx_runtime_1.jsx)("path", { d: "M12 2v20M2 12h20" }) }), "Arbitrage Feed"] }), activeTab === 'arbitrage' && ((0, jsx_runtime_1.jsx)("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-ot-accent" }))] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActiveTab('odds-browser'), className: (0, utils_1.cn)('relative px-4 py-2 text-[11px] font-medium transition-colors', activeTab === 'odds-browser'
                            ? 'text-ot-accent'
                            : 'text-ot-muted hover:text-ot-foreground'), "data-testid": "tab-odds-browser", "aria-selected": activeTab === 'odds-browser', role: "tab", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3.5 w-3.5", children: [(0, jsx_runtime_1.jsx)("path", { d: "M3 3v18h18" }), (0, jsx_runtime_1.jsx)("path", { d: "M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" })] }), "Odds Browser"] }), activeTab === 'odds-browser' && ((0, jsx_runtime_1.jsx)("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-ot-accent" }))] })] }), isCalculatorOpen && calculatorDisplayMode === 'modal' && (0, jsx_runtime_1.jsx)(CalculatorPanel_1.default, {}), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-1 gap-4 overflow-hidden rounded-lg border border-ot-border bg-ot-background p-4", "data-testid": "dashboard-layout", children: activeTab === 'arbitrage' ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { "aria-label": "Feed", className: (0, utils_1.cn)('flex min-w-[360px] flex-col gap-3 border-r border-ot-border pr-4 transition-all', isCalculatorOpen && calculatorDisplayMode === 'inline' ? 'flex-1' : 'flex-1'), "data-testid": "feed-pane", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Feed" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: "Opportunities" })] }), (0, jsx_runtime_1.jsx)(DeepScanPanel_1.default, {}), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 rounded-md border border-ot-border bg-ot-background p-3 text-[11px] text-ot-muted", children: feed ?? (0, jsx_runtime_1.jsx)(FeedPane_1.default, {}) })] }), isCalculatorOpen && calculatorDisplayMode === 'inline' && ((0, jsx_runtime_1.jsx)("section", { "aria-label": "Surebet Calculator", className: "flex shrink-0 flex-col", "data-testid": "calculator-section", children: (0, jsx_runtime_1.jsx)(CalculatorPanel_1.default, {}) })), (0, jsx_runtime_1.jsxs)("section", { "aria-label": "Signal preview and settings", className: "flex min-w-0 flex-1 flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 rounded-md border border-ot-border bg-ot-background", "data-testid": "signal-preview-pane", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 border-b border-ot-border px-3 py-1.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleRightPaneChange('signal-preview'), className: (0, utils_1.cn)('relative px-3 py-1.5 text-[10px] font-medium transition-colors rounded-t', rightPaneView === 'signal-preview'
                                                        ? 'text-ot-accent bg-ot-accent/10'
                                                        : 'text-ot-muted hover:text-ot-foreground'), "data-testid": "tab-signal-preview", "aria-selected": rightPaneView === 'signal-preview', children: "Signal Preview" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleRightPaneChange('best-odds'), className: (0, utils_1.cn)('relative px-3 py-1.5 text-[10px] font-medium transition-colors rounded-t', rightPaneView === 'best-odds'
                                                        ? 'text-ot-accent bg-ot-accent/10'
                                                        : 'text-ot-muted hover:text-ot-foreground'), "data-testid": "tab-best-odds", "aria-selected": rightPaneView === 'best-odds', children: "Best Odds" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 p-3", children: rightPaneView === 'signal-preview' ? ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full flex-col rounded-md border border-ot-border bg-ot-background p-3 text-[11px] font-mono text-ot-foreground", children: signalPreview ?? (0, jsx_runtime_1.jsx)(SignalPreview_1.default, {}) })) : ((0, jsx_runtime_1.jsx)("div", { className: "h-full", children: (0, jsx_runtime_1.jsx)(BestOddsPanel_1.default, {}) })) })] }), (0, jsx_runtime_1.jsx)("section", { className: "rounded-md border border-ot-border bg-ot-background p-3", children: (0, jsx_runtime_1.jsx)(ProviderSettings_1.default, {}) })] })] })) : ((0, jsx_runtime_1.jsx)("section", { "aria-label": "Odds Browser", className: "flex flex-1 flex-col overflow-hidden", "data-testid": "odds-browser-pane", children: (0, jsx_runtime_1.jsx)(OddsBrowser_1.OddsBrowser, { className: "flex h-full flex-col" }) })) })] }));
}
exports.default = DashboardLayout;
