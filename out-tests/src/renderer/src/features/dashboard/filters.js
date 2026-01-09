"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_MARKET_FILTERS = exports.ALL_SPORT_FILTERS = exports.ALL_REGION_CODES = void 0;
exports.inferRegionFromOpportunity = inferRegionFromOpportunity;
exports.inferMarketTypeFromOpportunity = inferMarketTypeFromOpportunity;
exports.applyDashboardFilters = applyDashboardFilters;
exports.ALL_REGION_CODES = ['AU', 'UK', 'IT', 'RO'];
exports.ALL_SPORT_FILTERS = ['soccer', 'tennis'];
exports.ALL_MARKET_FILTERS = [
    'moneyline',
    'draw-no-bet',
    'totals',
    'btts',
    'handicap'
];
function normalizeLeague(value) {
    return (value ?? '').toLowerCase();
}
function inferRegionFromOpportunity(opportunity) {
    const league = normalizeLeague(opportunity.event.league);
    if (!league) {
        return null;
    }
    if (league.includes('serie a') || league.includes('serie b') || league.includes('coppa italia')) {
        return 'IT';
    }
    if (league.includes('wimbledon') ||
        league.includes('premier league') ||
        league.includes('championship') ||
        league.includes('england')) {
        return 'UK';
    }
    if (league.includes('a-league') || league.includes('a league') || league.includes('australia')) {
        return 'AU';
    }
    if (league.includes('liga i') ||
        league.includes('liga 1') ||
        league.includes('romania')) {
        return 'RO';
    }
    return null;
}
function inferMarketTypeFromOpportunity(opportunity) {
    const primaryMarket = opportunity.legs[0]?.market ?? '';
    const normalized = primaryMarket.toLowerCase();
    // Moneyline / H2H variants
    if (normalized === 'moneyline' || normalized === 'match-winner' || normalized === 'h2h') {
        return 'moneyline';
    }
    // Draw No Bet variants
    if (normalized === 'draw-no-bet' ||
        normalized === 'draw no bet' ||
        normalized === 'dnb') {
        return 'draw-no-bet';
    }
    // Totals / Over-Under variants
    if (normalized === 'totals' ||
        normalized === 'over/under' ||
        normalized === 'over_under') {
        return 'totals';
    }
    // BTTS (Both Teams To Score) variants
    if (normalized === 'btts' ||
        normalized === 'both-teams-to-score' ||
        normalized === 'both_teams_to_score' ||
        normalized === 'btts_yes' ||
        normalized === 'btts_no' ||
        normalized === 'both_teams_score' ||
        normalized === 'both teams to score') {
        return 'btts';
    }
    // Handicap / Spread / Asian Handicap variants
    if (normalized === 'handicap' ||
        normalized === 'spread' ||
        normalized === 'spreads' ||
        normalized === 'asian_handicap' ||
        normalized === 'asian handicap' ||
        normalized === 'ah' ||
        normalized === '0-handicap' ||
        normalized === 'handicap_0' ||
        normalized === 'handicap 0' ||
        normalized.startsWith('spreads_')) {
        return 'handicap';
    }
    return null;
}
function arraysMatchIgnoringOrder(a, b) {
    if (a.length !== b.length)
        return false;
    return b.every((value) => a.includes(value));
}
function applyDashboardFilters(opportunities, filters) {
    const source = Array.isArray(opportunities) ? opportunities : [];
    const regions = Array.isArray(filters.regions) ? filters.regions : [];
    const sports = Array.isArray(filters.sports) ? filters.sports : [];
    const markets = Array.isArray(filters.markets) ? filters.markets : [];
    const bookmakers = Array.isArray(filters.bookmakers) ? filters.bookmakers : [];
    const minRoi = Number.isFinite(filters.minRoi) && filters.minRoi > 0 ? filters.minRoi : 0;
    const hasSportFilter = !arraysMatchIgnoringOrder(sports, exports.ALL_SPORT_FILTERS);
    const hasRegionFilter = !arraysMatchIgnoringOrder(regions, exports.ALL_REGION_CODES);
    const hasMarketFilter = !arraysMatchIgnoringOrder(markets, exports.ALL_MARKET_FILTERS);
    const hasBookmakerFilter = bookmakers.length > 0;
    const hasRoiFilter = minRoi > 0;
    if (!hasSportFilter &&
        !hasRegionFilter &&
        !hasMarketFilter &&
        !hasBookmakerFilter &&
        !hasRoiFilter) {
        return source;
    }
    return source.filter((opportunity) => {
        if (hasSportFilter && !sports.includes(opportunity.sport)) {
            return false;
        }
        if (hasRegionFilter) {
            const region = inferRegionFromOpportunity(opportunity);
            if (!region || !regions.includes(region)) {
                return false;
            }
        }
        if (hasMarketFilter) {
            const marketType = inferMarketTypeFromOpportunity(opportunity);
            if (!marketType || !markets.includes(marketType)) {
                return false;
            }
        }
        if (hasBookmakerFilter) {
            const involvedBookmakers = opportunity.legs.map((leg) => leg.bookmaker);
            const matchesBookmaker = involvedBookmakers.some((name) => bookmakers.includes(name));
            if (!matchesBookmaker) {
                return false;
            }
        }
        if (hasRoiFilter && opportunity.roi < minRoi) {
            return false;
        }
        return true;
    });
}
