import type { ArbitrageOpportunity, MarketGroup, MarketMetadata } from '../../../../../shared/types'
import { inferMarketMetadata, MARKET_GROUPS } from '../../../../../shared/types'
import type { RegionCode } from '../../../../../shared/filters'

export type SportFilterValue = 'soccer' | 'tennis'

/**
 * Legacy market filter values for backward compatibility.
 * Maps to the 5 original market categories.
 */
export type MarketFilterValue = 'moneyline' | 'draw-no-bet' | 'totals' | 'btts' | 'handicap'

/**
 * Re-export MarketGroup from shared types for convenience.
 */
export type { MarketGroup, MarketMetadata }

export const ALL_REGION_CODES: RegionCode[] = ['AU', 'UK', 'IT', 'RO']

export const ALL_SPORT_FILTERS: SportFilterValue[] = ['soccer', 'tennis']

/**
 * Legacy market filters (5 original categories).
 */
export const ALL_MARKET_FILTERS: MarketFilterValue[] = [
  'moneyline',
  'draw-no-bet',
  'totals',
  'btts',
  'handicap'
]

/**
 * All market groups for group-based filtering (Story 6.1).
 */
export const ALL_MARKET_GROUPS: MarketGroup[] = [...MARKET_GROUPS]

/**
 * Maps legacy MarketFilterValue to corresponding MarketGroup.
 */
export const LEGACY_MARKET_TO_GROUP: Record<MarketFilterValue, MarketGroup> = {
  moneyline: 'goals',
  'draw-no-bet': 'goals',
  totals: 'goals',
  btts: 'goals',
  handicap: 'handicap'
}

export interface DashboardFilterState {
  regions: RegionCode[]
  sports: SportFilterValue[]
  /**
   * Legacy market filters (5 categories) for backward compatibility.
   */
  markets: MarketFilterValue[]
  /**
   * Market groups for new group-based filtering (Story 6.1).
   * When set, filters by market group instead of legacy categories.
   * Optional to maintain backward compatibility.
   */
  marketGroups?: MarketGroup[]
  /**
   * When empty, no bookmaker filtering is applied.
   * When non-empty, only opportunities involving at least one of the selected
   * bookmakers are shown.
   */
  bookmakers: string[]
  /**
   * Internal persistence map for bookmaker selections per region combination.
   * Key: Comma-separated sorted region codes.
   * Value: Selected bookmakers for that region combination.
   */
  bookmakerSelections?: Record<string, string[]>
  /**
   * Minimum ROI threshold as a decimal (e.g., 0.03 for 3%).
   */
  minRoi: number
}

function normalizeLeague(value: string | undefined | null): string {
  return (value ?? '').toLowerCase()
}

export function inferRegionFromOpportunity(
  opportunity: ArbitrageOpportunity
): RegionCode | null {
  const league = normalizeLeague(opportunity.event.league)

  if (!league) {
    return null
  }

  // Italy
  if (
    league.includes('serie a') ||
    league.includes('serie b') ||
    league.includes('coppa italia') ||
    league.includes('supercoppa') ||
    league.includes('italy')
  ) {
    return 'IT'
  }

  // UK
  if (
    league.includes('wimbledon') ||
    league.includes('premier league') ||
    league.includes('epl') ||
    league.includes('championship') ||
    league.includes('league one') ||
    league.includes('league two') ||
    league.includes('fa cup') ||
    league.includes('efl cup') ||
    league.includes('carabao cup') ||
    league.includes('england') ||
    league.includes('scotland') ||
    league.includes('premiership') // Scottish Premiership often just 'Premiership'
  ) {
    return 'UK'
  }

  // Australia
  if (
    league.includes('a-league') ||
    league.includes('a league') ||
    league.includes('ffa cup') ||
    league.includes('australia')
  ) {
    return 'AU'
  }

  // Romania
  if (
    league.includes('liga i') ||
    league.includes('liga 1') ||
    league.includes('cupa romaniei') ||
    league.includes('romania')
  ) {
    return 'RO'
  }

  // Fallback: If no specific region detected, return null.
  // BUT: logic in getAvailableBookmakers only skips if region IS detected and doesn't match.
  // If region is null (unknown), stricter filtering might be safer, OR permissive?
  // Current logic: `if (!region || !regions.includes(region))`
  // This means Unknown regions are ALWAYS HIDDEN when filtering is active.
  // This is safe but hides data.
  // Let's keep it safe for now, as user explicitly selected "UK", "Italy" etc.
  return null
}

export function inferMarketTypeFromOpportunity(
  opportunity: ArbitrageOpportunity
): MarketFilterValue | null {
  const primaryMarket = opportunity.legs[0]?.market ?? ''
  const normalized = primaryMarket.toLowerCase()

  // Moneyline / H2H variants
  if (normalized === 'moneyline' || normalized === 'match-winner' || normalized === 'h2h') {
    return 'moneyline'
  }

  // Draw No Bet variants
  if (
    normalized === 'draw-no-bet' ||
    normalized === 'draw no bet' ||
    normalized === 'dnb'
  ) {
    return 'draw-no-bet'
  }

  // Totals / Over-Under variants
  if (
    normalized === 'totals' ||
    normalized === 'over/under' ||
    normalized === 'over_under'
  ) {
    return 'totals'
  }

  // BTTS (Both Teams To Score) variants
  if (
    normalized === 'btts' ||
    normalized === 'both-teams-to-score' ||
    normalized === 'both_teams_to_score' ||
    normalized === 'btts_yes' ||
    normalized === 'btts_no' ||
    normalized === 'both_teams_score' ||
    normalized === 'both teams to score'
  ) {
    return 'btts'
  }

  // Handicap / Spread / Asian Handicap variants
  if (
    normalized === 'handicap' ||
    normalized === 'spread' ||
    normalized === 'spreads' ||
    normalized === 'asian_handicap' ||
    normalized === 'asian handicap' ||
    normalized === 'ah' ||
    normalized === '0-handicap' ||
    normalized === 'handicap_0' ||
    normalized === 'handicap 0' ||
    normalized.startsWith('spreads_')
  ) {
    return 'handicap'
  }

  return null
}

