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
    const isDeepScan = effectiveOpportunity?.source === 'deepScan';
    const deepScanMeta = React.useMemo(() => {
        if (!effectiveOpportunity || !isDeepScan)
            return null;
        const timestamp = effectiveOpportunity.foundAt;
        try {
            const label = new Date(timestamp).toLocaleString();
            return `${label} - ${effectiveOpportunity.event.name}`;
        }
        catch {
            return `${timestamp} - ${effectiveOpportunity.event.name}`;
        }
    }, [isDeepScan, effectiveOpportunity?.foundAt, effectiveOpportunity?.event.name]);
    if (!effectiveOpportunity) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col items-center justify-center gap-4 text-ot-muted animate-fade-in", "data-testid": "signal-preview-empty", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-16 w-16 rounded-2xl bg-ot-surface-hover flex items-center justify-center", children: (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "h-8 w-8 opacity-50", children: [(0, jsx_runtime_1.jsx)("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), (0, jsx_runtime_1.jsx)("polyline", { points: "14 2 14 8 20 8" }), (0, jsx_runtime_1.jsx)("line", { x1: "16", y1: "13", x2: "8", y2: "13" }), (0, jsx_runtime_1.jsx)("line", { x1: "16", y1: "17", x2: "8", y2: "17" }), (0, jsx_runtime_1.jsx)("polyline", { points: "10 9 9 9 8 9" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm font-medium text-ot-foreground-secondary mb-1", children: "No Signal Selected" }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs opacity-70", children: "Select an opportunity from the feed to see its signal preview" })] })] }));
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col gap-3", "data-testid": "signal-preview", "data-opportunity-id": effectiveOpportunity.id, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2", children: isDeepScan ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 ot-badge ot-badge-deep-scan", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "11", cy: "11", r: "8" }), (0, jsx_runtime_1.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }), (0, jsx_runtime_1.jsx)("span", { children: "Deep Scan" }), deepScanMeta && (0, jsx_runtime_1.jsxs)("span", { className: "opacity-70", children: ["(", deepScanMeta, ")"] })] })) : effectiveOpportunity.isCrossProvider ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 ot-badge ot-badge-cross-provider", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3", children: (0, jsx_runtime_1.jsx)("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) }), (0, jsx_runtime_1.jsx)("span", { children: "Cross-Provider" }), effectiveOpportunity.mergedFrom && effectiveOpportunity.mergedFrom.length > 1 && ((0, jsx_runtime_1.jsxs)("span", { className: "opacity-70", children: ["(", effectiveOpportunity.mergedFrom.join(' + '), ")"] }))] })) : effectiveOpportunity.mergedFrom && effectiveOpportunity.mergedFrom.length > 1 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 ot-badge ot-badge-merged", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3", children: (0, jsx_runtime_1.jsx)("path", { d: "M12 5v14M5 12h14" }) }), (0, jsx_runtime_1.jsx)("span", { children: "Merged" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 text-xs text-ot-muted", children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4", children: [(0, jsx_runtime_1.jsx)("rect", { x: "2", y: "3", width: "20", height: "14", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("line", { x1: "8", y1: "21", x2: "16", y2: "21" }), (0, jsx_runtime_1.jsx)("line", { x1: "12", y1: "17", x2: "12", y2: "21" })] }), (0, jsx_runtime_1.jsx)("span", { children: effectiveProviderMetadata?.displayName || effectiveOpportunity.providerId || 'Active' })] })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-ot-muted", children: "ROI" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono font-bold text-lg text-ot-accent", children: [roiPercent, "%"] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-end", children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: copyState === 'copied' ? 'secondary' : copyState === 'error' ? 'danger' : 'primary', size: "sm", loading: isCopying, onClick: handleCopyClick, className: (0, utils_1.cn)(copyState === 'copied' && 'bg-ot-success hover:bg-ot-success text-white', copyState === 'error' && 'bg-ot-error hover:bg-ot-error'), "data-testid": "copy-signal-button", children: copyState === 'copied' ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 mr-1", children: (0, jsx_runtime_1.jsx)("polyline", { points: "20 6 9 17 4 12" }) }), "Copied!"] })) : copyState === 'error' ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 mr-1", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("line", { x1: "15", y1: "9", x2: "9", y2: "15" }), (0, jsx_runtime_1.jsx)("line", { x1: "9", y1: "9", x2: "15", y2: "15" })] }), "Failed"] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 mr-1", children: [(0, jsx_runtime_1.jsx)("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }), "Copy Signal"] })) }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-auto rounded-lg border border-ot-border bg-ot-background p-4 shadow-inner", children: (0, jsx_runtime_1.jsx)("pre", { className: "whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ot-foreground-secondary", children: payload }) })] }));
}
var signalPayload_2 = require("./signalPayload");
Object.defineProperty(exports, "formatSignalPayload", { enumerable: true, get: function () { return signalPayload_2.formatSignalPayload; } });
exports.default = SignalPreview;
