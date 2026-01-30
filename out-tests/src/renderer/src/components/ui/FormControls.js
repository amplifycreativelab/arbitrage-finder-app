"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollapsibleSection = CollapsibleSection;
exports.StatCard = StatCard;
exports.ToggleSwitch = ToggleSwitch;
exports.NumberInput = NumberInput;
exports.SelectInput = SelectInput;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const utils_1 = require("../../lib/utils");
function CollapsibleSection({ title, description, defaultOpen = false, badge, children, testId }) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg border border-ot-border/60 bg-ot-surface/50", "data-testid": testId, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left", onClick: () => setIsOpen(!isOpen), "aria-expanded": isOpen, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)('h-3.5 w-3.5 text-ot-muted transition-transform duration-200', isOpen && 'rotate-90'), children: (0, jsx_runtime_1.jsx)("polyline", { points: "9 18 15 12 9 6" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-semibold text-ot-foreground", children: title }), badge] }), description && ((0, jsx_runtime_1.jsx)("span", { className: "text-[9px] text-ot-muted", children: description }))] })] }) }), isOpen && ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-ot-border/60 px-3 py-2.5", children: children }))] }));
}
function StatCard({ label, value, subValue, trend, className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('rounded-md border border-ot-border/60 bg-gradient-to-b from-ot-surface to-ot-background p-2', className), children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[9px] font-medium uppercase tracking-[0.1em] text-ot-muted", children: label }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-0.5 flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-bold text-ot-foreground", children: value }), trend && ((0, jsx_runtime_1.jsxs)("span", { className: (0, utils_1.cn)('text-[10px]', trend === 'up' && 'text-emerald-500', trend === 'down' && 'text-red-500', trend === 'neutral' && 'text-ot-muted'), children: [trend === 'up' && '↑', trend === 'down' && '↓', trend === 'neutral' && '—'] }))] }), subValue && ((0, jsx_runtime_1.jsx)("div", { className: "mt-0.5 text-[9px] text-ot-muted", children: subValue }))] }));
}
function ToggleSwitch({ checked, onChange, label, description, className, testId }) {
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, utils_1.cn)('flex cursor-pointer items-center justify-between gap-3 rounded-md border border-ot-border/60 p-2.5 transition-colors', checked ? 'bg-ot-accent/5 border-ot-accent/30' : 'bg-ot-surface/50', className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: label }), description && ((0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: description }))] }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", role: "switch", "aria-checked": checked, checked: checked, onChange: (e) => onChange(e.target.checked), className: "sr-only", "data-testid": testId }), (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-ot-accent' : 'bg-ot-border'), children: (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5') }) })] }));
}
function NumberInput({ label, description, value, onChange, onCommit, min, max, suffix, className, testId }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
            e.currentTarget.blur();
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex items-center justify-between gap-2 rounded-md border border-ot-border/60 bg-ot-surface/50 p-2', className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: label }), description && ((0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: description }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: min, max: max, value: value, onChange: (e) => onChange(e.target.value), onBlur: onCommit, onKeyDown: handleKeyDown, className: "h-7 w-16 rounded border border-ot-border bg-ot-background px-2 text-right text-[11px] font-medium text-ot-foreground focus:border-ot-accent focus:outline-none", "data-testid": testId }), suffix && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: suffix }))] })] }));
}
function SelectInput({ label, description, value, options, onChange, className, testId }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex items-center justify-between gap-2 rounded-md border border-ot-border/60 bg-ot-surface/50 p-2', className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: label }), description && ((0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: description }))] }), (0, jsx_runtime_1.jsx)("select", { value: value, onChange: (e) => onChange(e.target.value), className: "h-7 rounded border border-ot-border bg-ot-background px-2 text-[11px] font-medium text-ot-foreground focus:border-ot-accent focus:outline-none", "data-testid": testId, children: options.map((opt) => ((0, jsx_runtime_1.jsx)("option", { value: opt.value, children: opt.label }, opt.value))) })] }));
}
exports.default = CollapsibleSection;
