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
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const select_1 = require("../../components/ui/select");
const trpc_1 = require("../../lib/trpc");
const types_1 = require("../../../../../shared/types");
function ProviderSettings() {
    const [providerId, setProviderId] = React.useState(null);
    const [apiKey, setApiKey] = React.useState('');
    const [hasStoredKeyByProvider, setHasStoredKeyByProvider] = React.useState({
        'odds-api-io': null,
        'the-odds-api': null
    });
    const [statusMessage, setStatusMessage] = React.useState(null);
    const [errorMessage, setErrorMessage] = React.useState(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFallbackActive, setIsFallbackActive] = React.useState(false);
    const [showFallbackWarning, setShowFallbackWarning] = React.useState(false);
    const credentialsApi = React.useMemo(() => (window.api?.credentials ?? null), []);
    React.useEffect(() => {
        let cancelled = false;
        const loadStorageStatus = async () => {
            if (!credentialsApi) {
                return;
            }
            try {
                const status = await credentialsApi.getStorageStatus();
                if (cancelled)
                    return;
                setIsFallbackActive(status.isUsingFallbackStorage);
                setShowFallbackWarning(status.isUsingFallbackStorage && !status.fallbackWarningShown);
            }
            catch {
                if (!cancelled) {
                    setStatusMessage('Unable to load credential storage status.');
                }
            }
        };
        const loadProviderAndKeyStatus = async () => {
            let initialProviderId = types_1.DEFAULT_PROVIDER_ID;
            try {
                const result = await trpc_1.trpcClient.getActiveProvider.query();
                if (!cancelled && (0, types_1.isProviderId)(result.providerId)) {
                    initialProviderId = result.providerId;
                }
            }
            catch {
                // Fallback to DEFAULT_PROVIDER_ID if active provider cannot be loaded.
            }
            if (cancelled)
                return;
            setProviderId(initialProviderId);
            try {
                if (!credentialsApi)
                    return;
                const configured = await credentialsApi.isProviderConfigured(initialProviderId);
                if (cancelled)
                    return;
                setHasStoredKeyByProvider((prev) => ({
                    ...prev,
                    [initialProviderId]: configured
                }));
            }
            catch {
                if (!cancelled) {
                    setHasStoredKeyByProvider((prev) => ({
                        ...prev,
                        [initialProviderId]: null
                    }));
                }
            }
        };
        void loadStorageStatus();
        void loadProviderAndKeyStatus();
        return () => {
            cancelled = true;
        };
    }, []);
    const refreshKeyStatus = React.useCallback(async (targetProviderId) => {
        if (!credentialsApi) {
            return;
        }
        try {
            const configured = await credentialsApi.isProviderConfigured(targetProviderId);
            setHasStoredKeyByProvider((prev) => ({
                ...prev,
                [targetProviderId]: configured
            }));
        }
        catch {
            setHasStoredKeyByProvider((prev) => ({
                ...prev,
                [targetProviderId]: null
            }));
        }
    }, []);
    const handleProviderChange = async (nextProviderId) => {
        if (!(0, types_1.isProviderId)(nextProviderId))
            return;
        setProviderId(nextProviderId);
        setApiKey('');
        setStatusMessage(null);
        setErrorMessage(null);
        try {
            await trpc_1.trpcClient.setActiveProvider.mutate({ providerId: nextProviderId });
        }
        catch {
            setStatusMessage('Unable to persist selected provider.');
        }
        await refreshKeyStatus(nextProviderId);
    };
    const handleSave = async (event) => {
        event.preventDefault();
        if (!providerId) {
            setErrorMessage('A provider must be selected.');
            return;
        }
        const trimmedKey = apiKey.trim();
        if (!trimmedKey) {
            setErrorMessage('API key cannot be empty or whitespace.');
            return;
        }
        if (!credentialsApi) {
            setErrorMessage('Credential bridge is not available.');
            return;
        }
        setIsSubmitting(true);
        setStatusMessage(null);
        setErrorMessage(null);
        try {
            await credentialsApi.saveApiKey(providerId, trimmedKey);
            setStatusMessage('API key saved securely.');
            setApiKey('');
            await refreshKeyStatus(providerId);
        }
        catch {
            setStatusMessage('Failed to save API key. See logs for details.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleDismissWarning = async () => {
        try {
            if (credentialsApi) {
                await credentialsApi.acknowledgeFallbackWarning();
            }
        }
        finally {
            setShowFallbackWarning(false);
        }
    };
    const currentKeyConfigured = providerId !== null ? hasStoredKeyByProvider[providerId] ?? null : null;
    return ((0, jsx_runtime_1.jsxs)("section", { className: "mt-4 space-y-3 rounded-md border border-ot-accent/40 bg-black/40 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Provider Credentials" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[11px] text-ot-foreground/70", children: "Configure API keys for odds providers via secure IPC." })] }), currentKeyConfigured !== null && ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent", children: currentKeyConfigured ? 'Key configured' : 'No key set' }))] }), isFallbackActive && showFallbackWarning && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-100", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-semibold uppercase tracking-[0.14em]", children: "Reduced security: fallback storage active" }), (0, jsx_runtime_1.jsx)("p", { className: "leading-snug", children: "Windows secure storage (safeStorage) is not available. Provider API keys are stored using reversible base64 encoding instead of OS-backed encryption. Use this mode only for development or low-risk environments." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1 flex justify-end", children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", className: "border-yellow-400/60 text-[10px] text-yellow-100 hover:bg-yellow-500/20", onClick: () => void handleDismissWarning(), children: "I understand the risk" }) })] })), (0, jsx_runtime_1.jsxs)("form", { className: "space-y-2", onSubmit: (event) => void handleSave(event), children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[11px] font-medium text-ot-foreground/80", htmlFor: "provider-id", children: "Provider" }), (0, jsx_runtime_1.jsx)(select_1.Select, { id: "provider-id", value: providerId ?? types_1.DEFAULT_PROVIDER_ID, onValueChange: (value) => {
                                    void handleProviderChange(value);
                                }, children: types_1.PROVIDERS.map((provider) => ((0, jsx_runtime_1.jsx)("option", { value: provider.id, children: provider.label }, provider.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[11px] font-medium text-ot-foreground/80", htmlFor: "provider-api-key", children: "API key" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "provider-api-key", type: "password", value: apiKey, onChange: (event) => setApiKey(event.target.value), autoComplete: "off" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-foreground/60", children: "Keys are stored per provider and never logged or written to plain-text config." })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between gap-2", children: (0, jsx_runtime_1.jsx)(button_1.Button, { disabled: isSubmitting, type: "submit", className: "px-3 py-1 text-[11px]", children: isSubmitting ? 'Saving…' : 'Save API key' }) })] }), errorMessage && ((0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-red-400", role: "alert", children: errorMessage })), statusMessage && ((0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-foreground/70", role: "status", children: statusMessage }))] }));
}
exports.default = ProviderSettings;
