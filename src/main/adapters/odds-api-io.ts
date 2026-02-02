import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { inferMarketMetadata } from '../../../shared/types'
import { BaseArbitrageAdapter } from './base'
import type { ProviderRequestContext } from '../services/poller'
import { createCorrelationId, logError, logInfo, type StructuredLogBase } from '../services/logger'
import { getSelectedBookmakers } from '../services/odds-api-io-bookmakers'

/**
 * Raw response structure from Odds-API.io /v3/arbitrage-bets endpoint.
 * Based on https://docs.odds-api.io API documentation.
 */
export interface OddsApiIoRawArbitrageBet {
  id: string
  eventId: number
  sport?: string
  roi?: number
  market: {
    name: string
    hdp?: number | null
  }
  profitMargin: number
  impliedProbability?: number
  totalStake?: number
  legs: Array<{
    side: string // e.g., "home", "away", "over", "under"
    bookmaker: string
    odds: string // API returns odds as string
    directLink?: string
  }>
  optimalStakes?: Array<{
    side: string
    bookmaker: string
    stake: number
    potentialReturn: number
  }>
  event?: {
    id?: number
    name?: string
    home?: string // Home team name
    away?: string // Away team name
    date?: string // Event date/time
    sport?: string
    league?: string
  }
}

/**
 * Normalizes a raw Odds-API.io opportunity to the standard ArbitrageOpportunity format.
 * Market strings are normalized using inferMarketMetadata for consistent filtering (Story 6.1).
 */
export function normalizeOddsApiIoOpportunity(
  raw: OddsApiIoRawArbitrageBet,
  foundAt: string = new Date().toISOString()
): ArbitrageOpportunity | null {
  // Validate required fields
  if (!raw || !raw.id || !Array.isArray(raw.legs) || raw.legs.length < 2) {
    return null
  }

  // Extract market name, with fallback
  const marketName = raw.market?.name ?? 'h2h'
  const metadata = inferMarketMetadata(marketName)

  // Build event info from the event object if available
  // API returns home/away team names, not homeTeam/awayTeam
  const eventName =
    raw.event?.name ??
    (raw.event?.home && raw.event?.away
      ? `${raw.event.home} vs ${raw.event.away}`
      : `Event ${raw.eventId}`)
  const eventDate = raw.event?.date ?? new Date().toISOString()
  const eventLeague = raw.event?.league ?? ''

  // Normalize sport value to match our SportFilterValue type
  const rawSport = (raw.event?.sport ?? raw.sport ?? 'soccer').toLowerCase()
  let sport = 'soccer'
  if (rawSport.includes('soccer') || (rawSport.includes('football') && !rawSport.includes('american'))) {
    sport = 'soccer'
  } else if (rawSport.includes('tennis')) {
    sport = 'tennis'
  } else if (
    rawSport.includes('basketball') ||
    rawSport.includes('nba') ||
    rawSport.includes('ncaab') ||
    rawSport.includes('euroleague') ||
    rawSport.includes('wnba')
  ) {
    sport = 'basketball'
  } else {
    // For unrecognized sports, use the raw value
    sport = rawSport
  }

  // Normalize legs - map 'side' to 'outcome' and convert odds string to number
  const normalizedLegs = raw.legs.slice(0, 2).map((leg) => ({
    bookmaker: leg.bookmaker ?? 'Unknown',
    market: metadata.key,
    odds: typeof leg.odds === 'string' ? parseFloat(leg.odds) : (leg.odds ?? 0),
    outcome: leg.side ?? 'unknown'
  })) as [
    { bookmaker: string; market: string; odds: number; outcome: string },
    { bookmaker: string; market: string; odds: number; outcome: string }
  ]

  // Validate odds are valid numbers
  if (!normalizedLegs.every((leg) => Number.isFinite(leg.odds) && leg.odds > 0)) {
    return null
  }

  // profitMargin from API is a percentage value (e.g., 2.04 means 2.04%)
  // Internal ROI format is decimal (e.g., 0.0204 for 2.04%), so divide by 100
  const roi =
    typeof raw.profitMargin === 'number'
      ? raw.profitMargin / 100
      : typeof raw.roi === 'number'
        ? raw.roi
        : 0

  return {
    id: raw.id,
    sport,
    event: {
      name: eventName,
      date: eventDate,
      league: eventLeague
    },
    legs: normalizedLegs,
    roi,
    foundAt
  }
}

const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_ARBS_PATH = '/v3/arbitrage-bets'

const ODDS_API_IO_PROVIDER_ID: ProviderId = 'odds-api-io'

const SELECTED_BOOKMAKERS_TTL_MS = 5 * 60 * 1000
let cachedSelectedBookmakers: { fetchedAtMs: number; bookmakers: string[] } | null = null

