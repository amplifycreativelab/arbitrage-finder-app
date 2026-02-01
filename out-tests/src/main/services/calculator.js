"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTwoLegArbitrageRoi = calculateTwoLegArbitrageRoi;
exports.calculateArbitrageFromSnapshots = calculateArbitrageFromSnapshots;
exports.mergeProviderOpportunities = mergeProviderOpportunities;
exports.deduplicateOpportunities = deduplicateOpportunities;
exports.getDeduplicationStats = getDeduplicationStats;
exports.clearCardRulesCache = clearCardRulesCache;
exports.detectCardRulesMismatch = detectCardRulesMismatch;
exports.formatCardRuleDescription = formatCardRuleDescription;
exports.getCardRuleLabel = getCardRuleLabel;
const schemas_1 = require("../../../shared/schemas");
const storage_1 = require("./storage");
function calculateTwoLegArbitrageRoi(oddsA, oddsB) {
    if (!Number.isFinite(oddsA) || !Number.isFinite(oddsB)) {
        return 0;
    }
    if (oddsA <= 0 || oddsB <= 0) {
        return 0;
    }
    const inverseSum = 1 / oddsA + 1 / oddsB;
    if (inverseSum <= 0) {
        return 0;
    }
    const roi = 1 - inverseSum;
    return roi < 0 ? 0 : roi;
}
function calculateArbitrageFromSnapshots(snapshots, foundAt = new Date().toISOString()) {
    const opportunities = [];
    for (const snapshot of snapshots) {
        const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds);
        if (roi <= 0)
            continue;
        const opportunity = {
            id: snapshot.id,
            sport: snapshot.sport,
            event: {
                name: snapshot.eventName,
                date: snapshot.eventDate,
                league: snapshot.league
            },
            legs: [
                {
                    bookmaker: snapshot.homeBookmaker,
                    market: snapshot.market,
                    odds: snapshot.homeOdds,
                    outcome: 'home'
                },
                {
                    bookmaker: snapshot.awayBookmaker,
                    market: snapshot.market,
                    odds: snapshot.awayOdds,
                    outcome: 'away'
                }
            ],
            roi,
            foundAt
        };
        opportunities.push(opportunity);
    }
    return schemas_1.arbitrageOpportunityListSchema.parse(opportunities);
}
function mergeProviderOpportunities(snapshots) {
    const validated = schemas_1.arbitrageOpportunityListSchema.parse(snapshots.flat());
    const seenIds = new Set();
    const result = [];
    for (const opportunity of validated) {
        if (seenIds.has(opportunity.id))
            continue;
        seenIds.add(opportunity.id);
        result.push(opportunity);
    }
    return result;
}
// ============================================================
// Multi-provider deduplication (Story 5.2)
// ============================================================
/**
 * Generate a semantic deduplication key for an opportunity.
 *
 * The key is composed of: eventName + eventDate + league + sorted(outcomes + markets).
 * This ensures the same opportunity from different providers produces the same key,
 * enabling cross-provider deduplication.
 *
 * @param opp - The arbitrage opportunity to generate a key for
 * @returns A string key uniquely identifying this opportunity semantically
 *
 * @example
 * // Two opportunities from different providers with same match:
 * getDeduplicationKey(oppFromProvider1) === getDeduplicationKey(oppFromProvider2)
 */
function getDeduplicationKey(opp) {
    // Sort outcomes to ensure consistent key regardless of legs order
    const sortedOutcomes = opp.legs
        .map((leg) => `${leg.outcome}:${leg.market}`)
        .sort()
        .join('|');
    return `${opp.event.name}|${opp.event.date}|${opp.event.league}|${sortedOutcomes}`;
}
/**
 * Select the best opportunity from a group of duplicates.
 *
 * Strategy:
 * 1. Prefer highest ROI
 * 2. If ROI is equal, first-seen wins (guaranteed by explicit stable sort)
 *
 * Sets `mergedFrom` to track all source providers.
 *
 * @param opps - Array of duplicate opportunities (same semantic key)
 * @returns The best opportunity with `mergedFrom` populated if multiple sources
 */
