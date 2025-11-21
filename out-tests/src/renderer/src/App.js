"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const Versions_1 = __importDefault(require("./components/Versions"));
const button_1 = require("./components/ui/button");
const DashboardLayout_1 = __importDefault(require("./features/dashboard/DashboardLayout"));
const electron_svg_1 = __importDefault(require("./assets/electron.svg"));
function App() {
    const handlePing = () => window.electron.ipcRenderer.send('ping');
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-screen flex-col bg-ot-background text-ot-foreground", children: [(0, jsx_runtime_1.jsx)("header", { className: "border-b border-ot-accent/40 bg-black/20", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-9 w-9 items-center justify-center rounded-md bg-ot-accent/10", children: (0, jsx_runtime_1.jsx)("img", { alt: "Arbitrage Finder", className: "h-6 w-6", src: electron_svg_1.default }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-ot-accent", children: "The Orange Terminal" }), (0, jsx_runtime_1.jsx)("div", { className: "text-[11px] text-ot-foreground/70", children: "Arbitrage Finder - Story 3.1: Main Layout & Split Pane" })] })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { className: "hidden text-[11px] sm:inline-flex", onClick: handlePing, children: "Ping main process" })] }) }), (0, jsx_runtime_1.jsx)("main", { className: "flex flex-1 px-6 py-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto flex w-full max-w-6xl flex-col gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[11px] text-ot-foreground/70", children: "Dashboard shell with a fixed-width feed pane and fluid signal preview pane, ready for Epic 3 stories." }), (0, jsx_runtime_1.jsx)(DashboardLayout_1.default, {}), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 flex justify-end", children: (0, jsx_runtime_1.jsx)(Versions_1.default, {}) })] }) })] }));
}
exports.default = App;
