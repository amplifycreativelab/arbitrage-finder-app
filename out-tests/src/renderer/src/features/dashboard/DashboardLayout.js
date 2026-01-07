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
const SystemErrorBar_1 = require("../../components/ui/SystemErrorBar");
const ErrorBanner_1 = require("../../components/ui/ErrorBanner");
const dashboardErrorStore_1 = require("./stores/dashboardErrorStore");
const feedStore_1 = require("./stores/feedStore");
const trpc_1 = require("../../lib/trpc");
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
    const systemError = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.systemError);
    const providerErrors = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.providerErrors);
    const dismissSystemError = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.dismissSystemError);
    const dismissProviderError = (0, dashboardErrorStore_1.useDashboardErrorStore)((state) => state.dismissProviderError);
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 flex-col overflow-hidden", children: [showSystemError && ((0, jsx_runtime_1.jsx)(SystemErrorBar_1.SystemErrorBar, { message: systemError.mappedError.message, correlationId: systemError.mappedError.originalError.correlationId, onRetry: handleRetry, onViewLogs: handleViewLogs, onDismiss: dismissSystemError })), activeProviderErrors.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col gap-1 px-4 py-2", "data-testid": "provider-error-banners", children: activeProviderErrors.map(([providerId, error]) => ((0, jsx_runtime_1.jsx)(ErrorBanner_1.ErrorBanner, { providerName: providerId, status: errorCodeToProviderStatus(error.mappedError.originalError.code), errorSummary: error.mappedError.message, actionText: error.mappedError.actionText, onAction: handleProviderRetry, onDismiss: () => dismissProviderError(providerId), testId: `provider-error-${providerId}` }, error.id))) })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 gap-4 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-4", "data-testid": "dashboard-layout", children: [(0, jsx_runtime_1.jsxs)("section", { "aria-label": "Feed", className: "flex w-[380px] min-w-[360px] max-w-[440px] flex-col gap-3 border-r border-white/10 pr-4", "data-testid": "feed-pane", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Feed" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Opportunities" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 rounded-md border border-white/10 bg-black/40 p-3 text-[11px] text-ot-foreground/70", children: feed ?? (0, jsx_runtime_1.jsx)(FeedPane_1.default, {}) })] }), (0, jsx_runtime_1.jsxs)("section", { "aria-label": "Signal preview and settings", className: "flex min-w-0 flex-1 flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 rounded-md border border-white/10 bg-black/40 p-3", "data-testid": "signal-preview-pane", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Signal Preview" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Layout shell" })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 flex h-full flex-col rounded-md border border-white/10 bg-black/60 p-3 text-[11px] font-mono text-ot-foreground/80", children: signalPreview ?? (0, jsx_runtime_1.jsx)(SignalPreview_1.default, {}) })] }), (0, jsx_runtime_1.jsx)("section", { className: "rounded-md border border-white/10 bg-black/40 p-3", children: (0, jsx_runtime_1.jsx)(ProviderSettings_1.default, {}) })] })] })] }));
}
exports.default = DashboardLayout;
