import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types';
export declare function calculateTwoLegArbitrageRoi(oddsA: number, oddsB: number): number;
export interface GoldenOddsSnapshot {
    id: string;
    providerId: ProviderId;
    sport: string;
    description?: string;
    eventName: string;
    eventDate: string;
    league: string;
    market: string;
    homeBookmaker: string;
    homeOdds: number;
    awayBookmaker: string;
    awayOdds: number;
}
export declare function calculateArbitrageFromSnapshots(snapshots: GoldenOddsSnapshot[], foundAt?: string): ArbitrageOpportunity[];
export declare function mergeProviderOpportunities(snapshots: ArbitrageOpportunity[][]): ArbitrageOpportunity[];
/**
 * Deduplicate opportunities from multiple providers.
 * Uses semantic key matching to identify duplicate opportunities across providers.
 * Prefers highest ROI when duplicates are found; if ROI is equal, first-seen wins.
 * Tracks all source providers via `mergedFrom` field.
 *
 * @param opportunities - Array of opportunities from all enabled providers
 * @returns Deduplicated array with `mergedFrom` set for merged opportunities
 */
export declare function deduplicateOpportunities(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[];
/**
 * Compute deduplication statistics for logging.
 */
export declare function getDeduplicationStats(originalCount: number, deduplicatedCount: number): {
    totalOpportunities: number;
    uniqueOpportunities: number;
    duplicatesRemoved: number;
};
