"use strict";
/**
 * Cross-Provider Arbitrage Calculator
 *
 * Story 5.4: Cross-Provider Arbitrage Aggregator
 *
 * This service finds arbitrage opportunities by combining odds from different
 * providers and bookmakers. It processes market quotes extracted from multiple
 * providers and identifies cross-provider arbs that wouldn't be visible to
 * a single-provider feed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCrossProviderArbitrages = findCrossProviderArbitrages;
exports.logCrossProviderStats = logCrossProviderStats;
const schemas_1 = require("../../../shared/schemas");
const calculator_1 = require("./calculator");
const logger_1 = require("./logger");
/**
 * Group key for quotes: eventKey + market + outcome
 */
function getQuoteGroupKey(quote) {
    return `${quote.eventKey}|${quote.market}|${quote.outcome}`;
}
/**
 * Get unique event+market combinations from quotes
 */
function getUniqueEventMarkets(quotes) {
    const seen = new Set();
    const result = [];
    for (const quote of quotes) {
        const key = `${quote.eventKey}|${quote.market}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push({ eventKey: quote.eventKey, market: quote.market });
        }
    }
    return result;
}
/**
 * Determine the outcome pairs for a given market type.
 *
 * - h2h, handicap, draw-no-bet, totals: home vs away
 * - btts: yes vs no
 */
function getOutcomePairs(market) {
    const bttsVariants = ['btts', 'both-teams-to-score', 'both_teams_to_score'];
    if (bttsVariants.some((v) => market.toLowerCase().includes(v))) {
        return ['yes', 'no'];
    }
    return ['home', 'away'];
}
/**
 * Find the best quote (highest odds) from an array, optionally excluding a bookmaker.
 */
function findBestQuote(quotes, excludeBookmaker) {
    if (!quotes || quotes.length === 0) {
        return null;
    }
    let best = null;
    for (const quote of quotes) {
        if (excludeBookmaker && quote.bookmaker === excludeBookmaker) {
            continue;
        }
        if (!best || quote.odds > best.odds) {
            best = quote;
        }
    }
    return best;
}
/**
 * Create a cross-provider arbitrage opportunity from two quotes.
 */
function createCrossProviderOpportunity(quote1, quote2, roi) {
    // Determine which quote is "home" and which is "away" based on outcome
    const [homeQuote, awayQuote] = quote1.outcome === 'home' || quote1.outcome === 'yes'
        ? [quote1, quote2]
        : [quote2, quote1];
    // Collect all unique provider IDs
    const providerIds = new Set();
    if (homeQuote.providerId)
        providerIds.add(homeQuote.providerId);
    if (awayQuote.providerId)
        providerIds.add(awayQuote.providerId);
    const mergedFrom = Array.from(providerIds);
    // Use the oldest foundAt for staleness tracking
    const oldestFoundAt = homeQuote.foundAt < awayQuote.foundAt ? homeQuote.foundAt : awayQuote.foundAt;
    // Generate unique cross-provider ID
    const id = `xprov:${homeQuote.eventKey}:${homeQuote.market}:${homeQuote.bookmaker}:${awayQuote.bookmaker}`;
    // Infer sport from event key (first team name suggests soccer for now)
    const sport = 'soccer'; // Default for soccer-focused app
    return {
        id,
        sport,
        event: {
            name: homeQuote.originalEventName,
            date: homeQuote.originalEventDate,
            league: homeQuote.originalLeague ?? '' // Use league from source quote (Story 5.4 fix)
        },
        legs: [
            {
                bookmaker: homeQuote.bookmaker,
                market: homeQuote.market,
                odds: homeQuote.odds,
                outcome: homeQuote.outcome
            },
            {
                bookmaker: awayQuote.bookmaker,
                market: awayQuote.market,
                odds: awayQuote.odds,
                outcome: awayQuote.outcome
            }
        ],
        roi,
        foundAt: oldestFoundAt,
        providerId: mergedFrom[0], // Primary provider
        mergedFrom: mergedFrom.length > 1 ? mergedFrom : undefined,
        isCrossProvider: true
    };
}
/**
 * Find cross-provider arbitrage opportunities from market quotes.
 *
 * Algorithm:
 * 1. Group quotes by (eventKey + market + outcome)
 * 2. For each unique (eventKey + market), find best odds for each outcome
 * 3. Ensure best odds come from DIFFERENT bookmakers
 * 4. Calculate ROI and create opportunity if profitable
 *
 * @param quotes - Array of market quotes from multiple providers
 * @returns Array of cross-provider arbitrage opportunities
 */
function findCrossProviderArbitrages(quotes) {
    if (quotes.length === 0) {
        return [];
    }
    const opportunities = [];
    // Group quotes by (eventKey + market + outcome)
    const grouped = new Map();
    for (const quote of quotes) {
        const key = getQuoteGroupKey(quote);
        const existing = grouped.get(key);
        if (existing) {
            existing.push(quote);
        }
        else {
            grouped.set(key, [quote]);
        }
    }
    // Get unique event+market combinations
    const eventMarkets = getUniqueEventMarkets(quotes);
    for (const { eventKey, market } of eventMarkets) {
        const [outcome1, outcome2] = getOutcomePairs(market);
        const key1 = `${eventKey}|${market}|${outcome1}`;
        const key2 = `${eventKey}|${market}|${outcome2}`;
        const quotes1 = grouped.get(key1);
        const quotes2 = grouped.get(key2);
        if (!quotes1 || !quotes2) {
            continue; // Need quotes for both outcomes
        }
        // Find best quote for outcome1
        const best1 = findBestQuote(quotes1);
        if (!best1)
            continue;
        // Find best quote for outcome2 with DIFFERENT bookmaker
        const best2 = findBestQuote(quotes2, best1.bookmaker);
        if (!best2)
            continue;
        // Calculate ROI
        const roi = (0, calculator_1.calculateTwoLegArbitrageRoi)(best1.odds, best2.odds);
        if (roi <= 0) {
            continue; // No arbitrage opportunity
        }
        // Create cross-provider opportunity
        const opportunity = createCrossProviderOpportunity(best1, best2, roi);
        // Validate against schema
        try {
            schemas_1.arbitrageOpportunitySchema.parse(opportunity);
            opportunities.push(opportunity);
        }
        catch (error) {
            (0, logger_1.logWarn)('cross-provider.validation-failed', {
                context: 'service:crossProviderCalculator',
                operation: 'findCrossProviderArbitrages',
                providerId: undefined,
                correlationId: undefined,
                durationMs: null,
                errorCategory: 'SystemError',
                message: `Cross-provider opportunity failed schema validation: ${error.message}`,
                eventKey,
                market
            });
        }
    }
    return opportunities;
}
/**
 * Log statistics about cross-provider arb generation.
 */
function logCrossProviderStats(quotesExtracted, arbsFound, durationMs) {
    (0, logger_1.logInfo)('cross-provider.stats', {
        context: 'service:crossProviderCalculator',
        operation: 'findCrossProviderArbitrages',
        providerId: undefined,
        correlationId: undefined,
        durationMs,
        errorCategory: null,
        quotesExtracted,
        crossProviderArbsFound: arbsFound
    });
}
