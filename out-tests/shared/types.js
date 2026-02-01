"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AGGRESSIVE_SCAN_CONFIG = exports.DEFAULT_TIER_WEIGHTS = exports.DEFAULT_TIER_BOUNDARIES = exports.DEFAULT_TIER_CONFIGS = exports.DEFAULT_CARD_COUNTING_RULE = exports.CARD_COUNTING_RULE_DISPLAY = exports.DEFAULT_PROVIDER_ID = exports.PROVIDERS = exports.MARKET_PATTERNS = exports.MARKET_GROUP_DISPLAYS = exports.MARKET_GROUPS = exports.PROVIDER_IDS = void 0;
exports.createMarketKey = createMarketKey;
exports.parseMarketKey = parseMarketKey;
exports.isKnownMarketPattern = isKnownMarketPattern;
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
/**
 * Comprehensive market group displays with subcategories.
 * Organized for soccer/football arbitrage betting.
 */
exports.MARKET_GROUP_DISPLAYS = [
    {
        group: 'goals',
        label: 'Goals',
        description: 'Goal-related markets including totals, BTTS, team goals',
        icon: '⚽',
        subcategories: [
            {
                id: 'goals_total_ou',
                label: 'Goals Over/Under',
                description: 'Total match goals over/under a line',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'btts',
                label: 'Both Teams To Score',
                description: 'Yes/No on both teams scoring',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: false
            },
            {
                id: 'team_goals_ou',
                label: 'Team Goals Over/Under',
                description: 'Home or away team goals over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            },
            {
                id: 'clean_sheet',
                label: 'Clean Sheet',
                description: 'Team to keep a clean sheet',
                periods: ['ft'],
                teamScope: ['home', 'away'],
                hasLine: false
            },
            {
                id: 'moneyline',
                label: 'Match Winner (1X2)',
                description: 'Three-way result betting',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: false
            },
            {
                id: 'draw_no_bet',
                label: 'Draw No Bet',
                description: 'Two-way result, stake returned on draw',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: false
            }
        ]
    },
    {
        group: 'handicap',
        label: 'Handicaps',
        description: 'Asian handicap and spread betting markets',
        icon: '📊',
        subcategories: [
            {
                id: 'asian_handicap',
                label: 'Asian Handicap',
                description: 'Two-way handicap with quarter/half lines',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'european_handicap',
                label: 'European Handicap',
                description: 'Three-way handicap including draw',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            }
        ]
    },
    {
        group: 'corners',
        label: 'Corners',
        description: 'Corner kick totals, handicaps, and team corners',
        icon: '🚩',
        subcategories: [
            {
                id: 'corners_total_ou',
                label: 'Corners Over/Under',
                description: 'Total match corners over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'team_corners_ou',
                label: 'Team Corners Over/Under',
                description: 'Home or away team corners over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            },
            {
                id: 'corners_handicap',
                label: 'Corners Handicap',
                description: 'Asian handicap on corners',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            }
        ]
    },
    {
        group: 'cards',
        label: 'Cards',
        description: 'Booking points, card totals, red cards',
        icon: '🟨',
        subcategories: [
            {
                id: 'cards_total_ou',
                label: 'Cards Over/Under',
                description: 'Total match cards over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'team_cards_ou',
                label: 'Team Cards Over/Under',
                description: 'Home or away team cards over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            },
            {
                id: 'red_card',
                label: 'Red Card Yes/No',
                description: 'Red card to be shown in match',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: false
            },
            {
                id: 'booking_points',
                label: 'Booking Points',
                description: 'Total booking points (10 yellow, 25 red)',
                periods: ['ft'],
                teamScope: ['match'],
                hasLine: true
            }
        ]
    },
    {
        group: 'shots',
        label: 'Shots',
        description: 'Shot totals, shots on target',
        icon: '🎯',
        subcategories: [
            {
                id: 'shots_total_ou',
                label: 'Shots Over/Under',
                description: 'Total match shots over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'team_shots_ou',
                label: 'Team Shots Over/Under',
                description: 'Home or away team shots over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            },
            {
                id: 'shots_on_target_ou',
                label: 'Shots on Target Over/Under',
                description: 'Total shots on target over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'team_sot_ou',
                label: 'Team Shots on Target O/U',
                description: 'Home or away team SOT over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            }
        ]
    },
    {
        group: 'other',
        label: 'Other',
        description: 'Offsides, fouls, penalties, and miscellaneous',
        icon: '📋',
        subcategories: [
            {
                id: 'offsides_total_ou',
                label: 'Offsides Over/Under',
                description: 'Total match offsides over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'team_offsides_ou',
                label: 'Team Offsides Over/Under',
                description: 'Home or away team offsides over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            },
            {
                id: 'fouls_total_ou',
                label: 'Fouls Over/Under',
                description: 'Total match fouls over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: true
            },
            {
                id: 'team_fouls_ou',
                label: 'Team Fouls Over/Under',
                description: 'Home or away team fouls over/under',
                periods: ['ft', '1h', '2h'],
                teamScope: ['home', 'away'],
                hasLine: true
            },
            {
                id: 'penalty_awarded',
                label: 'Penalty Awarded Yes/No',
                description: 'Penalty to be awarded in match',
                periods: ['ft', '1h', '2h'],
                teamScope: ['match'],
                hasLine: false
            }
        ]
    }
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
 * Story 7.4: Extended with comprehensive two-way market patterns.
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
    // Task 1.1: Goal in 1H/2H binaries and team-specific variants
    goal_in_1h: { group: 'goals', baseType: 'goal_occurrence_1h' },
    goal_in_2h: { group: 'goals', baseType: 'goal_occurrence_2h' },
    goal_in_match_yes: { group: 'goals', baseType: 'goal_occurrence' },
    goal_in_match_no: { group: 'goals', baseType: 'goal_occurrence' },
    first_half_goal: { group: 'goals', baseType: 'goal_occurrence_1h' },
    second_half_goal: { group: 'goals', baseType: 'goal_occurrence_2h' },
    home_to_score: { group: 'goals', baseType: 'team_to_score' },
    away_to_score: { group: 'goals', baseType: 'team_to_score' },
    home_clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
    away_clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
    goals_1h: { group: 'goals', baseType: 'totals_1h' },
    goals_2h: { group: 'goals', baseType: 'totals_2h' },
    first_half_totals: { group: 'goals', baseType: 'totals_1h' },
    second_half_totals: { group: 'goals', baseType: 'totals_2h' },
    // Handicap group - existing patterns
    handicap: { group: 'handicap', baseType: 'handicap' },
    spreads: { group: 'handicap', baseType: 'handicap' },
    spread: { group: 'handicap', baseType: 'handicap' },
    asian_handicap: { group: 'handicap', baseType: 'asian_handicap' },
    ah: { group: 'handicap', baseType: 'asian_handicap' },
    '0-handicap': { group: 'handicap', baseType: 'handicap' },
    '0_handicap': { group: 'handicap', baseType: 'handicap' },
    european_handicap: { group: 'handicap', baseType: 'european_handicap' },
    // Corners group - comprehensive patterns (Task 1.2)
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
    match_corners: { group: 'corners', baseType: 'corners_totals' },
    match_corners_over: { group: 'corners', baseType: 'corners_over' },
    match_corners_under: { group: 'corners', baseType: 'corners_under' },
    first_half_corners: { group: 'corners', baseType: 'corners_1h' },
    second_half_corners: { group: 'corners', baseType: 'corners_2h' },
    corners_1h: { group: 'corners', baseType: 'corners_1h' },
    corners_2h: { group: 'corners', baseType: 'corners_2h' },
    corner_match_bet: { group: 'corners', baseType: 'corners_winner' },
    corners_totals: { group: 'corners', baseType: 'corners_totals' },
    // Cards group - comprehensive patterns (Task 1.3)
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
    match_cards: { group: 'cards', baseType: 'cards_totals' },
    match_bookings: { group: 'cards', baseType: 'cards_totals' },
    booking_points: { group: 'cards', baseType: 'booking_points' },
    first_half_cards: { group: 'cards', baseType: 'cards_1h' },
    cards_1h: { group: 'cards', baseType: 'cards_1h' },
    cards_2h: { group: 'cards', baseType: 'cards_2h' },
    any_player_red: { group: 'cards', baseType: 'red_card' },
    red_card_shown: { group: 'cards', baseType: 'red_card' },
    cards_totals: { group: 'cards', baseType: 'cards_totals' },
    // Shots group - comprehensive patterns (Task 1.4)
    shots: { group: 'shots', baseType: 'shots' },
    shot_totals: { group: 'shots', baseType: 'shots_totals' },
    shots_over: { group: 'shots', baseType: 'shots_over' },
    shots_under: { group: 'shots', baseType: 'shots_under' },
    shots_on_target: { group: 'shots', baseType: 'shots_on_target' },
    sot: { group: 'shots', baseType: 'shots_on_target' },
    team_shots: { group: 'shots', baseType: 'team_shots' },
    home_shots: { group: 'shots', baseType: 'team_shots' },
    away_shots: { group: 'shots', baseType: 'team_shots' },
    match_shots: { group: 'shots', baseType: 'shots_totals' },
    total_shots: { group: 'shots', baseType: 'shots_totals' },
    shots_total: { group: 'shots', baseType: 'shots_totals' },
    sot_over: { group: 'shots', baseType: 'shots_on_target_over' },
    sot_under: { group: 'shots', baseType: 'shots_on_target_under' },
    shots_on_target_total: { group: 'shots', baseType: 'shots_on_target' },
    shots_on_target_over: { group: 'shots', baseType: 'shots_on_target_over' },
    shots_on_target_under: { group: 'shots', baseType: 'shots_on_target_under' },
    shots_totals: { group: 'shots', baseType: 'shots_totals' },
    // Other group - comprehensive patterns (Task 1.5)
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
    goal_kicks: { group: 'other', baseType: 'goal_kicks' },
    total_offsides: { group: 'other', baseType: 'offsides' },
    match_fouls: { group: 'other', baseType: 'fouls' },
    total_fouls: { group: 'other', baseType: 'fouls' },
    penalty_awarded: { group: 'other', baseType: 'penalty' },
    penalty_scored: { group: 'other', baseType: 'penalty' },
    own_goal_scored: { group: 'other', baseType: 'own_goal' },
    throw_in_totals: { group: 'other', baseType: 'throw_ins' },
    goal_kick_totals: { group: 'other', baseType: 'goal_kicks' }
};
/**
 * Alias map for fuzzy matching common abbreviations and variants (Task 2.5).
 * Maps shorthand/alternate names to canonical pattern keys.
 */
const MARKET_ALIAS_MAP = {
    btts: 'both_teams_to_score',
    sot: 'shots_on_target',
    dnb: 'draw_no_bet',
    ah: 'asian_handicap',
    'o/u': 'over_under',
    ou: 'over_under',
    gg: 'btts', // Goal-Goal (European term for BTTS)
    ng: 'btts_no', // No Goal (BTTS No)
    cs: 'clean_sheet',
    '1x2': 'h2h',
    ml: 'moneyline'
};
/**
 * Normalizes provider market strings into a canonical lookup key.
 * Preserves minus signs in numeric values (e.g., -1.5).
 */
function normalizeMarketString(marketString) {
    return marketString
        .toLowerCase()
        .trim()
        .replace(/([a-z])-([a-z])/g, '$1_$2') // word-word hyphens to underscores
        .replace(/ /g, '_');
}
/**
 * Extracts period from a market key suffix (Task 2.1).
 * Detects _1h, _2h, _ft, first_half_, second_half_ patterns.
 */
function extractPeriodFromKey(key) {
    // Check suffix patterns
    if (key.endsWith('_ft') || key.endsWith('_full_time')) {
        return 'ft';
    }
    if (key.endsWith('_1h') || key.endsWith('_first_half')) {
        return '1h';
    }
    if (key.endsWith('_2h') || key.endsWith('_second_half')) {
        return '2h';
    }
    // Check prefix patterns
    if (key.startsWith('first_half_') || key.startsWith('1h_')) {
        return '1h';
    }
    if (key.startsWith('second_half_') || key.startsWith('2h_')) {
        return '2h';
    }
    return undefined;
}
/**
 * Extracts line value from a market key (Task 2.2).
 * Handles patterns like over_2.5, under_9.5, handicap_-1.5.
 */
function extractLineFromKey(key) {
    // Match patterns like _2.5, _-1.5, _+0.5, _10.5
    // Search for the LAST numeric value in the key which is typically the line
    const parts = key.split('_');
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        // Check if this part is a number (with optional sign and decimal)
        // Note: [-+] not [+-] because minus must be first or last in character class
        const numMatch = part.match(/^([-+]?\d+(?:\.\d+)?)$/);
        if (numMatch) {
            const parsed = parseFloat(numMatch[1]);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
    }
    return undefined;
}
/**
 * Extracts side (home/away/match) from a market key (Task 2.3).
 * Detects home_, away_, team1_, team2_ prefixes.
 */
function extractSideFromKey(key) {
    if (key.startsWith('home_') || key.startsWith('team1_') || key.includes('_home_')) {
        return 'home';
    }
    if (key.startsWith('away_') || key.startsWith('team2_') || key.includes('_away_')) {
        return 'away';
    }
    if (key.startsWith('match_') || key.includes('_match_')) {
        return 'match';
    }
    return undefined;
}
/**
 * Resolves aliases to canonical patterns (Task 2.5).
 */
function resolveAlias(key) {
    // Check exact alias match
    if (MARKET_ALIAS_MAP[key]) {
        return MARKET_ALIAS_MAP[key];
    }
    // Check if key starts with an alias
    for (const [alias, canonical] of Object.entries(MARKET_ALIAS_MAP)) {
        if (key.startsWith(alias + '_')) {
            return key.replace(alias, canonical);
        }
    }
    return key;
}
/**
 * Attempts to resolve a normalized market key to a known pattern.
 * Returns the matched pattern metadata or null when no match exists.
 */
function findMarketPattern(resolvedKey) {
    const exactMatch = exports.MARKET_PATTERNS[resolvedKey];
    if (exactMatch) {
        return exactMatch;
    }
    // Progressive prefix matching for compound keys like corners_totals_over_9.5_ft
    const parts = resolvedKey.split('_');
    for (let len = parts.length - 1; len >= 1; len--) {
        const prefix = parts.slice(0, len).join('_');
        const match = exports.MARKET_PATTERNS[prefix];
        if (match) {
            return match;
        }
    }
    // Broad prefix scan fallback
    for (const [pattern, meta] of Object.entries(exports.MARKET_PATTERNS)) {
        if (resolvedKey.startsWith(pattern)) {
            return meta;
        }
    }
    return null;
}
/**
 * Determines whether a provider market key matches any known market pattern.
 * Used to distinguish known "other" markets from truly unknown markets.
 */
function isKnownMarketPattern(marketString) {
    if (!marketString || typeof marketString !== 'string') {
        return false;
    }
    const normalized = normalizeMarketString(marketString);
    const resolved = resolveAlias(normalized);
    return findMarketPattern(resolved) !== null;
}
/**
 * Infers MarketMetadata from a raw market string.
 * Falls back to 'other' group if pattern is not recognized.
 * Story 7.4: Enhanced with period/line/side detection, improved prefix matching, and fuzzy alias resolution.
 */
function inferMarketMetadata(marketString) {
    // Guard against undefined/null input
    if (!marketString || typeof marketString !== 'string') {
        return {
            group: 'other',
            key: 'unknown',
            label: 'Unknown'
        };
    }
    const normalized = normalizeMarketString(marketString);
    // Resolve aliases first (Task 2.5)
    const resolved = resolveAlias(normalized);
    const matchedPattern = findMarketPattern(resolved);
    if (matchedPattern) {
        const period = extractPeriodFromKey(resolved);
        const line = extractLineFromKey(resolved);
        const side = extractSideFromKey(resolved);
        return {
            group: matchedPattern.group,
            key: resolved,
            label: formatMarketLabelFromKey(resolved),
            ...(period && { period }),
            ...(line !== undefined && { line }),
            ...(side && { side })
        };
    }
    // Fallback to 'other' group with all available metadata
    const period = extractPeriodFromKey(resolved);
    const line = extractLineFromKey(resolved);
    const side = extractSideFromKey(resolved);
    return {
        group: 'other',
        key: resolved,
        label: formatMarketLabelFromKey(resolved),
        ...(period && { period }),
        ...(line !== undefined && { line }),
        ...(side && { side })
    };
}
/**
 * Converts a canonical market key to human-readable label.
 * Story 7.4 Task 4: Enhanced with comprehensive label mappings and dynamic formatting.
 */
function formatMarketLabelFromKey(key) {
    const labelMap = {
        // Goals group
        h2h: 'Moneyline',
        moneyline: 'Moneyline',
        'match-winner': 'Match Winner',
        totals: 'Goals O/U',
        goals_totals: 'Goals O/U',
        goals_totals_1h: 'Goals O/U (1H)',
        goals_totals_2h: 'Goals O/U (2H)',
        btts: 'BTTS (Both Teams to Score)',
        both_teams_to_score: 'BTTS (Both Teams to Score)',
        btts_yes: 'BTTS Yes',
        btts_no: 'BTTS No',
        btts_yes_ft: 'BTTS Yes (FT)',
        btts_no_ft: 'BTTS No (FT)',
        btts_yes_1h: 'BTTS Yes (1H)',
        btts_no_1h: 'BTTS No (1H)',
        'draw-no-bet': 'Draw No Bet',
        draw_no_bet: 'Draw No Bet',
        dnb: 'Draw No Bet',
        clean_sheet: 'Clean Sheet',
        home_clean_sheet: 'Home Clean Sheet',
        away_clean_sheet: 'Away Clean Sheet',
        goal_occurrence: 'Goal in Match',
        goal_occurrence_1h: 'Goal in 1H',
        goal_occurrence_2h: 'Goal in 2H',
        goal_in_1h: 'Goal in 1H',
        goal_in_2h: 'Goal in 2H',
        team_to_score: 'Team to Score',
        home_to_score: 'Home to Score',
        away_to_score: 'Away to Score',
        totals_1h: 'Goals O/U (1H)',
        totals_2h: 'Goals O/U (2H)',
        // Handicap group
        handicap: 'Handicap',
        spreads: 'Handicap/Spread',
        spread: 'Handicap/Spread',
        asian_handicap: 'Asian Handicap',
        ah: 'Asian Handicap',
        european_handicap: 'European Handicap',
        // Corners group
        corners: 'Corners',
        corners_over: 'Corners Over',
        corners_under: 'Corners Under',
        corners_totals: 'Corners O/U',
        corner_totals: 'Corners O/U',
        corners_handicap: 'Corner Handicap',
        corner_handicap: 'Corner Handicap',
        corners_race: 'Corner Race',
        corner_race: 'Corner Race',
        corners_1h: 'Corners (1H)',
        corners_2h: 'Corners (2H)',
        first_half_corners: 'Corners (1H)',
        second_half_corners: 'Corners (2H)',
        corners_winner: 'Corner Match Bet',
        corner_match_bet: 'Corner Match Bet',
        team_corners: 'Team Corners',
        home_corners: 'Home Team Corners',
        away_corners: 'Away Team Corners',
        // Cards group
        cards: 'Cards',
        cards_over: 'Cards Over',
        cards_under: 'Cards Under',
        cards_totals: 'Cards O/U',
        card_totals: 'Cards O/U',
        red_card: 'Red Card',
        red_card_yes: 'Red Card Yes',
        red_card_no: 'Red Card No',
        bookings: 'Bookings',
        booking_totals: 'Bookings O/U',
        booking_points: 'Booking Points',
        cards_1h: 'Cards (1H)',
        cards_2h: 'Cards (2H)',
        first_half_cards: 'Cards (1H)',
        team_cards: 'Team Cards',
        home_cards: 'Home Team Cards',
        away_cards: 'Away Team Cards',
        // Shots group
        shots: 'Shots',
        shots_over: 'Shots Over',
        shots_under: 'Shots Under',
        shots_totals: 'Shots O/U',
        shot_totals: 'Shots O/U',
        shots_on_target: 'Shots on Target',
        sot: 'Shots on Target',
        shots_on_target_over: 'Shots on Target Over',
        shots_on_target_under: 'Shots on Target Under',
        sot_over: 'Shots on Target Over',
        sot_under: 'Shots on Target Under',
        team_shots: 'Team Shots',
        home_shots: 'Home Team Shots',
        away_shots: 'Away Team Shots',
        // Other group
        offsides: 'Offsides',
        offside_totals: 'Offsides O/U',
        fouls: 'Fouls',
        foul_totals: 'Fouls O/U',
        penalty: 'Penalty',
        penalty_yes: 'Penalty Yes',
        penalty_no: 'Penalty No',
        penalty_awarded: 'Penalty Awarded',
        penalty_scored: 'Penalty Scored',
        own_goal: 'Own Goal',
        own_goal_yes: 'Own Goal Yes',
        own_goal_no: 'Own Goal No',
        throw_ins: 'Throw-ins',
        goal_kicks: 'Goal Kicks'
    };
    // Check exact match first
    const normalized = key.toLowerCase();
    if (labelMap[normalized]) {
        return labelMap[normalized];
    }
    // Parse and format dynamically (Task 4.2)
    const parsed = parseMarketKey(normalized);
    // Extract line value from key if present
    const lineMatch = key.match(/([+-]?\d+(?:\.\d+)?)/);
    const lineValue = lineMatch ? parseFloat(lineMatch[0]) : undefined;
    const formattedLine = lineValue !== undefined && Number.isFinite(lineValue)
        ? (lineValue % 1 === 0 ? lineValue.toString() : lineValue.toFixed(1).replace(/\.0$/, ''))
        : null;
    // Try to match base key (without line) against labelMap for better labels
    if (formattedLine && lineMatch) {
        // Remove line value from key to find base key
        const baseKey = normalized.replace(new RegExp(`_?${lineMatch[0].replace(/[.+]/g, '\\$&')}$`), '');
        if (labelMap[baseKey]) {
            // Insert line value into the base label
            let baseLabel = labelMap[baseKey];
            // Add line after "O/U" or at the end
            if (baseLabel.includes('O/U')) {
                baseLabel = baseLabel.replace('O/U', `O/U ${formattedLine}`);
            }
            else if (baseLabel.includes('Over')) {
                baseLabel = baseLabel.replace(/Over$/, `Over ${formattedLine}`);
            }
            else if (baseLabel.includes('Under')) {
                baseLabel = baseLabel.replace(/Under$/, `Under ${formattedLine}`);
            }
            else if (baseLabel.includes('Handicap')) {
                // formattedLine already contains sign for negative values
                const sign = lineValue !== undefined && lineValue >= 0 ? '+' : '';
                baseLabel = `${baseLabel} ${sign}${formattedLine}`;
            }
            else {
                baseLabel = `${baseLabel} ${formattedLine}`;
            }
            return baseLabel;
        }
    }
    // Build base label from key parts (fallback)
    let label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    // Task 4.2: Handle compound keys like "corners_over_9.5_ft"
    // Replace "Totals" with "O/U" for readability
    label = label.replace(/\bTotals\b/gi, 'O/U');
    label = label.replace(/\bOver Under\b/gi, 'O/U');
    // Clean up numeric formatting in label
    if (formattedLine && lineMatch) {
        label = label.replace(new RegExp(lineMatch[0].replace(/[.+]/g, '\\$&'), 'g'), formattedLine);
    }
    // Add period suffix if present (Task 4.2)
    if (parsed.period) {
        const periodLabels = {
            ft: '(FT)',
            '1h': '(1H)',
            '2h': '(2H)'
        };
        const periodSuffix = periodLabels[parsed.period];
        // Remove raw period from label and add formatted suffix
        if (!label.includes(periodSuffix)) {
            label = label.replace(/ Ft$/i, '');
            label = label.replace(/ 1h$/i, '');
            label = label.replace(/ 2h$/i, '');
            label = label.trim() + ' ' + periodSuffix;
        }
    }
    return label.trim();
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
/**
 * Display metadata for card counting rules.
 */
exports.CARD_COUNTING_RULE_DISPLAY = {
    conservative: {
        label: 'Conservative (2 cards max)',
        description: 'Counts both yellows and the resulting red as just the red',
        example: '2 yellows + red = 2 cards total'
    },
    standard: {
        label: 'Standard (3 cards)',
        description: 'Counts each card shown individually',
        example: '2 yellows + red = 3 cards total'
    }
};
/**
 * Default card counting rule for new/unconfigured bookmakers.
 */
exports.DEFAULT_CARD_COUNTING_RULE = 'standard';
/**
 * Default tier configurations for aggressive scanning.
 * Story 8.7: Pre-configured tier boundaries and weights.
 */
exports.DEFAULT_TIER_CONFIGS = [
    { name: 'imminent', maxMinutesToKickoff: 30, weight: 50, minPollIntervalSeconds: 15, maxPollIntervalSeconds: 60 },
    { name: 'soon', maxMinutesToKickoff: 120, weight: 25, minPollIntervalSeconds: 60, maxPollIntervalSeconds: 180 },
    { name: 'today', maxMinutesToKickoff: 360, weight: 12, minPollIntervalSeconds: 180, maxPollIntervalSeconds: 600 },
    { name: 'later', maxMinutesToKickoff: 1440, weight: 8, minPollIntervalSeconds: 600, maxPollIntervalSeconds: 1800 },
    { name: 'tomorrow', maxMinutesToKickoff: 2880, weight: 3, minPollIntervalSeconds: 1800, maxPollIntervalSeconds: 3600 },
    { name: 'distant', maxMinutesToKickoff: Infinity, weight: 2, minPollIntervalSeconds: 3600, maxPollIntervalSeconds: 7200 }
];
/**
 * Default tier boundaries (in minutes).
 * Story 8.7: Default time-to-kickoff boundaries for each tier.
 */
exports.DEFAULT_TIER_BOUNDARIES = {
    imminent: 30,
    soon: 120,
    today: 360,
    later: 1440,
    tomorrow: 2880
};
/**
 * Default tier weights (% of quota budget).
 * Story 8.7: Default weights prioritize imminent events.
 */
exports.DEFAULT_TIER_WEIGHTS = {
    imminent: 50,
    soon: 25,
    today: 12,
    later: 8,
    tomorrow: 3,
    distant: 2
};
/**
 * Default aggressive scan configuration.
 * Story 8.7: Sensible defaults for aggressive mode.
 */
exports.DEFAULT_AGGRESSIVE_SCAN_CONFIG = {
    enabled: false,
    quotaTargetPercent: 75,
    scanHorizonHours: 48,
    imminentPollIntervalSeconds: 45,
    tierBoundaries: exports.DEFAULT_TIER_BOUNDARIES,
    tierWeights: exports.DEFAULT_TIER_WEIGHTS,
    arbBoostDurationMinutes: 5,
    arbBoostPollIntervalSeconds: 20,
    maxBoostedEvents: 10,
    maxCachedEvents: 3000,
    eventDiscoveryIntervalMinutes: 30
};
