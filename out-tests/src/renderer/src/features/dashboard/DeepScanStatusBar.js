"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepScanStatusBar = DeepScanStatusBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const deepScanStore_1 = require("./stores/deepScanStore");
function formatMinutesAgo(timestamp) {
    if (!timestamp)
        return 'Never';
    const ms = new Date(timestamp).getTime();
    if (!Number.isFinite(ms))
        return 'Unknown';
    const diffMs = Math.max(0, Date.now() - ms);
    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 1)
        return 'Just now';
    if (diffMinutes === 1)
        return '1m ago';
    if (diffMinutes < 60)
        return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours === 1)
        return '1h ago';
    return `${hours}h ago`;
}
function DeepScanStatusBar() {
    const progress = (0, deepScanStore_1.useDeepScanStore)((state) => state.progress);
    const continuousStatus = (0, deepScanStore_1.useDeepScanStore)((state) => state.continuousStatus);
    const isScanning = progress.status === 'scanning' && progress.mode === 'continuous';
    const isPaused = continuousStatus.isPaused;
    // Calculate quota percentage for color indication
    const quotaPercent = continuousStatus.quotaStatus?.percentUsed ?? 0;
    const showQuotaWarning = quotaPercent >= 0.8;
    const showQuotaDanger = quotaPercent >= 0.9;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [isScanning && !isPaused && ((0, jsx_runtime_1.jsxs)("span", { className: "relative flex h-2 w-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }), (0, jsx_runtime_1.jsx)("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-emerald-500" })] })), isPaused && ((0, jsx_runtime_1.jsx)("span", { className: "h-2 w-2 rounded-full bg-amber-400" })), !isScanning && !isPaused && ((0, jsx_runtime_1.jsx)("span", { className: "h-2 w-2 rounded-full bg-ot-muted/50" })), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: isScanning
                            ? isPaused
                                ? 'Paused'
                                : `Scanning ${progress.eventsScanned}/${progress.eventsTotal || progress.eventsScanned} events`
                            : `Idle - Last scan: ${formatMinutesAgo(continuousStatus.lastContinuousScanAt)}` })] }), (0, jsx_runtime_1.jsxs)("div", { className: "hidden sm:flex items-center gap-2 text-[10px] text-ot-muted border-l border-ot-border pl-3", children: [(0, jsx_runtime_1.jsx)("span", { children: "Deep Scan:" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-semibold text-ot-foreground", children: [continuousStatus.opportunitiesFoundToday, " arbs today"] })] }), (showQuotaWarning || showQuotaDanger) && ((0, jsx_runtime_1.jsx)("div", { className: `hidden md:block h-1.5 w-8 rounded-full overflow-hidden ${showQuotaDanger ? 'bg-red-400/30' : 'bg-amber-400/30'}`, title: `Quota: ${Math.round(quotaPercent * 100)}%`, children: (0, jsx_runtime_1.jsx)("div", { className: `h-full ${showQuotaDanger ? 'bg-red-400' : 'bg-amber-400'}`, style: { width: `${Math.min(quotaPercent * 100, 100)}%` } }) }))] }));
}
exports.default = DeepScanStatusBar;
