import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { createTRPCProxyClient } from '@trpc/client'
import { ELECTRON_TRPC_CHANNEL, ipcLink } from 'electron-trpc/renderer'
import type { AppRouter } from '../main/services/router'
import type { ArbitrageOpportunity, DeepScanConfig, DeepScanProgress, ProviderId, ScanHistoryEntry, DeepScanQuotaStatus } from '../../shared/types'

type CredentialsStorageStatus = {
  isUsingFallbackStorage: boolean
  fallbackWarningShown: boolean
}

type ProviderStatusInfo = {
  providerId: ProviderId
  enabled: boolean
  hasKey: boolean
}

type CredentialsAPI = {
  saveApiKey: (providerId: ProviderId, apiKey: string) => Promise<void>
  isProviderConfigured: (providerId: ProviderId) => Promise<boolean>
  getStorageStatus: () => Promise<CredentialsStorageStatus>
  acknowledgeFallbackWarning: () => Promise<void>
  // Multi-provider methods (Story 5.1)
  getEnabledProviders: () => Promise<ProviderId[]>
  setProviderEnabled: (providerId: ProviderId, enabled: boolean) => Promise<{ providerId: ProviderId; enabled: boolean }>
  getAllProvidersStatus: () => Promise<ProviderStatusInfo[]>
}

export type OddsApiIoBookmaker = {
  name: string
  active: boolean
}

type OddsApiIoAPI = {
  getSupportedBookmakers: () => Promise<OddsApiIoBookmaker[]>
  getSelectedBookmakers: () => Promise<string[]>
  selectBookmakers: (bookmakers: string[]) => Promise<void>
  clearSelectedBookmakers: () => Promise<void>
}

type DeepScanAPI = {
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
  getIntervalMinutes: () => Promise<number>
  setIntervalMinutes: (intervalMinutes: number) => Promise<void>
  getConcurrentRequests: () => Promise<number>
  setConcurrentRequests: (concurrentRequests: number) => Promise<void>
  getScanScope: () => Promise<'all-sports' | 'selected-sports' | 'selected-leagues'>
  setScanScope: (scanScope: 'all-sports' | 'selected-sports' | 'selected-leagues') => Promise<void>
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
}

// Story 7.9: Sport and League types for the UI
type DiscoveredSport = {
  name: string
  slug: string
}

type DiscoveredLeague = {
  name: string
  slug: string
  eventsCount: number
  sport: string
}

type LeaguePreset = {
  id: string
  name: string
  description: string
  sport: string
  leagues: string[]
}

type DeepScanContinuousStatus = {
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

// Electron-TRPC bridge: attach to both preload globalThis and renderer via contextBridge
const exposeElectronTRPC = (): void => {
  const handler = {
    sendMessage: (operation: unknown) => ipcRenderer.send(ELECTRON_TRPC_CHANNEL, operation),
    onMessage: (callback: (payload: unknown) => void) =>
      ipcRenderer.on(ELECTRON_TRPC_CHANNEL, (_event, payload) => callback(payload))
  }

  ;(globalThis as typeof globalThis & { electronTRPC?: typeof handler }).electronTRPC = handler

  if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld('electronTRPC', handler)
    } catch {
      // no-op if already exposed
    }
  } else {
    // @ts-ignore - electronTRPC is injected on window in non-isolated mode
    window.electronTRPC = handler
  }
}

// Register the TRPC bridge immediately so renderer and preload can find it before creating clients.
exposeElectronTRPC()

const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()]
})

const credentialsApi: CredentialsAPI = {
  async saveApiKey(providerId, apiKey) {
    await trpcClient.saveApiKey.mutate({ providerId, apiKey })
  },
  async isProviderConfigured(providerId) {
    const result = await trpcClient.isProviderConfigured.query({ providerId })
    return result.isConfigured
  },
  async getStorageStatus() {
    return trpcClient.getStorageStatus.query()
  },
  async acknowledgeFallbackWarning() {
    await trpcClient.acknowledgeFallbackWarning.mutate()
  },
  // Multi-provider methods (Story 5.1)
  async getEnabledProviders() {
    const result = await trpcClient.getEnabledProviders.query()
    return result.enabledProviders
  },
  async setProviderEnabled(providerId, enabled) {
    const result = await trpcClient.setProviderEnabled.mutate({ providerId, enabled })
    return result
  },
  async getAllProvidersStatus() {
    const result = await trpcClient.getAllProvidersStatus.query()
    return result.providers
  }
}

const oddsApiIoApi: OddsApiIoAPI = {
  async getSupportedBookmakers() {
    const result = await trpcClient.oddsApiIoGetSupportedBookmakers.query()
    return result.bookmakers as OddsApiIoBookmaker[]
  },
  async getSelectedBookmakers() {
    const result = await trpcClient.oddsApiIoGetSelectedBookmakers.query()
    return result.bookmakers as string[]
  },
  async selectBookmakers(bookmakers) {
    await trpcClient.oddsApiIoSelectBookmakers.mutate({ bookmakers })
  },
  async clearSelectedBookmakers() {
    await trpcClient.oddsApiIoClearSelectedBookmakers.mutate()
  }
}

