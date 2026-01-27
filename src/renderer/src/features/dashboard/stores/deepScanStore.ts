import { create } from 'zustand'

import {
  type DeepScanConfig,
  type DeepScanProgress,
  type DeepScanStatus,
  type MarketGroup
} from '../../../../../../shared/types'
import { trpcClient } from '../../../lib/trpc'
import { useFeedFiltersStore } from './feedFiltersStore'
import { useFeedStore } from './feedStore'

const POLL_INTERVAL_MS = 1500

const idleProgress: DeepScanProgress = {
  status: 'idle',
  eventsScanned: 0,
  eventsTotal: 0,
  requestsMade: 0,
  opportunitiesFound: 0,
  startedAt: null,
  elapsedMs: 0
}

let pollHandle: ReturnType<typeof setInterval> | null = null
let lastStatus: DeepScanStatus = 'idle'

function clearPolling(): void {
  if (pollHandle) {
    clearInterval(pollHandle)
    pollHandle = null
  }
}

function triggerFeedRefresh(): void {
  void useFeedStore.getState().refreshSnapshot()
}

interface DeepScanState {
  progress: DeepScanProgress
  isDialogOpen: boolean
  isStarting: boolean
  lastConfig: DeepScanConfig | null
  setDialogOpen: (open: boolean) => void
  startScan: (config: DeepScanConfig) => Promise<void>
  cancelScan: () => Promise<void>
  refreshStatus: () => Promise<void>
}

export const useDeepScanStore = create<DeepScanState>((set, get) => ({
  progress: idleProgress,
  isDialogOpen: false,
  isStarting: false,
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
  }
}))
