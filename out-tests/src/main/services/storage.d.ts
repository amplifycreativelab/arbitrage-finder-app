import { safeStorage } from 'electron';
import { type ProviderId } from '../../../shared/types';
export declare function __setSafeStorageForTests(override: typeof safeStorage | null): void;
export declare function __resetMigrationForTests(): void;
export declare function isUsingFallbackStorage(): boolean;
export declare function getFallbackWarningShown(): boolean;
export declare function markFallbackWarningShown(): void;
export declare function getActiveProviderId(): ProviderId;
export declare function setActiveProviderId(providerId: ProviderId): void;
/**
 * Get all enabled providers. Performs migration on first call.
 */
export declare function getEnabledProviders(): ProviderId[];
/**
 * Set the list of enabled providers.
 */
export declare function setEnabledProviders(providers: ProviderId[]): void;
/**
 * Check if a specific provider is enabled.
 */
export declare function isProviderEnabled(providerId: ProviderId): boolean;
/**
 * Toggle a provider's enabled state.
 * Returns the new enabled state.
 */
export declare function toggleProvider(providerId: ProviderId, enabled: boolean): boolean;
/**
 * Get all providers with their enabled status (for UI).
 */
export declare function getAllProvidersWithStatus(): Array<{
    providerId: ProviderId;
    enabled: boolean;
    hasKey: boolean;
}>;
export declare function saveApiKey(providerId: string, apiKey: string): Promise<void>;
export declare function getApiKey(providerId: string): Promise<string | null>;