function selectBestOpportunity(opps) {
    if (opps.length === 1) {
        return opps[0];
    }
    // Explicit stable sort: highest ROI first, original index as tiebreaker
    // This guarantees first-seen wins on ROI ties regardless of JS engine sort stability
    const sorted = opps
        .map((o, i) => ({ o, i }))
        .sort((a, b) => b.o.roi - a.o.roi || a.i - b.i)
        .map((x) => x.o);
    const best = sorted[0];
    // Track all source providers
    const allProviders = opps.map((o) => o.providerId).filter((id) => !!id);
    // Use Set to deduplicate provider IDs (in case same provider appears multiple times)
    const uniqueProviders = [...new Set(allProviders)];
    return {
        ...best,
        mergedFrom: uniqueProviders.length > 1 ? uniqueProviders : undefined
    };
}
/**
 * Deduplicate opportunities from multiple providers.
 * Uses semantic key matching to identify duplicate opportunities across providers.
 * Prefers highest ROI when duplicates are found; if ROI is equal, first-seen wins.
 * Tracks all source providers via `mergedFrom` field.
 *
 * @param opportunities - Array of opportunities from all enabled providers
 * @returns Deduplicated array with `mergedFrom` set for merged opportunities
 */
function deduplicateOpportunities(opportunities) {
    if (opportunities.length === 0) {
        return [];
    }
    // Group by deduplication key
    const grouped = new Map();
    for (const opp of opportunities) {
        const key = getDeduplicationKey(opp);
        const existing = grouped.get(key);
        if (existing) {
            existing.push(opp);
        }
        else {
            grouped.set(key, [opp]);
        }
    }
    // Select best from each group
    const result = [];
    for (const group of grouped.values()) {
        result.push(selectBestOpportunity(group));
    }
    // Validate all opportunities pass schema
    return schemas_1.arbitrageOpportunityListSchema.parse(result);
}
/**
 * Compute deduplication statistics for logging.
 */
function getDeduplicationStats(originalCount, deduplicatedCount) {
    return {
        totalOpportunities: originalCount,
        uniqueOpportunities: deduplicatedCount,
        duplicatesRemoved: originalCount - deduplicatedCount
    };
}
// ============================================================
// Card Rules Mismatch Detection (Story 6.5)
// ============================================================
/**
 * Cache for bookmaker card rules to avoid repeated store reads per feed refresh.
 * This is cleared at the start of each feed refresh cycle.
 */
let cardRulesCache = null;
/**
 * Clear the card rules cache. Should be called at the start of each feed refresh.
 */
function clearCardRulesCache() {
    cardRulesCache = null;
}
/**
 * Get the card counting rule for a bookmaker, using cache if available.
 */
function getCachedBookmakerCardRule(bookmaker) {
    if (!cardRulesCache) {
        cardRulesCache = new Map();
    }
    const cached = cardRulesCache.get(bookmaker);
    if (cached) {
        return cached;
    }
    const rule = (0, storage_1.getBookmakerCardRule)(bookmaker);
    cardRulesCache.set(bookmaker, rule);
    return rule;
}
/**
 * Detect if there's a card counting rules mismatch between bookmakers.
 * Only applies to opportunities in the 'cards' market group.
 *
 * @param bookmakerA - First bookmaker name
 * @param bookmakerB - Second bookmaker name
 * @param marketGroup - The market group (e.g., 'cards', 'goals', etc.)
 * @returns CardRulesWarning if market is cards and rules differ, null otherwise
 */
function detectCardRulesMismatch(bookmakerA, bookmakerB, marketGroup) {
    // Only apply to cards market group
    if (marketGroup !== 'cards') {
        return null;
    }
    const ruleA = getCachedBookmakerCardRule(bookmakerA);
    const ruleB = getCachedBookmakerCardRule(bookmakerB);
    const mismatch = ruleA !== ruleB;
    return {
        bookmakerA: { name: bookmakerA, rule: ruleA },
        bookmakerB: { name: bookmakerB, rule: ruleB },
        mismatch
    };
}
/**
 * Format card counting rule for display.
 * Shows the card count for "2 yellows + 1 red" scenario.
 */
function formatCardRuleDescription(rule) {
    switch (rule) {
        case 'conservative':
            return '2 cards for YY+R (counts only the red)';
        case 'standard':
            return '3 cards for YY+R (counts each card)';
        default:
            return 'Unknown rule';
    }
}
/**
 * Get display label for card counting rule.
 */
function getCardRuleLabel(rule) {
    switch (rule) {
        case 'conservative':
            return 'Conservative';
        case 'standard':
            return 'Standard';
        default:
            return 'Unknown';
    }
}
