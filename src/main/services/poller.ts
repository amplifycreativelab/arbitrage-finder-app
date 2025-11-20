import type { ProviderId } from '../../../shared/types'

let activeProviderIdForPolling: ProviderId | null = null

export function notifyActiveProviderChanged(providerId: ProviderId): void {
  activeProviderIdForPolling = providerId
  // Future stories will wire this into real poller/adapters refresh logic.
}

export function getActiveProviderForPolling(): ProviderId | null {
  return activeProviderIdForPolling
}
