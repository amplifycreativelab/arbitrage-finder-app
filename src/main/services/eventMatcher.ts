/**
 * Event Matcher Service
 *
 * Story 5.4: Cross-Provider Arbitrage Aggregator
 *
 * This service provides functions to normalize event and team names,
 * enabling cross-provider matching of the same underlying fixture.
 */

import type { ArbitrageOpportunity, MarketQuote, ProviderId } from '../../../shared/types'

/**
 * Common suffixes to strip from team names for normalization.
 * Order matters: longer suffixes should be checked first to avoid partial matches.
 */
const TEAM_SUFFIXES = [
  ' football club',
  ' soccer club',
  ' fc',
  ' sc',
  ' cf',
  ' afc',
  ' ac'
] as const

/**
 * Common prefixes to strip from team names for normalization.
 */
const TEAM_PREFIXES = ['fc ', 'ac ', 'sc '] as const

/**
 * Normalize a team name to a canonical form for cross-provider matching.
 *
 * Transformations applied:
 * 1. Lowercase and trim
 * 2. Remove accents/diacritics (NFD normalization)
 * 3. Strip common prefixes (FC, AC, SC)
 * 4. Strip common suffixes (FC, SC, United, etc.)
 * 5. Collapse spaces
 *
 * NOTE: V1 does NOT expand abbreviations (e.g., "Man Utd" stays as "man utd")
 * because reliable abbreviation mapping requires curated data. This means
 * "Man Utd vs Liverpool" will NOT match "Manchester United vs Liverpool".
 * Cross-provider matching relies more on date+league similarity.
 *
 * @param name - Raw team name from provider
 * @returns Normalized team name
 *
 * @example
 * normalizeTeamName("Arsenal FC") // => "arsenal"
 * normalizeTeamName("FC Barcelona") // => "barcelona"
 * normalizeTeamName("Atlético Madrid") // => "atletico madrid"
 */
export function normalizeTeamName(name: string): string {
  if (!name || typeof name !== 'string') {
    return ''
  }

  // Step 1: Lowercase and trim
  let normalized = name.toLowerCase().trim()

  // Step 2: Remove accents/diacritics (NFD decomposes, then remove combining marks)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Step 3: Strip common prefixes
  for (const prefix of TEAM_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim()
      break // Only strip one prefix
    }
  }

  // Step 4: Strip common suffixes
  for (const suffix of TEAM_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length).trim()
      break // Only strip one suffix
    }
  }

  // Step 5: Final trim and collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Extract home and away team names from an event name.
 *
 * Handles common separators: " vs ", " v ", " - ", " @ "
 *
 * @param eventName - Full event name (e.g., "Arsenal FC vs Chelsea")
 * @returns Tuple of [homeTeam, awayTeam] or null if cannot parse
 */
export function extractTeamsFromEventName(
  eventName: string
): [string, string] | null {
  if (!eventName || typeof eventName !== 'string') {
    return null
  }

  // Common separators in order of preference
  const separators = [' vs ', ' v ', ' - ', ' @ ']

  for (const sep of separators) {
    const parts = eventName.split(sep)
    if (parts.length === 2) {
      const home = parts[0].trim()
      const away = parts[1].trim()
      if (home && away) {
        return [home, away]
      }
    }
  }

  return null
}

/**
 * Truncate a date string to the hour for tolerance-based matching.
 *
 * @param dateString - ISO date string
 * @returns Date truncated to hour in format "YYYY-MM-DDTHH" (UTC)
 */
export function truncateDateToHour(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return ''
    }
    // Format: YYYY-MM-DDTHH in UTC
    return date.toISOString().slice(0, 13)
  } catch {
    return ''
  }
}

/**
 * Generate a normalized event key for cross-provider matching.
 *
 * The key is composed of:
 * - Sorted normalized team names (alphabetically)
 * - Date truncated to hour (UTC)
 *
 * This ensures the same match from different providers produces the same key,
 * regardless of which team is listed as "home" or how dates are formatted.
 *
 * @param event - Event data with name, date, and league
 * @returns Normalized event key or null if cannot generate
 *
 * @example
 * generateEventKey({ name: "Arsenal FC vs Chelsea", date: "2025-01-15T15:00:00Z", league: "EPL" })
 * // => "arsenal|chelsea|2025-01-15T15"
 */
export function generateEventKey(event: {
  name: string
  date: string
  league: string
}): string | null {
  const teams = extractTeamsFromEventName(event.name)
  if (!teams) {
    return null
  }

  const [home, away] = teams
  const normalizedHome = normalizeTeamName(home)
  const normalizedAway = normalizeTeamName(away)

  if (!normalizedHome || !normalizedAway) {
    return null
  }

  // Sort alphabetically for consistent key regardless of home/away order
  const sortedTeams = [normalizedHome, normalizedAway].sort()

  const dateHour = truncateDateToHour(event.date)
  if (!dateHour) {
    return null
  }

  return `${sortedTeams[0]}|${sortedTeams[1]}|${dateHour}`
}

/**
 * Group arbitrage opportunities by their normalized event key.
 *
 * This enables finding the same underlying fixture across different providers.
 *
 * @param opps - Array of arbitrage opportunities from multiple providers
 * @returns Map of event key to opportunities sharing that key
 */
export function matchEventsByKey(
  opps: ArbitrageOpportunity[]
): Map<string, ArbitrageOpportunity[]> {
  const grouped = new Map<string, ArbitrageOpportunity[]>()

  for (const opp of opps) {
    const key = generateEventKey(opp.event)
    if (!key) {
      continue // Skip opportunities that can't be keyed
    }

    const existing = grouped.get(key)
    if (existing) {
      existing.push(opp)
    } else {
      grouped.set(key, [opp])
    }
  }

  return grouped
}

/**
 * Extract market quotes from a single arbitrage opportunity.
 *
 * Each leg of the opportunity becomes a separate quote, enabling
 * cross-provider combination of odds.
 *
 * @param opp - Arbitrage opportunity with 2 legs
 * @returns Array of market quotes (2 per opportunity)
 */
export function extractQuotesFromOpportunity(
  opp: ArbitrageOpportunity
): MarketQuote[] {
  const eventKey = generateEventKey(opp.event)
  if (!eventKey) {
    return []
  }

  const providerId = opp.providerId ?? ('unknown' as ProviderId)

  return opp.legs.map((leg) => ({
    eventKey,
    providerId,
    bookmaker: leg.bookmaker,
    market: leg.market,
    outcome: leg.outcome,
    odds: leg.odds,
    originalEventName: opp.event.name,
    originalEventDate: opp.event.date,
    originalLeague: opp.event.league,
    foundAt: opp.foundAt
  }))
}

/**
 * Extract all market quotes from multiple arbitrage opportunities.
 *
 * Flattens all legs into individual quotes and filters invalid ones.
 *
 * @param opps - Array of arbitrage opportunities
 * @returns Flat array of all valid market quotes
 */
export function extractAllQuotes(opps: ArbitrageOpportunity[]): MarketQuote[] {
  const quotes: MarketQuote[] = []

  for (const opp of opps) {
    const oppQuotes = extractQuotesFromOpportunity(opp)
    for (const quote of oppQuotes) {
      // Filter to valid quotes only
      if (
        quote.eventKey &&
        quote.bookmaker &&
        typeof quote.odds === 'number' &&
        Number.isFinite(quote.odds) &&
        quote.odds > 0
      ) {
        quotes.push(quote)
      }
    }
  }

  return quotes
}
