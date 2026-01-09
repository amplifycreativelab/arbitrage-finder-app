"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROVIDER_ID = exports.PROVIDERS = exports.MARKET_PATTERNS = exports.MARKET_GROUP_DISPLAYS = exports.MARKET_GROUPS = exports.PROVIDER_IDS = void 0;
exports.createMarketKey = createMarketKey;
exports.parseMarketKey = parseMarketKey;
exports.inferMarketMetadata = inferMarketMetadata;
exports.formatMarketLabelFromKey = formatMarketLabelFromKey;
exports.isProviderId = isProviderId;
exports.PROVIDER_IDS = ['odds-api-io', 'the-odds-api'];
// ============================================================================
// Market Groups and Metadata (Story 6.1: Expanded Two-Way Market Types)
// ============================================================================
/**
 * Market groups for categorizing arbitrage opportunity market types.
 * Each market belongs to exactly one group for filtering purposes.
 */
exports.MARKET_GROUPS = ['goals', 'handicap', 'corners', 'cards', 'shots', 'other'];
exports.MARKET_GROUP_DISPLAYS = [
    { group: 'goals', label: 'Goals', description: 'Totals, BTTS, team goals, clean sheets' },
    { group: 'handicap', label: 'Handicaps', description: 'Asian handicaps, spreads' },
    { group: 'corners', label: 'Corners', description: 'Corner totals, handicaps, races' },
    { group: 'cards', label: 'Cards', description: 'Card totals, red cards, bookings' },
    { group: 'shots', label: 'Shots', description: 'Shot totals, shots on target' },
    { group: 'other', label: 'Other', description: 'Offsides, fouls, penalties' }
];
/**
 * Creates a canonical market key from components.
 */
function createMarketKey(group, type, options = {}) {
    const parts = [group, type];
    if (options.side && options.side !== 'match') {
        parts.push(options.side);
    }
    if (options.line !== undefined) {
        parts.push(options.line.toString());
    }
    if (options.period) {
        parts.push(options.period);
    }
    return parts.join('_');
}
/**
 * Parses a canonical market key into its components.
 */
function parseMarketKey(key) {
    const parts = key.split('_');
    const group = parts[0];
    if (!exports.MARKET_GROUPS.includes(group)) {
        return { group: 'other', key };
    }
    const result = { group, key };
    // Parse period from last part if valid
    const lastPart = parts[parts.length - 1];
    if (['ft', '1h', '2h'].includes(lastPart)) {
        result.period = lastPart;
    }
    // Parse line (numeric value in parts)
    for (const part of parts) {
        const num = parseFloat(part);
        if (!isNaN(num)) {
            result.line = num;
            break;
        }
    }
    // Parse side
    if (parts.includes('home')) {
        result.side = 'home';
    }
    else if (parts.includes('away')) {
        result.side = 'away';
    }
    return result;
}
/**
 * Known market type patterns for inference.
 * Maps provider market strings to canonical group assignments.
 */
