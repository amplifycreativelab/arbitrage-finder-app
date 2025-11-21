import { initTRPC } from '@trpc/server'
import { getActiveProviderId, setActiveProviderId } from './storage'
import { activeProviderSchema, saveApiKeyInputSchema, providerIdParamSchema } from '../../../shared/schemas'
import { getLatestSnapshotForProvider, notifyActiveProviderChanged, pollOnceForActiveProvider, registerAdapters } from './poller'
import type { ProviderId } from '../../../shared/types'
import {
  acknowledgeFallbackWarning,
  getStorageStatus,
  isProviderConfigured,
  saveApiKey
} from '../credentials'
import { OddsApiIoAdapter } from '../adapters/odds-api-io'
import { TheOddsApiAdapter } from '../adapters/the-odds-api'

const t = initTRPC.create()

registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()])

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
  getStorageStatus: t.procedure.query(async () => {
    return getStorageStatus()
  }),
  acknowledgeFallbackWarning: t.procedure.mutation(async () => {
    await acknowledgeFallbackWarning()
    return { ok: true }
  }),
  getFeedSnapshot: t.procedure.query(async () => {
    const providerId = getActiveProviderId() as ProviderId
    const snapshot = getLatestSnapshotForProvider(providerId)

    return {
      providerId,
      opportunities: snapshot.opportunities,
      fetchedAt: snapshot.fetchedAt
    }
  }),
  pollAndGetFeedSnapshot: t.procedure.mutation(async () => {
    const providerId = getActiveProviderId() as ProviderId

    await pollOnceForActiveProvider()
    const snapshot = getLatestSnapshotForProvider(providerId)

    return {
      providerId,
      opportunities: snapshot.opportunities,
      fetchedAt: snapshot.fetchedAt
    }
  })
})

export type AppRouter = typeof appRouter
