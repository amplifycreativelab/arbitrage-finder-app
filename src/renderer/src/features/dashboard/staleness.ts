import type { ArbitrageOpportunity } from '../../../../../shared/types'

export interface StalenessInfo {
  label: string
  isStale: boolean
}

export const STALE_THRESHOLD_MINUTES = 5
const JUST_NOW_THRESHOLD_SECONDS = 30

export function getStalenessInfo(
  opportunity: Pick<ArbitrageOpportunity, 'foundAt'>,
  nowMs: number
): StalenessInfo {
  const parsed = Date.parse(opportunity.foundAt)

  if (Number.isNaN(parsed)) {
    return {
      label: '',
      isStale: false
    }
  }

  const ageMs = Math.max(0, nowMs - parsed)
  const ageSeconds = Math.floor(ageMs / 1000)
  const ageMinutes = Math.floor(ageSeconds / 60)

  if (ageSeconds < JUST_NOW_THRESHOLD_SECONDS) {
    return {
      label: 'Just now',
      isStale: false
    }
  }

  if (ageSeconds < 60) {
    return {
      label: `${ageSeconds}s ago`,
      isStale: false
    }
  }

  if (ageMinutes < STALE_THRESHOLD_MINUTES) {
    return {
      label: `${ageMinutes}m ago`,
      isStale: false
    }
  }

  return {
    label: '5m+',
    isStale: true
  }
}