export class OddsApiIoAdapter extends BaseArbitrageAdapter {
  readonly id = ODDS_API_IO_PROVIDER_ID

  protected async fetchWithApiKey(
    apiKey: string,
    context?: ProviderRequestContext
  ): Promise<ArbitrageOpportunity[]> {
    const httpFetch = (globalThis as any).fetch as
      | ((
          input: string,
          init?: {
            method?: string
            headers?: Record<string, string>
          }
        ) => Promise<{
          ok: boolean
          status: number
          json(): Promise<unknown>
          text(): Promise<string>
        }>)
      | undefined

    const correlationId = context?.correlationId ?? createCorrelationId()
    const startedAt = Date.now()
    let responseStatus: number | undefined

    if (typeof httpFetch !== 'function') {
      const error = new Error('Global fetch is not available for Odds-API.io adapter')
      logError('adapter.call', {
        context: 'adapter:odds-api-io',
        operation: 'fetchOpportunities',
        providerId: this.id,
        correlationId,
        durationMs: Date.now() - startedAt,
        errorCategory: 'SystemError',
        success: false,
        message: error.message
      } satisfies StructuredLogBase)
      throw error
    }

    try {
      let selectedBookmakers = cachedSelectedBookmakers?.bookmakers ?? []
      const cacheAgeMs = cachedSelectedBookmakers ? Date.now() - cachedSelectedBookmakers.fetchedAtMs : Infinity

      if (!selectedBookmakers.length || cacheAgeMs > SELECTED_BOOKMAKERS_TTL_MS) {
        selectedBookmakers = await getSelectedBookmakers(apiKey)
        cachedSelectedBookmakers = { fetchedAtMs: Date.now(), bookmakers: selectedBookmakers }
      }

      if (!selectedBookmakers.length) {
        throw new Error(
          'No selected bookmakers configured. Select bookmakers in Settings (Odds-API.io bookmaker selection) and try again.'
        )
      }

      const url = new URL(ODDS_API_IO_ARBS_PATH, ODDS_API_IO_BASE_URL)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('bookmakers', selectedBookmakers.join(','))
      url.searchParams.set('includeEventDetails', 'true')
      url.searchParams.set('limit', '500') // Max limit to get all available opportunities

      const response = await httpFetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })

      responseStatus = response.status

      if (!response.ok) {
        const message = await response
          .text()
          .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
          .catch(() => `Odds-API.io request failed with status ${response.status}`)

        const error = new Error(message)
        ;(error as { status?: number }).status = response.status
        throw error
      }

      const body = (await response.json()) as unknown

      const rawBets: unknown[] = Array.isArray(body)
        ? body
        : Array.isArray((body as { data?: unknown[] }).data)
          ? (body as { data: unknown[] }).data
          : Array.isArray((body as { bets?: unknown[] }).bets)
            ? (body as { bets: unknown[] }).bets
            : []

      logInfo('adapter.debug', {
        context: 'adapter:odds-api-io',
        operation: 'fetchOpportunities',
        providerId: this.id,
        correlationId,
        durationMs: null,
        errorCategory: null,
        selectedBookmakersCount: selectedBookmakers.length,
        rawBetsCount: rawBets.length
      } satisfies StructuredLogBase)

      const nowIso = new Date().toISOString()

      const opportunities = rawBets
        .map((item) => normalizeOddsApiIoOpportunity(item as OddsApiIoRawArbitrageBet, nowIso))
        .filter((opportunity): opportunity is ArbitrageOpportunity =>
          opportunity !== null && opportunity.roi >= 0
        )

      const durationMs = Date.now() - startedAt

      logInfo('adapter.call', {
        context: 'adapter:odds-api-io',
        operation: 'fetchOpportunities',
        providerId: this.id,
        correlationId,
        durationMs,
        errorCategory: null,
        success: true,
        httpStatus: responseStatus,
        opportunitiesCount: opportunities.length,
        endpoint: ODDS_API_IO_ARBS_PATH
      } satisfies StructuredLogBase)

      return opportunities
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const status =
        responseStatus ??
        (error as { status?: number }).status ??
        (error as { statusCode?: number }).statusCode ??
        (error as { response?: { status?: number } }).response?.status

      logError('adapter.call', {
        context: 'adapter:odds-api-io',
        operation: 'fetchOpportunities',
        providerId: this.id,
        correlationId,
        durationMs,
        errorCategory: typeof status === 'number' && status >= 400 ? 'ProviderError' : 'SystemError',
        success: false,
        httpStatus: status,
        message: (error as Error)?.message ?? 'Odds-API.io adapter error',
        endpoint: ODDS_API_IO_ARBS_PATH
      } satisfies StructuredLogBase)

      throw error
    }
  }
}
