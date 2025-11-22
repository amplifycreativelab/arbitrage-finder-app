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
    'totals'
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
    if (normalized === 'moneyline' || normalized === 'match-winner' || normalized === 'h2h') {
        return 'moneyline';
    }
    if (normalized === 'draw-no-bet' ||
        normalized === 'draw no bet' ||
        normalized === 'dnb') {
        return 'draw-no-bet';
    }
    if (normalized === 'totals' ||
        normalized === 'over/under' ||
        normalized === 'over_under') {
        return 'totals';
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
    const minRoi = Number.isFinite(filters.minRoi) && filters.minRoi > 0 ? filters.minRoi : 0;
    const hasSportFilter = !arraysMatchIgnoringOrder(sports, exports.ALL_SPORT_FILTERS);
    const hasRegionFilter = !arraysMatchIgnoringOrder(regions, exports.ALL_REGION_CODES);
    const hasMarketFilter = !arraysMatchIgnoringOrder(markets, exports.ALL_MARKET_FILTERS);
    const hasRoiFilter = minRoi > 0;
    if (!hasSportFilter && !hasRegionFilter && !hasMarketFilter && !hasRoiFilter) {
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
        if (hasRoiFilter && opportunity.roi < minRoi) {
            return false;
        }
        return true;
    });
}