exports.MARKET_PATTERNS = {
    // Goals group - existing patterns
    h2h: { group: 'goals', baseType: 'moneyline' },
    moneyline: { group: 'goals', baseType: 'moneyline' },
    'match-winner': { group: 'goals', baseType: 'moneyline' },
    totals: { group: 'goals', baseType: 'totals' },
    'over/under': { group: 'goals', baseType: 'totals' },
    over_under: { group: 'goals', baseType: 'totals' },
    btts: { group: 'goals', baseType: 'btts' },
    'both-teams-to-score': { group: 'goals', baseType: 'btts' },
    both_teams_to_score: { group: 'goals', baseType: 'btts' },
    btts_yes: { group: 'goals', baseType: 'btts' },
    btts_no: { group: 'goals', baseType: 'btts' },
    'draw-no-bet': { group: 'goals', baseType: 'draw_no_bet' },
    draw_no_bet: { group: 'goals', baseType: 'draw_no_bet' },
    dnb: { group: 'goals', baseType: 'draw_no_bet' },
    clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
    cleansheet: { group: 'goals', baseType: 'clean_sheet' },
    goal_in_match: { group: 'goals', baseType: 'goal_occurrence' },
    team_totals: { group: 'goals', baseType: 'team_totals' },
    home_totals: { group: 'goals', baseType: 'team_totals' },
    away_totals: { group: 'goals', baseType: 'team_totals' },
    // Handicap group - existing patterns
    handicap: { group: 'handicap', baseType: 'handicap' },
    spreads: { group: 'handicap', baseType: 'handicap' },
    spread: { group: 'handicap', baseType: 'handicap' },
    asian_handicap: { group: 'handicap', baseType: 'asian_handicap' },
    ah: { group: 'handicap', baseType: 'asian_handicap' },
    '0-handicap': { group: 'handicap', baseType: 'handicap' },
    '0_handicap': { group: 'handicap', baseType: 'handicap' },
    european_handicap: { group: 'handicap', baseType: 'european_handicap' },
    // Corners group - new patterns
    corners: { group: 'corners', baseType: 'corners' },
    corner_totals: { group: 'corners', baseType: 'corners_totals' },
    corners_over: { group: 'corners', baseType: 'corners_over' },
    corners_under: { group: 'corners', baseType: 'corners_under' },
    corner_handicap: { group: 'corners', baseType: 'corners_handicap' },
    corners_handicap: { group: 'corners', baseType: 'corners_handicap' },
    corner_race: { group: 'corners', baseType: 'corners_race' },
    race_to_corners: { group: 'corners', baseType: 'corners_race' },
    team_corners: { group: 'corners', baseType: 'team_corners' },
    home_corners: { group: 'corners', baseType: 'team_corners' },
    away_corners: { group: 'corners', baseType: 'team_corners' },
    // Cards group - new patterns
    cards: { group: 'cards', baseType: 'cards' },
    card_totals: { group: 'cards', baseType: 'cards_totals' },
    cards_over: { group: 'cards', baseType: 'cards_over' },
    cards_under: { group: 'cards', baseType: 'cards_under' },
    booking_totals: { group: 'cards', baseType: 'cards_totals' },
    bookings: { group: 'cards', baseType: 'cards_totals' },
    red_card: { group: 'cards', baseType: 'red_card' },
    red_card_yes: { group: 'cards', baseType: 'red_card' },
    red_card_no: { group: 'cards', baseType: 'red_card' },
    team_cards: { group: 'cards', baseType: 'team_cards' },
    home_cards: { group: 'cards', baseType: 'team_cards' },
    away_cards: { group: 'cards', baseType: 'team_cards' },
    player_booked: { group: 'cards', baseType: 'player_booked' },
    // Shots group - new patterns
    shots: { group: 'shots', baseType: 'shots' },
    shot_totals: { group: 'shots', baseType: 'shots_totals' },
    shots_over: { group: 'shots', baseType: 'shots_over' },
    shots_under: { group: 'shots', baseType: 'shots_under' },
    shots_on_target: { group: 'shots', baseType: 'shots_on_target' },
    sot: { group: 'shots', baseType: 'shots_on_target' },
    team_shots: { group: 'shots', baseType: 'team_shots' },
    home_shots: { group: 'shots', baseType: 'team_shots' },
    away_shots: { group: 'shots', baseType: 'team_shots' },
    // Other group - new patterns
    offsides: { group: 'other', baseType: 'offsides' },
    offside_totals: { group: 'other', baseType: 'offsides' },
    fouls: { group: 'other', baseType: 'fouls' },
    foul_totals: { group: 'other', baseType: 'fouls' },
    penalty: { group: 'other', baseType: 'penalty' },
    penalty_yes: { group: 'other', baseType: 'penalty' },
    penalty_no: { group: 'other', baseType: 'penalty' },
    own_goal: { group: 'other', baseType: 'own_goal' },
    own_goal_yes: { group: 'other', baseType: 'own_goal' },
    own_goal_no: { group: 'other', baseType: 'own_goal' },
    throw_ins: { group: 'other', baseType: 'throw_ins' },
    goal_kicks: { group: 'other', baseType: 'goal_kicks' }
};
/**
 * Infers MarketMetadata from a raw market string.
 * Falls back to 'other' group if pattern is not recognized.
 */
