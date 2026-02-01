"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBanner = ErrorBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function getStatusStyles(status) {
    switch (status) {
        case 'QuotaLimited':
            return {
                container: 'border-ot-warning/30 bg-ot-warning-dim',
                icon: 'text-ot-warning',
                badge: 'border-ot-warning/30 text-ot-warning bg-ot-warning-dim'
            };
        case 'Degraded':
            return {
                container: 'border-amber-500/30 bg-amber-500/10',
                icon: 'text-amber-500',
                badge: 'border-amber-500/30 text-amber-500 bg-amber-500/10'
            };
        case 'ConfigMissing':
            return {
                container: 'border-ot-info/30 bg-ot-info-dim',
                icon: 'text-ot-info',
                badge: 'border-ot-info/30 text-ot-info bg-ot-info-dim'
            };
        case 'Down':
        default:
            return {
                container: 'border-ot-error/30 bg-ot-error-dim',
                icon: 'text-ot-error',
                badge: 'border-ot-error/30 text-ot-error bg-ot-error-dim'
            };
    }
}
function getStatusIcon(status) {
    const iconClass = 'h-4 w-4 flex-shrink-0';
    switch (status) {
        case 'QuotaLimited':
            return ((0, jsx_runtime_1.jsx)("svg", { className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) }));
        case 'Degraded':
            return ((0, jsx_runtime_1.jsx)("svg", { className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }));
        case 'ConfigMissing':
            return ((0, jsx_runtime_1.jsxs)("svg", { className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: [(0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })] }));
        case 'Down':
        default:
            return ((0, jsx_runtime_1.jsx)("svg", { className: iconClass, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" }) }));
    }
}
/**
 * ErrorBanner - Displays provider errors as non-blocking banners.
 * Used for HTTP 5xx, 429 rate-limited, timeout errors.
 * Shows provider name, error type, last success, and actionable CTA.
 */
function ErrorBanner({ providerName, status, errorSummary, lastSuccess, actionText, onAction, onDismiss, className, testId = 'error-banner' }) {
    const styles = getStatusStyles(status);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex items-start gap-3 rounded-lg border px-4 py-3 text-xs animate-slide-in shadow-ot-sm', styles.container, className), role: "alert", "data-testid": testId, children: [(0, jsx_runtime_1.jsx)("div", { className: styles.icon, children: getStatusIcon(status) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-ot-foreground", children: providerName }), (0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', styles.badge), children: status })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-ot-foreground-secondary", children: errorSummary }), lastSuccess && ((0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[10px] text-ot-muted", children: ["Last success: ", lastSuccess] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 flex-shrink-0", children: [actionText && onAction && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onAction, className: (0, utils_1.cn)('rounded-md border px-3 py-1 text-xs font-medium transition-all duration-150', 'hover:bg-ot-surface-hover active:scale-95', styles.badge), "data-testid": `${testId}-action`, children: actionText })), onDismiss && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onDismiss, className: "p-1 rounded-md hover:bg-ot-surface-hover transition-colors opacity-70 hover:opacity-100", "aria-label": "Dismiss", "data-testid": `${testId}-dismiss`, children: (0, jsx_runtime_1.jsx)("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }) }))] })] }));
}
exports.default = ErrorBanner;
