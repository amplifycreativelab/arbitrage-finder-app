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
exports.useDeepScanOdds = useDeepScanOdds;
const React = __importStar(require("react"));
const trpc_1 = require("../../../lib/trpc");
const oddsBrowserStore_1 = require("../stores/oddsBrowserStore");
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds for new odds
/**
 * Transform RawOddsPayload to OddsBrowserRow format.
 * Flattens nested bookmaker/market/outcome structure into individual rows.
 */
function transformRawOddsToRows(payload) {
    const rows = [];
    const timestamp = new Date().toISOString();
    for (const bookmaker of payload.bookmakers) {
        for (const market of bookmaker.markets) {
            // Infer market group from market key
            const marketGroup = inferMarketGroup(market.key);
            for (const outcome of market.outcomes) {
                const row = {
                    id: `${payload.event.id}:${market.key}:${bookmaker.name}:${outcome.name}`,
                    sport: payload.event.sport,
                    league: payload.event.league,
                    event: {
                        home: extractHomeTeam(payload.event.name),
                        away: extractAwayTeam(payload.event.name),
                        startTime: payload.event.date
                    },
                    marketType: formatMarketType(market.key),
                    marketKey: market.key,
                    marketGroup,
                    bookmaker: bookmaker.name,
                    odds: outcome.odds,
                    outcome: outcome.name,
                    lastUpdated: timestamp
                };
                rows.push(row);
            }
        }
    }
    return rows;
}
/**
 * Infer market group from market key.
 * Maps to canonical MarketGroup type: 'goals' | 'handicap' | 'corners' | 'cards' | 'shots' | 'other'
 */
function inferMarketGroup(key) {
    const normalized = key.toLowerCase().trim();
    // Goals group: moneyline, totals, BTTS
    if (normalized.includes('h2h') || normalized.includes('moneyline') || normalized.includes('1x2')) {
        return 'goals';
    }
    if (normalized.includes('total') || normalized.includes('over_under') || normalized.includes('ou') || normalized.includes('btts')) {
        return 'goals';
    }
    // Handicap group: spreads, asian handicaps
    if (normalized.includes('spread') || normalized.includes('handicap') || normalized.includes('asian')) {
        return 'handicap';
    }
    // Corners group
    if (normalized.includes('corner')) {
        return 'corners';
    }
    // Cards group
    if (normalized.includes('card') || normalized.includes('booking')) {
        return 'cards';
    }
    // Shots group
    if (normalized.includes('shot')) {
        return 'shots';
    }
    return 'other';
}
/**
 * Format market key to human-readable market type.
 */
function formatMarketType(key) {
    const normalized = key.toLowerCase().trim();
    if (normalized === 'h2h')
        return 'Moneyline';
    if (normalized === 'totals' || normalized === 'total')
        return 'Over/Under';
    if (normalized === 'spreads' || normalized === 'spread')
        return 'Handicap';
    if (normalized.includes('btts'))
        return 'BTTS';
    if (normalized.includes('draw_no_bet'))
        return 'Draw No Bet';
    if (normalized.includes('double_chance'))
        return 'Double Chance';
    // Capitalize first letter of each word
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
/**
 * Extract home team name from event name.
 * Assumes format: "Home Team vs Away Team" or "Home Team v Away Team"
 */
function extractHomeTeam(eventName) {
    const vsMatch = eventName.match(/^(.+?)(?:\s+(?:vs|v)\s+.+)$/i);
    return vsMatch?.[1]?.trim() || eventName;
}
/**
 * Extract away team name from event name.
 * Assumes format: "Home Team vs Away Team" or "Home Team v Away Team"
 */
function extractAwayTeam(eventName) {
    const vsMatch = eventName.match(/(?:vs|v)\s+(.+)$/i);
    return vsMatch?.[1]?.trim() || 'Unknown';
}
/**
 * Hook to sync Deep Scan raw odds data to oddsBrowserStore.
 * Polls for updates and transforms data into OddsBrowserRow format.
 *
 * Note: Duplicate handling is done at the row level by the store (addRawOddsRows).
 * Event-level deduplication was removed to allow odds updates for existing events.
 * This enables continuous scans and rescans to reflect updated odds in the UI.
 */
function useDeepScanOdds() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [lastUpdated, setLastUpdated] = React.useState(null);
    const addRawOddsRows = (0, oddsBrowserStore_1.useOddsBrowserStore)(state => state.addRawOddsRows);
    const rawOddsRows = (0, oddsBrowserStore_1.useOddsBrowserStore)(state => state.rawOddsRows);
    React.useEffect(() => {
        let isMounted = true;
        let pollHandle = null;
        const fetchRawOdds = async () => {
            try {
                const result = await trpc_1.trpcClient.deepScanGetRawOdds.query();
                if (!isMounted)
                    return;
                if (result.rawOdds.length === 0) {
                    setIsLoading(false);
                    return;
                }
                // Transform all payloads to rows
                const allNewRows = [];
                for (const payload of result.rawOdds) {
                    const rows = transformRawOddsToRows(payload);
                    allNewRows.push(...rows);
                }
                if (allNewRows.length > 0) {
                    // Add/merge rows to store (store handles upsert)
                    addRawOddsRows(allNewRows);
                }
                // Update loading state and timestamp
                setIsLoading(false);
                setLastUpdated(new Date());
                setError(null);
            }
            catch (err) {
                if (!isMounted)
                    return;
                const message = err instanceof Error ? err.message : 'Failed to fetch raw odds';
                setError(message);
                setIsLoading(false);
            }
        };
        // Initial fetch
        void fetchRawOdds();
        // Set up polling
        pollHandle = setInterval(() => {
            void fetchRawOdds();
        }, POLL_INTERVAL_MS);
        return () => {
            isMounted = false;
            if (pollHandle) {
                clearInterval(pollHandle);
            }
        };
    }, [addRawOddsRows]);
    return {
        isLoading,
        error,
        rowCount: rawOddsRows.length,
        lastUpdated
    };
}
exports.default = useDeepScanOdds;
