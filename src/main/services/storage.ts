import ElectronStore from 'electron-store'
import { safeStorage } from 'electron'
import { DEFAULT_PROVIDER_ID, isProviderId, type ProviderId } from '../../../shared/types'

type ProviderSecrets = Partial<Record<ProviderId, string>>

interface StorageSchema {
  providerSecrets: ProviderSecrets
  fallbackWarningShown?: boolean
  activeProviderId?: ProviderId
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

function getEffectiveSafeStorage(): typeof safeStorage | null {
  return safeStorageOverride ?? safeStorage
}

export function __setSafeStorageForTests(override: typeof safeStorage | null): void {
  safeStorageOverride = override
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
