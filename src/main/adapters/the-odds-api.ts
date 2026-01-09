import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { BaseArbitrageAdapter } from './base'
import { calculateTwoLegArbitrageRoi } from '../services/calculator'
import type { ProviderRequestContext } from '../services/poller'
import { createCorrelationId, logError, logInfo, type StructuredLogBase } from '../services/logger'

export interface TheOddsApiMarket {
  id: string
  sport: string
  eventName: string
  eventDate: string
  league: string
  market: string
  homeBookmaker: string
  homeOdds: number
  awayBookmaker: string
  awayOdds: number
}

interface TheOddsApiOutcome {
  name: string
  price: number
}

interface TheOddsApiMarketFragment {
  key: string
  outcomes?: TheOddsApiOutcome[]
}

interface TheOddsApiBookmakerFragment {
  key: string
  title?: string
  markets?: TheOddsApiMarketFragment[]
}

interface TheOddsApiEventFragment {
  id: string
  sport_key?: string
  sport_title?: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers?: TheOddsApiBookmakerFragment[]
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function mapRawEventToMarkets(event: TheOddsApiEventFragment): TheOddsApiMarket[] {
  if (!Array.isArray(event.bookmakers) || !event.bookmakers.length) {
    return []
  }

  const sportKey = event.sport_key
  const sportTitle = event.sport_title

  let sport = ''
  if (typeof sportKey === 'string') {
    const lower = sportKey.toLowerCase()
    if (lower.startsWith('soccer')) {
      sport = 'soccer'
    } else if (lower.startsWith('tennis')) {
      sport = 'tennis'
    } else {
      sport = sportKey
    }
  } else if (typeof sportTitle === 'string') {
    sport = sportTitle
  }

  const markets: TheOddsApiMarket[] = []
  const eventName = `${event.home_team} vs ${event.away_team}`
  const league = event.sport_title ?? ''

  // H2H (Moneyline) candidates
  const h2hHomeCandidates: { bookmaker: string; odds: number }[] = []
  const h2hAwayCandidates: { bookmaker: string; odds: number }[] = []

  // BTTS candidates: Yes and No across bookmakers
  const bttsYesCandidates: { bookmaker: string; odds: number }[] = []
  const bttsNoCandidates: { bookmaker: string; odds: number }[] = []

  // Spreads candidates: Group by handicap point value
  // Key: point value (e.g., "0.5"), Value: { home: [], away: [] }
  const spreadsCandidates: Map<string, {
    home: { bookmaker: string; odds: number; point: number }[]
    away: { bookmaker: string; odds: number; point: number }[]
  }> = new Map()

  for (const bookmaker of event.bookmakers) {
    if (!Array.isArray(bookmaker.markets)) continue

    const bookmakerLabel = bookmaker.title || bookmaker.key

    // Process H2H market
    const h2hMarket = bookmaker.markets.find((m) => m.key === 'h2h')
    if (h2hMarket && Array.isArray(h2hMarket.outcomes)) {
      for (const outcome of h2hMarket.outcomes) {
        if (!isFinitePositive(outcome.price)) continue

        if (outcome.name === event.home_team) {
          h2hHomeCandidates.push({ bookmaker: bookmakerLabel, odds: outcome.price })
        } else if (outcome.name === event.away_team) {
          h2hAwayCandidates.push({ bookmaker: bookmakerLabel, odds: outcome.price })
        }
      }
    }

    // Process BTTS market
    const bttsMarket = bookmaker.markets.find((m) => m.key === 'btts')
    if (bttsMarket && Array.isArray(bttsMarket.outcomes)) {
      for (const outcome of bttsMarket.outcomes) {
        if (!isFinitePositive(outcome.price)) continue

        const outcomeName = outcome.name.toLowerCase()
        if (outcomeName === 'yes') {
          bttsYesCandidates.push({ bookmaker: bookmakerLabel, odds: outcome.price })
        } else if (outcomeName === 'no') {
          bttsNoCandidates.push({ bookmaker: bookmakerLabel, odds: outcome.price })
        }
      }
    }

    // Process Spreads market
    const spreadsMarket = bookmaker.markets.find((m) => m.key === 'spreads')
    if (spreadsMarket && Array.isArray(spreadsMarket.outcomes)) {
      for (const outcome of spreadsMarket.outcomes) {
        if (!isFinitePositive(outcome.price)) continue

        // outcomes have: name (team name), price, point (handicap value)
        const point = (outcome as { point?: number }).point
        if (typeof point !== 'number') continue

        // Asian Handicap Pairing Logic:
        // Use absolute point value as key for grouping opposite sides.
        // E.g., Home -0.5 pairs with Away +0.5 → both keyed as "0.5".
        // This ensures correct cross-bookmaker arbitrage detection where
        // one bookmaker offers Home -0.5 and another offers Away +0.5.
        const pointKey = Math.abs(point).toString()

        if (!spreadsCandidates.has(pointKey)) {
          spreadsCandidates.set(pointKey, { home: [], away: [] })
        }

        const group = spreadsCandidates.get(pointKey)!

        if (outcome.name === event.home_team) {
          group.home.push({ bookmaker: bookmakerLabel, odds: outcome.price, point })
        } else if (outcome.name === event.away_team) {
          group.away.push({ bookmaker: bookmakerLabel, odds: outcome.price, point })
        }
      }
    }
  }

  // Generate H2H opportunities (cross-bookmaker only)
  for (const home of h2hHomeCandidates) {
    for (const away of h2hAwayCandidates) {
      if (home.bookmaker === away.bookmaker) continue

      markets.push({
        id: `${event.id}:h2h:${home.bookmaker}:${away.bookmaker}`,
        sport,
        eventName,
        eventDate: event.commence_time,
        league,
        market: 'h2h',
        homeBookmaker: home.bookmaker,
        homeOdds: home.odds,
        awayBookmaker: away.bookmaker,
        awayOdds: away.odds
      })
    }
  }

  // Generate BTTS opportunities (cross-bookmaker only)
  // BTTS Yes from BookmakerA vs BTTS No from BookmakerB
  for (const yes of bttsYesCandidates) {
    for (const no of bttsNoCandidates) {
      if (yes.bookmaker === no.bookmaker) continue

      markets.push({
        id: `${event.id}:btts:${yes.bookmaker}:${no.bookmaker}`,
        sport,
        eventName,
        eventDate: event.commence_time,
        league,
        market: 'btts',
        homeBookmaker: yes.bookmaker,
        homeOdds: yes.odds,
        awayBookmaker: no.bookmaker,
        awayOdds: no.odds
      })
    }
  }

  // Generate Spreads opportunities (cross-bookmaker only, matching point values)
  // For each point value, pair home handicap with away handicap
  for (const [, group] of spreadsCandidates) {
    for (const home of group.home) {
      for (const away of group.away) {
        if (home.bookmaker === away.bookmaker) continue

        markets.push({
          id: `${event.id}:spreads:${home.point}:${home.bookmaker}:${away.bookmaker}`,
          sport,
          eventName,
          eventDate: event.commence_time,
          league,
          market: 'spreads',
          homeBookmaker: home.bookmaker,
          homeOdds: home.odds,
          awayBookmaker: away.bookmaker,
          awayOdds: away.odds
        })
      }
    }
  }

  return markets
}

function parseRawOddsResponse(body: unknown): TheOddsApiMarket[] {
  const items: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown[] }).data)
      ? ((body as { data: unknown[] }).data as unknown[])
      : []

  const markets: TheOddsApiMarket[] = []

  for (const item of items) {
    if (!item || typeof item !== 'object') continue

    const event = item as {
      id?: unknown
      sport_key?: unknown
      sport_title?: unknown
      commence_time?: unknown
      home_team?: unknown
      away_team?: unknown
      bookmakers?: unknown
    }

    if (
      typeof event.id !== 'string' ||
      typeof event.commence_time !== 'string' ||
      typeof event.home_team !== 'string' ||
      typeof event.away_team !== 'string'
    ) {
      continue
    }

    const bookmakersArray = Array.isArray(event.bookmakers)
      ? (event.bookmakers as TheOddsApiBookmakerFragment[])
      : []

    const typedEvent: TheOddsApiEventFragment = {
      id: event.id,
      sport_key: typeof event.sport_key === 'string' ? event.sport_key : undefined,
      sport_title: typeof event.sport_title === 'string' ? event.sport_title : undefined,
      commence_time: event.commence_time,
      home_team: event.home_team,
      away_team: event.away_team,
      bookmakers: bookmakersArray
    }

    markets.push(...mapRawEventToMarkets(typedEvent))
  }

  return markets
}

