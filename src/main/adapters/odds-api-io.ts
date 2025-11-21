import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { BaseArbitrageAdapter } from './base'

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

const ODDS_API_IO_PROVIDER_ID: ProviderId = 'odds-api-io'

export class OddsApiIoAdapter extends BaseArbitrageAdapter {
  readonly id = ODDS_API_IO_PROVIDER_ID

  // Real HTTP integration is implemented in later Epic 2 stories.
  protected async fetchWithApiKey(_apiKey: string): Promise<ArbitrageOpportunity[]> {
    return []
  }
}
