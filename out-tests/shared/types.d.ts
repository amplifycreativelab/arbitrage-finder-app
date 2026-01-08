export declare const PROVIDER_IDS: readonly ["odds-api-io", "the-odds-api"];
export type ProviderId = (typeof PROVIDER_IDS)[number];
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
