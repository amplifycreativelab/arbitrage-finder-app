import Bottleneck from 'bottleneck';
import type { ArbitrageAdapter, ArbitrageOpportunity, DashboardStatusSnapshot, ProviderId } from '../../../shared/types';
/**
 * Rate limit parameters derived from PRD FR8 (5,000 req/hour) and Architecture R-001 (NFR1).
 * minTime = 3600_000ms / 5000req = 720ms; reservoir enforces per-hour ceiling.
 */
export interface RateLimiterConfig {
    minTime: number;
    maxConcurrent: number;
    reservoir: number;
    reservoirRefreshAmount: number;
    reservoirRefreshInterval: number;
}
export type ProviderQuotaStatus = 'OK' | 'QuotaLimited' | 'Degraded';
interface BackoffState {
    consecutive429s: number;
    cooldownUntil: number | null;
    lastBackoffMs: number;
}
export interface ProviderRequestContext {
    correlationId: string;
}
export declare function getRateLimiterConfig(providerId: ProviderId): RateLimiterConfig;
export declare function getProviderQuotaStatus(providerId: ProviderId): ProviderQuotaStatus;
export declare function scheduleProviderRequest<T>(providerId: ProviderId, fn: (context: ProviderRequestContext) => Promise<T>): Promise<T>;
export declare function registerAdapter(adapter: ArbitrageAdapter): void;
export declare function registerAdapters(adapters: ArbitrageAdapter[]): void;
/**
 * Update the set of enabled providers for polling.
 * Called when user enables/disables providers in settings.
 */
export declare function notifyEnabledProvidersChanged(providers: ProviderId[]): void;
/**
 * Get all currently enabled providers for polling.
 */
export declare function getEnabledProvidersForPolling(): ProviderId[];
/**
 * Poll all enabled providers and return concatenated opportunities.
 * Each provider is polled respecting its own rate limiter.
 */
export declare function pollOnceForEnabledProviders(): Promise<ArbitrageOpportunity[]>;
export declare function getRegisteredAdapter(providerId: ProviderId): ArbitrageAdapter | null;
export declare function getLatestSnapshotForProvider(providerId: ProviderId): {
    opportunities: ArbitrageOpportunity[];
    fetchedAt: string | null;
};
export declare function getDashboardStatusSnapshot(): Promise<DashboardStatusSnapshot>;
export declare const __test: {
    resetLimiterState(): void;
    getLimiterCounts(providerId: ProviderId): Bottleneck.Counts;
    getBackoffState(providerId: ProviderId): BackoffState;
};
export {};