export function normalizeTheOddsApiMarket(
  raw: TheOddsApiMarket,
  foundAt: string = new Date().toISOString()
): ArbitrageOpportunity | null {
  const roi = calculateTwoLegArbitrageRoi(raw.homeOdds, raw.awayOdds)

  if (roi <= 0) {
    return null
  }

  // BTTS markets use yes/no outcomes; others use home/away
  const isBtts = raw.market === 'btts'
  const leg1Outcome = isBtts ? 'yes' : 'home'
  const leg2Outcome = isBtts ? 'no' : 'away'

  return {
    id: raw.id,
    sport: raw.sport,
    event: {
      name: raw.eventName,
      date: raw.eventDate,
      league: raw.league
    },
    legs: [
      {
        bookmaker: raw.homeBookmaker,
        market: raw.market,
        odds: raw.homeOdds,
        outcome: leg1Outcome
      },
      {
        bookmaker: raw.awayBookmaker,
        market: raw.market,
        odds: raw.awayOdds,
        outcome: leg2Outcome
      }
    ],
    roi,
    foundAt
  }
}

const THE_ODDS_API_BASE_URL = 'https://api.the-odds-api.com'
const THE_ODDS_API_ODDS_PATH = '/v4/sports/soccer/odds'
// The-Odds-API.com only supports h2h for soccer odds endpoint
// (btts and spreads cause 422 INVALID_MARKET errors)
const THE_ODDS_API_MARKETS = ['h2h'] as const
const THE_ODDS_API_REGIONS = ['eu'] as const

