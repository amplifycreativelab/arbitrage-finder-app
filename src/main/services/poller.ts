import type { ArbitrageAdapter, ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { arbitrageOpportunityListSchema } from '../../../shared/schemas'

let activeProviderIdForPolling: ProviderId | null = null

const adaptersByProviderId: Partial<Record<ProviderId, ArbitrageAdapter>> = {}
const latestSnapshotByProviderId: Partial<Record<ProviderId, ArbitrageOpportunity[]>> = {}
const latestSnapshotTimestampByProviderId: Partial<Record<ProviderId, string>> = {}

export function registerAdapter(adapter: ArbitrageAdapter): void {
  adaptersByProviderId[adapter.id] = adapter
}

export function registerAdapters(adapters: ArbitrageAdapter[]): void {
  for (const adapter of adapters) {
    registerAdapter(adapter)
  }
}

export function notifyActiveProviderChanged(providerId: ProviderId): void {
  activeProviderIdForPolling = providerId
}

export function getActiveProviderForPolling(): ProviderId | null {
  return activeProviderIdForPolling
}

export function getRegisteredAdapter(providerId: ProviderId): ArbitrageAdapter | null {
  return adaptersByProviderId[providerId] ?? null
}

export async function pollOnceForActiveProvider(): Promise<ArbitrageOpportunity[]> {
  const providerId = activeProviderIdForPolling

  if (!providerId) {
    return []
  }

  const adapter = adaptersByProviderId[providerId]

  if (!adapter) {
    return []
  }

  const opportunities = await adapter.fetchOpportunities()
  const validated = arbitrageOpportunityListSchema.parse(opportunities)

  latestSnapshotByProviderId[providerId] = validated
  latestSnapshotTimestampByProviderId[providerId] = new Date().toISOString()

  return validated
}

export function getLatestSnapshotForProvider(
  providerId: ProviderId
): { opportunities: ArbitrageOpportunity[]; fetchedAt: string | null } {
  return {
    opportunities: latestSnapshotByProviderId[providerId] ?? [],
    fetchedAt: latestSnapshotTimestampByProviderId[providerId] ?? null
  }
}