/**
 * Gets rich market metadata from an opportunity (Story 6.1).
 * Uses the new inferMarketMetadata from shared types for group-based categorization.
 */
export function getMarketMetadataFromOpportunity(
  opportunity: ArbitrageOpportunity
): MarketMetadata {
  const primaryMarket = opportunity.legs[0]?.market ?? ''
  return inferMarketMetadata(primaryMarket)
}

/**
 * Gets the market group for an opportunity (Story 6.1).
 * Convenience function for group-based filtering.
 */
export function getMarketGroupFromOpportunity(
  opportunity: ArbitrageOpportunity
): MarketGroup {
  return getMarketMetadataFromOpportunity(opportunity).group
}

function arraysMatchIgnoringOrder<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false
  return b.every((value) => a.includes(value))
}

export function applyDashboardFilters(
  opportunities: ArbitrageOpportunity[] | undefined | null,
  filters: DashboardFilterState
): ArbitrageOpportunity[] {
  const source = Array.isArray(opportunities) ? opportunities : []
  const regions = Array.isArray(filters.regions) ? filters.regions : []
  const sports = Array.isArray(filters.sports) ? filters.sports : []
  const markets = Array.isArray(filters.markets) ? filters.markets : []
  const marketGroups = Array.isArray(filters.marketGroups) ? filters.marketGroups : []
  const bookmakers = Array.isArray(filters.bookmakers) ? filters.bookmakers : []
  const minRoi = Number.isFinite(filters.minRoi) && filters.minRoi > 0 ? filters.minRoi : 0

  const hasSportFilter = !arraysMatchIgnoringOrder(sports, ALL_SPORT_FILTERS)
  const hasRegionFilter = !arraysMatchIgnoringOrder(regions, ALL_REGION_CODES)
  const hasLegacyMarketFilter = !arraysMatchIgnoringOrder(markets, ALL_MARKET_FILTERS)
  // New: Group-based market filtering (Story 6.1)
  const hasMarketGroupFilter = marketGroups.length > 0 && !arraysMatchIgnoringOrder(marketGroups, ALL_MARKET_GROUPS)
  const hasBookmakerFilter = bookmakers.length > 0
  const hasRoiFilter = minRoi > 0

  // Use group filter if provided, otherwise fall back to legacy filter
  const hasMarketFilter = hasMarketGroupFilter || hasLegacyMarketFilter

  if (
    !hasSportFilter &&
    !hasRegionFilter &&
    !hasMarketFilter &&
    !hasBookmakerFilter &&
    !hasRoiFilter
  ) {
    return source
  }

  return source.filter((opportunity) => {
    if (hasSportFilter && !sports.includes(opportunity.sport as SportFilterValue)) {
      return false
    }

    if (hasRegionFilter) {
      const region = inferRegionFromOpportunity(opportunity)
      if (!region || !regions.includes(region)) {
        return false
      }
    }

    // Market filtering: prefer group-based if available, otherwise use legacy
    if (hasMarketFilter) {
      if (hasMarketGroupFilter) {
        // New: Group-based filtering (Story 6.1)
        const opportunityGroup = getMarketGroupFromOpportunity(opportunity)
        if (!marketGroups.includes(opportunityGroup)) {
          return false
        }
      } else if (hasLegacyMarketFilter) {
        // Legacy: 5-category filtering
        const marketType = inferMarketTypeFromOpportunity(opportunity)
        if (!marketType || !markets.includes(marketType)) {
          return false
        }
      }
    }

    if (hasBookmakerFilter) {
      const involvedBookmakers = opportunity.legs.map((leg) => leg.bookmaker)
      const matchesBookmaker = involvedBookmakers.some((name) => bookmakers.includes(name))
      if (!matchesBookmaker) {
        return false
      }
    }

    if (hasRoiFilter && opportunity.roi < minRoi) {
      return false
    }

    return true
  })
}

export function getAvailableBookmakers(
  opportunities: ArbitrageOpportunity[],
  regions: RegionCode[]
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  const hasRegionFilter =
    regions.length !== ALL_REGION_CODES.length ||
    !ALL_REGION_CODES.every((code) => regions.includes(code))

  for (const opportunity of opportunities) {
    const region = inferRegionFromOpportunity(opportunity)

    if (hasRegionFilter) {
      if (!region || !regions.includes(region)) {
        continue
      }
    }

    for (const leg of opportunity.legs) {
      const name = leg.bookmaker
      if (!seen.has(name)) {
        seen.add(name)
        result.push(name)
      }
    }
  }

  return result.sort((a, b) => a.localeCompare(b))
}

