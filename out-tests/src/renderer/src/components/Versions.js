"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function Versions() {
    const [versions] = (0, react_1.useState)(window.electron.process.versions);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4 text-[10px] text-ot-muted-subtle", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "uppercase tracking-wider font-medium", children: "Electron" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-ot-foreground-secondary", children: ["v", versions.electron] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "uppercase tracking-wider font-medium", children: "Chromium" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-ot-foreground-secondary", children: ["v", versions.chrome] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "uppercase tracking-wider font-medium", children: "Node" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-ot-foreground-secondary", children: ["v", versions.node] })] })] }));
}
exports.default = Versions;
