import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { BaseArbitrageAdapter } from './base'
import type { ProviderRequestContext } from '../services/poller'
import { createCorrelationId, logError, logInfo, type StructuredLogBase } from '../services/logger'

export interface OddsApiIoArbitrageBet {
  id: string
  sport: string
  event: {
    name: string
    date: string
    league: string
  }
  legs: [
    {
      bookmaker: string
      market: string
      odds: number
      outcome: string
    },
    {
      bookmaker: string
      market: string
      odds: number
      outcome: string
    }
  ]
  roi: number
}

export function normalizeOddsApiIoOpportunity(
  raw: OddsApiIoArbitrageBet,
  foundAt: string = new Date().toISOString()
): ArbitrageOpportunity {
  return {
    id: raw.id,
    sport: raw.sport,
    event: {
      name: raw.event.name,
      date: raw.event.date,
      league: raw.event.league
    },
    legs: raw.legs,
    roi: raw.roi,
    foundAt
  }
}

const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_ARBS_PATH = '/v3/arbitrage-bets'

const ODDS_API_IO_PROVIDER_ID: ProviderId = 'odds-api-io'

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
      const url = new URL(ODDS_API_IO_ARBS_PATH, ODDS_API_IO_BASE_URL)
      url.searchParams.set('apiKey', apiKey)

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

      const nowIso = new Date().toISOString()

      const opportunities = rawBets
        .map((item) => normalizeOddsApiIoOpportunity(item as OddsApiIoArbitrageBet, nowIso))
        .filter((opportunity) => opportunity.roi >= 0)

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
