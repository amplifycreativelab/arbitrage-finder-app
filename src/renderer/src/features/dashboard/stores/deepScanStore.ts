import { create } from 'zustand'

import {
  type DeepScanConfig,
  type DeepScanProgress,
  type DeepScanStatus,
  type MarketGroup,
  type ScanHistoryEntry,
  type DeepScanQuotaStatus
} from '../../../../../../shared/types'
import { trpcClient } from '../../../lib/trpc'
import { useFeedFiltersStore } from './feedFiltersStore'
import { useFeedStore } from './feedStore'

const POLL_INTERVAL_MS = 1500
const DEFAULT_MAX_EVENTS_PER_CYCLE = 50

const idleProgress: DeepScanProgress = {
  status: 'idle',
  mode: 'manual',
  eventsScanned: 0,
  eventsTotal: 0,
  requestsMade: 0,
  opportunitiesFound: 0,
  marketsScanned: 0,
  marketGroupsWithArbs: [],
  startedAt: null,
  elapsedMs: 0
}

let pollHandle: ReturnType<typeof setInterval> | null = null
let lastStatus: DeepScanStatus = 'idle'

interface ContinuousStatusSnapshot {
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
  enabledSports: string[]
  enabledLeagues: string[]
  quotaStatus: DeepScanQuotaStatus
  history: ScanHistoryEntry[]
}

const idleContinuousStatus: ContinuousStatusSnapshot = {
  enabled: true,
  isActive: false,
  isPaused: false,
  lastContinuousScanAt: null,
  eventsScannedToday: 0,
  opportunitiesFoundToday: 0,
  requestsToday: 0,
  maxEventsPerCycle: DEFAULT_MAX_EVENTS_PER_CYCLE,
  cacheEntries: 0,
  cacheTtlMinutes: 5,
  batchSize: 10,
  cacheOldestEntryAgeMs: null,
  intervalMinutes: 5,
  concurrentRequests: 2,
  scanScope: 'all-sports',
  enabledSports: [],
  enabledLeagues: [],
  quotaStatus: {
    hourlyUsed: 0,
    hourlyLimit: 5000,
    percentUsed: 0,
    isThrottled: false
  },
  history: []
}

function clearPolling(): void {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
}

function triggerFeedRefresh(): void {
  void useFeedStore.getState().refreshSnapshot()
}

function computeFilterSignature(state: { regions?: string[]; bookmakers?: string[] }): string {
  const regionsKey = (state.regions ?? []).slice().sort().join(',')
  const bookmakersKey = (state.bookmakers ?? []).slice().sort().join(',')
  return `${regionsKey}|${bookmakersKey}`
}

let filtersSubscribed = false

function ensureFilterCacheInvalidationSubscription(): void {
  if (filtersSubscribed) return
  filtersSubscribed = true

  let previousSignature = computeFilterSignature(useFeedFiltersStore.getState())

  useFeedFiltersStore.subscribe((state) => {
    const nextSignature = computeFilterSignature(state)
    if (nextSignature === previousSignature) {
      return
    }
    previousSignature = nextSignature

    const clearCacheMutation = trpcClient.deepScanClearCache
    if (!clearCacheMutation || typeof clearCacheMutation.mutate !== 'function') {
      return
    }

    void clearCacheMutation.mutate({ reason: 'filters_changed' }).catch(() => {
      // Cache invalidation is best-effort and should not surface to the user.
    })
  })
}

ensureFilterCacheInvalidationSubscription()

let startupSyncCompleted = false

async function syncPersistedSettingsToMain(): Promise<void> {
  if (startupSyncCompleted) return
  startupSyncCompleted = true

  const {
    continuousDeepScanEnabled,
    continuousDeepScanMaxEventsPerCycle,
    deepScanCacheTtlMinutes,
    deepScanBatchSize,
    deepScanRoiThresholds,
    deepScanIntervalMinutes,
    deepScanConcurrentRequests,
    deepScanScope
  } = useFeedFiltersStore.getState()

  try {
    await trpcClient.deepScanSetContinuousEnabled.mutate({ enabled: continuousDeepScanEnabled })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetMaxEventsPerCycle.mutate({ maxEvents: continuousDeepScanMaxEventsPerCycle })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetCacheTtl.mutate({ ttlMinutes: deepScanCacheTtlMinutes })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetBatchSize.mutate({ batchSize: deepScanBatchSize })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetDefaultThresholds.mutate({
      minRoi: deepScanRoiThresholds.globalMinRoi,
      marketGroupThresholds: deepScanRoiThresholds.marketGroupMinRoi
    })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetIntervalMinutes.mutate({ intervalMinutes: deepScanIntervalMinutes })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetConcurrentRequests.mutate({ concurrentRequests: deepScanConcurrentRequests })
  } catch {
    // Best-effort sync; ignore errors
  }

  try {
    await trpcClient.deepScanSetScope.mutate({ scanScope: deepScanScope })
  } catch {
    // Best-effort sync; ignore errors
  }
}

interface DeepScanState {
  progress: DeepScanProgress
  continuousStatus: ContinuousStatusSnapshot
  isDialogOpen: boolean
  isStarting: boolean
  isContinuousUpdating: boolean
  isPausing: boolean
  lastConfig: DeepScanConfig | null
  setDialogOpen: (open: boolean) => void
  startScan: (config: DeepScanConfig) => Promise<void>
  cancelScan: () => Promise<void>
  refreshStatus: () => Promise<void>
  refreshContinuousStatus: () => Promise<void>
  setContinuousEnabled: (enabled: boolean) => Promise<void>
  setMaxEventsPerCycle: (maxEvents: number) => Promise<void>
  pauseContinuous: () => Promise<void>
  resumeContinuous: () => Promise<void>
}

