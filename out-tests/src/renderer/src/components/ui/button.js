"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function Button({ className, variant = 'primary', size = 'md', loading = false, children, disabled, ...props }) {
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
        'focus-visible:ring-ot-accent focus-visible:ring-offset-ot-background ' +
        'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
    const variantClasses = {
        primary: 'bg-gradient-to-r from-ot-accent to-ot-accent-hover text-white ' +
            'shadow-[0_1px_3px_rgba(249,115,22,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] ' +
            'hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)] hover:-translate-y-px ' +
            'active:shadow-[0_1px_2px_rgba(249,115,22,0.3)] active:translate-y-0',
        secondary: 'bg-ot-surface-elevated text-ot-foreground border border-ot-border ' +
            'shadow-ot-sm hover:bg-ot-surface-hover hover:border-ot-border-strong ' +
            'hover:shadow-ot',
        outline: 'border border-ot-border text-ot-foreground bg-transparent ' +
            'hover:border-ot-accent hover:bg-ot-accent-subtle',
        ghost: 'text-ot-muted bg-transparent hover:text-ot-foreground hover:bg-ot-surface-hover',
        danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white ' +
            'shadow-[0_1px_3px_rgba(239,68,68,0.3)] ' +
            'hover:shadow-[0_4px_12px_rgba(239,68,68,0.4)] hover:-translate-y-px',
    };
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs gap-1.5',
        md: 'px-4 py-2 text-sm gap-2',
        lg: 'px-6 py-2.5 text-base gap-2',
        icon: 'h-9 w-9',
    };
    return ((0, jsx_runtime_1.jsxs)("button", { className: (0, utils_1.cn)(baseClasses, variantClasses[variant], sizeClasses[size], className), type: props.type ?? 'button', disabled: disabled || loading, ...props, children: [loading && ((0, jsx_runtime_1.jsxs)("svg", { className: "animate-spin h-4 w-4", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })), children] }));
}
exports.default = Button;
