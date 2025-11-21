"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = Select;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function Select({ className, onValueChange, children, ...props }) {
    const handleChange = (event) => {
        props.onChange?.(event);
        onValueChange?.(event.target.value);
    };
    return ((0, jsx_runtime_1.jsx)("select", { className: (0, utils_1.cn)('flex h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-ot-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ot-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ot-background', className), onChange: handleChange, ...props, children: children }));
}
