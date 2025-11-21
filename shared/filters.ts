import type { ArbitrageOpportunity } from './types'

export type RegionCode = 'AU' | 'UK' | 'IT' | 'RO'

export interface OpportunityFilters {
  sports?: string[]
  regions?: RegionCode[]
}

export type RegionResolver = (opportunity: ArbitrageOpportunity) => RegionCode | null | undefined

export function filterOpportunitiesByRegionAndSport(
  opportunities: ArbitrageOpportunity[],
  filters: OpportunityFilters,
  resolveRegion?: RegionResolver
): ArbitrageOpportunity[] {
  const sports = filters.sports ?? []
  const regions = filters.regions ?? []

  return opportunities.filter((opportunity) => {
    if (sports.length > 0 && !sports.includes(opportunity.sport)) {
      return false
    }

    if (regions.length > 0) {
      const region = resolveRegion ? resolveRegion(opportunity) : null
      if (!region || !regions.includes(region)) {
        return false
      }
    }

    return true
  })
}

