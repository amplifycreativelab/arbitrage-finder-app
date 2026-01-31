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
exports.SportLeagueFilter = SportLeagueFilter;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
function SportLeagueFilter({ scanScope, enabledSports, enabledLeagues, onSportsChange, onLeaguesChange, onApplyPreset }) {
    const [sports, setSports] = React.useState([]);
    const [leagues, setLeagues] = React.useState([]);
    const [presets, setPresets] = React.useState([]);
    const [isLoadingSports, setIsLoadingSports] = React.useState(false);
    const [isLoadingLeagues, setIsLoadingLeagues] = React.useState(false);
    const [selectedSport, setSelectedSport] = React.useState('football');
    const [expandedSection, setExpandedSection] = React.useState('presets');
    // Load presets on mount
    React.useEffect(() => {
        void (async () => {
            try {
                const result = await window.api.deepScan.getLeaguePresets();
                setPresets(result);
            }
            catch {
                // Silent fail
            }
        })();
    }, []);
    // Load cached sports on mount
    React.useEffect(() => {
        void (async () => {
            try {
                const result = await window.api.deepScan.getSportsDetails();
                if (result.length > 0) {
                    setSports(result);
                }
            }
            catch {
                // Silent fail
            }
        })();
    }, []);
    // Load cached leagues on mount
    React.useEffect(() => {
        void (async () => {
            try {
                const result = await window.api.deepScan.getLeagues();
                if (result.length > 0) {
                    setLeagues(result);
                }
            }
            catch {
                // Silent fail
            }
        })();
    }, []);
    // Fetch sports from API
    const handleFetchSports = async () => {
        setIsLoadingSports(true);
        try {
            const result = await window.api.deepScan.fetchSports();
            setSports(result);
        }
        catch (error) {
            console.error('Failed to fetch sports:', error);
        }
        finally {
            setIsLoadingSports(false);
        }
    };
    // Fetch leagues for selected sport
    const handleFetchLeagues = async (sport) => {
        setIsLoadingLeagues(true);
        try {
            const result = await window.api.deepScan.fetchLeagues(sport);
            setLeagues((prev) => {
                const others = prev.filter((l) => l.sport !== sport);
                return [...others, ...result];
            });
        }
        catch (error) {
            console.error('Failed to fetch leagues:', error);
        }
        finally {
            setIsLoadingLeagues(false);
        }
    };
    // Toggle sport selection
    const toggleSport = (slug) => {
        const newSports = enabledSports.includes(slug)
            ? enabledSports.filter((s) => s !== slug)
            : [...enabledSports, slug];
        onSportsChange(newSports);
    };
    // Toggle league selection
    const toggleLeague = (slug) => {
        const newLeagues = enabledLeagues.includes(slug)
            ? enabledLeagues.filter((l) => l !== slug)
            : [...enabledLeagues, slug];
        onLeaguesChange(newLeagues);
    };
    // Don't render if scan scope is 'all-sports'
    if (scanScope === 'all-sports') {
        return null;
    }
    const filteredLeagues = leagues.filter((l) => l.sport === selectedSport || (selectedSport === 'all' && true));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 rounded border border-ot-border/60 bg-ot-border/10 p-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setExpandedSection(expandedSection === 'presets' ? null : 'presets'), className: "flex w-full items-center justify-between text-[10px] font-semibold text-ot-foreground", children: [(0, jsx_runtime_1.jsx)("span", { children: "Quick Presets" }), (0, jsx_runtime_1.jsx)("span", { className: "text-ot-muted", children: expandedSection === 'presets' ? '▲' : '▼' })] }), expandedSection === 'presets' && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 space-y-1", children: presets.map((preset) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onApplyPreset(preset.id), className: "flex w-full items-start gap-2 rounded border border-ot-border bg-ot-surface p-2 text-left transition-colors hover:border-ot-accent hover:bg-ot-accent/10", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[10px] font-semibold text-ot-foreground", children: preset.name }), (0, jsx_runtime_1.jsx)("div", { className: "text-[9px] text-ot-muted", children: preset.description }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1 text-[8px] text-ot-muted/70", children: [preset.leagues.length, " leagues"] })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[10px] text-ot-accent", children: "Apply" })] }, preset.id))) }))] }), scanScope === 'selected-sports' && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-2 border-t border-ot-border/40 pt-2", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setExpandedSection(expandedSection === 'sports' ? null : 'sports'), className: "flex w-full items-center justify-between text-[10px] font-semibold text-ot-foreground", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Sports (", enabledSports.length > 0 ? `${enabledSports.length} selected` : 'All', ")"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-ot-muted", children: expandedSection === 'sports' ? '▲' : '▼' })] }), expandedSection === 'sports' && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void handleFetchSports(), disabled: isLoadingSports, className: "rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent disabled:opacity-50", children: isLoadingSports ? 'Loading...' : 'Refresh Sports' }), enabledSports.length > 0 && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onSportsChange([]), className: "text-[9px] text-ot-muted hover:text-ot-accent", children: "Clear All" }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: sports.length === 0 ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[9px] text-ot-muted", children: "Click \"Refresh Sports\" to load available sports" })) : (sports.map((sport) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => toggleSport(sport.slug), className: `rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors ${enabledSports.includes(sport.slug)
                                        ? 'border-ot-accent bg-ot-accent/20 text-ot-accent'
                                        : 'border-ot-border bg-ot-surface text-ot-muted hover:border-ot-accent/50'}`, children: sport.name }, sport.slug)))) })] }))] })), scanScope === 'selected-leagues' && ((0, jsx_runtime_1.jsxs)("div", { className: "border-t border-ot-border/40 pt-2", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setExpandedSection(expandedSection === 'leagues' ? null : 'leagues'), className: "flex w-full items-center justify-between text-[10px] font-semibold text-ot-foreground", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Leagues (", enabledLeagues.length > 0 ? `${enabledLeagues.length} selected` : 'None', ")"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-ot-muted", children: expandedSection === 'leagues' ? '▲' : '▼' })] }), expandedSection === 'leagues' && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("select", { value: selectedSport, onChange: (e) => setSelectedSport(e.target.value), className: "h-6 rounded border border-ot-border bg-ot-surface px-1 text-[9px] text-ot-foreground", children: [(0, jsx_runtime_1.jsx)("option", { value: "football", children: "Football" }), (0, jsx_runtime_1.jsx)("option", { value: "basketball", children: "Basketball" }), (0, jsx_runtime_1.jsx)("option", { value: "tennis", children: "Tennis" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void handleFetchLeagues(selectedSport), disabled: isLoadingLeagues, className: "rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent disabled:opacity-50", children: isLoadingLeagues ? 'Loading...' : 'Refresh Leagues' }), enabledLeagues.length > 0 && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onLeaguesChange([]), className: "text-[9px] text-ot-muted hover:text-ot-accent", children: "Clear All" }))] }), enabledLeagues.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "mb-2 flex flex-wrap gap-1 border-b border-ot-border/40 pb-2", children: enabledLeagues.map((slug) => {
                                    const league = leagues.find((l) => l.slug === slug);
                                    return ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-full border border-ot-accent/30 bg-ot-accent/10 px-2 py-0.5 text-[9px] font-medium text-ot-accent", children: [league?.name ?? slug, (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => toggleLeague(slug), className: "hover:text-red-400", children: "\u00D7" })] }, slug));
                                }) })), (0, jsx_runtime_1.jsx)("div", { className: "max-h-40 overflow-y-auto", children: filteredLeagues.length === 0 ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[9px] text-ot-muted", children: "Click \"Refresh Leagues\" to load available leagues" })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-1", children: filteredLeagues
                                        .sort((a, b) => b.eventsCount - a.eventsCount)
                                        .map((league) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggleLeague(league.slug), className: `flex w-full items-center justify-between rounded border px-2 py-1 text-left text-[9px] transition-colors ${enabledLeagues.includes(league.slug)
                                            ? 'border-ot-accent/40 bg-ot-accent/10 text-ot-accent'
                                            : 'border-ot-border bg-ot-surface text-ot-foreground hover:border-ot-accent/50'}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "truncate", children: league.name }), (0, jsx_runtime_1.jsxs)("span", { className: "ml-2 text-ot-muted", children: [league.eventsCount, " events"] })] }, league.slug))) })) })] }))] }))] }));
}
exports.default = SportLeagueFilter;
