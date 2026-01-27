import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { createTRPCProxyClient } from '@trpc/client'
import { ELECTRON_TRPC_CHANNEL, ipcLink } from 'electron-trpc/renderer'
import type { AppRouter } from '../main/services/router'
import type { ArbitrageOpportunity, DeepScanConfig, DeepScanProgress, ProviderId } from '../../shared/types'

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
  clearCache: (reason?: string) => Promise<void>
}

type DeepScanContinuousStatus = {
  enabled: boolean
  isActive: boolean
  lastContinuousScanAt: string | null
  eventsScannedToday: number
  opportunitiesFoundToday: number
  requestsToday: number
  maxEventsPerCycle: number
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
  async clearCache(reason) {
    await trpcClient.deepScanClearCache.mutate(reason ? { reason } : undefined)
  }
}

// ... existing imports
// Custom APIs for renderer
const api = {
  credentials: credentialsApi,
  oddsApiIo: oddsApiIoApi,
  deepScan: deepScanApi,
  feed: {
    async runManualFetch() {
      await trpcClient.pollAndGetFeedSnapshot.mutate()
    }
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
