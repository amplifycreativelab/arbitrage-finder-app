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
exports.SettingsSection = SettingsSection;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const utils_1 = require("../../../lib/utils");
const STORAGE_KEY_PREFIX = 'arb-finder-settings-section-';
function loadExpandedState(id, defaultValue) {
    if (typeof localStorage === 'undefined')
        return defaultValue;
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
    if (stored === null)
        return defaultValue;
    return stored === 'true';
}
function saveExpandedState(id, expanded) {
    if (typeof localStorage === 'undefined')
        return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, String(expanded));
}
function SettingsSection({ id, title, description, icon, defaultExpanded = true, children, className }) {
    const [isOpen, setIsOpen] = React.useState(() => loadExpandedState(id, defaultExpanded));
    const handleToggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        saveExpandedState(id, next);
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: (0, utils_1.cn)('rounded-lg border border-ot-border bg-ot-surface/50', className), "data-testid": `settings-section-${id}`, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleToggle, className: "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-ot-surface/80", "aria-expanded": isOpen, "aria-controls": `settings-section-content-${id}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [icon && ((0, jsx_runtime_1.jsx)("span", { className: "flex h-8 w-8 items-center justify-center rounded-md bg-ot-accent/10 text-ot-accent", children: icon })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-ot-foreground", children: title }), description && ((0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] text-ot-muted", children: description }))] })] }), (0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: (0, utils_1.cn)('h-4 w-4 text-ot-muted transition-transform', isOpen && 'rotate-180'), children: (0, jsx_runtime_1.jsx)("path", { d: "m6 9 6 6 6-6" }) })] }), isOpen && ((0, jsx_runtime_1.jsx)("div", { id: `settings-section-content-${id}`, className: "border-t border-ot-border/60 p-4", children: children }))] }));
}
exports.default = SettingsSection;
