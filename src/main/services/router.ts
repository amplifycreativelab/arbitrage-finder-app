import { initTRPC } from '@trpc/server'
import {
  getEnabledProviders,
  toggleProvider,
  getAllProvidersWithStatus
} from './storage'
import {
  copySignalToClipboardInputSchema,
  saveApiKeyInputSchema,
  providerIdParamSchema,
  setProviderEnabledInputSchema
} from '../../../shared/schemas'
import {
  getDashboardStatusSnapshot,
  getLatestSnapshotForProvider,
  notifyEnabledProvidersChanged,
  pollOnceForEnabledProviders,
  registerAdapters
} from './poller'
import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import {
  acknowledgeFallbackWarning,
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

const t = initTRPC.create()

registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()])

// Initialize with enabled providers (multi-provider mode)
const initialEnabledProviders = getEnabledProviders()
notifyEnabledProvidersChanged(initialEnabledProviders)

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

    return {
      enabledProviderIds,
      // Legacy field for backward compatibility
      providerId: enabledProviderIds[0] ?? null,
      opportunities,
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

    return {
      enabledProviderIds,
      // Legacy field for backward compatibility
      providerId: enabledProviderIds[0] ?? null,
      opportunities,
      fetchedAt: latestFetchedAt,
      status
    }
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
  })
})

export type AppRouter = typeof appRouter

