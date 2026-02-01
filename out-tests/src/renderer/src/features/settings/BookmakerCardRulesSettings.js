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
exports.BookmakerCardRulesSettings = BookmakerCardRulesSettings;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const select_1 = require("../../components/ui/select");
const button_1 = require("../../components/ui/button");
const input_1 = require("../../components/ui/input");
const types_1 = require("../../../../../shared/types");
// ============================================================================
// Info Icon Component
// ============================================================================
function InfoIcon({ className }) {
    return ((0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className, children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 16v-4" }), (0, jsx_runtime_1.jsx)("path", { d: "M12 8h.01" })] }));
}
// ============================================================================
// Card Rules Info Tooltip Component
// ============================================================================
function CardRulesInfo() {
    const [isOpen, setIsOpen] = React.useState(false);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setIsOpen(!isOpen), onBlur: () => setTimeout(() => setIsOpen(false), 200), className: "flex items-center gap-1.5 text-[10px] text-ot-accent hover:text-ot-accent/80 transition-colors", "aria-expanded": isOpen, "aria-haspopup": "dialog", children: [(0, jsx_runtime_1.jsx)(InfoIcon, { className: "h-3.5 w-3.5" }), (0, jsx_runtime_1.jsx)("span", { children: "What's this?" })] }), isOpen && ((0, jsx_runtime_1.jsxs)("div", { className: "absolute z-50 mt-2 w-80 rounded-md border border-ot-accent/30 bg-ot-surface p-3 shadow-lg", role: "dialog", "aria-label": "Card counting rules explanation", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-2 text-[11px]", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-ot-foreground font-medium", children: "Different bookmakers count cards differently in Over/Under card markets:" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded bg-ot-background/50 p-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-emerald-400", children: types_1.CARD_COUNTING_RULE_DISPLAY.standard.label }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-ot-muted", children: types_1.CARD_COUNTING_RULE_DISPLAY.standard.example })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded bg-ot-background/50 p-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-amber-400", children: types_1.CARD_COUNTING_RULE_DISPLAY.conservative.label }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-ot-muted", children: types_1.CARD_COUNTING_RULE_DISPLAY.conservative.example })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "text-ot-muted italic", children: "Configure the counting rule for each bookmaker to identify potential arbitrage risks." })] }), (0, jsx_runtime_1.jsx)("div", { className: "absolute -top-1 left-4 h-2 w-2 rotate-45 border-l border-t border-ot-accent/30 bg-ot-surface" })] }))] }));
}
function BookmakerRuleRow({ bookmaker, rule, onRuleChange, onRemove, isLoading = false }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 rounded-md border border-ot-border/60 bg-ot-background/30 p-2.5", "data-testid": `card-rule-row-${bookmaker}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "flex-1 truncate text-[11px] font-medium text-ot-foreground", title: bookmaker, children: bookmaker }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)(select_1.Select, { value: rule, onChange: (e) => onRuleChange(bookmaker, e.target.value), disabled: isLoading, className: "w-44", "data-testid": `card-rule-select-${bookmaker}`, children: [(0, jsx_runtime_1.jsx)("option", { value: "standard", children: types_1.CARD_COUNTING_RULE_DISPLAY.standard.label }), (0, jsx_runtime_1.jsx)("option", { value: "conservative", children: types_1.CARD_COUNTING_RULE_DISPLAY.conservative.label })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", onClick: () => onRemove(bookmaker), disabled: isLoading, className: "h-7 px-2 text-[10px] border-red-500/40 text-red-200 hover:bg-red-500/10", "data-testid": `card-rule-remove-${bookmaker}`, children: "Remove" })] })] }));
}
// ============================================================================
// Main Component
// ============================================================================
function BookmakerCardRulesSettings() {
    const [rules, setRules] = React.useState({});
    const [newBookmaker, setNewBookmaker] = React.useState('');
    const [newRule, setNewRule] = React.useState(types_1.DEFAULT_CARD_COUNTING_RULE);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(null);
    const cardRulesApi = React.useMemo(() => window.api?.cardRules ?? null, []);
    // Load initial rules on mount
    React.useEffect(() => {
        let cancelled = false;
        const loadRules = async () => {
            if (!cardRulesApi) {
                setError('Card rules API is not available. Restart the app and try again.');
                return;
            }
            try {
                const rules = await cardRulesApi.getAllRules();
                if (!cancelled) {
                    setRules(rules);
                }
            }
            catch (err) {
                if (!cancelled) {
                    setError('Failed to load card counting rules.');
                }
            }
        };
        void loadRules();
        return () => {
            cancelled = true;
        };
    }, [cardRulesApi]);
    // Clear messages after 3 seconds
    React.useEffect(() => {
        if (!success)
            return undefined;
        const timer = setTimeout(() => setSuccess(null), 3000);
        return () => clearTimeout(timer);
    }, [success]);
    React.useEffect(() => {
        if (!error)
            return undefined;
        const timer = setTimeout(() => setError(null), 5000);
        return () => clearTimeout(timer);
    }, [error]);
    const handleAddRule = async () => {
        if (!cardRulesApi)
            return;
        const trimmedBookmaker = newBookmaker.trim();
        if (!trimmedBookmaker) {
            setError('Please enter a bookmaker name.');
            return;
        }
        // Check if already exists
        if (rules[trimmedBookmaker]) {
            setError(`Rule for "${trimmedBookmaker}" already exists. Remove it first to change the rule.`);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await cardRulesApi.setRule(trimmedBookmaker, newRule);
            const updatedRules = await cardRulesApi.getAllRules();
            setRules(updatedRules);
            setNewBookmaker('');
            setNewRule(types_1.DEFAULT_CARD_COUNTING_RULE);
            setSuccess(`Added rule for ${trimmedBookmaker}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save rule.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleRuleChange = async (bookmaker, rule) => {
        if (!cardRulesApi) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await cardRulesApi.setRule(bookmaker, rule);
            setRules((prev) => ({ ...prev, [bookmaker]: rule }));
            setSuccess(`Updated rule for ${bookmaker}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update rule.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleRemoveRule = async (bookmaker) => {
        if (!cardRulesApi) {
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await cardRulesApi.removeRule(bookmaker);
            const { [bookmaker]: _, ...rest } = rules;
            setRules(rest);
            setSuccess(`Removed rule for ${bookmaker}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove rule.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const configuredBookmakers = Object.entries(rules).sort((a, b) => a[0].localeCompare(b[0]));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-ot-muted", children: "Configure card counting rules for each bookmaker. This helps identify arbitrage risks when bookmakers count cards differently." }) }), (0, jsx_runtime_1.jsx)(CardRulesInfo, {})] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-end gap-2 rounded-md border border-ot-border/60 bg-ot-background/30 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 space-y-1.5", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "new-bookmaker", className: "text-[10px] font-medium text-ot-foreground", children: "Bookmaker" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "new-bookmaker", value: newBookmaker, onChange: (e) => setNewBookmaker(e.target.value), placeholder: "e.g., Sportsbet, Bet365", className: "h-8 text-[11px]", disabled: isLoading, "data-testid": "card-rule-new-bookmaker" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "w-48 space-y-1.5", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "new-rule", className: "text-[10px] font-medium text-ot-foreground", children: "Counting Rule" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { id: "new-rule", value: newRule, onChange: (e) => setNewRule(e.target.value), disabled: isLoading, className: "h-8", "data-testid": "card-rule-new-rule", children: [(0, jsx_runtime_1.jsx)("option", { value: "standard", children: types_1.CARD_COUNTING_RULE_DISPLAY.standard.label }), (0, jsx_runtime_1.jsx)("option", { value: "conservative", children: types_1.CARD_COUNTING_RULE_DISPLAY.conservative.label })] })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", onClick: () => void handleAddRule(), disabled: isLoading || !newBookmaker.trim(), className: "h-8 px-3 text-[11px]", "data-testid": "card-rule-add-btn", children: isLoading ? 'Adding...' : 'Add Rule' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-[11px] font-semibold uppercase tracking-[0.14em] text-ot-accent", children: "Configured Bookmakers" }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent", children: [configuredBookmakers.length, " configured"] })] }), configuredBookmakers.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-ot-border/40 bg-ot-background/20 p-4 text-center", children: (0, jsx_runtime_1.jsxs)("p", { className: "text-[11px] text-ot-muted", children: ["No bookmakers configured yet. All bookmakers will use the \"", types_1.CARD_COUNTING_RULE_DISPLAY[types_1.DEFAULT_CARD_COUNTING_RULE].label, "\" rule by default."] }) })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: configuredBookmakers.map(([bookmaker, rule]) => ((0, jsx_runtime_1.jsx)(BookmakerRuleRow, { bookmaker: bookmaker, rule: rule, onRuleChange: handleRuleChange, onRemove: handleRemoveRule, isLoading: isLoading }, bookmaker))) }))] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[11px] text-red-200", role: "alert", "data-testid": "card-rule-error", children: error })), success && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-[11px] text-emerald-400", role: "status", "data-testid": "card-rule-success", children: success }))] }));
}
exports.default = BookmakerCardRulesSettings;
