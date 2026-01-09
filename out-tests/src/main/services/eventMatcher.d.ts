/**
 * Event Matcher Service
 *
 * Story 5.4: Cross-Provider Arbitrage Aggregator
 *
 * This service provides functions to normalize event and team names,
 * enabling cross-provider matching of the same underlying fixture.
 */
import type { ArbitrageOpportunity, MarketQuote } from '../../../shared/types';
/**
 * Normalize a team name to a canonical form for cross-provider matching.
 *
 * Transformations applied:
 * 1. Lowercase and trim
 * 2. Remove accents/diacritics (NFD normalization)
 * 3. Strip common prefixes (FC, AC, SC)
 * 4. Strip common suffixes (FC, SC, United, etc.)
 * 5. Collapse spaces
 *
 * NOTE: V1 does NOT expand abbreviations (e.g., "Man Utd" stays as "man utd")
 * because reliable abbreviation mapping requires curated data. This means
 * "Man Utd vs Liverpool" will NOT match "Manchester United vs Liverpool".
 * Cross-provider matching relies more on date+league similarity.
 *
 * @param name - Raw team name from provider
 * @returns Normalized team name
 *
 * @example
 * normalizeTeamName("Arsenal FC") // => "arsenal"
 * normalizeTeamName("FC Barcelona") // => "barcelona"
 * normalizeTeamName("Atlético Madrid") // => "atletico madrid"
 */
export declare function normalizeTeamName(name: string): string;
/**
 * Extract home and away team names from an event name.
 *
 * Handles common separators: " vs ", " v ", " - ", " @ "
 *
 * @param eventName - Full event name (e.g., "Arsenal FC vs Chelsea")
 * @returns Tuple of [homeTeam, awayTeam] or null if cannot parse
 */
export declare function extractTeamsFromEventName(eventName: string): [string, string] | null;
/**
 * Truncate a date string to the hour for tolerance-based matching.
 *
 * @param dateString - ISO date string
 * @returns Date truncated to hour in format "YYYY-MM-DDTHH" (UTC)
 */
export declare function truncateDateToHour(dateString: string): string;
/**
 * Generate a normalized event key for cross-provider matching.
 *
 * The key is composed of:
 * - Sorted normalized team names (alphabetically)
 * - Date truncated to hour (UTC)
 *
 * This ensures the same match from different providers produces the same key,
 * regardless of which team is listed as "home" or how dates are formatted.
 *
 * @param event - Event data with name, date, and league
 * @returns Normalized event key or null if cannot generate
 *
 * @example
 * generateEventKey({ name: "Arsenal FC vs Chelsea", date: "2025-01-15T15:00:00Z", league: "EPL" })
 * // => "arsenal|chelsea|2025-01-15T15"
 */
export declare function generateEventKey(event: {
    name: string;
    date: string;
    league: string;
}): string | null;
/**
 * Group arbitrage opportunities by their normalized event key.
 *
 * This enables finding the same underlying fixture across different providers.
 *
 * @param opps - Array of arbitrage opportunities from multiple providers
 * @returns Map of event key to opportunities sharing that key
 */
export declare function matchEventsByKey(opps: ArbitrageOpportunity[]): Map<string, ArbitrageOpportunity[]>;
/**
 * Extract market quotes from a single arbitrage opportunity.
 *
 * Each leg of the opportunity becomes a separate quote, enabling
 * cross-provider combination of odds.
 *
 * @param opp - Arbitrage opportunity with 2 legs
 * @returns Array of market quotes (2 per opportunity)
 */
export declare function extractQuotesFromOpportunity(opp: ArbitrageOpportunity): MarketQuote[];
/**
 * Extract all market quotes from multiple arbitrage opportunities.
 *
 * Flattens all legs into individual quotes and filters invalid ones.
 *
 * @param opps - Array of arbitrage opportunities
 * @returns Flat array of all valid market quotes
 */
export declare function extractAllQuotes(opps: ArbitrageOpportunity[]): MarketQuote[];
