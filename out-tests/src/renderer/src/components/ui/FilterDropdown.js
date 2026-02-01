"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterDropdown = FilterDropdown;
exports.MultiFilterChipGroup = MultiFilterChipGroup;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function FilterDropdown({ label, options, value, onChange, className, triggerClassName, testId }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex flex-col gap-1.5', className), children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-bold uppercase tracking-wider text-ot-muted", children: label }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("select", { value: value, onChange: (e) => onChange(e.target.value), className: (0, utils_1.cn)('h-9 w-full appearance-none rounded-lg border border-ot-border bg-ot-surface pl-3 pr-9', 'text-xs font-medium text-ot-foreground', 'transition-all duration-150', 'hover:border-ot-accent/60 hover:bg-ot-accent-subtle/50', 'focus:border-ot-accent focus:outline-none focus:ring-2 focus:ring-ot-accent/20', 'cursor-pointer', triggerClassName), "data-testid": testId, children: options.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))) }), (0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3", children: (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "h-4 w-4 text-ot-muted", children: (0, jsx_runtime_1.jsx)("path", { d: "m6 9 6 6 6-6" }) }) })] })] }));
}
function MultiFilterChipGroup({ label, options, selected, onToggle, className, testIdPrefix = 'filter-chip' }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex flex-col gap-2', className), children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[10px] font-bold uppercase tracking-wider text-ot-muted", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1.5", children: options.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onToggle(option.value), className: (0, utils_1.cn)('ot-chip', isSelected && 'ot-chip-active'), "data-testid": `${testIdPrefix}-${option.value}`, "aria-pressed": isSelected, children: [option.icon && ((0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('transition-opacity', isSelected ? 'opacity-100' : 'opacity-70'), children: option.icon })), (0, jsx_runtime_1.jsx)("span", { children: option.label }), isSelected && ((0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", className: "h-3 w-3 ml-0.5", children: (0, jsx_runtime_1.jsx)("polyline", { points: "20 6 9 17 4 12" }) }))] }, option.value));
                }) })] }));
}
exports.default = FilterDropdown;
