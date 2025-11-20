import { z } from 'zod'
import { PROVIDER_IDS } from './types'

export const providerIdSchema = z.enum(PROVIDER_IDS)

export const saveApiKeyInputSchema = z.object({
  providerId: providerIdSchema,
  apiKey: z.string().min(1)
})

export const getApiKeyInputSchema = z.object({
  providerId: providerIdSchema
})

export const activeProviderSchema = z.object({
  providerId: providerIdSchema
})

export const setActiveProviderInputSchema = activeProviderSchema

export const providerIdParamSchema = z.object({
  providerId: providerIdSchema
})
