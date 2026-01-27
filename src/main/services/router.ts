import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import {
  getEnabledProviders,
  toggleProvider,
  getAllProvidersWithStatus
} from './storage'
import {
  copySignalToClipboardInputSchema,
  deepScanConfigSchema,
  oddsApiIoSelectBookmakersInputSchema,
  saveApiKeyInputSchema,
  providerIdParamSchema,
  setProviderEnabledInputSchema
} from '../../../shared/schemas'
import {
  getDashboardStatusSnapshot,
  getLatestSnapshotForProvider,
  notifyEnabledProvidersChanged,
  pollOnceForEnabledProviders,
  registerAdapters,
  registerPollCompleteListener
} from './poller'
import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import {
  acknowledgeFallbackWarning,
  getApiKeyForAdapter,
  getStorageStatus,
  isProviderConfigured,
  saveApiKey
} from '../credentials'
import { copyTextToClipboard } from './clipboard'
import { openLogDirectory } from './logs'
import { OddsApiIoAdapter } from '../adapters/odds-api-io'
import { TheOddsApiAdapter } from '../adapters/the-odds-api'
import { deduplicateOpportunities, getDeduplicationStats } from './calculator'
import { logInfo } from './logger'
import {
  clearSelectedBookmakers,
  getSelectedBookmakers,
  getSupportedBookmakers,
  selectBookmakers
} from './odds-api-io-bookmakers'
import {
  cancelDeepScan,
  clearScanCache,
  getAvailableSports,
  getContinuousDeepScanEnabled,
  getContinuousScanBatchSize,
  getContinuousScanMaxEventsPerCycle,
  getContinuousScanStatus,
  getDeepScanProgress,
  getDeepScanResults,
  getEnabledSportsFilter,
  getScanCacheTtlMinutes,
  setContinuousDeepScanEnabled,
  setContinuousScanBatchSize,
  setContinuousScanDefaultThresholds,
  setContinuousScanMaxEventsPerCycle,
  setEnabledSportsFilter,
  setScanCacheTtl,
  startContinuousDeepScan,
  startDeepScan
} from './deepScan'

const t = initTRPC.create()

registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()])

// Initialize with enabled providers (multi-provider mode)
const initialEnabledProviders = getEnabledProviders()
notifyEnabledProvidersChanged(initialEnabledProviders)

registerPollCompleteListener(() => {
  void startContinuousDeepScan({ reason: 'poll-complete' })
})

function buildFeedMergeKey(opportunity: ArbitrageOpportunity): string {
  const legsKey = opportunity.legs
    .map((leg) => `${leg.bookmaker}|${leg.market}|${leg.outcome}`)
    .sort()
    .join('|')
  return `${opportunity.event.name}|${opportunity.event.date}|${opportunity.event.league}|${legsKey}`
}

function mergeDeepScanIntoFeed(
  feedOpportunities: ArbitrageOpportunity[]
): {
  merged: ArbitrageOpportunity[]
  stats: { feedCount: number; deepScanCount: number; deepScanMergedCount: number; mergedTotal: number }
} {
  const deepScanResults = getDeepScanResults()
  if (deepScanResults.length === 0) {
    return {
      merged: feedOpportunities,
      stats: {
        feedCount: feedOpportunities.length,
        deepScanCount: 0,
        deepScanMergedCount: 0,
        mergedTotal: feedOpportunities.length
      }
    }
  }

  const feedKeys = new Set(feedOpportunities.map(buildFeedMergeKey))
  const deepScanKeys = new Set<string>()
  const deepScanMerged: ArbitrageOpportunity[] = []

  for (const opportunity of deepScanResults) {
    const key = buildFeedMergeKey(opportunity)
    if (feedKeys.has(key) || deepScanKeys.has(key)) {
      continue
    }
    deepScanKeys.add(key)
    deepScanMerged.push(opportunity)
  }

  const merged = [...feedOpportunities, ...deepScanMerged]
  return {
    merged,
    stats: {
      feedCount: feedOpportunities.length,
      deepScanCount: deepScanResults.length,
      deepScanMergedCount: deepScanMerged.length,
      mergedTotal: merged.length
    }
  }
}

