export declare const PROVIDER_IDS: readonly ["odds-api-io", "the-odds-api"];
export type ProviderId = (typeof PROVIDER_IDS)[number];
/**
 * Market groups for categorizing arbitrage opportunity market types.
 * Each market belongs to exactly one group for filtering purposes.
 */
export declare const MARKET_GROUPS: readonly ["goals", "handicap", "corners", "cards", "shots", "other"];
export type MarketGroup = (typeof MARKET_GROUPS)[number];
/**
 * Time period for a market.
 */
export type MarketPeriod = 'ft' | '1h' | '2h';
/**
 * Rich metadata describing a market type.
 * Used for filtering, display, and categorization.
 */
export interface MarketMetadata {
    /** Market group for filtering (e.g., 'goals', 'corners') */
    group: MarketGroup;
    /** Canonical market key (e.g., 'corners_over_9.5_ft') */
    key: string;
    /** Human-readable label (e.g., 'Corners Over 9.5 (Full Time)') */
    label: string;
    /** Time period (optional - some markets are whole-match only) */
    period?: MarketPeriod;
    /** Line/point value for O/U or handicap markets (optional) */
    line?: number;
    /** Side for team-specific markets: 'home', 'away', or 'match' */
    side?: 'home' | 'away' | 'match';
}
/**
 * Market group display metadata for UI.
 */
export interface MarketGroupDisplay {
    group: MarketGroup;
    label: string;
    description: string;
}
export declare const MARKET_GROUP_DISPLAYS: MarketGroupDisplay[];
/**
 * Creates a canonical market key from components.
 */
export declare function createMarketKey(group: MarketGroup, type: string, options?: {
    line?: number;
    period?: MarketPeriod;
    side?: 'home' | 'away' | 'match';
}): string;
/**
 * Parses a canonical market key into its components.
 */
export declare function parseMarketKey(key: string): Partial<MarketMetadata>;
/**
 * Known market type patterns for inference.
 * Maps provider market strings to canonical group assignments.
 */
export declare const MARKET_PATTERNS: Record<string, {
    group: MarketGroup;
    baseType: string;
}>;
/**
 * Infers MarketMetadata from a raw market string.
 * Falls back to 'other' group if pattern is not recognized.
 */
export declare function inferMarketMetadata(marketString: string): MarketMetadata;
/**
 * Converts a canonical market key to human-readable label.
 */
export declare function formatMarketLabelFromKey(key: string): string;
export type SystemStatus = 'OK' | 'Degraded' | 'Error' | 'Stale';
export type ProviderStatus = 'OK' | 'Degraded' | 'Down' | 'QuotaLimited' | 'ConfigMissing';
export interface ProviderStatusSummary {
    providerId: ProviderId;
    status: ProviderStatus;
    lastSuccessfulFetchAt: string | null;
}
export interface DashboardStatusSnapshot {
    systemStatus: SystemStatus;
    providers: ProviderStatusSummary[];
    lastUpdatedAt: string | null;
}
export interface ArbitrageOpportunity {
    id: string;
    sport: string;
    event: {
        name: string;
        date: string;
        league: string;
    };
    legs: [
        {
            bookmaker: string;
            market: string;
            odds: number;
            outcome: string;
        },
        {
            bookmaker: string;
            market: string;
            odds: number;
            outcome: string;
        }
    ];
    roi: number;
    foundAt: string;
    /** Provider that sourced this opportunity (Story 5.1 multi-provider support) */
    providerId?: ProviderId;
    /**
     * All providers that returned this opportunity (Story 5.2 merged feed).
     * Populated only when the same opportunity was found from multiple providers
     * during deduplication. The `providerId` field contains the "winning" source
     * (highest ROI or first-seen), while `mergedFrom` contains all source providers.
     */
    mergedFrom?: ProviderId[];
    /**
     * Indicates this opportunity was created by combining odds from different providers.
     * Story 5.4: Cross-Provider Arbitrage Aggregator.
     */
    isCrossProvider?: boolean;
}
/**
 * Represents a single market quote extracted from an arbitrage opportunity leg.
 * Used for cross-provider arbitrage detection where quotes from different
 * providers/bookmakers are combined to find new arbitrage opportunities.
 *
 * Story 5.4: Cross-Provider Arbitrage Aggregator
 */
export interface MarketQuote {
    /** Normalized event key for cross-provider matching */
    eventKey: string;
    /** Source provider ID */
    providerId: ProviderId;
    /** Bookmaker name */
    bookmaker: string;
    /** Canonical market type (e.g., 'h2h', 'btts', 'handicap') */
    market: string;
    /** Outcome identifier ('home', 'away', 'yes', 'no', etc.) */
    outcome: string;
    /** Decimal odds */
    odds: number;
    /** Original event name for display/debugging */
    originalEventName: string;
    /** Original event date for staleness tracking */
    originalEventDate: string;
    /** Original event league for cross-provider opportunity display */
    originalLeague: string;
    /** When the quote was fetched */
    foundAt: string;
    /** Handicap point value for spread markets (optional, future use) */
    point?: number;
}
export interface ArbitrageAdapter {
    id: ProviderId;
    fetchOpportunities(): Promise<ArbitrageOpportunity[]>;
    /**
     * Marker indicating that this adapter's fetchOpportunities implementation
     * already routes all outbound HTTP calls through the centralized rate limiter.
     */
    __usesCentralRateLimiter?: true;
}
export interface ProviderMetadata {
    id: ProviderId;
    label: string;
    kind: 'production' | 'test';
    displayName: string;
}
export declare const PROVIDERS: ProviderMetadata[];
export declare const DEFAULT_PROVIDER_ID: ProviderId;
export declare function isProviderId(value: unknown): value is ProviderId;
