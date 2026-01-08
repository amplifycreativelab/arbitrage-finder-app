import type { ProviderId } from '../../shared/types';
export declare function saveApiKey(providerId: ProviderId, apiKey: string): Promise<void>;
export declare function getApiKeyForAdapter(providerId: ProviderId): Promise<string | null>;
export declare function isProviderConfigured(providerId: ProviderId): Promise<boolean>;
export declare function getStorageStatus(): {
    isUsingFallbackStorage: boolean;
    fallbackWarningShown: boolean;
};
export declare function acknowledgeFallbackWarning(): Promise<void>;
