"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardRulesWarningModal = CardRulesWarningModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const types_1 = require("../../../../../shared/types");
/**
 * Get display label for card counting rule.
 */
function getCardRuleLabel(rule) {
    return types_1.CARD_COUNTING_RULE_DISPLAY[rule]?.label ?? 'Unknown';
}
/**
 * Format card counting rule description.
 */
function formatCardRuleDescription(rule) {
    return types_1.CARD_COUNTING_RULE_DISPLAY[rule]?.example ?? '';
}
/**
 * Card Rules Warning Modal Component
 *
 * Story 6.5: Displays detailed information about card counting rule differences
 * between bookmakers. Explains the risk and provides an example scenario where
 * this could cause a loss.
 */
function CardRulesWarningModal({ warning, isOpen, onClose }) {
    if (!isOpen || !warning) {
        return null;
    }
    const conservativeBookmaker = warning.bookmakerA.rule === 'conservative'
        ? warning.bookmakerA
        : warning.bookmakerB.rule === 'conservative'
            ? warning.bookmakerB
            : null;
    const standardBookmaker = warning.bookmakerA.rule === 'standard'
        ? warning.bookmakerA
        : warning.bookmakerB.rule === 'standard'
            ? warning.bookmakerB
            : null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: onClose, "data-testid": "card-rules-warning-modal", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-md rounded-lg border border-amber-500/30 bg-slate-900/95 p-6 shadow-2xl", onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-4 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xl", children: "\u26A0\uFE0F" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-amber-400", children: "Card Counting Rules Differ" })] }), (0, jsx_runtime_1.jsx)("p", { className: "mb-4 text-sm text-slate-400", children: "This arbitrage opportunity involves bookmakers with different card counting rules." }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-xs font-semibold uppercase tracking-wider text-slate-400", children: "Bookmaker Rules" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "mt-0.5 h-2 w-2 rounded-full bg-emerald-500" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium text-emerald-400", children: warning.bookmakerA.name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-slate-400", children: [getCardRuleLabel(warning.bookmakerA.rule), ": ", formatCardRuleDescription(warning.bookmakerA.rule)] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "mt-0.5 h-2 w-2 rounded-full bg-amber-500" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium text-amber-400", children: warning.bookmakerB.name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-slate-400", children: [getCardRuleLabel(warning.bookmakerB.rule), ": ", formatCardRuleDescription(warning.bookmakerB.rule)] })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-xs font-semibold uppercase tracking-wider text-slate-400", children: "The Risk" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-slate-200 leading-relaxed", children: ["In a scenario where a player receives ", (0, jsx_runtime_1.jsx)("strong", { children: "2 yellow cards" }), " (resulting in a red), the total card count depends on how each bookmaker counts:"] }), (0, jsx_runtime_1.jsxs)("ul", { className: "space-y-1 text-sm text-slate-200", children: [(0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-emerald-400", children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Standard" }), " counts 3 cards (YY+R)"] })] }), (0, jsx_runtime_1.jsxs)("li", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-amber-400", children: "\u2022" }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Conservative" }), " counts 2 cards (only the red)"] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg border border-red-500/20 bg-red-500/10 p-3", children: [(0, jsx_runtime_1.jsx)("h4", { className: "mb-2 text-xs font-semibold uppercase tracking-wider text-red-400", children: "Example Scenario" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-slate-200 leading-relaxed", children: ["If you bet ", (0, jsx_runtime_1.jsx)("strong", { children: "Over 2.5 cards" }), " with ", conservativeBookmaker?.name ?? 'Bookmaker A', "and ", (0, jsx_runtime_1.jsx)("strong", { children: "Under 2.5 cards" }), " with ", standardBookmaker?.name ?? 'Bookmaker B', ", and the match ends with exactly ", (0, jsx_runtime_1.jsx)("strong", { children: "2 yellows + 1 red" }), ":"] }), (0, jsx_runtime_1.jsxs)("ul", { className: "mt-2 space-y-1 text-sm", children: [(0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-emerald-400", children: "\u2713" }), (0, jsx_runtime_1.jsxs)("span", { children: [standardBookmaker?.name ?? 'Standard bookmaker', " settles as ", (0, jsx_runtime_1.jsx)("strong", { children: "3 cards" }), " (Over wins)"] })] }), (0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-red-400", children: "\u2717" }), (0, jsx_runtime_1.jsxs)("span", { children: [conservativeBookmaker?.name ?? 'Conservative bookmaker', " settles as ", (0, jsx_runtime_1.jsx)("strong", { children: "2 cards" }), " (Under wins)"] })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm font-medium text-red-400", children: "Both bets lose! The \"guaranteed profit\" becomes a loss." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg border border-amber-500/20 bg-amber-500/10 p-3", children: [(0, jsx_runtime_1.jsx)("h4", { className: "mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400", children: "Recommendation" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-slate-200 leading-relaxed", children: ["Before placing bets, ", (0, jsx_runtime_1.jsx)("strong", { children: "verify both bookmakers' settlement rules" }), " for this specific match. Consider avoiding this opportunity if you cannot confirm the rules or if the line is close to the potential discrepancy (e.g., Over/Under 2.5 when the difference is between 2 and 3 cards)."] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-6 flex justify-end", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-md bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50", "data-testid": "card-rules-warning-close", children: "Got it" }) })] }) }));
}
