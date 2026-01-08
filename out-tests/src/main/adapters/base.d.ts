import type { ArbitrageAdapter, ArbitrageOpportunity, ProviderId } from '../../../shared/types';
import { type ProviderRequestContext } from '../services/poller';
export declare abstract class BaseArbitrageAdapter implements ArbitrageAdapter {
    readonly __usesCentralRateLimiter: true;
    abstract readonly id: ProviderId;
    protected abstract fetchWithApiKey(apiKey: string, context?: ProviderRequestContext): Promise<ArbitrageOpportunity[]>;
    fetchOpportunities(): Promise<ArbitrageOpportunity[]>;
}
