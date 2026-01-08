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

// ============================================================
// Multi-provider deduplication (Story 5.2)
// ============================================================

/**
 * Generate a semantic deduplication key for an opportunity.
 *
 * The key is composed of: eventName + eventDate + league + sorted(outcomes + markets).
 * This ensures the same opportunity from different providers produces the same key,
 * enabling cross-provider deduplication.
 *
 * @param opp - The arbitrage opportunity to generate a key for
 * @returns A string key uniquely identifying this opportunity semantically
 *
 * @example
 * // Two opportunities from different providers with same match:
 * getDeduplicationKey(oppFromProvider1) === getDeduplicationKey(oppFromProvider2)
 */
function getDeduplicationKey(opp: ArbitrageOpportunity): string {
  // Sort outcomes to ensure consistent key regardless of legs order
  const sortedOutcomes = opp.legs
    .map((leg) => `${leg.outcome}:${leg.market}`)
    .sort()
    .join('|')

  return `${opp.event.name}|${opp.event.date}|${opp.event.league}|${sortedOutcomes}`
}

/**
 * Select the best opportunity from a group of duplicates.
 *
 * Strategy:
 * 1. Prefer highest ROI
 * 2. If ROI is equal, first-seen wins (guaranteed by explicit stable sort)
 *
 * Sets `mergedFrom` to track all source providers.
 *
 * @param opps - Array of duplicate opportunities (same semantic key)
 * @returns The best opportunity with `mergedFrom` populated if multiple sources
 */
function selectBestOpportunity(opps: ArbitrageOpportunity[]): ArbitrageOpportunity {
  if (opps.length === 1) {
    return opps[0]
  }

  // Explicit stable sort: highest ROI first, original index as tiebreaker
  // This guarantees first-seen wins on ROI ties regardless of JS engine sort stability
  const sorted = opps
    .map((o, i) => ({ o, i }))
    .sort((a, b) => b.o.roi - a.o.roi || a.i - b.i)
    .map((x) => x.o)

  const best = sorted[0]

  // Track all source providers
  const allProviders = opps.map((o) => o.providerId).filter((id): id is ProviderId => !!id)

  // Use Set to deduplicate provider IDs (in case same provider appears multiple times)
  const uniqueProviders = [...new Set(allProviders)]

  return {
    ...best,
    mergedFrom: uniqueProviders.length > 1 ? uniqueProviders : undefined
  }
}

/**
 * Deduplicate opportunities from multiple providers.
 * Uses semantic key matching to identify duplicate opportunities across providers.
 * Prefers highest ROI when duplicates are found; if ROI is equal, first-seen wins.
 * Tracks all source providers via `mergedFrom` field.
 *
 * @param opportunities - Array of opportunities from all enabled providers
 * @returns Deduplicated array with `mergedFrom` set for merged opportunities
 */
export function deduplicateOpportunities(
  opportunities: ArbitrageOpportunity[]
): ArbitrageOpportunity[] {
  if (opportunities.length === 0) {
    return []
  }

  // Group by deduplication key
  const grouped = new Map<string, ArbitrageOpportunity[]>()

  for (const opp of opportunities) {
    const key = getDeduplicationKey(opp)
    const existing = grouped.get(key)
    if (existing) {
      existing.push(opp)
    } else {
      grouped.set(key, [opp])
    }
  }

  // Select best from each group
  const result: ArbitrageOpportunity[] = []
  for (const group of grouped.values()) {
    result.push(selectBestOpportunity(group))
  }

  // Validate all opportunities pass schema
  return arbitrageOpportunityListSchema.parse(result)
}

/**
 * Compute deduplication statistics for logging.
 */
export function getDeduplicationStats(
  originalCount: number,
  deduplicatedCount: number
): { totalOpportunities: number; uniqueOpportunities: number; duplicatesRemoved: number } {
  return {
    totalOpportunities: originalCount,
    uniqueOpportunities: deduplicatedCount,
    duplicatesRemoved: originalCount - deduplicatedCount
  }
}

