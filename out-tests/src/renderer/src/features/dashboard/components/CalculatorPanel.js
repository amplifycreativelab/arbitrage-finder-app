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
exports.CalculatorPanel = CalculatorPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const button_1 = require("../../../components/ui/button");
const utils_1 = require("../../../lib/utils");
const calculatorStore_1 = require("../stores/calculatorStore");
const copyBetSlip_1 = require("../lib/copyBetSlip");
const SurebetCalculator_1 = __importDefault(require("./SurebetCalculator"));
const CalculatorHistory_1 = __importDefault(require("./CalculatorHistory"));
// Icons as SVG components since lucide-react may not be available
const CopyIcon = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" })] }));
const XIcon = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M18 6 6 18" }), (0, jsx_runtime_1.jsx)("path", { d: "m6 6 12 12" })] }));
const Maximize2Icon = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M15 3h6v6" }), (0, jsx_runtime_1.jsx)("path", { d: "m21 3-7 7" }), (0, jsx_runtime_1.jsx)("path", { d: "m3 21 7-7" })] }));
const PanelLeftIcon = () => ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" }), (0, jsx_runtime_1.jsx)("path", { d: "M9 3v18" })] }));
function CalculatorPanel({ className }) {
    const { isOpen, closeCalculator, displayMode, setDisplayMode, opportunity, calculatedStakeA, calculatedStakeB, totalInvestment, profit, addToHistory } = (0, calculatorStore_1.useCalculatorStore)();
    const [copyState, setCopyState] = React.useState('idle');
    // Handle ESC key
    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isOpen) {
                closeCalculator();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeCalculator]);
    const handleCopyBetSlip = async () => {
        if (!opportunity)
            return;
        const data = (0, copyBetSlip_1.createBetSlipData)(opportunity, calculatedStakeA, calculatedStakeB, profit);
        const success = await (0, copyBetSlip_1.copyBetSlipToClipboard)(data);
        if (success) {
            setCopyState('copied');
            window.setTimeout(() => setCopyState('idle'), 1500);
        }
    };
    const handleSaveToHistory = () => {
        addToHistory();
    };
    const handleToggleMode = () => {
        setDisplayMode(displayMode === 'inline' ? 'modal' : 'inline');
    };
    const handleClose = () => {
        // Save to history before closing if there's a valid calculation
        if (opportunity && totalInvestment > 0) {
            addToHistory();
        }
        closeCalculator();
    };
    // Empty state
    if (!isOpen || !opportunity) {
        return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('flex h-full flex-col items-center justify-center p-4 text-center', className), "data-testid": "calculator-panel-empty", children: (0, jsx_runtime_1.jsx)("div", { className: "text-[12px] text-ot-muted", children: "Select a surebet opportunity and click \"Calculate Stakes\" to use the calculator." }) }));
    }
    const panelContent = ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full flex-col bg-slate-900", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-slate-700 p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2", children: (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-ot-foreground", children: "\u26A1 Surebet Calculator" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: handleToggleMode, className: "h-7 w-7", title: displayMode === 'inline' ? 'Switch to modal' : 'Switch to inline', "data-testid": "toggle-display-mode", children: displayMode === 'inline' ? (0, jsx_runtime_1.jsx)(Maximize2Icon, {}) : (0, jsx_runtime_1.jsx)(PanelLeftIcon, {}) }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: handleClose, className: "h-7 w-7", "data-testid": "close-calculator", children: (0, jsx_runtime_1.jsx)(XIcon, {}) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 overflow-y-auto p-3", children: [(0, jsx_runtime_1.jsx)(SurebetCalculator_1.default, { opportunity: opportunity }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 space-y-2", children: [(0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", size: "sm", onClick: handleCopyBetSlip, className: (0, utils_1.cn)('w-full gap-2 text-[11px]', copyState === 'copied' && 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500'), disabled: totalInvestment <= 0, "data-testid": "copy-bet-slip-button", children: [(0, jsx_runtime_1.jsx)(CopyIcon, {}), copyState === 'copied' ? 'Copied!' : 'Copy Bet Slip'] }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "sm", onClick: handleSaveToHistory, className: "w-full text-[11px]", disabled: totalInvestment <= 0, "data-testid": "save-to-history-button", children: "Save to History" })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4", children: (0, jsx_runtime_1.jsx)(CalculatorHistory_1.default, {}) })] })] }));
    // Modal mode: centered overlay
    if (displayMode === 'modal') {
        return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4", onClick: (e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }, "data-testid": "calculator-panel-modal", children: (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('w-full max-w-md max-h-[85vh] overflow-hidden rounded-lg border border-slate-700 shadow-xl', className), children: panelContent }) }));
    }
    // Inline mode: slide-out panel
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('h-full w-[380px] border-l border-slate-700 bg-slate-900', 'transition-all duration-200 ease-in-out', className), "data-testid": "calculator-panel-inline", children: panelContent }));
}
exports.default = CalculatorPanel;
