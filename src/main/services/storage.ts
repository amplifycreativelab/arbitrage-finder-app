import ElectronStore from 'electron-store'
import { safeStorage } from 'electron'
import { DEFAULT_PROVIDER_ID, isProviderId, PROVIDER_IDS, type ProviderId } from '../../../shared/types'

type ProviderSecrets = Partial<Record<ProviderId, string>>

interface StorageSchema {
  providerSecrets: ProviderSecrets
  fallbackWarningShown?: boolean
  activeProviderId?: ProviderId // Legacy field, kept for backward compatibility
  enabledProviders?: ProviderId[] // New multi-provider field
}

type StorageStore = {
  get: <K extends keyof StorageSchema>(key: K) => StorageSchema[K] | undefined
  set: <K extends keyof StorageSchema>(key: K, value: StorageSchema[K]) => void
}

const StoreCtor = (ElectronStore as any).default ?? (ElectronStore as any)

const store = new (StoreCtor as new (options?: any) => ElectronStore)(
  {
    name: 'credentials',
    defaults: {
      providerSecrets: {}
    },
    projectName: 'arbitrage-finder'
  } as any
) as unknown as StorageStore

let safeStorageOverride: typeof safeStorage | null = null
let migrationCompleted = false

function getEffectiveSafeStorage(): typeof safeStorage | null {
  return safeStorageOverride ?? safeStorage
}

export function __setSafeStorageForTests(override: typeof safeStorage | null): void {
  safeStorageOverride = override
}

export function __resetMigrationForTests(): void {
  migrationCompleted = false
}

function isSafeStorageAvailable(): boolean {
  try {
    const effectiveSafeStorage = getEffectiveSafeStorage()

    return Boolean(
      effectiveSafeStorage &&
        typeof effectiveSafeStorage.isEncryptionAvailable === 'function' &&
        effectiveSafeStorage.isEncryptionAvailable()
    )
  } catch {
    return false
  }
}

export function isUsingFallbackStorage(): boolean {
  const secrets = store.get('providerSecrets') ?? {}
  return Object.values(secrets).some(
    (value) => typeof value === 'string' && value.startsWith('b64:')
  )
}

export function getFallbackWarningShown(): boolean {
  return store.get('fallbackWarningShown') === true
}

export function markFallbackWarningShown(): void {
  store.set('fallbackWarningShown', true)
}

// ============================================================
// Legacy single-provider functions (backward compatible)
// ============================================================

export function getActiveProviderId(): ProviderId {
  const stored = store.get('activeProviderId')

  if (isProviderId(stored)) {
    return stored
  }

  return DEFAULT_PROVIDER_ID
}

export function setActiveProviderId(providerId: ProviderId): void {
  if (!isProviderId(providerId)) {
    throw new Error('Unsupported providerId')
  }

  store.set('activeProviderId', providerId)
}

// ============================================================
// Multi-provider functions (Story 5.1)
// ============================================================

/**
 * Checks if a provider has an API key configured (synchronous check based on stored secrets).
 * This is a sync helper for migration; for async checks use credentials.isProviderConfigured.
 */
function hasProviderKey(providerId: ProviderId): boolean {
  const secrets = store.get('providerSecrets') ?? {}
  const stored = secrets[providerId]
  return typeof stored === 'string' && stored.length > 0
}

/**
 * Perform one-time migration from activeProviderId to enabledProviders.
 * Called on first access to multi-provider functions.
 */
function migrateToMultiProvider(): void {
  if (migrationCompleted) return

  const enabledProviders = store.get('enabledProviders')

  if (enabledProviders === undefined) {
    const legacyActive = store.get('activeProviderId')

    if (legacyActive && isProviderId(legacyActive) && hasProviderKey(legacyActive)) {
      // Migrate: single active provider with key becomes the only enabled provider
      store.set('enabledProviders', [legacyActive])
    } else {
      // No legacy config or no key: start with empty enabled list
      store.set('enabledProviders', [])
    }
  }

  migrationCompleted = true
}

/**
 * Get all enabled providers. Performs migration on first call.
 */
export function getEnabledProviders(): ProviderId[] {
  migrateToMultiProvider()

  const enabled = store.get('enabledProviders')

  if (!Array.isArray(enabled)) {
    return []
  }

  // Filter to only valid provider IDs
  return enabled.filter((id): id is ProviderId => isProviderId(id))
}

/**
 * Set the list of enabled providers.
 */
export function setEnabledProviders(providers: ProviderId[]): void {
  migrateToMultiProvider()

  // Validate all provider IDs
  const validProviders = providers.filter((id) => isProviderId(id))
  store.set('enabledProviders', validProviders)
}

/**
 * Check if a specific provider is enabled.
 */
export function isProviderEnabled(providerId: ProviderId): boolean {
  if (!isProviderId(providerId)) {
    return false
  }

  const enabled = getEnabledProviders()
  return enabled.includes(providerId)
}

/**
 * Toggle a provider's enabled state.
 * Returns the new enabled state.
 */
export function toggleProvider(providerId: ProviderId, enabled: boolean): boolean {
  if (!isProviderId(providerId)) {
    throw new Error('Unsupported providerId')
  }

  const currentEnabled = getEnabledProviders()

  if (enabled) {
    // Add if not already present
    if (!currentEnabled.includes(providerId)) {
      setEnabledProviders([...currentEnabled, providerId])
    }
  } else {
    // Remove if present
    setEnabledProviders(currentEnabled.filter((id) => id !== providerId))
  }

  return isProviderEnabled(providerId)
}

/**
 * Get all providers with their enabled status (for UI).
 */
export function getAllProvidersWithStatus(): Array<{ providerId: ProviderId; enabled: boolean; hasKey: boolean }> {
  migrateToMultiProvider()

  return PROVIDER_IDS.map((providerId) => ({
    providerId,
    enabled: isProviderEnabled(providerId),
    hasKey: hasProviderKey(providerId)
  }))
}

// ============================================================
// API Key functions
// ============================================================

export async function saveApiKey(providerId: string, apiKey: string): Promise<void> {
  if (!providerId) {
    throw new Error('providerId is required')
  }

  const secrets = { ...(store.get('providerSecrets') ?? {}) }

  if (!apiKey) {
    delete secrets[providerId]
    store.set('providerSecrets', secrets)
    return
  }

  if (isSafeStorageAvailable()) {
    const effectiveSafeStorage = getEffectiveSafeStorage()
    const encrypted = effectiveSafeStorage!.encryptString(apiKey)
    secrets[providerId] = `enc:${encrypted.toString('base64')}`
    store.set('providerSecrets', secrets)
    store.set('fallbackWarningShown', false)
    return
  }

  const buffer = Buffer.from(apiKey, 'utf8')
  secrets[providerId] = `b64:${buffer.toString('base64')}`
  store.set('providerSecrets', secrets)
}

export async function getApiKey(providerId: string): Promise<string | null> {
  if (!providerId) {
    throw new Error('providerId is required')
  }

  const secrets = store.get('providerSecrets') ?? {}
  const stored = secrets[providerId]

  if (!stored) {
    return null
  }

  if (stored.startsWith('enc:') && isSafeStorageAvailable()) {
    const encryptedBuf = Buffer.from(stored.slice(4), 'base64')
    const effectiveSafeStorage = getEffectiveSafeStorage()
    return effectiveSafeStorage!.decryptString(encryptedBuf)
  }

  if (stored.startsWith('b64:')) {
    return Buffer.from(stored.slice(4), 'base64').toString('utf8')
  }

  return null
}

