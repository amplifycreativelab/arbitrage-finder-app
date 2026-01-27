import type { ElectronAPI } from '@electron-toolkit/preload'
import type { ArbitrageOpportunity, DeepScanConfig, DeepScanProgress, ProviderId } from '../../shared/types'

export interface CredentialsStorageStatus {
  isUsingFallbackStorage: boolean
  fallbackWarningShown: boolean
}

export interface ProviderStatusInfo {
  providerId: ProviderId
  enabled: boolean
  hasKey: boolean
}

export interface CredentialsAPI {
  saveApiKey: (providerId: ProviderId, apiKey: string) => Promise<void>
  isProviderConfigured: (providerId: ProviderId) => Promise<boolean>
  getStorageStatus: () => Promise<CredentialsStorageStatus>
  acknowledgeFallbackWarning: () => Promise<void>
  // Multi-provider methods (Story 5.1)
  getEnabledProviders: () => Promise<ProviderId[]>
  setProviderEnabled: (providerId: ProviderId, enabled: boolean) => Promise<{ providerId: ProviderId; enabled: boolean }>
  getAllProvidersStatus: () => Promise<ProviderStatusInfo[]>
}

export interface FeedAPI {
  runManualFetch: () => Promise<void>
}

export interface DeepScanAPI {
  startDeepScan: (config: DeepScanConfig) => Promise<void>
  cancelDeepScan: () => Promise<void>
  getStatus: () => Promise<DeepScanProgress>
  getResults: () => Promise<ArbitrageOpportunity[]>
}

export interface OddsApiIoBookmaker {
  name: string
  active: boolean
}

export interface OddsApiIoAPI {
  getSupportedBookmakers: () => Promise<OddsApiIoBookmaker[]>
  getSelectedBookmakers: () => Promise<string[]>
  selectBookmakers: (bookmakers: string[]) => Promise<void>
  clearSelectedBookmakers: () => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      credentials: CredentialsAPI
      oddsApiIo: OddsApiIoAPI
      feed: FeedAPI
      deepScan: DeepScanAPI
    }
  }
}
