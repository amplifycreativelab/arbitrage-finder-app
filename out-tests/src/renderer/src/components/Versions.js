"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function Versions() {
    const [versions] = (0, react_1.useState)(window.electron.process.versions);
    return ((0, jsx_runtime_1.jsxs)("dl", { className: "mt-4 space-y-1 text-[10px] text-ot-foreground/70", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("dt", { className: "uppercase tracking-[0.18em] text-ot-foreground/60", children: "Electron" }), (0, jsx_runtime_1.jsxs)("dd", { className: "font-medium", children: ["v", versions.electron] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("dt", { className: "uppercase tracking-[0.18em] text-ot-foreground/60", children: "Chromium" }), (0, jsx_runtime_1.jsxs)("dd", { className: "font-medium", children: ["v", versions.chrome] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("dt", { className: "uppercase tracking-[0.18em] text-ot-foreground/60", children: "Node" }), (0, jsx_runtime_1.jsxs)("dd", { className: "font-medium", children: ["v", versions.node] })] })] }));
}
exports.default = Versions;
