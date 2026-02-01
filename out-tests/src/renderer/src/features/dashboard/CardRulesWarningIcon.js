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
exports.CardRulesWarningIcon = CardRulesWarningIcon;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const types_1 = require("../../../../../shared/types");
/**
 * Get display label for card counting rule.
 */
function getCardRuleLabel(rule) {
    return types_1.CARD_COUNTING_RULE_DISPLAY[rule]?.label ?? 'Unknown';
}
/**
 * Format card counting rule description for tooltip.
 * Shows the card count for "2 yellows + 1 red" scenario.
 */
function formatCardRuleDescription(rule) {
    switch (rule) {
        case 'conservative':
            return '2 cards for YY+R (counts only the red)';
        case 'standard':
            return '3 cards for YY+R (counts each card)';
        default:
            return 'Unknown rule';
    }
}
/**
 * Card Rules Warning Icon Component
 *
 * Story 6.5: Displays a warning icon for arbitrage opportunities where
 * bookmakers have different card counting rules. Shows a tooltip on hover
 * with the rule details for each bookmaker.
 */
function CardRulesWarningIcon({ warning, onClick }) {
    const [showTooltip, setShowTooltip] = React.useState(false);
    const tooltipContent = ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-semibold text-amber-300", children: "Card counting rules differ between bookmakers" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 text-xs", children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-medium", children: [warning.bookmakerA.name, ":"] }), ' ', (0, jsx_runtime_1.jsx)("span", { className: warning.bookmakerA.rule === 'conservative' ? 'text-amber-400' : 'text-emerald-400', children: getCardRuleLabel(warning.bookmakerA.rule) }), ' ', "- ", formatCardRuleDescription(warning.bookmakerA.rule)] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "font-medium", children: [warning.bookmakerB.name, ":"] }), ' ', (0, jsx_runtime_1.jsx)("span", { className: warning.bookmakerB.rule === 'conservative' ? 'text-amber-400' : 'text-emerald-400', children: getCardRuleLabel(warning.bookmakerB.rule) }), ' ', "- ", formatCardRuleDescription(warning.bookmakerB.rule)] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[10px] text-ot-muted italic", children: "Click for more details" })] }));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative inline-flex", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, onMouseEnter: () => setShowTooltip(true), onMouseLeave: () => setShowTooltip(false), onFocus: () => setShowTooltip(true), onBlur: () => setShowTooltip(false), className: "flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/50", "aria-label": "Card counting rules differ between bookmakers", "data-testid": "card-rules-warning-icon", children: "\u26A0\uFE0F" }), showTooltip && ((0, jsx_runtime_1.jsxs)("div", { className: "absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-md border border-amber-500/30 bg-slate-900/95 p-3 text-[11px] text-ot-foreground shadow-lg backdrop-blur-sm", "data-testid": "card-rules-warning-tooltip", children: [tooltipContent, (0, jsx_runtime_1.jsx)("div", { className: "absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-amber-500/30 bg-slate-900/95" })] }))] }));
}
