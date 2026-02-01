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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const Versions_1 = __importDefault(require("./components/Versions"));
const DashboardLayout_1 = __importDefault(require("./features/dashboard/DashboardLayout"));
const DeepScanStatusBar_1 = __importDefault(require("./features/dashboard/DeepScanStatusBar"));
const ThemeToggle_1 = require("./components/ui/ThemeToggle");
const themeStore_1 = require("./stores/themeStore");
const electron_svg_1 = __importDefault(require("./assets/electron.svg"));
function App() {
    // Initialize theme on mount
    React.useEffect(() => {
        (0, themeStore_1.initTheme)();
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-screen flex-col bg-ot-background text-ot-foreground", children: [(0, jsx_runtime_1.jsx)("header", { className: "ot-glass sticky top-0 z-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-3", children: (0, jsx_runtime_1.jsx)("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ot-accent to-ot-accent-hover shadow-ot-glow", children: (0, jsx_runtime_1.jsx)("img", { alt: "Arbitrage Finder", className: "h-6 w-6 drop-shadow-md", src: electron_svg_1.default }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(DeepScanStatusBar_1.default, {}), (0, jsx_runtime_1.jsx)("div", { className: "h-6 w-px bg-ot-border" }), (0, jsx_runtime_1.jsx)(ThemeToggle_1.ThemeToggle, {})] })] }) }), (0, jsx_runtime_1.jsx)("main", { className: "flex flex-1 px-4 py-4 md:px-6 lg:px-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "mx-auto flex w-full flex-col gap-4", children: [(0, jsx_runtime_1.jsx)(DashboardLayout_1.default, {}), (0, jsx_runtime_1.jsxs)("footer", { className: "flex items-center justify-between text-[10px] text-ot-muted-subtle", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-flex h-1.5 w-1.5 rounded-full bg-ot-success animate-pulse-live" }), "System Operational"] }), (0, jsx_runtime_1.jsx)(Versions_1.default, {})] })] }) })] }));
}
exports.default = App;
