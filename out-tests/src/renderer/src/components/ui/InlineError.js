"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineError = InlineError;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
/**
 * InlineError - Displays user errors inline near the relevant control.
 * Used for configuration errors, validation failures, and user input issues.
 * Styled according to the Orange Terminal theme.
 */
function InlineError({ message, guidance, onDismiss, className, testId = 'inline-error' }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px]', className), role: "alert", "data-testid": testId, children: [(0, jsx_runtime_1.jsx)("svg", { className: "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-red-300", children: message }), guidance && ((0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[10px] text-red-200/80", children: guidance }))] }), onDismiss && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onDismiss, className: "flex-shrink-0 text-red-300/70 hover:text-red-300", "aria-label": "Dismiss error", "data-testid": `${testId}-dismiss`, children: (0, jsx_runtime_1.jsx)("svg", { className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }) }))] }));
}
exports.default = InlineError;
