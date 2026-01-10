"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_MARKET_TO_GROUP = exports.ALL_MARKET_GROUPS = exports.ALL_MARKET_FILTERS = exports.ALL_SPORT_FILTERS = exports.ALL_REGION_CODES = void 0;
exports.inferRegionFromOpportunity = inferRegionFromOpportunity;
exports.inferMarketTypeFromOpportunity = inferMarketTypeFromOpportunity;
exports.getMarketMetadataFromOpportunity = getMarketMetadataFromOpportunity;
exports.getMarketGroupFromOpportunity = getMarketGroupFromOpportunity;
exports.applyDashboardFilters = applyDashboardFilters;
exports.getAvailableBookmakers = getAvailableBookmakers;
const types_1 = require("../../../../../shared/types");
exports.ALL_REGION_CODES = ['AU', 'UK', 'IT', 'RO'];
exports.ALL_SPORT_FILTERS = ['soccer', 'tennis'];
/**
 * Legacy market filters (5 original categories).
 */
exports.ALL_MARKET_FILTERS = [
    'moneyline',
    'draw-no-bet',
    'totals',
    'btts',
    'handicap'
];
/**
 * All market groups for group-based filtering (Story 6.1).
 */
exports.ALL_MARKET_GROUPS = [...types_1.MARKET_GROUPS];
/**
 * Maps legacy MarketFilterValue to corresponding MarketGroup.
 */
exports.LEGACY_MARKET_TO_GROUP = {
    moneyline: 'goals',
    'draw-no-bet': 'goals',
    totals: 'goals',
    btts: 'goals',
    handicap: 'handicap'
};
function normalizeLeague(value) {
    return (value ?? '').toLowerCase();
}
function inferRegionFromOpportunity(opportunity) {
    const league = normalizeLeague(opportunity.event.league);
    if (!league) {
        return null;
    }
    // Italy
    if (league.includes('serie a') ||
        league.includes('serie b') ||
        league.includes('coppa italia') ||
        league.includes('supercoppa') ||
        league.includes('italy')) {
        return 'IT';
    }
    // UK
    if (league.includes('wimbledon') ||
        league.includes('premier league') ||
        league.includes('epl') ||
        league.includes('championship') ||
        league.includes('league one') ||
        league.includes('league two') ||
        league.includes('fa cup') ||
        league.includes('efl cup') ||
        league.includes('carabao cup') ||
        league.includes('england') ||
        league.includes('scotland') ||
        league.includes('premiership') // Scottish Premiership often just 'Premiership'
    ) {
        return 'UK';
    }
    // Australia
    if (league.includes('a-league') ||
        league.includes('a league') ||
        league.includes('ffa cup') ||
        league.includes('australia')) {
        return 'AU';
    }
    // Romania
    if (league.includes('liga i') ||
        league.includes('liga 1') ||
        league.includes('cupa romaniei') ||
        league.includes('romania')) {
        return 'RO';
    }
    // Fallback: If no specific region detected, return null.
    // BUT: logic in getAvailableBookmakers only skips if region IS detected and doesn't match.
    // If region is null (unknown), stricter filtering might be safer, OR permissive?
    // Current logic: `if (!region || !regions.includes(region))`
    // This means Unknown regions are ALWAYS HIDDEN when filtering is active.
    // This is safe but hides data.
    // Let's keep it safe for now, as user explicitly selected "UK", "Italy" etc.
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
/**
 * Gets rich market metadata from an opportunity (Story 6.1).
 * Uses the new inferMarketMetadata from shared types for group-based categorization.
 */
function getMarketMetadataFromOpportunity(opportunity) {
    const primaryMarket = opportunity.legs[0]?.market ?? '';
    return (0, types_1.inferMarketMetadata)(primaryMarket);
}
/**
 * Gets the market group for an opportunity (Story 6.1).
 * Convenience function for group-based filtering.
 */
function getMarketGroupFromOpportunity(opportunity) {
    return getMarketMetadataFromOpportunity(opportunity).group;
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
    const marketGroups = Array.isArray(filters.marketGroups) ? filters.marketGroups : [];
    const bookmakers = Array.isArray(filters.bookmakers) ? filters.bookmakers : [];
    const minRoi = Number.isFinite(filters.minRoi) && filters.minRoi > 0 ? filters.minRoi : 0;
    const hasSportFilter = !arraysMatchIgnoringOrder(sports, exports.ALL_SPORT_FILTERS);
    const hasRegionFilter = !arraysMatchIgnoringOrder(regions, exports.ALL_REGION_CODES);
    const hasLegacyMarketFilter = !arraysMatchIgnoringOrder(markets, exports.ALL_MARKET_FILTERS);
    // New: Group-based market filtering (Story 6.1)
    const hasMarketGroupFilter = marketGroups.length > 0 && !arraysMatchIgnoringOrder(marketGroups, exports.ALL_MARKET_GROUPS);
    const hasBookmakerFilter = bookmakers.length > 0;
    const hasRoiFilter = minRoi > 0;
    // Use group filter if provided, otherwise fall back to legacy filter
    const hasMarketFilter = hasMarketGroupFilter || hasLegacyMarketFilter;
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
        // Market filtering: prefer group-based if available, otherwise use legacy
        if (hasMarketFilter) {
            if (hasMarketGroupFilter) {
                // New: Group-based filtering (Story 6.1)
                const opportunityGroup = getMarketGroupFromOpportunity(opportunity);
                if (!marketGroups.includes(opportunityGroup)) {
                    return false;
                }
            }
            else if (hasLegacyMarketFilter) {
                // Legacy: 5-category filtering
                const marketType = inferMarketTypeFromOpportunity(opportunity);
                if (!marketType || !markets.includes(marketType)) {
                    return false;
                }
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
function getAvailableBookmakers(opportunities, regions) {
    const seen = new Set();
    const result = [];
    const hasRegionFilter = regions.length !== exports.ALL_REGION_CODES.length ||
        !exports.ALL_REGION_CODES.every((code) => regions.includes(code));
    for (const opportunity of opportunities) {
        const region = inferRegionFromOpportunity(opportunity);
        if (hasRegionFilter) {
            if (!region || !regions.includes(region)) {
                continue;
            }
        }
        for (const leg of opportunity.legs) {
            const name = leg.bookmaker;
            if (!seen.has(name)) {
                seen.add(name);
                result.push(name);
            }
        }
    }
    return result.sort((a, b) => a.localeCompare(b));
}
