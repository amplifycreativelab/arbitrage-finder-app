import type { ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { arbitrageOpportunityListSchema } from '../../../shared/schemas'

export function calculateTwoLegArbitrageRoi(oddsA: number, oddsB: number): number {
  if (!Number.isFinite(oddsA) || !Number.isFinite(oddsB)) {
    return 0
  }

  if (oddsA <= 0 || oddsB <= 0) {
    return 0
  }

  const inverseSum = 1 / oddsA + 1 / oddsB

  if (inverseSum <= 0) {
    return 0
  }

  const roi = 1 - inverseSum

  return roi < 0 ? 0 : roi
}

export interface GoldenOddsSnapshot {
  id: string
  providerId: ProviderId
  sport: string
  description?: string
  eventName: string
  eventDate: string
  league: string
  market: string
  homeBookmaker: string
  homeOdds: number
  awayBookmaker: string
  awayOdds: number
}

export function calculateArbitrageFromSnapshots(
  snapshots: GoldenOddsSnapshot[],
  foundAt: string = new Date().toISOString()
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = []

  for (const snapshot of snapshots) {
    const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds)

    if (roi <= 0) continue

    const opportunity: ArbitrageOpportunity = {
      id: snapshot.id,
      sport: snapshot.sport,
      event: {
        name: snapshot.eventName,
        date: snapshot.eventDate,
        league: snapshot.league
      },
      legs: [
        {
          bookmaker: snapshot.homeBookmaker,
          market: snapshot.market,
          odds: snapshot.homeOdds,
          outcome: 'home'
        },
        {
          bookmaker: snapshot.awayBookmaker,
          market: snapshot.market,
          odds: snapshot.awayOdds,
          outcome: 'away'
        }
      ],
      roi,
      foundAt
    }

    opportunities.push(opportunity)
  }

  return arbitrageOpportunityListSchema.parse(opportunities)
}

export function mergeProviderOpportunities(
  snapshots: ArbitrageOpportunity[][]
): ArbitrageOpportunity[] {
  const validated = arbitrageOpportunityListSchema.parse(snapshots.flat())
  const seenIds = new Set<string>()
  const result: ArbitrageOpportunity[] = []

  for (const opportunity of validated) {
    if (seenIds.has(opportunity.id)) continue
    seenIds.add(opportunity.id)
    result.push(opportunity)
  }

  return result
}
