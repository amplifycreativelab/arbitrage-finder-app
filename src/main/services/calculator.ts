import type { ArbitrageOpportunity } from '../../../shared/types'
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
