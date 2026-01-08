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

export const copySignalToClipboardInputSchema = z.object({
  text: z.string().min(1)
})

// ============================================================
// Multi-provider schemas (Story 5.1)
// ============================================================

/**
 * Input schema for toggling a provider's enabled state.
 */
export const setProviderEnabledInputSchema = z.object({
  providerId: providerIdSchema,
  enabled: z.boolean()
})

/**
 * Response schema for getEnabledProviders.
 */
export const enabledProvidersResponseSchema = z.object({
  enabledProviders: z.array(providerIdSchema)
})

/**
 * Response schema for setProviderEnabled.
 */
export const setProviderEnabledResponseSchema = z.object({
  providerId: providerIdSchema,
  enabled: z.boolean()
})

/**
 * Provider status information for UI.
 */
export const providerStatusInfoSchema = z.object({
  providerId: providerIdSchema,
  enabled: z.boolean(),
  hasKey: z.boolean()
})

export const allProvidersStatusResponseSchema = z.object({
  providers: z.array(providerStatusInfoSchema)
})

// ============================================================
// Arbitrage schemas
// ============================================================

const arbitrageLegSchema = z.object({
  bookmaker: z.string(),
  market: z.string(),
  odds: z.number().positive(),
  outcome: z.string()
})

export const arbitrageOpportunitySchema = z
  .object({
    id: z.string(),
    sport: z.string(),
    event: z.object({
      name: z.string(),
      date: z.string(),
      league: z.string()
    }),
    legs: z.tuple([arbitrageLegSchema, arbitrageLegSchema]),
    roi: z.number().min(0),
    foundAt: z.string(),
    providerId: providerIdSchema.optional(), // Multi-provider source tracking (Story 5.1)
    mergedFrom: z.array(providerIdSchema).optional() // All source providers after deduplication (Story 5.2)
  })
  .refine(
    (value) => value.legs[0].bookmaker !== value.legs[1].bookmaker,
    {
      message: 'legs must reference distinct bookmakers',
      path: ['legs']
    }
  )

export const arbitrageOpportunityListSchema = z.array(arbitrageOpportunitySchema)

