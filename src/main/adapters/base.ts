import type { ArbitrageAdapter, ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { getApiKeyForAdapter } from '../credentials'

export abstract class BaseArbitrageAdapter implements ArbitrageAdapter {
  abstract readonly id: ProviderId

  protected abstract fetchWithApiKey(apiKey: string): Promise<ArbitrageOpportunity[]>

  async fetchOpportunities(): Promise<ArbitrageOpportunity[]> {
    const apiKey = await getApiKeyForAdapter(this.id)

    if (!apiKey) {
      throw new Error(`API key not configured for provider ${this.id}`)
    }

    return this.fetchWithApiKey(apiKey)
  }
}
