import type { ArbitrageAdapter, ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { getApiKeyForAdapter } from '../credentials'
import { scheduleProviderRequest } from '../services/poller'

export abstract class BaseArbitrageAdapter implements ArbitrageAdapter {
  readonly __usesCentralRateLimiter = true as const
  abstract readonly id: ProviderId

  protected abstract fetchWithApiKey(apiKey: string): Promise<ArbitrageOpportunity[]>

  async fetchOpportunities(): Promise<ArbitrageOpportunity[]> {
    const apiKey = await getApiKeyForAdapter(this.id)

    if (!apiKey) {
      throw new Error(`API key not configured for provider ${this.id}`)
    }

    return scheduleProviderRequest(this.id, () => this.fetchWithApiKey(apiKey))
  }
}
