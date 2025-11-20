import type { ProviderId } from '../../shared/types'
import {
  getApiKey as getRawApiKey,
  getFallbackWarningShown,
  isUsingFallbackStorage,
  markFallbackWarningShown,
  saveApiKey as saveRawApiKey
} from './services/storage'

export async function saveApiKey(providerId: ProviderId, apiKey: string): Promise<void> {
  await saveRawApiKey(providerId, apiKey)
}

export async function getApiKeyForAdapter(providerId: ProviderId): Promise<string | null> {
  return getRawApiKey(providerId)
}

export async function isProviderConfigured(providerId: ProviderId): Promise<boolean> {
  const apiKey = await getRawApiKey(providerId)
  return typeof apiKey === 'string' && apiKey.length > 0
}

export function getStorageStatus(): {
  isUsingFallbackStorage: boolean
  fallbackWarningShown: boolean
} {
  return {
    isUsingFallbackStorage: isUsingFallbackStorage(),
    fallbackWarningShown: getFallbackWarningShown()
  }
}

export async function acknowledgeFallbackWarning(): Promise<void> {
  markFallbackWarningShown()
}

