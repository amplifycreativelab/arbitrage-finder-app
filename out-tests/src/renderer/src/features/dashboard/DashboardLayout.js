"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const ProviderSettings_1 = __importDefault(require("../settings/ProviderSettings"));
const FeedPane_1 = __importDefault(require("./FeedPane"));
const SignalPreview_1 = __importDefault(require("./SignalPreview"));
function DashboardLayout({ feed, signalPreview }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-1 gap-4 overflow-hidden rounded-lg border border-white/10 bg-black/30 p-4", "data-testid": "dashboard-layout", children: [(0, jsx_runtime_1.jsxs)("section", { "aria-label": "Feed", className: "flex w-[380px] min-w-[360px] max-w-[440px] flex-col gap-3 border-r border-white/10 pr-4", "data-testid": "feed-pane", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Feed" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Opportunities" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 rounded-md border border-white/10 bg-black/40 p-3 text-[11px] text-ot-foreground/70", children: feed ?? (0, jsx_runtime_1.jsx)(FeedPane_1.default, {}) })] }), (0, jsx_runtime_1.jsxs)("section", { "aria-label": "Signal preview and settings", className: "flex min-w-0 flex-1 flex-col gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 rounded-md border border-white/10 bg-black/40 p-3", "data-testid": "signal-preview-pane", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent", children: "Signal Preview" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-foreground/60", children: "Layout shell" })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 flex h-full flex-col rounded-md border border-white/10 bg-black/60 p-3 text-[11px] font-mono text-ot-foreground/80", children: signalPreview ?? (0, jsx_runtime_1.jsx)(SignalPreview_1.default, {}) })] }), (0, jsx_runtime_1.jsx)("section", { className: "rounded-md border border-white/10 bg-black/40 p-3", children: (0, jsx_runtime_1.jsx)(ProviderSettings_1.default, {}) })] })] }));
}
exports.default = DashboardLayout;
