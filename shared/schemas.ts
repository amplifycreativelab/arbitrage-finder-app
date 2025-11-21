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
    foundAt: z.string()
  })
  .refine(
    (value) => value.legs[0].bookmaker !== value.legs[1].bookmaker,
    {
      message: 'legs must reference distinct bookmakers',
      path: ['legs']
    }
  )

export const arbitrageOpportunityListSchema = z.array(arbitrageOpportunitySchema)
