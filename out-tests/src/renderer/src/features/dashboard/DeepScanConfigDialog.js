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
exports.DeepScanConfigDialog = DeepScanConfigDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const types_1 = require("../../../../../shared/types");
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const feedFiltersStore_1 = require("./stores/feedFiltersStore");
function parseEventIds(value) {
    return value
        .split(/[,\s]+/)
        .map((id) => id.trim())
        .filter(Boolean);
}
function DeepScanConfigDialog({ open, initialConfig, onClose, onStart }) {
    const [eventIdsText, setEventIdsText] = React.useState('');
    const [globalMinRoiPercent, setGlobalMinRoiPercent] = React.useState(0);
    const [marketGroupMinRoi, setMarketGroupMinRoi] = React.useState({});
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const deepScanRoiThresholds = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.deepScanRoiThresholds);
    const setDeepScanGlobalMinRoi = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanGlobalMinRoi);
    const setDeepScanMarketGroupMinRoi = (0, feedFiltersStore_1.useFeedFiltersStore)((state) => state.setDeepScanMarketGroupMinRoi);
    const normalizePercent = (value) => {
        return Number.isFinite(value) && value > 0 ? value : 0;
    };
    React.useEffect(() => {
        if (!open) {
            return;
        }
        const nextEventIds = initialConfig?.eventIds?.join(', ') ?? '';
        setEventIdsText(nextEventIds);
        setGlobalMinRoiPercent(deepScanRoiThresholds.globalMinRoi * 100);
        const percentOverrides = {};
        for (const display of types_1.MARKET_GROUP_DISPLAYS) {
            const value = deepScanRoiThresholds.marketGroupMinRoi[display.group];
            if (value && value > 0) {
                percentOverrides[display.group] = value * 100;
            }
        }
        setMarketGroupMinRoi(percentOverrides);
        setShowAdvanced(false);
    }, [open, initialConfig, deepScanRoiThresholds]);
    const handleStart = () => {
        const eventIds = parseEventIds(eventIdsText);
        if (eventIds.length === 0) {
            return;
        }
        const globalMinRoi = normalizePercent(globalMinRoiPercent) / 100;
        setDeepScanGlobalMinRoi(globalMinRoi);
        for (const display of types_1.MARKET_GROUP_DISPLAYS) {
            const percentValue = normalizePercent(marketGroupMinRoi[display.group] ?? 0);
            setDeepScanMarketGroupMinRoi(display.group, percentValue / 100);
        }
        onStart({
            eventIds,
            minRoi: globalMinRoi
        });
    };
    if (!open) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4", role: "dialog", "aria-modal": "true", "data-testid": "deep-scan-config-dialog", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-lg rounded-lg border border-ot-border bg-ot-background p-4 shadow-lg", children: [(0, jsx_runtime_1.jsxs)("header", { className: "mb-3 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold uppercase tracking-[0.12em] text-ot-accent", children: "Deep Scan Scope" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-xs text-ot-muted hover:text-ot-foreground", onClick: onClose, "aria-label": "Close deep scan dialog", children: "Close" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 text-[11px] text-ot-foreground", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] uppercase tracking-[0.12em] text-ot-muted", children: "Event IDs" }), (0, jsx_runtime_1.jsx)(input_1.Input, { value: eventIdsText, onChange: (event) => setEventIdsText(event.target.value), placeholder: "evt-123, evt-456", "data-testid": "deep-scan-event-ids" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: "Comma or space separated. MVP supports event-level scans." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-[10px] uppercase tracking-[0.12em] text-ot-muted", children: ["Global Minimum ROI (", globalMinRoiPercent.toFixed(1), "%)"] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: 0, max: 10, step: 0.5, value: globalMinRoiPercent, onChange: (event) => setGlobalMinRoiPercent(Number.parseFloat(event.target.value) || 0), className: "h-2 w-full cursor-pointer appearance-none rounded bg-ot-border/60 accent-ot-accent", "data-testid": "deep-scan-min-roi-slider" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { type: "number", min: 0, step: 0.5, value: globalMinRoiPercent.toFixed(1), onChange: (event) => setGlobalMinRoiPercent(Number.parseFloat(event.target.value) || 0), className: "h-7 w-24 text-[11px]", "data-testid": "deep-scan-min-roi-input" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-muted", children: "%" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-ot-border/70 bg-ot-surface/40 p-2", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "flex w-full items-center justify-between text-left text-[10px] uppercase tracking-[0.12em] text-ot-muted", onClick: () => setShowAdvanced((value) => !value), "aria-expanded": showAdvanced, children: [(0, jsx_runtime_1.jsx)("span", { children: "Advanced: Per-Market ROI Overrides" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-accent", children: showAdvanced ? 'Hide' : 'Show' })] }), showAdvanced ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 grid gap-2", children: types_1.MARKET_GROUP_DISPLAYS.map((display) => {
                                        const percentValue = marketGroupMinRoi[display.group] ?? 0;
                                        return ((0, jsx_runtime_1.jsxs)("label", { className: "flex items-center justify-between gap-2 text-[11px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-ot-foreground", children: display.label }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { type: "number", min: 0, step: 0.5, value: percentValue.toFixed(1), onChange: (event) => setMarketGroupMinRoi((prev) => ({
                                                                ...prev,
                                                                [display.group]: Number.parseFloat(event.target.value) || 0
                                                            })), className: "h-7 w-24 text-[11px]", "aria-label": `${display.label} minimum ROI percent` }), (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-ot-muted", children: "%" })] })] }, display.group));
                                    }) })) : null] })] }), (0, jsx_runtime_1.jsxs)("footer", { className: "mt-4 flex items-center justify-end gap-2", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: onClose, "data-testid": "deep-scan-cancel-config", children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: handleStart, "data-testid": "deep-scan-confirm-start", children: "Start Scan" })] })] }) }));
}
exports.default = DeepScanConfigDialog;
