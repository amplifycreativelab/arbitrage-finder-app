import { initTRPC } from '@trpc/server'
import {
  getActiveProviderId,
  setActiveProviderId,
  getEnabledProviders,
  toggleProvider,
  getAllProvidersWithStatus
} from './storage'
import {
  activeProviderSchema,
  copySignalToClipboardInputSchema,
  saveApiKeyInputSchema,
  providerIdParamSchema,
  setProviderEnabledInputSchema
} from '../../../shared/schemas'
import {
  getDashboardStatusSnapshot,
  getLatestSnapshotForProvider,
  notifyActiveProviderChanged,
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

const t = initTRPC.create()

registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()])

// Initialize with enabled providers (multi-provider mode)
const initialEnabledProviders = getEnabledProviders()
notifyEnabledProvidersChanged(initialEnabledProviders)

// Legacy: also set active provider for backward compatibility
const initialProviderId = getActiveProviderId() as ProviderId
notifyActiveProviderChanged(initialProviderId)

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

  // ============================================================
  // Legacy single-provider procedures (backward compatible)
  // ============================================================

  getActiveProvider: t.procedure.query(async () => {
    const providerId = getActiveProviderId()
    return { providerId }
  }),
  setActiveProvider: t.procedure
    .input(activeProviderSchema)
    .mutation(async ({ input }) => {
      const providerId = input.providerId as ProviderId
      setActiveProviderId(providerId)
      notifyActiveProviderChanged(providerId)
      return { ok: true }
    }),

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
    const opportunities: ArbitrageOpportunity[] = []
    let latestFetchedAt: string | null = null

    for (const providerId of enabledProviderIds) {
      const snapshot = getLatestSnapshotForProvider(providerId)
      opportunities.push(...snapshot.opportunities)

      // Track most recent fetch time
      if (snapshot.fetchedAt) {
        if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
          latestFetchedAt = snapshot.fetchedAt
        }
      }
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
    const opportunities: ArbitrageOpportunity[] = []
    let latestFetchedAt: string | null = null

    for (const providerId of enabledProviderIds) {
      const snapshot = getLatestSnapshotForProvider(providerId)
      opportunities.push(...snapshot.opportunities)

      if (snapshot.fetchedAt) {
        if (!latestFetchedAt || snapshot.fetchedAt > latestFetchedAt) {
          latestFetchedAt = snapshot.fetchedAt
        }
      }
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

