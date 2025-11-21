import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { BaseArbitrageAdapter } from './base'
import { calculateTwoLegArbitrageRoi } from '../services/calculator'

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

export function normalizeTheOddsApiMarket(
  raw: TheOddsApiMarket,
  foundAt: string = new Date().toISOString()
): ArbitrageOpportunity | null {
  const roi = calculateTwoLegArbitrageRoi(raw.homeOdds, raw.awayOdds)

  if (roi <= 0) {
    return null
  }

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
        outcome: 'home'
      },
      {
        bookmaker: raw.awayBookmaker,
        market: raw.market,
        odds: raw.awayOdds,
        outcome: 'away'
      }
    ],
    roi,
    foundAt
  }
}

const THE_ODDS_API_PROVIDER_ID: ProviderId = 'the-odds-api'

export class TheOddsApiAdapter extends BaseArbitrageAdapter {
  readonly id = THE_ODDS_API_PROVIDER_ID

  // Real HTTP integration is implemented in later Epic 2 stories.
  protected async fetchWithApiKey(_apiKey: string): Promise<ArbitrageOpportunity[]> {
    return []
  }
}
