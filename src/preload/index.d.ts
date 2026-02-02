import type { ElectronAPI } from '@electron-toolkit/preload'
import type { ArbitrageOpportunity, DeepScanConfig, DeepScanProgress, ProviderId, ScanHistoryEntry, DeepScanQuotaStatus, CardCountingRule, BookmakerCardRules, AggressiveScanConfig, AggressiveScanStats } from '../../shared/types'
import type { AggressiveScanSelection, QuotaConfig, ApiPlanTier } from '../../shared/aggressiveScanPresets'

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
  getContinuousEnabled: () => Promise<boolean>
  setContinuousEnabled: (enabled: boolean) => Promise<void>
  getContinuousStatus: () => Promise<DeepScanContinuousStatus>
  setMaxEventsPerCycle: (maxEvents: number) => Promise<void>
  getCacheTtl: () => Promise<number>
  setCacheTtl: (ttlMinutes: number) => Promise<void>
  getBatchSize: () => Promise<number>
  setBatchSize: (batchSize: number) => Promise<void>
  clearCache: (reason?: string) => Promise<void>
  // Story 7.6: New settings
  setIntervalMinutes: (minutes: number) => Promise<void>
  setConcurrentRequests: (count: number) => Promise<void>
  setScanScope: (scope: 'all-sports' | 'selected-sports' | 'selected-leagues') => Promise<void>
  // Story 7.9: Sport/League filter methods
  getEnabledSportsFilter: () => Promise<string[]>
  setEnabledSportsFilter: (sports: string[]) => Promise<void>
  getEnabledLeaguesFilter: () => Promise<string[]>
  setEnabledLeaguesFilter: (leagues: string[]) => Promise<void>
  fetchSports: () => Promise<DiscoveredSport[]>
  getSportsDetails: () => Promise<DiscoveredSport[]>
  fetchLeagues: (sport: string) => Promise<DiscoveredLeague[]>
  getLeagues: () => Promise<DiscoveredLeague[]>
  getLeaguePresets: () => Promise<LeaguePreset[]>
  applyPreset: (presetId: string) => Promise<{ scanScope: string; enabledSports: string[]; enabledLeagues: string[] }>
  // Story 8.7: Aggressive scan methods
  setAggressiveScanConfig: (config: Partial<AggressiveScanConfig>) => Promise<void>
  getAggressiveScanConfig: () => Promise<AggressiveScanConfig>
  getAggressiveScanStats: () => Promise<AggressiveScanStats>
  startAggressiveScan: () => Promise<void>
  stopAggressiveScan: () => Promise<void>
  startAggressiveScanWithSelection: (selection: AggressiveScanSelection) => Promise<void>
  // Story 8.7: Dynamic presets with API data
  getDynamicPresets: () => Promise<{
    presets: AggressiveScanPreset[]
    quotaConfig: QuotaConfig
    availableSports: DiscoveredSport[]
    availableLeagues: DiscoveredLeague[]
    usedApiData: boolean
  }>
  refreshDynamicPresets: () => Promise<{
    presets: AggressiveScanPreset[]
    quotaConfig: QuotaConfig
    availableSports: DiscoveredSport[]
    availableLeagues: DiscoveredLeague[]
    usedApiData: boolean
  }>
  getQuotaConfig: () => Promise<QuotaConfig>
  setQuotaConfig: (planTier: ApiPlanTier, targetPercent?: number) => Promise<{ ok: boolean; config: QuotaConfig }>
  detectPlanTier: (observedLimit: number) => Promise<{ ok: boolean; detectedTier: ApiPlanTier; config: QuotaConfig }>
}

// Story 7.9: Sport and League types
export interface DiscoveredSport {
  name: string
  slug: string
}

export interface DiscoveredLeague {
  name: string
  slug: string
  eventsCount: number
  sport: string
}

export interface LeaguePreset {
  id: string
  name: string
  description: string
  sport: string
  leagues: string[]
}

// Story 8.7: Dynamic preset types
export interface AggressiveScanPreset {
  id: string
  name: string
  description: string
  sports: string[]
  leagues: string[]
  estimatedEvents: number
  category: 'major' | 'minor' | 'regional' | 'custom'
}

export interface DeepScanContinuousStatus {
  enabled: boolean
  isActive: boolean
  isPaused: boolean
  lastContinuousScanAt: string | null
  eventsScannedToday: number
  opportunitiesFoundToday: number
  requestsToday: number
  maxEventsPerCycle: number
  cacheEntries: number
  cacheTtlMinutes: number
  batchSize: number
  cacheOldestEntryAgeMs: number | null
  intervalMinutes: number
  concurrentRequests: number
  scanScope: 'all-sports' | 'selected-sports' | 'selected-leagues'
  quotaStatus: DeepScanQuotaStatus
  history: ScanHistoryEntry[]
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

// Story 1.5: Card Counting Rules API
export interface CardRulesAPI {
  getAllRules: () => Promise<BookmakerCardRules>
  getRule: (bookmaker: string) => Promise<CardCountingRule>
  setRule: (bookmaker: string, rule: CardCountingRule) => Promise<void>
  removeRule: (bookmaker: string) => Promise<void>
  getConfiguredBookmakers: () => Promise<string[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      credentials: CredentialsAPI
      oddsApiIo: OddsApiIoAPI
      feed: FeedAPI
      deepScan: DeepScanAPI
      cardRules: CardRulesAPI
      // Story 7.7: Best Odds Comparison & copy utilities
      deepScanGetBestOdds: (input: { eventId: string }) => Promise<{
        bestOdds: Array<{
          eventId: string
          marketKey: string
          marketLabel: string
          marketGroup: string
          outcomes: Array<{
            outcome: string
            bestBookmaker: string
            bestOdds: number
            allBookmakers: Array<{ bookmaker: string; odds: number }>
          }>
          hasArbitrage: boolean
          arbitrageRoi?: number
        }> | null
        cachedAt: number | null
      }>
      copySignalToClipboard: (input: { text: string }) => Promise<void>
    }
  }
}