export const appRouter = t.router({
  saveApiKey: t.procedure
    .input(saveApiKeyInputSchema)
    .mutation(async ({ input }) => {
      await saveApiKey(input.providerId, input.apiKey)
      return { ok: true }
    }),
  isProviderConfigured: t.procedure
    .input(providerIdParamSchema)
    .query(async ({ input }) => {
      const configured = await isProviderConfigured(input.providerId)
      return { isConfigured: configured }
    }),

  // Legacy getActiveProvider/setActiveProvider removed in Story 5.1 cleanup

  // ============================================================
  // Multi-provider procedures (Story 5.1)
  // ============================================================

  /**
   * Get all enabled providers.
   */
  getEnabledProviders: t.procedure.query(async () => {
    const enabledProviders = getEnabledProviders()
    return { enabledProviders }
  }),

  /**
   * Toggle a provider's enabled state.
   */
  setProviderEnabled: t.procedure
    .input(setProviderEnabledInputSchema)
    .mutation(async ({ input }) => {
      const providerId = input.providerId as ProviderId
      const newState = toggleProvider(providerId, input.enabled)

      // Notify poller of configuration change
      const enabledProviders = getEnabledProviders()
      notifyEnabledProvidersChanged(enabledProviders)

      return { providerId, enabled: newState }
    }),

  /**
   * Get all providers with their status (enabled, hasKey).
   */
  getAllProvidersStatus: t.procedure.query(async () => {
    const providers = getAllProvidersWithStatus()
    return { providers }
  }),

  // ============================================================
  // Storage status procedures
  // ============================================================

  getStorageStatus: t.procedure.query(async () => {
    return getStorageStatus()
  }),
  acknowledgeFallbackWarning: t.procedure.mutation(async () => {
    await acknowledgeFallbackWarning()
    return { ok: true }
  }),

  // ============================================================
  // Feed procedures (updated for multi-provider)
  // ============================================================

  /**
   * Get current feed snapshot from all enabled providers.
   */
  getFeedSnapshot: t.procedure.query(async () => {
    const enabledProviderIds = getEnabledProviders()
    const status = await getDashboardStatusSnapshot()

    // Concatenate opportunities from all enabled providers
    const rawOpportunities: ArbitrageOpportunity[] = []
    let latestFetchedAt: string | null = null

    for (const providerId of enabledProviderIds) {
      const snapshot = getLatestSnapshotForProvider(providerId)
      rawOpportunities.push(...snapshot.opportunities)

      // Track most recent fetch time
      if (snapshot.fetchedAt) {
        if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
          latestFetchedAt = snapshot.fetchedAt
        }
      }
    }

    // Deduplicate opportunities across providers (Story 5.2)
    const opportunities = deduplicateOpportunities(rawOpportunities)
    const { merged, stats: mergeStats } = mergeDeepScanIntoFeed(opportunities)

    // Log deduplication stats for observability (MED-002 fix: parity with pollAndGetFeedSnapshot)
    const stats = getDeduplicationStats(rawOpportunities.length, opportunities.length)
    if (stats.duplicatesRemoved > 0) {
      logInfo('feed.deduplication', {
        context: 'service:router',
        operation: 'getFeedSnapshot',
        correlationId: undefined,
        durationMs: null,
        errorCategory: null,
        ...stats
      })
    }

    logInfo('feed.merge', {
      context: 'service:router',
      operation: 'getFeedSnapshot',
      correlationId: undefined,
      durationMs: null,
      errorCategory: null,
      ...mergeStats
    })

    return {
      enabledProviderIds,
      // Legacy field for backward compatibility
      providerId: enabledProviderIds[0] ?? null,
      opportunities: merged,
      fetchedAt: latestFetchedAt,
      status
    }
  }),

  /**
   * Poll all enabled providers and return merged feed snapshot.
   */
  pollAndGetFeedSnapshot: t.procedure.mutation(async () => {
    const enabledProviderIds = getEnabledProviders()

    // Poll all enabled providers
    await pollOnceForEnabledProviders()

    const status = await getDashboardStatusSnapshot()

    // Concatenate opportunities from all enabled providers
    const rawOpportunities: ArbitrageOpportunity[] = []
    let latestFetchedAt: string | null = null

    for (const providerId of enabledProviderIds) {
      const snapshot = getLatestSnapshotForProvider(providerId)
      rawOpportunities.push(...snapshot.opportunities)

      if (snapshot.fetchedAt) {
        if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
          latestFetchedAt = snapshot.fetchedAt
        }
      }
    }

    // Deduplicate opportunities across providers (Story 5.2)
    const opportunities = deduplicateOpportunities(rawOpportunities)
    const { merged, stats: mergeStats } = mergeDeepScanIntoFeed(opportunities)

    // Log deduplication stats
    const stats = getDeduplicationStats(rawOpportunities.length, opportunities.length)
    if (stats.duplicatesRemoved > 0) {
      logInfo('feed.deduplication', {
        context: 'service:router',
        operation: 'pollAndGetFeedSnapshot',
        correlationId: undefined,
        durationMs: null,
        errorCategory: null,
        ...stats
      })
    }

    logInfo('feed.merge', {
      context: 'service:router',
      operation: 'pollAndGetFeedSnapshot',
      correlationId: undefined,
      durationMs: null,
      errorCategory: null,
      ...mergeStats
    })

    return {
      enabledProviderIds,
      // Legacy field for backward compatibility
      providerId: enabledProviderIds[0] ?? null,
      opportunities: merged,
      fetchedAt: latestFetchedAt,
      status
    }
  }),

  // ============================================================
  // Deep Scan procedures (Story 7.1)
  // ============================================================

  deepScanStart: t.procedure
    .input(deepScanConfigSchema)
    .mutation(async ({ input }) => {
      await startDeepScan(input)
      return { ok: true }
    }),

  deepScanCancel: t.procedure.mutation(async () => {
    cancelDeepScan()
    return { ok: true }
  }),

  deepScanStatus: t.procedure.query(async () => {
    return getDeepScanProgress()
  }),

  deepScanResults: t.procedure.query(async () => {
    return { opportunities: getDeepScanResults() }
  }),

  deepScanGetContinuousEnabled: t.procedure.query(() => {
    return { enabled: getContinuousDeepScanEnabled() }
  }),

  deepScanSetContinuousEnabled: t.procedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ input }) => {
      setContinuousDeepScanEnabled(input.enabled)
      return { ok: true }
    }),

  deepScanSetMaxEventsPerCycle: t.procedure
    .input(z.object({ maxEvents: z.number().int().min(1).max(500) }))
    .mutation(({ input }) => {
      setContinuousScanMaxEventsPerCycle(input.maxEvents)
      return { ok: true, maxEvents: getContinuousScanMaxEventsPerCycle() }
    }),

  deepScanGetContinuousStatus: t.procedure.query(() => {
    return getContinuousScanStatus()
  }),

  deepScanClearCache: t.procedure
    .input(z.object({ reason: z.string().trim().min(1) }).optional())
    .mutation(({ input }) => {
      clearScanCache(input?.reason ?? 'renderer_settings_change')
      return { ok: true }
    }),

  deepScanSetDefaultThresholds: t.procedure
    .input(z.object({
      minRoi: z.number().min(0).optional(),
      marketGroupThresholds: z.record(z.string(), z.number().min(0)).optional()
    }))
    .mutation(({ input }) => {
      setContinuousScanDefaultThresholds(input)
      return { ok: true }
    }),

  deepScanGetCacheTtl: t.procedure.query(() => {
    return { ttlMinutes: getScanCacheTtlMinutes() }
  }),

  deepScanSetCacheTtl: t.procedure
    .input(z.object({ ttlMinutes: z.number().int().min(1).max(60) }))
    .mutation(({ input }) => {
      setScanCacheTtl(input.ttlMinutes)
      return { ok: true, ttlMinutes: getScanCacheTtlMinutes() }
    }),

  deepScanGetBatchSize: t.procedure.query(() => {
    return { batchSize: getContinuousScanBatchSize() }
  }),

  deepScanSetBatchSize: t.procedure
    .input(z.object({ batchSize: z.number().int().min(5).max(50) }))
    .mutation(({ input }) => {
      setContinuousScanBatchSize(input.batchSize)
      return { ok: true, batchSize: getContinuousScanBatchSize() }
    }),

  deepScanGetAvailableSports: t.procedure.query(() => {
    return { sports: getAvailableSports() }
  }),

  deepScanGetEnabledSportsFilter: t.procedure.query(() => {
    return { sports: getEnabledSportsFilter() }
  }),

  deepScanSetEnabledSportsFilter: t.procedure
    .input(z.object({ sports: z.array(z.string()) }))
    .mutation(({ input }) => {
      setEnabledSportsFilter(input.sports)
      return { ok: true, sports: getEnabledSportsFilter() }
    }),

  // ============================================================
  // Utility procedures
  // ============================================================

  copySignalToClipboard: t.procedure
    .input(copySignalToClipboardInputSchema)
    .mutation(async ({ input }) => {
      copyTextToClipboard(input.text)
      return { ok: true }
    }),
  openLogDirectory: t.procedure.mutation(async () => {
    const result = openLogDirectory()
    return result
  }),

  // ============================================================
  // Odds-API.io bookmaker management
  // ============================================================

  oddsApiIoGetSupportedBookmakers: t.procedure.query(async () => {
    const bookmakers = await getSupportedBookmakers()
    return { bookmakers }
  }),

  oddsApiIoGetSelectedBookmakers: t.procedure.query(async () => {
    const apiKey = await getApiKeyForAdapter('odds-api-io')
    if (!apiKey) {
      throw new Error('API key not configured for provider odds-api-io')
    }
    const bookmakers = await getSelectedBookmakers(apiKey)
    return { bookmakers }
  }),

  oddsApiIoSelectBookmakers: t.procedure
    .input(oddsApiIoSelectBookmakersInputSchema)
    .mutation(async ({ input }) => {
      const apiKey = await getApiKeyForAdapter('odds-api-io')
      if (!apiKey) {
        throw new Error('API key not configured for provider odds-api-io')
      }
      await selectBookmakers(apiKey, input.bookmakers)
      clearScanCache('bookmakers_changed')
      return { ok: true }
    }),

  oddsApiIoClearSelectedBookmakers: t.procedure.mutation(async () => {
    const apiKey = await getApiKeyForAdapter('odds-api-io')
    if (!apiKey) {
      throw new Error('API key not configured for provider odds-api-io')
    }
    await clearSelectedBookmakers(apiKey)
    clearScanCache('bookmakers_cleared')
    return { ok: true }
  })
})

export type AppRouter = typeof appRouter
