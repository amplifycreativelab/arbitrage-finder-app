import { format, parseISO } from 'date-fns'

import type { ArbitrageOpportunity, ProviderMetadata } from '../../../../../shared/types'
import { formatMarketLabelFromKey } from '../../../../../shared/types'

function formatDisplayDate(source: string | null | undefined): string {
  if (!source) {
    return ''
  }

  try {
    const date = parseISO(source)
    return format(date, 'dd/MM')
  } catch {
    return source
  }
}

function formatDisplayTime(source: string | null | undefined): string {
  if (!source) {
    return ''
  }

  try {
    const date = parseISO(source)
    return format(date, 'HH:mm')
  } catch {
    return source
  }
}

function formatSportLabel(raw: string): string {
  const value = raw.trim().toLowerCase()

  if (value === 'soccer' || value === 'football') {
    return 'Calcio'
  }

  if (value === 'tennis') {
    return 'Tennis'
  }

  return raw
}

/**
 * Formats a market key into a human-readable label.
 * Uses the centralized formatMarketLabelFromKey from shared types (Story 6.1).
 * Falls back to the raw value if no label is found.
 */
function formatMarketLabel(raw: string): string {
  const label = formatMarketLabelFromKey(raw)
  // If the label is identical to a title-cased version of the raw input,
  // it means formatMarketLabelFromKey didn't find a specific mapping
  // and just formatted the key - that's still valid output
  return label
}

function formatOutcomeLabel(raw: string): string {
  const value = raw.trim().toLowerCase()

  if (value === 'home') {
    return 'Home'
  }

  if (value === 'away') {
    return 'Away'
  }

  if (value === 'yes') {
    return 'Yes'
  }

  if (value === 'no') {
    return 'No'
  }

  return raw
}

export function formatSignalPayload(
  opportunity: ArbitrageOpportunity,
  provider: ProviderMetadata | null
): string {
  const lines: string[] = []
  const isDeepScan = opportunity.source === 'deepScan'

  const eventDateSource = opportunity.event.date || opportunity.foundAt
  const dateLabel = formatDisplayDate(eventDateSource)
  const timeLabel = formatDisplayTime(eventDateSource)
  const sportLabel = formatSportLabel(opportunity.sport)

  const [firstLeg, secondLeg] = opportunity.legs

  // Event header - clear event identification
  const eventName = opportunity.event.name
  const leagueLabel = opportunity.event.league || ''

  lines.push(`${eventName}`)
  lines.push(`${sportLabel} | ${leagueLabel} | ${dateLabel} ${timeLabel}`.replace(/\|\s*\|/g, '|').trim())
  lines.push('')

  // Cross-provider indicator or provider name
  if (opportunity.isCrossProvider) {
    const sourceProviders = opportunity.mergedFrom?.join(' + ') ?? 'Multiple Providers'
    lines.push(`⚡ Cross-Provider (${sourceProviders})`)
    lines.push('')
  } else {
    const providerLabel = provider?.displayName ?? provider?.label ?? ''
    let wroteSourceInfo = false

    if (isDeepScan) {
      lines.push('Source: Deep Scan')
      wroteSourceInfo = true
    }

    if (providerLabel) {
      lines.push(`Provider: ${providerLabel}`)
      wroteSourceInfo = true
    }

    if (wroteSourceInfo) {
      lines.push('')
    }
  }

  // Format legs in clear tabular format: Odds @ Bookmaker | Market → Selection
  const formatLegLine = (leg: ArbitrageOpportunity['legs'][number]): string => {
    const marketLabel = formatMarketLabel(leg.market)
    const outcomeLabel = formatOutcomeLabel(leg.outcome)
    return `${leg.odds.toFixed(2)} @ ${leg.bookmaker}`
      + `\n    ${marketLabel} → ${outcomeLabel}`
  }

  lines.push(`Side A:`)
  lines.push(formatLegLine(firstLeg))
  lines.push('')
  lines.push(`Side B:`)
  lines.push(formatLegLine(secondLeg))

  // ROI with clear percentage
  const roiPercent = (opportunity.roi * 100).toFixed(2)
  lines.push('')
  lines.push(`ROI: ${roiPercent}%`)

  return lines.join('\n').trim()
}
