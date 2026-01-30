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
exports.CalculatorHistory = CalculatorHistory;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../../components/ui/button");
const utils_1 = require("../../../lib/utils");
const calculatorStore_1 = require("../stores/calculatorStore");
function CalculatorHistory() {
    const { history, loadFromHistory, clearHistory, removeHistoryEntry, addToHistory } = (0, calculatorStore_1.useCalculatorStore)();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [showClearConfirm, setShowClearConfirm] = React.useState(false);
    const handleClear = () => {
        if (showClearConfirm) {
            clearHistory();
            setShowClearConfirm(false);
        }
        else {
            setShowClearConfirm(true);
            window.setTimeout(() => setShowClearConfirm(false), 3000);
        }
    };
    const handleSaveCurrent = () => {
        addToHistory();
    };
    if (history.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-slate-700 pt-3", "data-testid": "calculator-history-empty", children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "sm", onClick: handleSaveCurrent, className: "w-full text-[11px]", "data-testid": "save-calculation-button", children: "Save Calculation" }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "border-t border-slate-700 pt-3", "data-testid": "calculator-history", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setIsExpanded(!isExpanded), className: "flex items-center gap-1 text-[11px] font-medium text-ot-muted hover:text-ot-foreground", "data-testid": "history-toggle", children: [(0, jsx_runtime_1.jsx)("span", { children: isExpanded ? '▼' : '▶' }), (0, jsx_runtime_1.jsxs)("span", { children: ["Recent Calculations (", history.length, ")"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", onClick: handleSaveCurrent, className: "h-6 px-2 text-[10px]", "data-testid": "save-calculation-button", children: "Save" }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", onClick: handleClear, className: (0, utils_1.cn)('h-6 px-2 text-[10px]', showClearConfirm && 'text-red-400 hover:text-red-300'), "data-testid": "clear-history-button", children: showClearConfirm ? 'Confirm?' : 'Clear' })] })] }), isExpanded && ((0, jsx_runtime_1.jsx)("div", { className: "max-h-[200px] overflow-y-auto space-y-2", "data-testid": "history-list", children: history.map((entry) => ((0, jsx_runtime_1.jsx)(HistoryItem, { entry: entry, onLoad: () => loadFromHistory(entry), onRemove: () => removeHistoryEntry(entry.id) }, entry.id))) }))] }));
}
function HistoryItem({ entry, onLoad, onRemove }) {
    const timeAgo = React.useMemo(() => {
        const minutes = Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / (60 * 1000));
        if (minutes < 1)
            return 'just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }, [entry.timestamp]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-slate-700 bg-slate-800/30 p-2", "data-testid": "history-item", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-1 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "truncate text-[11px] font-medium text-ot-foreground", children: entry.eventName }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-muted", children: timeAgo })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-2 text-[10px] text-ot-muted", children: ["$", entry.totalStake.toFixed(0), " \u2192 $", entry.profit.toFixed(2), " profit"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "sm", onClick: onLoad, className: "h-6 flex-1 text-[10px]", "data-testid": "load-history-button", children: "Load" }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", onClick: onRemove, className: "h-6 px-2 text-[10px] text-ot-muted hover:text-red-400", "data-testid": "remove-history-button", children: "\u00D7" })] })] }));
}
exports.default = CalculatorHistory;