const THE_ODDS_API_PROVIDER_ID: ProviderId = 'the-odds-api'

export class TheOddsApiAdapter extends BaseArbitrageAdapter {
  readonly id = THE_ODDS_API_PROVIDER_ID

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
      const error = new Error('Global fetch is not available for The-Odds-API.com adapter')
      logError('adapter.call', {
        context: 'adapter:the-odds-api',
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
      const url = new URL(THE_ODDS_API_ODDS_PATH, THE_ODDS_API_BASE_URL)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('regions', THE_ODDS_API_REGIONS.join(','))
      url.searchParams.set('markets', THE_ODDS_API_MARKETS.join(','))

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
          .then((text) => text || `The-Odds-API.com request failed with status ${response.status}`)
          .catch(() => `The-Odds-API.com request failed with status ${response.status}`)

        const error = new Error(message) as { status?: number }
        error.status = response.status
        throw error
      }

      const body = await response.json()
      const markets = parseRawOddsResponse(body)
      const nowIso = new Date().toISOString()

      const opportunities = markets
        .map((market) => normalizeTheOddsApiMarket(market, nowIso))
        .filter((opportunity): opportunity is ArbitrageOpportunity => opportunity !== null)

      const durationMs = Date.now() - startedAt

      logInfo('adapter.call', {
        context: 'adapter:the-odds-api',
        operation: 'fetchOpportunities',
        providerId: this.id,
        correlationId,
        durationMs,
        errorCategory: null,
        success: true,
        httpStatus: responseStatus,
        opportunitiesCount: opportunities.length,
        endpoint: THE_ODDS_API_ODDS_PATH
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
        context: 'adapter:the-odds-api',
        operation: 'fetchOpportunities',
        providerId: this.id,
        correlationId,
        durationMs,
        errorCategory: typeof status === 'number' && status >= 400 ? 'ProviderError' : 'SystemError',
        success: false,
        httpStatus: status,
        message: (error as Error)?.message ?? 'The-Odds-API.com adapter error',
        endpoint: THE_ODDS_API_ODDS_PATH
      } satisfies StructuredLogBase)

      throw error
    }
  }
}
