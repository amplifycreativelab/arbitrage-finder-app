/**
 * Configuration store module
 *
 * Provides a safe wrapper around electron-store with proper
 * handling of the v11 ESM/CJS interop issues.
 */

import ElectronStore from 'electron-store'
import type { ProviderId } from '../../../shared/types'

interface StorageSchema {
  providerSecrets: Partial<Record<ProviderId, string>>
  fallbackWarningShown?: boolean
  activeProviderId?: ProviderId
  enabledProviders?: ProviderId[]
  bookmakerCardRules?: Record<string, 'conservative' | 'standard'>
}

// Handle electron-store v11 import quirks
// The package exports differently depending on module system
function getStoreConstructor(): typeof ElectronStore {
  // Try accessing the default export first (ESM style)
  const ctor = (ElectronStore as unknown as { default?: typeof ElectronStore }).default
  if (ctor && typeof ctor === 'function') {
    return ctor
  }
  // Fall back to direct export (CJS style)
  if (typeof ElectronStore === 'function') {
    return ElectronStore
  }
  // Last resort: try to find a constructor in the module
  const anyStore = ElectronStore as unknown as Record<string, unknown>
  for (const key of ['default', 'ElectronStore', 'Store']) {
    if (typeof anyStore[key] === 'function') {
      return anyStore[key] as typeof ElectronStore
    }
  }
  throw new Error('Failed to find electron-store constructor')
}

const StoreCtor = getStoreConstructor()

// Create the store with proper typing
const rawStore = new StoreCtor({
  name: 'credentials',
  projectName: 'arbitrage-finder',
  defaults: {
    providerSecrets: {}
  },
  // Ensure data is persisted immediately for reliability
  clearInvalidConfig: true
} as ConstructorParameters<typeof StoreCtor>[0])

// Export typed wrapper
export const store = rawStore as unknown as {
  get<K extends keyof StorageSchema>(key: K): StorageSchema[K] | undefined
  set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): void
}

// Log store location for debugging
if (process.env['NODE_ENV'] === 'development') {
  console.log('[configStore] Store path:', (rawStore as unknown as { path?: string }).path)
}