function inferMarketMetadata(marketString) {
    const normalized = marketString.toLowerCase().trim().replace(/-/g, '_').replace(/ /g, '_');
    // Check for exact match first
    const exactMatch = exports.MARKET_PATTERNS[normalized];
    if (exactMatch) {
        return {
            group: exactMatch.group,
            key: normalized,
            label: formatMarketLabelFromKey(normalized)
        };
    }
    // Check for prefix matches (e.g., "spreads_0.5" matches "spreads")
    for (const [pattern, meta] of Object.entries(exports.MARKET_PATTERNS)) {
        if (normalized.startsWith(pattern)) {
            const parsed = parseMarketKey(normalized);
            // Extract only period, line, side from parsed - NOT group (we use pattern's group)
            const { period, line, side } = parsed;
            return {
                group: meta.group,
                key: normalized,
                label: formatMarketLabelFromKey(normalized),
                ...(period && { period }),
                ...(line !== undefined && { line }),
                ...(side && { side })
            };
        }
    }
    // Fallback to 'other' group
    return {
        group: 'other',
        key: normalized,
        label: formatMarketLabelFromKey(normalized)
    };
}
/**
 * Converts a canonical market key to human-readable label.
 */
function formatMarketLabelFromKey(key) {
    const labelMap = {
        h2h: 'Moneyline',
        moneyline: 'Moneyline',
        'match-winner': 'Match Winner',
        totals: 'Totals O/U',
        btts: 'BTTS (Both Teams to Score)',
        btts_yes: 'BTTS Yes',
        btts_no: 'BTTS No',
        btts_yes_ft: 'BTTS Yes (FT)',
        btts_no_ft: 'BTTS No (FT)',
        btts_yes_1h: 'BTTS Yes (1H)',
        btts_no_1h: 'BTTS No (1H)',
        'draw-no-bet': 'Draw No Bet',
        draw_no_bet: 'Draw No Bet',
        dnb: 'Draw No Bet',
        handicap: 'Handicap',
        spreads: 'Handicap/Spread',
        asian_handicap: 'Asian Handicap',
        clean_sheet: 'Clean Sheet',
        corners: 'Corners',
        corners_over: 'Corners Over',
        corners_under: 'Corners Under',
        corners_totals: 'Corners O/U',
        corners_handicap: 'Corner Handicap',
        corners_race: 'Corner Race',
        cards: 'Cards',
        cards_over: 'Cards Over',
        cards_under: 'Cards Under',
        cards_totals: 'Cards O/U',
        red_card: 'Red Card',
        bookings: 'Bookings',
        shots: 'Shots',
        shots_over: 'Shots Over',
        shots_under: 'Shots Under',
        shots_on_target: 'Shots on Target',
        sot: 'Shots on Target',
        offsides: 'Offsides',
        fouls: 'Fouls',
        penalty: 'Penalty',
        own_goal: 'Own Goal'
    };
    // Check exact match
    const normalized = key.toLowerCase();
    if (labelMap[normalized]) {
        return labelMap[normalized];
    }
    // Parse and format dynamically
    const parsed = parseMarketKey(normalized);
    // Build label from parts
    let label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    // Add period suffix if present
    if (parsed.period) {
        const periodLabels = {
            ft: '(FT)',
            '1h': '(1H)',
            '2h': '(2H)'
        };
        if (!label.includes(periodLabels[parsed.period])) {
            label = label.replace(` ${parsed.period.toUpperCase()}`, ` ${periodLabels[parsed.period]}`);
            label = label.replace(` ${parsed.period}`, ` ${periodLabels[parsed.period]}`);
        }
    }
    return label;
}
exports.PROVIDERS = [
    {
        id: 'odds-api-io',
        label: 'Production (Odds-API.io)',
        kind: 'production',
        displayName: 'Odds-API.io'
    },
    {
        id: 'the-odds-api',
        label: 'Test (The-Odds-API.com)',
        kind: 'test',
        displayName: 'The-Odds-API.com'
    }
];
exports.DEFAULT_PROVIDER_ID = 'the-odds-api';
function isProviderId(value) {
    return typeof value === 'string' && exports.PROVIDER_IDS.includes(value);
}
