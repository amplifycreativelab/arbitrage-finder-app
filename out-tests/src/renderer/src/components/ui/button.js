"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function Button({ className, variant = 'primary', ...props }) {
    const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
        'focus-visible:ring-ot-accent focus-visible:ring-offset-ot-background disabled:pointer-events-none disabled:opacity-50';
    const variants = {
        primary: 'bg-ot-accent text-ot-foreground hover:bg-ot-accent/90',
        outline: 'border border-ot-accent text-ot-accent hover:bg-ot-accent/10 hover:text-ot-foreground',
    };
    return ((0, jsx_runtime_1.jsx)("button", { className: (0, utils_1.cn)(base, variants[variant], className), type: props.type ?? 'button', ...props }));
}
