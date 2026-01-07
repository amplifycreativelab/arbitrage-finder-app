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
exports.formatSignalPayload = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../components/ui/button");
const utils_1 = require("../../lib/utils");
const copyAndAdvance_1 = require("./copyAndAdvance");
const signalPayload_1 = require("./signalPayload");
const feedStore_1 = require("./stores/feedStore");
const isServerEnvironment = typeof document === 'undefined';
function SignalPreview({ opportunity, providerMetadata }) {
    const storeOpportunities = (0, feedStore_1.useFeedStore)((state) => state.opportunities);
    const selectedOpportunityId = (0, feedStore_1.useFeedStore)((state) => state.selectedOpportunityId);
    const storeProviderMetadata = (0, feedStore_1.useFeedStore)((state) => state.providerMetadata);
    const [copyState, setCopyState] = React.useState('idle');
    const [isCopying, setIsCopying] = React.useState(false);
    const effectiveOpportunity = React.useMemo(() => {
        if (opportunity) {
            return opportunity;
        }
        let opportunitiesFromStore = storeOpportunities;
        let idFromStore = selectedOpportunityId;
        if (isServerEnvironment) {
            const snapshot = feedStore_1.useFeedStore.getState();
            opportunitiesFromStore = snapshot.opportunities;
            idFromStore = snapshot.selectedOpportunityId;
        }
        if (!Array.isArray(opportunitiesFromStore) || opportunitiesFromStore.length === 0) {
            return null;
        }
        if (!idFromStore) {
            return null;
        }
        return (opportunitiesFromStore.find((candidate) => candidate.id === idFromStore) ??
            opportunitiesFromStore[0] ??
            null);
    }, [opportunity, storeOpportunities, selectedOpportunityId]);
    const effectiveProviderMetadata = providerMetadata ?? storeProviderMetadata ?? null;
    if (!effectiveOpportunity) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-center justify-center text-[11px] text-ot-foreground/60", "data-testid": "signal-preview-empty", children: "Select an opportunity from the feed to see its signal preview." }));
    }
    const payload = (0, signalPayload_1.formatSignalPayload)(effectiveOpportunity, effectiveProviderMetadata);
    const roiPercent = (effectiveOpportunity.roi * 100).toFixed(1);
    const handleCopyClick = () => {
        if (isCopying) {
            return;
        }
        setIsCopying(true);
        setCopyState('idle');
        void (0, copyAndAdvance_1.copyAndAdvanceCurrentOpportunity)()
            .then((result) => {
            if (result.success) {
                setCopyState('copied');
                window.setTimeout(() => {
                    setCopyState('idle');
                }, 1200);
            }
            else {
                setCopyState('error');
            }
        })
            .finally(() => {
            setIsCopying(false);
        });
    };
    const buttonLabel = copyState === 'copied' ? 'COPIED' : copyState === 'error' ? 'COPY FAILED' : 'COPY SIGNAL [Enter]';
    const buttonClassName = copyState === 'copied'
        ? 'bg-emerald-500 text-black hover:bg-emerald-400'
        : copyState === 'error'
            ? 'bg-red-500 text-black hover:bg-red-400'
            : undefined;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col", "data-testid": "signal-preview", "data-opportunity-id": effectiveOpportunity.id, children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between text-[10px] text-ot-foreground/60", children: [(0, jsx_runtime_1.jsx)("span", { children: effectiveProviderMetadata
                            ? `Provider: ${effectiveProviderMetadata.displayName}`
                            : 'Provider: (active)' }), (0, jsx_runtime_1.jsxs)("span", { className: "font-semibold text-ot-accent", children: ["ROI ", roiPercent, "%"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mb-2 flex justify-end", children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", className: (0, utils_1.cn)('px-3 py-1 text-[11px]', buttonClassName), onClick: handleCopyClick, disabled: isCopying, "data-testid": "copy-signal-button", children: buttonLabel }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-auto rounded-md border border-white/10 bg-black/80 p-3", children: (0, jsx_runtime_1.jsx)("pre", { className: "whitespace-pre-wrap break-words font-mono text-[11px] leading-snug", children: payload }) })] }));
}
var signalPayload_2 = require("./signalPayload");
Object.defineProperty(exports, "formatSignalPayload", { enumerable: true, get: function () { return signalPayload_2.formatSignalPayload; } });
exports.default = SignalPreview;
