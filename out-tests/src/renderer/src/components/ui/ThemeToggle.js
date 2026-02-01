"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeToggle = ThemeToggle;
const jsx_runtime_1 = require("react/jsx-runtime");
const themeStore_1 = require("../../stores/themeStore");
const utils_1 = require("../../lib/utils");
function ThemeToggle({ className, size = 'md' }) {
    const { isDark, toggle } = (0, themeStore_1.useTheme)();
    const sizeClasses = {
        sm: 'h-7 w-7',
        md: 'h-8 w-8',
        lg: 'h-10 w-10',
    };
    const iconSizes = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };
    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: toggle, className: (0, utils_1.cn)('relative inline-flex items-center justify-center rounded-lg', 'border border-ot-border bg-ot-surface text-ot-muted', 'hover:border-ot-border-strong hover:text-ot-foreground', 'hover:bg-ot-surface-hover', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ot-accent', 'focus-visible:ring-offset-2 focus-visible:ring-offset-ot-background', 'transition-all duration-150', sizeClasses[size], className), "aria-label": isDark ? 'Switch to light mode' : 'Switch to dark mode', title: isDark ? 'Switch to light mode' : 'Switch to dark mode', children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: isDark ? 'Switch to light mode' : 'Switch to dark mode' }), (0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)(iconSizes[size], 'absolute transition-all duration-200', isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'), children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "4" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 2v2" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 20v2" }), (0, jsx_runtime_1.jsx)("path", { d: "m4.93 4.93 1.41 1.41" }), (0, jsx_runtime_1.jsx)("path", { d: "m17.66 17.66 1.41 1.41" }), (0, jsx_runtime_1.jsx)("path", { d: "M2 12h2" }), (0, jsx_runtime_1.jsx)("path", { d: "M20 12h2" }), (0, jsx_runtime_1.jsx)("path", { d: "m6.34 17.66-1.41 1.41" }), (0, jsx_runtime_1.jsx)("path", { d: "m19.07 4.93-1.41 1.41" })] }), (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)(iconSizes[size], 'absolute transition-all duration-200', isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'), children: (0, jsx_runtime_1.jsx)("path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }) })] }));
}
exports.default = ThemeToggle;
