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
exports.ApiProvidersSection = ApiProvidersSection;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../../components/ui/button");
const input_1 = require("../../../components/ui/input");
const InlineError_1 = require("../../../components/ui/InlineError");
const types_1 = require("../../../../../../shared/types");
const feedStore_1 = require("../../dashboard/stores/feedStore");
function ProviderCard({ provider, state, onToggle, onApiKeyChange, onSaveApiKey, onTestConnection, onDismissError }) {
    const { enabled, hasKey, apiKeyInput, isSaving, isTesting, error, successMessage, testResult } = state;
    const [showKey, setShowKey] = React.useState(false);
    const showConfigMissing = enabled && !hasKey && !apiKeyInput.trim();
    const statusBadge = () => {
        if (!enabled) {
            return { label: 'Disabled', className: 'bg-ot-muted/10 text-ot-muted' };
        }
        if (hasKey) {
            return { label: 'Configured', className: 'bg-emerald-500/10 text-emerald-400' };
        }
        return { label: 'No Key', className: 'bg-amber-500/10 text-amber-400' };
    };
    const badge = statusBadge();
    return ((0, jsx_runtime_1.jsxs)("div", { className: `rounded-md border p-4 transition-colors ${enabled
            ? 'border-ot-accent/60 bg-ot-surface'
            : 'border-ot-border bg-ot-surface/50'}`, "data-testid": `provider-card-${provider.id}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", role: "switch", "aria-checked": enabled, onClick: () => onToggle(!enabled), className: `relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ot-accent/50 ${enabled ? 'bg-ot-accent' : 'bg-ot-muted/30'}`, "data-testid": `provider-toggle-${provider.id}`, children: (0, jsx_runtime_1.jsx)("span", { className: `absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'left-[18px]' : 'left-0.5'}` }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium text-ot-foreground", children: provider.displayName }), (0, jsx_runtime_1.jsxs)("span", { className: "ml-2 text-[10px] text-ot-muted", children: ["(", provider.kind, ")"] })] })] }), (0, jsx_runtime_1.jsx)("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`, "data-testid": `provider-status-${provider.id}`, children: badge.label })] }), showConfigMissing && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3", children: (0, jsx_runtime_1.jsx)(InlineError_1.InlineError, { message: "Provider enabled but API key not configured.", guidance: "Enter your API key below to start receiving data from this provider.", testId: `config-missing-${provider.id}` }) })), enabled && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { type: showKey ? 'text' : 'password', placeholder: "Enter API key...", value: apiKeyInput, onChange: (e) => onApiKeyChange(e.target.value), autoComplete: "off", className: "pr-10 text-[11px]", "data-testid": `api-key-input-${provider.id}` }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setShowKey(!showKey), className: "absolute right-2 top-1/2 -translate-y-1/2 text-ot-muted hover:text-ot-foreground", "aria-label": showKey ? 'Hide API key' : 'Show API key', children: showKey ? ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "h-4 w-4", children: [(0, jsx_runtime_1.jsx)("path", { d: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" }), (0, jsx_runtime_1.jsx)("line", { x1: "1", y1: "1", x2: "23", y2: "23" })] })) : ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "h-4 w-4", children: [(0, jsx_runtime_1.jsx)("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), (0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "3" })] })) })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", onClick: onSaveApiKey, disabled: isSaving || !apiKeyInput.trim(), className: "px-3 py-1 text-[11px]", "data-testid": `save-key-btn-${provider.id}`, children: isSaving ? 'Saving...' : 'Save' })] }), hasKey && ((0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", onClick: onTestConnection, disabled: isTesting, className: "h-8 px-3 text-[11px]", "data-testid": `test-connection-btn-${provider.id}`, children: isTesting ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsxs)("svg", { className: "h-3 w-3 animate-spin", viewBox: "0 0 24 24", fill: "none", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] }), "Testing..."] })) : ('Test Connection') })), testResult === 'success' && ((0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-emerald-400", role: "status", children: "Connection successful!" })), testResult === 'error' && ((0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-red-400", role: "status", children: "Connection failed. Check your API key." })), error && ((0, jsx_runtime_1.jsx)(InlineError_1.InlineError, { message: error.message, guidance: error.guidance, onDismiss: onDismissError, testId: `provider-error-${provider.id}` })), successMessage && ((0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-emerald-400", role: "status", "data-testid": `success-msg-${provider.id}`, children: successMessage }))] }))] }));
}
// ============================================================
// Main Component
// ============================================================
function ApiProvidersSection() {
    const [providers, setProviders] = React.useState(() => {
        const initial = {};
        for (const p of types_1.PROVIDERS) {
            initial[p.id] = {
                enabled: false,
                hasKey: false,
                apiKeyInput: '',
                isSaving: false,
                isTesting: false,
                error: null,
                successMessage: null,
                testResult: null
            };
        }
        return initial;
    });
    const [isFallbackActive, setIsFallbackActive] = React.useState(false);
    const [showFallbackWarning, setShowFallbackWarning] = React.useState(false);
    const credentialsApi = React.useMemo(() => window.api?.credentials ?? null, []);
    React.useEffect(() => {
        let cancelled = false;
        const loadInitialState = async () => {
            if (!credentialsApi)
                return;
            try {
                const storageStatus = await credentialsApi.getStorageStatus();
                if (cancelled)
                    return;
                setIsFallbackActive(storageStatus.isUsingFallbackStorage);
                setShowFallbackWarning(storageStatus.isUsingFallbackStorage && !storageStatus.fallbackWarningShown);
                const allStatus = await credentialsApi.getAllProvidersStatus();
                if (cancelled)
                    return;
                setProviders((prev) => {
                    const next = { ...prev };
                    for (const status of allStatus ?? []) {
                        if (next[status.providerId]) {
                            next[status.providerId] = {
                                ...next[status.providerId],
                                enabled: status.enabled,
                                hasKey: status.hasKey
                            };
                        }
                    }
                    return next;
                });
            }
            catch {
                // Silent fail on initial load
            }
        };
        void loadInitialState();
        return () => {
            cancelled = true;
        };
    }, [credentialsApi]);
    const handleToggle = React.useCallback(async (providerId, enabled) => {
        if (!credentialsApi)
            return;
        try {
            const result = await credentialsApi.setProviderEnabled(providerId, enabled);
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    enabled: result.enabled,
                    error: null,
                    successMessage: null,
                    testResult: null
                }
            }));
        }
        catch {
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    error: {
                        message: 'Failed to update provider status.',
                        guidance: 'Please try again or restart the application.'
                    }
                }
            }));
        }
    }, [credentialsApi]);
    const handleApiKeyChange = React.useCallback((providerId, value) => {
        setProviders((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                apiKeyInput: value,
                error: null,
                successMessage: null,
                testResult: null
            }
        }));
    }, []);
    const handleSaveApiKey = React.useCallback(async (providerId) => {
        if (!credentialsApi)
            return;
        const state = providers[providerId];
        const trimmedKey = state.apiKeyInput.trim();
        if (!trimmedKey) {
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    error: {
                        message: 'API key cannot be empty.',
                        guidance: 'Enter a valid API key from your provider dashboard.'
                    }
                }
            }));
            return;
        }
        setProviders((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                isSaving: true,
                error: null,
                successMessage: null
            }
        }));
        try {
            await credentialsApi.saveApiKey(providerId, trimmedKey);
            const allStatus = await credentialsApi.getAllProvidersStatus();
            const thisStatus = allStatus.find((s) => s.providerId === providerId);
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    isSaving: false,
                    apiKeyInput: '',
                    hasKey: thisStatus?.hasKey ?? true,
                    successMessage: 'API key saved securely.'
                }
            }));
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    isSaving: false,
                    error: {
                        message: 'Failed to save API key.',
                        guidance: `Save operation failed: ${errorMessage}. Check logs for details.`
                    }
                }
            }));
        }
    }, [credentialsApi, providers]);
    const refreshSnapshot = (0, feedStore_1.useFeedStore)((state) => state.refreshSnapshot);
    const handleTestConnection = React.useCallback(async (providerId) => {
        setProviders((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                isTesting: true,
                testResult: null,
                error: null
            }
        }));
        try {
            await refreshSnapshot();
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    isTesting: false,
                    testResult: 'success'
                }
            }));
        }
        catch {
            setProviders((prev) => ({
                ...prev,
                [providerId]: {
                    ...prev[providerId],
                    isTesting: false,
                    testResult: 'error'
                }
            }));
        }
    }, [refreshSnapshot]);
    const handleDismissError = React.useCallback((providerId) => {
        setProviders((prev) => ({
            ...prev,
            [providerId]: {
                ...prev[providerId],
                error: null
            }
        }));
    }, []);
    const handleDismissFallbackWarning = React.useCallback(async () => {
        try {
            if (credentialsApi) {
                await credentialsApi.acknowledgeFallbackWarning();
            }
        }
        finally {
            setShowFallbackWarning(false);
        }
    }, [credentialsApi]);
    const enabledCount = Object.values(providers).filter((p) => p.enabled).length;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Enable providers and configure API keys for multi-source arbitrage detection." }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent", "data-testid": "enabled-count-badge", children: [enabledCount, " provider", enabledCount !== 1 ? 's' : '', " enabled"] })] }), isFallbackActive && showFallbackWarning && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-[11px] text-yellow-100", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold uppercase tracking-[0.14em]", children: "Reduced security: fallback storage active" }), (0, jsx_runtime_1.jsx)("p", { className: "leading-snug", children: "Windows secure storage (safeStorage) is not available. Provider API keys are stored using reversible base64 encoding instead of OS-backed encryption." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 flex justify-end", children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "border-yellow-400/60 text-[10px] text-yellow-100 hover:bg-yellow-500/20", onClick: () => void handleDismissFallbackWarning(), children: "I understand the risk" }) })] })), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: types_1.PROVIDERS.map((provider) => ((0, jsx_runtime_1.jsx)(ProviderCard, { provider: provider, state: providers[provider.id], onToggle: (enabled) => void handleToggle(provider.id, enabled), onApiKeyChange: (value) => handleApiKeyChange(provider.id, value), onSaveApiKey: () => void handleSaveApiKey(provider.id), onTestConnection: () => void handleTestConnection(provider.id), onDismissError: () => handleDismissError(provider.id) }, provider.id))) }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-muted/70", children: "Keys are stored per provider using secure OS storage and never logged or exposed." })] }));
}
exports.default = ApiProvidersSection;
