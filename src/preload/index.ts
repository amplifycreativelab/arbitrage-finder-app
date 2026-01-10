import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { createTRPCProxyClient } from '@trpc/client'
import { ELECTRON_TRPC_CHANNEL, ipcLink } from 'electron-trpc/renderer'
import type { AppRouter } from '../main/services/router'
import type { ProviderId } from '../../shared/types'

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
    // @ts-ignore
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

// ... existing imports
// Custom APIs for renderer
const api = {
  credentials: credentialsApi,
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
