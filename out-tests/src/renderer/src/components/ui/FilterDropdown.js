"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterDropdown = FilterDropdown;
exports.MultiFilterChipGroup = MultiFilterChipGroup;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("../../lib/utils");
function FilterDropdown({ label, options, value, onChange, className, triggerClassName, testId }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex flex-col gap-1', className), children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: label }), (0, jsx_runtime_1.jsx)("select", { value: value, onChange: (e) => onChange(e.target.value), className: (0, utils_1.cn)('h-8 rounded-md border border-ot-border bg-ot-surface px-2.5 text-[11px] font-medium text-ot-foreground', 'transition-all duration-150', 'hover:border-ot-accent/60 hover:bg-ot-accent/5', 'focus:border-ot-accent focus:outline-none focus:ring-1 focus:ring-ot-accent/30', 'cursor-pointer appearance-none', 'bg-[length:12px] bg-[right_8px_center] bg-no-repeat', 'pr-7', triggerClassName), style: {
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
                }, "data-testid": testId, children: options.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))) })] }));
}
function MultiFilterChipGroup({ label, options, selected, onToggle, className, testIdPrefix = 'filter-chip' }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex flex-col gap-1.5', className), children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: options.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onToggle(option.value), className: (0, utils_1.cn)('flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium', 'transition-all duration-150', isSelected
                            ? 'border-ot-accent bg-ot-accent/10 text-ot-accent shadow-sm'
                            : 'border-ot-border text-ot-muted hover:border-ot-accent/40 hover:bg-ot-accent/5 hover:text-ot-foreground'), "data-testid": `${testIdPrefix}-${option.value}`, "aria-pressed": isSelected, children: [option.icon && (0, jsx_runtime_1.jsx)("span", { className: "opacity-70", children: option.icon }), (0, jsx_runtime_1.jsx)("span", { children: option.label })] }, option.value));
                }) })] }));
}
exports.default = FilterDropdown;
