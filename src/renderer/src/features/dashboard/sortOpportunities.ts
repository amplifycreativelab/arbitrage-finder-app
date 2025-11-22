import type { ArbitrageOpportunity } from '../../../../../shared/types'
import type { FeedSortDirection, FeedSortKey } from './stores/feedStore'

function getTimeValue(opportunity: ArbitrageOpportunity): number {
  const source = opportunity.event.date || opportunity.foundAt
  const value = Date.parse(source)
  return Number.isNaN(value) ? 0 : value
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

    return (getTimeValue(a) - getTimeValue(b)) * factor
  })
}