export const useDeepScanStore = create<DeepScanState>((set, get) => ({
  progress: idleProgress,
  continuousStatus: idleContinuousStatus,
  isDialogOpen: false,
  isStarting: false,
  isContinuousUpdating: false,
  isPausing: false,
  lastConfig: null,
  setDialogOpen: (open) => {
    set({ isDialogOpen: open })
  },
  startScan: async (config) => {
    if (get().progress.status === 'scanning' || get().isStarting) {
      return
    }

    const { deepScanRoiThresholds } = useFeedFiltersStore.getState()
    const thresholdOverrides = deepScanRoiThresholds.marketGroupMinRoi
    const definedOverrides = Object.entries(thresholdOverrides).filter(
      ([, value]) => typeof value === 'number' && value > 0
    )
    const marketGroupThresholds =
      definedOverrides.length > 0
        ? (Object.fromEntries(definedOverrides) as Record<MarketGroup, number>)
        : undefined
    const finalConfig: DeepScanConfig = {
      ...config,
      minRoi:
        typeof config.minRoi === 'number'
          ? config.minRoi
          : deepScanRoiThresholds.globalMinRoi,
      marketGroupThresholds
    }

    const optimisticStartedAt = new Date().toISOString()
    set({
      isStarting: true,
      isDialogOpen: false,
      lastConfig: finalConfig,
      progress: {
        ...idleProgress,
        status: 'scanning',
        startedAt: optimisticStartedAt
      }
    })

    try {
      await trpcClient.deepScanStart.mutate(finalConfig)
      await get().refreshStatus()

      clearPolling()
      pollHandle = setInterval(() => {
        void get().refreshStatus()
      }, POLL_INTERVAL_MS)
    } catch (error) {
      clearPolling()
      const message = (error as Error)?.message ?? 'Unable to start deep scan'
      lastStatus = 'error'
      set({
        isStarting: false,
        progress: {
          ...idleProgress,
          status: 'error',
          errorMessage: message,
          startedAt: optimisticStartedAt
        }
      })
    } finally {
      set({ isStarting: false })
    }
  },
  cancelScan: async () => {
    try {
      await trpcClient.deepScanCancel.mutate()
    } catch {
      // Ignore cancel errors; we still attempt to stop local polling.
    } finally {
      clearPolling()
      lastStatus = 'cancelled'
      set((state) => ({
        progress: {
          ...state.progress,
          status: 'cancelled'
        }
      }))
      triggerFeedRefresh()
    }
  },
  refreshStatus: async () => {
    try {
      const status = await trpcClient.deepScanStatus.query()
      const previous = lastStatus
      lastStatus = status.status

      set((state) => ({
        progress: {
          ...state.progress,
          ...status
        }
      }))

      await get().refreshContinuousStatus()

      if (previous === 'scanning' && status.status !== 'scanning') {
        clearPolling()
        triggerFeedRefresh()
      }
    } catch (error) {
      clearPolling()
      const message = (error as Error)?.message ?? 'Unable to refresh deep scan status'
      lastStatus = 'error'
      set((state) => ({
        progress: {
          ...state.progress,
          status: 'error',
          errorMessage: message
        }
      }))
    }
  },
  refreshContinuousStatus: async () => {
    set({ isContinuousUpdating: true })
    try {
      // Sync persisted settings from renderer to main on first refresh
      await syncPersistedSettingsToMain()

      const status = await trpcClient.deepScanGetContinuousStatus.query()
      set({ continuousStatus: status })
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to refresh continuous deep scan status'
      set((state) => ({
        progress: {
          ...state.progress,
          errorMessage: message
        }
      }))
    } finally {
      set({ isContinuousUpdating: false })
    }
  },
  setContinuousEnabled: async (enabled) => {
    const normalized = Boolean(enabled)

    set((state) => ({
      continuousStatus: {
        ...state.continuousStatus,
        enabled: normalized
      }
    }))

    try {
      await trpcClient.deepScanSetContinuousEnabled.mutate({ enabled: normalized })
      await get().refreshContinuousStatus()
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to update continuous deep scan setting'
      set((state) => ({
        progress: {
          ...state.progress,
          errorMessage: message
        }
      }))
    }
  },
  setMaxEventsPerCycle: async (maxEvents) => {
    const normalized = Number.isFinite(maxEvents) ? Math.max(1, Math.floor(maxEvents)) : DEFAULT_MAX_EVENTS_PER_CYCLE
    set((state) => ({
      continuousStatus: {
        ...state.continuousStatus,
        maxEventsPerCycle: normalized
      }
    }))

    try {
      await trpcClient.deepScanSetMaxEventsPerCycle.mutate({ maxEvents: normalized })
      await get().refreshContinuousStatus()
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to update max events per cycle'
      set((state) => ({
        progress: {
          ...state.progress,
          errorMessage: message
        }
      }))
    }
  },
  pauseContinuous: async () => {
    set({ isPausing: true })
    try {
      await trpcClient.deepScanPauseContinuous.mutate()
      set((state) => ({
        continuousStatus: {
          ...state.continuousStatus,
          isPaused: true
        }
      }))
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to pause continuous scan'
      set((state) => ({
        progress: {
          ...state.progress,
          errorMessage: message
        }
      }))
    } finally {
      set({ isPausing: false })
    }
  },
  resumeContinuous: async () => {
    set({ isPausing: true })
    try {
      await trpcClient.deepScanResumeContinuous.mutate()
      set((state) => ({
        continuousStatus: {
          ...state.continuousStatus,
          isPaused: false
        }
      }))
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unable to resume continuous scan'
      set((state) => ({
        progress: {
          ...state.progress,
          errorMessage: message
        }
      }))
    } finally {
      set({ isPausing: false })
    }
  }
}))
