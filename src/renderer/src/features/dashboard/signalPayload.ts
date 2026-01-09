import { format, parseISO } from 'date-fns'

import type { ArbitrageOpportunity, ProviderMetadata } from '../../../../../shared/types'

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

function formatMarketLabel(raw: string): string {
  const value = raw.trim().toLowerCase()

  if (value === 'moneyline' || value === 'h2h' || value === 'match-winner') {
    return 'Moneyline'
  }

  if (value === 'draw-no-bet' || value === 'dnb') {
    return 'Draw No Bet'
  }

  if (value === 'totals' || value === 'over/under' || value === 'over_under') {
    return 'Totals'
  }

  if (
    value === 'btts' ||
    value === 'both-teams-to-score' ||
    value === 'both_teams_to_score' ||
    value === 'both teams to score' ||
    value === 'btts_yes' ||
    value === 'btts_no' ||
    value === 'both_teams_score'
  ) {
    return 'BTTS (Both Teams to Score)'
  }

  if (
    value === 'handicap' ||
    value === 'spreads' ||
    value === 'spread' ||
    value === 'asian_handicap' ||
    value === 'asian handicap' ||
    value === 'ah' ||
    value === '0-handicap' ||
    value === 'handicap_0' ||
    value === 'handicap 0' ||
    value.startsWith('spreads_')
  ) {
    return 'Handicap'
  }

  return raw
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

  const eventDateSource = opportunity.event.date || opportunity.foundAt
  const dateLabel = formatDisplayDate(eventDateSource)
  const timeLabel = formatDisplayTime(eventDateSource)
  const sportLabel = formatSportLabel(opportunity.sport)

  // Cross-provider header takes precedence (Story 5.4)
  if (opportunity.isCrossProvider) {
    const sourceProviders = opportunity.mergedFrom?.join(' + ') ?? 'Multiple Providers'
    lines.push('⚡ Cross-Provider Arbitrage')
    lines.push(`Sources: ${sourceProviders}`)
    lines.push('')
  } else {
    const providerLabel = provider?.displayName ?? provider?.label ?? ''
    if (providerLabel) {
      lines.push(providerLabel)
      lines.push('')
    }
  }

  const [firstLeg, secondLeg] = opportunity.legs

  const formatLeg = (leg: ArbitrageOpportunity['legs'][number]): string[] => {
    const bookmakerLabel = leg.bookmaker
    const marketLabel = formatMarketLabel(leg.market)
    const outcomeLabel = formatOutcomeLabel(leg.outcome)

    const leaguePrefix = opportunity.event.league ? `${opportunity.event.league} ` : ''

    return [
      bookmakerLabel,
      `${sportLabel} ${dateLabel}`.trim(),
      `${timeLabel} ${opportunity.event.name}`.trim(),
      `${leaguePrefix}${marketLabel}: ${outcomeLabel}`.trim(),
      leg.odds.toFixed(2)
    ]
  }

  lines.push(...formatLeg(firstLeg))
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(...formatLeg(secondLeg))

  const roiPercent = (opportunity.roi * 100).toFixed(1)
  lines.push('')
  lines.push(`ROI: ${roiPercent}%`)

  return lines.join('\n').trim()
}

