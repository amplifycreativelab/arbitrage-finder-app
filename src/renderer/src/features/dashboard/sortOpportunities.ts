import type { ArbitrageOpportunity } from '../../../../../shared/types'
import type { FeedSortDirection, FeedSortKey } from './stores/feedStore'

function getTimeValue(opportunity: ArbitrageOpportunity): number {
  const source = opportunity.event.date || opportunity.foundAt
  const value = Date.parse(source)
  return Number.isNaN(value) ? 0 : value
}

/**
 * Story 7.8: Get numeric value for trend sorting
 * improving (2) > stable (1) > worsening (0) > undefined (-1)
 */
function getTrendValue(trend: string | undefined): number {
  switch (trend) {
    case 'improving':
      return 2
    case 'stable':
      return 1
    case 'worsening':
      return 0
    default:
      return -1
  }
}

export function sortOpportunities(
  opportunities: ArbitrageOpportunity[] | undefined | null,
  sortBy: FeedSortKey,
  direction: FeedSortDirection
): ArbitrageOpportunity[] {
  if (!Array.isArray(opportunities)) {
    return []
  }

  const factor = direction === 'asc' ? 1 : -1

  return [...opportunities].sort((a, b) => {
    if (sortBy === 'roi') {
      return (a.roi - b.roi) * factor
    }

    // Story 7.8: Sort by trend
    if (sortBy === 'trend') {
      return (getTrendValue(a.oddsTrend) - getTrendValue(b.oddsTrend)) * factor
    }

    return (getTimeValue(a) - getTimeValue(b)) * factor
  })
}

