import { initTRPC } from '@trpc/server'
import { getActiveProviderId, setActiveProviderId } from './storage'
import { activeProviderSchema, saveApiKeyInputSchema, providerIdParamSchema } from '../../../shared/schemas'
import { notifyActiveProviderChanged } from './poller'
import type { ProviderId } from '../../../shared/types'
import {
  acknowledgeFallbackWarning,
  getStorageStatus,
  isProviderConfigured,
  saveApiKey
} from '../credentials'

const t = initTRPC.create()

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
  })
})

export type AppRouter = typeof appRouter
