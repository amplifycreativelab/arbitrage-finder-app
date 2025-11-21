"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function Input({ className, type = 'text', ...props }) {
    return ((0, jsx_runtime_1.jsx)("input", { className: (0, utils_1.cn)('flex h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-ot-foreground placeholder:text-ot-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ot-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ot-background', className), type: type, ...props }));
}
