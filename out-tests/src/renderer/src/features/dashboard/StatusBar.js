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
const types_1 = require("../../../../../shared/types");
const staleness_1 = require("./staleness");
function getSystemStatusClasses(status) {
    switch (status) {
        case 'OK':
            return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
        case 'Degraded':
            return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
        case 'Stale':
            return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100';
        case 'Error':
        default:
            return 'border-red-500/40 bg-red-500/10 text-red-300';
    }
}
function getProviderStatusClasses(status) {
    switch (status) {
        case 'OK':
            return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
        case 'Degraded':
        case 'QuotaLimited':
            return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
        case 'ConfigMissing':
            return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
        case 'Down':
        default:
            return 'border-red-500/40 bg-red-500/10 text-red-300';
    }
}
function getSystemStatusLabel(status) {
    switch (status) {
        case 'OK':
            return 'System OK';
        case 'Degraded':
            return 'System degraded';
        case 'Stale':
            return 'System stale';
        case 'Error':
        default:
            return 'System error';
    }
}
function getProviderStatusLabel(status) {
    switch (status) {
        case 'OK':
            return 'OK';
        case 'Degraded':
            return 'Degraded';
        case 'Down':
            return 'Down';
        case 'QuotaLimited':
            return 'Quota limited';
        case 'ConfigMissing':
            return 'Config missing';
        default:
            return status;
    }
}
function formatLastUpdated(snapshot, stalenessNow) {
    const timestamp = snapshot?.lastUpdatedAt ?? null;
    if (!timestamp) {
        return 'No recent data';
    }
    const info = (0, staleness_1.getStalenessInfo)({ foundAt: timestamp }, stalenessNow);
    return info.label || 'Just now';
}
function StatusBar({ stalenessNow, statusSnapshot, fetchedAt }) {
    const status = statusSnapshot;
    const systemStatus = status?.systemStatus ?? 'OK';
    const effectiveStatus = status ?? (fetchedAt ? { systemStatus: 'OK', providers: [], lastUpdatedAt: fetchedAt } : null);
    const providers = React.useMemo(() => {
        if (!effectiveStatus?.providers?.length) {
            return types_1.PROVIDERS.map((provider) => ({
                providerId: provider.id,
                displayName: provider.displayName,
                status: 'OK',
                lastSuccessfulFetchAt: null
            }));
        }
        const byId = new Map(effectiveStatus.providers.map((entry) => [entry.providerId, entry]));
        return types_1.PROVIDERS.map((provider) => {
            const entry = byId.get(provider.id);
            return {
                providerId: provider.id,
                displayName: provider.displayName,
                status: (entry?.status ?? 'OK'),
                lastSuccessfulFetchAt: entry?.lastSuccessfulFetchAt ?? null
            };
        });
    }, [effectiveStatus]);
    const lastUpdatedLabel = formatLastUpdated(effectiveStatus, stalenessNow);
    return ((0, jsx_runtime_1.jsxs)("section", { className: "mb-2 flex items-center justify-between gap-2 text-[10px]", "aria-label": "System and provider status", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60", children: "Status" }), (0, jsx_runtime_1.jsxs)("span", { className: `inline-flex items-center gap-2 rounded-full border px-2 py-[2px] ${getSystemStatusClasses(systemStatus)}`, "data-testid": "system-status-chip", "aria-label": getSystemStatusLabel(systemStatus), children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: systemStatus }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[9px] opacity-80", children: ["Updated ", lastUpdatedLabel] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center justify-end gap-1", "aria-label": "Provider statuses", children: providers.map((provider) => ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/20 px-2 py-[1px] text-[9px] text-ot-foreground/70", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: provider.displayName }), (0, jsx_runtime_1.jsx)("span", { className: `rounded-full border px-1 py-[1px] ${getProviderStatusClasses(provider.status)}`, "data-testid": `provider-status-${provider.providerId}`, "aria-label": `${provider.displayName} status ${getProviderStatusLabel(provider.status)}`, children: getProviderStatusLabel(provider.status) })] }, provider.providerId))) })] }));
}
exports.default = StatusBar;