const deepScanApi: DeepScanAPI = {
  async startDeepScan(config) {
    await trpcClient.deepScanStart.mutate(config)
  },
  async cancelDeepScan() {
    await trpcClient.deepScanCancel.mutate()
  },
  async getStatus() {
    return trpcClient.deepScanStatus.query()
  },
  async getResults() {
    const result = await trpcClient.deepScanResults.query()
    return result.opportunities
  },
  async getContinuousEnabled() {
    const result = await trpcClient.deepScanGetContinuousEnabled.query()
    return result.enabled
  },
  async setContinuousEnabled(enabled) {
    await trpcClient.deepScanSetContinuousEnabled.mutate({ enabled: Boolean(enabled) })
  },
  async getContinuousStatus() {
    return trpcClient.deepScanGetContinuousStatus.query()
  },
  async setMaxEventsPerCycle(maxEvents) {
    await trpcClient.deepScanSetMaxEventsPerCycle.mutate({ maxEvents })
  },
  async getCacheTtl() {
    const result = await trpcClient.deepScanGetCacheTtl.query()
    return result.ttlMinutes
  },
  async setCacheTtl(ttlMinutes) {
    await trpcClient.deepScanSetCacheTtl.mutate({ ttlMinutes })
  },
  async getBatchSize() {
    const result = await trpcClient.deepScanGetBatchSize.query()
    return result.batchSize
  },
  async setBatchSize(batchSize) {
    await trpcClient.deepScanSetBatchSize.mutate({ batchSize })
  },
  async clearCache(reason) {
    await trpcClient.deepScanClearCache.mutate(reason ? { reason } : undefined)
  },
  async getIntervalMinutes() {
    const result = await trpcClient.deepScanGetIntervalMinutes.query()
    return result.intervalMinutes
  },
  async setIntervalMinutes(intervalMinutes) {
    await trpcClient.deepScanSetIntervalMinutes.mutate({ intervalMinutes })
  },
  async getConcurrentRequests() {
    const result = await trpcClient.deepScanGetConcurrentRequests.query()
    return result.concurrentRequests
  },
  async setConcurrentRequests(concurrentRequests) {
    await trpcClient.deepScanSetConcurrentRequests.mutate({ concurrentRequests })
  },
  async getScanScope() {
    const result = await trpcClient.deepScanGetScope.query()
    return result.scanScope
  },
  async setScanScope(scanScope) {
    await trpcClient.deepScanSetScope.mutate({ scanScope })
  },
  // Story 7.9: Sport/League filter methods
  async getEnabledSportsFilter() {
    const result = await trpcClient.deepScanGetEnabledSportsFilter.query()
    return result.sports
  },
  async setEnabledSportsFilter(sports) {
    await trpcClient.deepScanSetEnabledSportsFilter.mutate({ sports })
  },
  async getEnabledLeaguesFilter() {
    const result = await trpcClient.deepScanGetEnabledLeaguesFilter.query()
    return result.leagues
  },
  async setEnabledLeaguesFilter(leagues) {
    await trpcClient.deepScanSetEnabledLeaguesFilter.mutate({ leagues })
  },
  async fetchSports() {
    const result = await trpcClient.deepScanFetchSports.mutate()
    return result.sports
  },
  async getSportsDetails() {
    const result = await trpcClient.deepScanGetSportsDetails.query()
    return result.sports
  },
  async fetchLeagues(sport) {
    const result = await trpcClient.deepScanFetchLeagues.mutate({ sport })
    return result.leagues
  },
  async getLeagues() {
    const result = await trpcClient.deepScanGetLeagues.query()
    return result.leagues
  },
  async getLeaguePresets() {
    const result = await trpcClient.deepScanGetLeaguePresets.query()
    return result.presets
  },
  async applyPreset(presetId) {
    const result = await trpcClient.deepScanApplyPreset.mutate({ presetId })
    return {
      scanScope: result.scanScope,
      enabledSports: result.enabledSports,
      enabledLeagues: result.enabledLeagues
    }
  }
}

// Custom APIs for renderer
const api = {
  credentials: credentialsApi,
  oddsApiIo: oddsApiIoApi,
  deepScan: deepScanApi,
  feed: {
    async runManualFetch() {
      await trpcClient.pollAndGetFeedSnapshot.mutate()
    }
  },
  // Story 7.7: Best Odds Comparison API
  async deepScanGetBestOdds(input: { eventId: string }) {
    return trpcClient.deepScanGetBestOdds.query(input)
  },
  async copySignalToClipboard(input: { text: string }) {
    await trpcClient.copySignalToClipboard.mutate(input)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
