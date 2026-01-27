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
const deepScanStore_1 = require("./stores/deepScanStore");
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
function formatMinutesAgo(timestamp) {
    if (!timestamp)
        return 'never';
    const ms = new Date(timestamp).getTime();
    if (!Number.isFinite(ms))
        return 'unknown';
    const diffMs = Math.max(0, Date.now() - ms);
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 1)
        return 'just now';
    if (diffMinutes === 1)
        return '1m ago';
    if (diffMinutes < 60)
        return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours === 1)
        return '1h ago';
    return `${hours}h ago`;
}
function getContinuousStatusLabel(status, progress) {
    if (!status.enabled) {
        return 'Continuous off';
    }
    const isContinuousScanActive = progress.mode === 'continuous' && progress.status === 'scanning';
    if (isContinuousScanActive) {
        const eventsTotalSafe = progress.eventsTotal > 0 ? progress.eventsTotal : progress.eventsScanned;
        const marketsScanned = progress.marketsScanned ?? 0;
        const arbsFound = progress.opportunitiesFound;
        return `Scanning: ${progress.eventsScanned}/${eventsTotalSafe} events (${marketsScanned} markets, ${arbsFound} arbs)`;
    }
    if (status.isActive) {
        return 'Scanning...';
    }
    const arbsToday = status.opportunitiesFoundToday ?? 0;
    return `Idle - ${arbsToday} arbs today - Last: ${formatMinutesAgo(status.lastContinuousScanAt)}`;
}
function formatCacheExpiryTooltip(status) {
    const entries = status.cacheEntries ?? 0;
    const ttl = status.cacheTtlMinutes ?? 5;
    const oldestAgeMs = status.cacheOldestEntryAgeMs;
    if (entries === 0) {
        return `Cache: empty (TTL: ${ttl}m)`;
    }
    if (oldestAgeMs === null || oldestAgeMs === undefined) {
        return `Cache: ${entries} events (TTL: ${ttl}m)`;
    }
    const remainingMs = Math.max(0, ttl * 60_000 - oldestAgeMs);
    const remainingMinutes = Math.ceil(remainingMs / 60_000);
    return `Cache: ${entries} events (oldest expires in ${remainingMinutes}m)`;
}
function getQuotaWarningLevel(requestsToday) {
    const hourlyLimit = 5000;
    // Rough estimate: if they're using more than 4000 requests in a day, they might be hitting hourly limits
    if (requestsToday >= hourlyLimit * 0.9)
        return 'critical';
    if (requestsToday >= hourlyLimit * 0.8)
        return 'warn';
    return 'none';
}
function StatusBar({ stalenessNow, statusSnapshot, fetchedAt }) {
    const status = statusSnapshot;
    const continuousStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.continuousStatus);
    const progress = (0, deepScanStore_1.useDeepScanStore)((state) => state.progress);
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
    return ((0, jsx_runtime_1.jsxs)("section", { className: "mb-2 flex items-center justify-between gap-2 text-[10px]", "aria-label": "System and provider status", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60", children: "Status" }), (0, jsx_runtime_1.jsxs)("span", { className: `inline-flex items-center gap-2 rounded-full border px-2 py-[2px] ${getSystemStatusClasses(systemStatus)}`, "data-testid": "system-status-chip", "aria-label": getSystemStatusLabel(systemStatus), children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold", children: systemStatus }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[9px] opacity-80", children: ["Updated ", lastUpdatedLabel] })] }), (0, jsx_runtime_1.jsxs)("span", { className: `inline-flex items-center gap-2 rounded-full border border-ot-border bg-ot-surface px-2 py-[2px] text-[9px] text-ot-muted ${continuousStatus.isActive ? 'animate-pulse border-ot-accent/60 text-ot-accent' : ''}`, "aria-label": "Continuous deep scan status", title: formatCacheExpiryTooltip(continuousStatus), children: [(0, jsx_runtime_1.jsx)("span", { className: `h-1.5 w-1.5 rounded-full ${continuousStatus.enabled ? (continuousStatus.isActive ? 'bg-ot-accent' : 'bg-emerald-400') : 'bg-ot-muted/60'}` }), (0, jsx_runtime_1.jsx)("span", { children: getContinuousStatusLabel(continuousStatus, progress) }), getQuotaWarningLevel(continuousStatus.requestsToday ?? 0) === 'warn' && ((0, jsx_runtime_1.jsx)("span", { className: "text-amber-400", title: "High API usage", children: "\u26A0" })), getQuotaWarningLevel(continuousStatus.requestsToday ?? 0) === 'critical' && ((0, jsx_runtime_1.jsx)("span", { className: "text-red-400", title: "Near quota limit", children: "\u26A0" }))] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center justify-end gap-1", "aria-label": "Provider statuses", children: providers.map((provider) => ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-full border border-ot-border bg-ot-surface px-2 py-[1px] text-[9px] text-ot-muted", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: provider.displayName }), (0, jsx_runtime_1.jsx)("span", { className: `rounded-full border px-1 py-[1px] ${getProviderStatusClasses(provider.status)}`, "data-testid": `provider-status-${provider.providerId}`, "aria-label": `${provider.displayName} status ${getProviderStatusLabel(provider.status)}`, children: getProviderStatusLabel(provider.status) })] }, provider.providerId))) })] }));
}
exports.default = StatusBar;
