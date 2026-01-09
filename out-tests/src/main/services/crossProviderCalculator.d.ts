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
import type { ArbitrageOpportunity, MarketQuote } from '../../../shared/types';
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
export declare function findCrossProviderArbitrages(quotes: MarketQuote[]): ArbitrageOpportunity[];
/**
 * Log statistics about cross-provider arb generation.
 */
export declare function logCrossProviderStats(quotesExtracted: number, arbsFound: number, durationMs: number): void;
