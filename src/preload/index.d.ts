import type { ElectronAPI } from '@electron-toolkit/preload'
import type { ProviderId } from '../../shared/types'

export interface CredentialsStorageStatus {
  isUsingFallbackStorage: boolean
  fallbackWarningShown: boolean
}

export interface CredentialsAPI {
  saveApiKey: (providerId: ProviderId, apiKey: string) => Promise<void>
  isProviderConfigured: (providerId: ProviderId) => Promise<boolean>
  getStorageStatus: () => Promise<CredentialsStorageStatus>
  acknowledgeFallbackWarning: () => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      credentials: CredentialsAPI
    }
  }
}
