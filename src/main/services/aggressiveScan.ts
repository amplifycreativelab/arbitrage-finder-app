/**
 * Story 8.7: Aggressive Pre-Match Scanning with Quota Maximization
 *
 * This module implements tiered event polling with quota-aware scheduling:
 * - Events are categorized into tiers based on time-to-kickoff
 * - Each tier gets a weighted portion of the API quota budget
 * - Imminent events get aggressive polling (30-60 seconds)
 * - Arb-triggered boosts temporarily increase polling priority
 */

import {
  type EventTier,
  type TieredEvent,
  type CachedEventWithOdds,
  type TierBudget,
  type QuotaBudget,
  type EventBoostInfo,
  type AggressiveScanStats,
  type AggressiveScanConfig,
  type ColdStartProgress,
  type TieredPollResult,
  type RawOddsPayload,
  DEFAULT_TIER_CONFIGS,
  DEFAULT_AGGRESSIVE_SCAN_CONFIG
} from '../../../shared/types'
import {
  type QuotaConfig,
  createQuotaConfig,
  type ApiPlanTier
} from '../../../shared/aggressiveScanPresets'
import {
  discoverEventsForEnabledLeagues,
  getEnabledLeaguesFilter,
  getEnabledSportsFilter,
  type DeepScanEvent
} from './deepScan'
import {
  logInfo,
  logWarn,
  logDebug,
  logError,
  createCorrelationId,
  type StructuredLogBase
} from './logger'
import { getSelectedBookmakers } from './odds-api-io-bookmakers'
import { calculateTwoLegArbitrageRoi } from './calculator'
import { net } from 'electron'
import { getApiKeyForAdapter } from '../credentials'

// ============================================================================
// Constants
// ============================================================================

// Default hourly limit - will be overridden by quotaConfig if set
let HOURLY_REQUEST_LIMIT = 5000
const DEFAULT_BUFFER_PERCENT = 20

// User's quota configuration
let quotaConfig: QuotaConfig = createQuotaConfig('paid')
const MAX_ODDS_HISTORY_SNAPSHOTS = 3
const BATCH_SIZE_MAX = 10
const BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes - ONLY for bookmaker LIST

// API Configuration
const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi'
const BATCH_DELAY_MS = 100 // Delay between batch requests to avoid rate limiting
const MAX_BOOKMAKERS_PER_REQUEST = 30 // API limit for bookmakers parameter
const TIER_PROMOTION_INTERVAL_MS = 30000 // Check for tier promotions every 30 seconds
const EVENT_EVICT_AFTER_MINUTES = 30 // Remove finished events after 30 minutes

// Story 9.5.5: Event discovery interval is configurable via config.eventDiscoveryIntervalMinutes

// ============================================================================
// State
// ============================================================================

let config: AggressiveScanConfig = { ...DEFAULT_AGGRESSIVE_SCAN_CONFIG }
let isRunning = false
let abortController: AbortController | null = null
let correlationId: string | null = null

// Event caches
const tieredEventCache = new Map<EventTier, Map<string, TieredEvent>>()
const oddsCache = new Map<string, CachedEventWithOdds>()
const boostedEvents = new Map<string, EventBoostInfo>()

// Quota tracking
let quotaBudget: QuotaBudget | null = null
let hourStartedAt: number = Date.now()
// Use hourStartedAt to track quota window (will be used for window reset detection)
void hourStartedAt
let pollsThisHour = 0
let arbsFoundThisHour = 0
let arbsFoundTotal = 0
let totalPollLatencyMs = 0
let lastPollAt: string | null = null
let scanStartedAt: string | null = null

// Tier promotion timer
let tierPromotionTimer: ReturnType<typeof setInterval> | null = null

// Polling loops
const tierPollTimers = new Map<EventTier, ReturnType<typeof setInterval>>()

// Cold start tracking
let coldStartProgress: ColdStartProgress | null = null

// Story 9-5.5: Event discovery timer
let eventDiscoveryTimer: ReturnType<typeof setInterval> | null = null
let eventDiscoveryIntervalMsActive: number | null = null
let lastDiscoveryChangedPollingPlan = false

// Story 9.5.5: Serialize discovery/refresh operations to avoid overlap
let discoveryQueue: Promise<unknown> = Promise.resolve()

// Bookmaker list cache (cached for 5 min - bookmaker names only, NOT odds)
let cachedBookmakers: { fetchedAtMs: number; bookmakers: string[] } | null = null

// ============================================================================
// HTTP Fetch Helper
// ============================================================================

/**
 * Get HTTP fetch implementation.
 * Uses Electron's net.fetch in main process, falls back to globalThis.fetch.
 */
function getHttpFetch(): typeof fetch {
  if (typeof net?.fetch === 'function') {
    return net.fetch as unknown as typeof fetch
  }

  const httpFetch = (globalThis as { fetch?: typeof fetch }).fetch
  if (typeof httpFetch === 'function') {
    return httpFetch
  }

  throw new Error('No fetch implementation available for aggressive scan')
}

// ============================================================================
// Bookmaker Cache (Story 9.5 Task 2)
// ============================================================================

/**
 * Get cached bookmaker LIST (names only, not odds).
 * This caches the user's selected bookmakers to avoid repeated settings lookups.
 * ODDS THEMSELVES ARE ALWAYS FRESH - fetched from /v3/odds/multi every poll.
 *
 * @param apiKey - API key for fetching bookmakers
 * @returns Array of bookmaker names
 */
async function getCachedBookmakers(apiKey: string): Promise<string[]> {
  let bookmakers = cachedBookmakers?.bookmakers ?? []
  const cacheAgeMs = cachedBookmakers ? Date.now() - cachedBookmakers.fetchedAtMs : Infinity

  if (!bookmakers.length || cacheAgeMs > BOOKMAKER_CACHE_TTL_MS) {
    bookmakers = await getSelectedBookmakers(apiKey)
    cachedBookmakers = { fetchedAtMs: Date.now(), bookmakers }

    logDebug('aggressiveScan.bookmakers.refreshed', {
      context: 'service:aggressiveScan',
      operation: 'getCachedBookmakers',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      bookmakerCount: bookmakers.length,
      cacheAgeMs: cacheAgeMs === Infinity ? 'cold-start' : cacheAgeMs
    } satisfies StructuredLogBase)
  }

  return bookmakers
}

// ============================================================================
// Batch Odds Fetching (Story 9.5 Task 1)
// ============================================================================

/**
 * Fetch odds for a batch of events using /v3/odds/multi endpoint.
 * Batches events into groups of 10 (API maximum).
 *
 * Story 9.5 AC1: Uses /v3/odds/multi endpoint
 * Story 9.5 AC2: Batch size limited to 10 events
 * Story 9.5 AC4: Accepts real DeepScanEvent objects
 * Story 9.5 AC6: Requests are batched at 10 events wherever possible
 *
 * @param events - DeepScanEvent objects to fetch odds for
 * @param apiKey - API key for authentication
 * @param signal - AbortSignal for cancellation
 * @returns Array of RawOddsPayload results
 */
async function fetchOddsForEvents(
  events: DeepScanEvent[],
  apiKey: string,
  signal: AbortSignal
): Promise<RawOddsPayload[]> {
  if (events.length === 0) {
    return []
  }

  // Get cached bookmakers (with TTL check)
  const bookmakers = await getCachedBookmakers(apiKey)

  if (!bookmakers.length) {
    logWarn('aggressiveScan.fetchOdds.noBookmakers', {
      context: 'service:aggressiveScan',
      operation: 'fetchOddsForEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: 'UserError',
      message: 'No bookmakers configured for aggressive scan'
    } satisfies StructuredLogBase)
    return []
  }

  // Warn if bookmakers will be truncated
  if (bookmakers.length > MAX_BOOKMAKERS_PER_REQUEST) {
    logWarn('aggressiveScan.fetchOdds.bookmakersTruncated', {
      context: 'service:aggressiveScan',
      operation: 'fetchOddsForEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      configuredCount: bookmakers.length,
      maxAllowed: MAX_BOOKMAKERS_PER_REQUEST,
      message: `Configured ${bookmakers.length} bookmakers but API allows max ${MAX_BOOKMAKERS_PER_REQUEST}. Some bookmakers will be excluded.`
    } satisfies StructuredLogBase)
  }

  const httpFetch = getHttpFetch()
  const allResults: RawOddsPayload[] = []

  // Batch events into groups of 10 (AC2, AC6)
  const batches: DeepScanEvent[][] = []
  for (let i = 0; i < events.length; i += BATCH_SIZE_MAX) {
    batches.push(events.slice(i, i + BATCH_SIZE_MAX))
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    if (signal.aborted) {
      break
    }

    // Add delay between batches to avoid rate limiting (skip delay for first batch)
    if (batchIndex > 0) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
    }

    const eventIds = batch.map((e) => e.id).join(',')
    const url = new URL(ODDS_API_IO_ODDS_MULTI_PATH, ODDS_API_IO_BASE_URL)
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('eventIds', eventIds)
    url.searchParams.set('bookmakers', bookmakers.slice(0, MAX_BOOKMAKERS_PER_REQUEST).join(','))

    try {
      const startTime = Date.now()
      const response = await httpFetch(url.toString(), {
        method: 'GET',
        signal,
        headers: { Accept: 'application/json' }
      })

      if (!response.ok) {
        const message = await response
          .text()
          .catch(() => `Batch odds request failed with status ${response.status}`)
        logWarn('aggressiveScan.fetchOdds.failed', {
          context: 'service:aggressiveScan',
          operation: 'fetchOddsForEvents',
          providerId: 'odds-api-io',
          correlationId: correlationId ?? undefined,
          durationMs: Date.now() - startTime,
          errorCategory: 'ProviderError',
          status: response.status,
          eventCount: batch.length,
          message
        } satisfies StructuredLogBase)
        continue
      }

      const body = (await response.json()) as unknown
      const batchResults = parseBatchOddsResponse(body, batch)
      allResults.push(...batchResults)

      logDebug('aggressiveScan.fetchOdds.batch', {
        context: 'service:aggressiveScan',
        operation: 'fetchOddsForEvents',
        providerId: 'odds-api-io',
        correlationId: correlationId ?? undefined,
        durationMs: Date.now() - startTime,
        errorCategory: null,
        batchSize: batch.length,
        resultsCount: batchResults.length
      } satisfies StructuredLogBase)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        break
      }

      logError('aggressiveScan.fetchOdds.error', {
        context: 'service:aggressiveScan',
        operation: 'fetchOddsForEvents',
        providerId: 'odds-api-io',
        correlationId: correlationId ?? undefined,
        durationMs: null,
        errorCategory: 'ProviderError',
        message: (error as Error).message,
        eventCount: batch.length
      } satisfies StructuredLogBase)
    }
  }

  return allResults
}

/**
 * Parse batch odds response from /v3/odds/multi endpoint.
 * Converts API response to RawOddsPayload format.
 */
function parseBatchOddsResponse(body: unknown, requestedEvents: DeepScanEvent[]): RawOddsPayload[] {
  const results: RawOddsPayload[] = []

  // Handle array response (expected format)
  const items = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)
      ? (body as { data: unknown[] }).data
      : []

  for (const item of items) {
    if (!item || typeof item !== 'object') continue

    // Extract event ID
    const rawId =
      (item as { id?: unknown; eventId?: unknown }).id ?? (item as { eventId?: unknown }).eventId
    const eventId = rawId != null ? String(rawId) : null

    if (!eventId) continue

    // Find matching event
    const event = requestedEvents.find((e) => e.id === eventId)
    if (!event) continue

    // Extract bookmakers
    const rawBookmakers = (item as { bookmakers?: unknown[] }).bookmakers
    if (!Array.isArray(rawBookmakers)) continue

    const bookmakers: RawOddsPayload['bookmakers'] = []
    for (const bk of rawBookmakers) {
      if (!bk || typeof bk !== 'object') continue

      const name = (bk as { name?: unknown }).name
      if (typeof name !== 'string') continue

      const rawMarkets = (bk as { markets?: unknown[] }).markets
      if (!Array.isArray(rawMarkets)) continue

      const markets: RawOddsPayload['bookmakers'][number]['markets'] = []
      for (const mkt of rawMarkets) {
        if (!mkt || typeof mkt !== 'object') continue

        const key = (mkt as { key?: unknown }).key
        if (typeof key !== 'string') continue

        const rawOutcomes = (mkt as { outcomes?: unknown[] }).outcomes
        if (!Array.isArray(rawOutcomes)) continue

        const outcomes: RawOddsPayload['bookmakers'][number]['markets'][number]['outcomes'] = []
        for (const out of rawOutcomes) {
          if (!out || typeof out !== 'object') continue

          const outName = (out as { name?: unknown }).name
          const odds =
            (out as { price?: unknown; odds?: unknown }).price ?? (out as { odds?: unknown }).odds

          if (typeof outName === 'string' && typeof odds === 'number') {
            outcomes.push({ name: outName, odds })
          }
        }

        if (outcomes.length > 0) {
          markets.push({ key, outcomes })
        }
      }

      if (markets.length > 0) {
        bookmakers.push({ name, markets })
      }
    }

    if (bookmakers.length > 0) {
      results.push({
        event: {
          id: eventId,
          name: event.name,
          date: event.date ?? '',
          league: event.league ?? '',
          sport: event.sport ?? ''
        },
        bookmakers
      })
    }
  }

  return results
}

// ============================================================================
// Arbitrage Computation (Story 9.5 Task 3)
// ============================================================================

/**
 * Compute arbitrage opportunities from odds payload.
 * Returns the number of arbitrage opportunities found.
 *
 * Story 9.5 AC5: Compute arbitrage opportunities from fetched odds
 */
function computeArbitrageFromOdds(odds: RawOddsPayload): number {
  let arbCount = 0

  // Build best odds map per market/outcome
  const bestOddsByMarket = new Map<string, Map<string, { odds: number; bookmaker: string }>>()

  for (const bookmaker of odds.bookmakers) {
    for (const market of bookmaker.markets) {
      if (!bestOddsByMarket.has(market.key)) {
        bestOddsByMarket.set(market.key, new Map())
      }
      const outcomeMap = bestOddsByMarket.get(market.key)!

      for (const outcome of market.outcomes) {
        const existing = outcomeMap.get(outcome.name)
        if (!existing || outcome.odds > existing.odds) {
          outcomeMap.set(outcome.name, { odds: outcome.odds, bookmaker: bookmaker.name })
        }
      }
    }
  }

  // Check for two-way arbitrage opportunities
  for (const [marketKey, outcomeMap] of bestOddsByMarket.entries()) {
    const outcomes = Array.from(outcomeMap.entries())

    // Two-way markets (h2h, over/under, etc.)
    if (outcomes.length === 2) {
      const [first, second] = outcomes
      const roi = calculateTwoLegArbitrageRoi(first[1].odds, second[1].odds)

      if (roi > 0) {
        arbCount++
        logDebug('aggressiveScan.arb.detected', {
          context: 'service:aggressiveScan',
          operation: 'computeArbitrageFromOdds',
          providerId: 'odds-api-io',
          correlationId: correlationId ?? undefined,
          durationMs: null,
          errorCategory: null,
          eventId: odds.event.id,
          marketKey,
          roi: roi.toFixed(4),
          odds1: first[1].odds,
          odds2: second[1].odds,
          bookmaker1: first[1].bookmaker,
          bookmaker2: second[1].bookmaker
        } satisfies StructuredLogBase)
      }
    }
  }

  return arbCount
}

// ============================================================================
// Configuration
// ============================================================================

export function setAggressiveScanConfig(newConfig: Partial<AggressiveScanConfig>): void {
  const previousIntervalMinutes = config.eventDiscoveryIntervalMinutes
  config = { ...config, ...newConfig }
  logInfo('aggressiveScan.config.updated', {
    context: 'service:aggressiveScan',
    operation: 'setAggressiveScanConfig',
    providerId: 'odds-api-io',
    correlationId: correlationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    config: sanitizeConfigForLogging(config)
  } satisfies StructuredLogBase)

  // Apply discovery interval changes immediately when running.
  if (
    isRunning &&
    typeof newConfig.eventDiscoveryIntervalMinutes === 'number' &&
    newConfig.eventDiscoveryIntervalMinutes !== previousIntervalMinutes
  ) {
    restartEventDiscoveryTimer()
  }
}

/**
 * Set the quota configuration based on user's plan tier.
 * This affects the hourly rate limit and target percentage.
 */
export function setQuotaConfig(newQuotaConfig: QuotaConfig): void {
  quotaConfig = { ...newQuotaConfig }
  HOURLY_REQUEST_LIMIT = quotaConfig.hourlyLimit

  // Re-initialize quota budget if already running
  if (isRunning) {
    initQuotaBudget()
  }

  logInfo('aggressiveScan.quotaConfig.updated', {
    context: 'service:aggressiveScan',
    operation: 'setQuotaConfig',
    providerId: 'odds-api-io',
    correlationId: correlationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    hourlyLimit: quotaConfig.hourlyLimit,
    targetPercent: quotaConfig.targetPercent,
    planTier: quotaConfig.planTier
  } satisfies StructuredLogBase)
}

/**
 * Get the current quota configuration.
 */
export function getQuotaConfig(): QuotaConfig {
  return { ...quotaConfig }
}

/**
 * Convenience function to set plan tier.
 * @param planTier - 'free' for 100/hr, 'paid' for 5000/hr
 */
export function setPlanTier(planTier: ApiPlanTier): void {
  setQuotaConfig(createQuotaConfig(planTier))
}

/**
 * Detect plan tier based on observed rate limit from API responses.
 * Call this when you receive rate limit headers from the API.
 * @param observedLimit - The X-RateLimit-Limit value from API response
 */
export function detectPlanTierFromRateLimit(observedLimit: number): ApiPlanTier {
  // Free tier is 100/hr, paid is 5000/hr
  // Use threshold of 1000 to distinguish between them
  const detectedTier: ApiPlanTier = observedLimit <= 1000 ? 'free' : 'paid'

  // Auto-update if different from current
  if (quotaConfig.planTier !== detectedTier || quotaConfig.hourlyLimit !== observedLimit) {
    setQuotaConfig({
      hourlyLimit: observedLimit,
      targetPercent: detectedTier === 'free' ? 80 : 75,
      planTier: detectedTier
    })
  }

  return detectedTier
}

export function getAggressiveScanConfig(): AggressiveScanConfig {
  return { ...config }
}

function sanitizeConfigForLogging(cfg: AggressiveScanConfig): Record<string, unknown> {
  return {
    enabled: cfg.enabled,
    quotaTargetPercent: cfg.quotaTargetPercent,
    scanHorizonHours: cfg.scanHorizonHours,
    imminentPollIntervalSeconds: cfg.imminentPollIntervalSeconds,
    arbBoostDurationMinutes: cfg.arbBoostDurationMinutes,
    maxBoostedEvents: cfg.maxBoostedEvents,
    maxCachedEvents: cfg.maxCachedEvents
  }
}

// ============================================================================
// Event Tiering
// ============================================================================

/**
 * Calculate the tier for an event based on its kickoff time.
 * Story 8.7 Task 1.3: Implement calculateEventTier
 */
export function calculateEventTier(event: DeepScanEvent, now: number = Date.now()): EventTier {
  if (!event.date) {
    return 'distant'
  }

  const kickoffMs = new Date(event.date).getTime()
  if (!Number.isFinite(kickoffMs)) {
    return 'distant'
  }

  // Event has already started - exclude from pre-match scanning
  if (kickoffMs <= now) {
    return 'distant' // Will be filtered out later
  }

  const minutesToKickoff = Math.floor((kickoffMs - now) / (60 * 1000))

  if (minutesToKickoff <= config.tierBoundaries.imminent) {
    return 'imminent'
  }
  if (minutesToKickoff <= config.tierBoundaries.soon) {
    return 'soon'
  }
  if (minutesToKickoff <= config.tierBoundaries.today) {
    return 'today'
  }
  if (minutesToKickoff <= config.tierBoundaries.later) {
    return 'later'
  }
  if (minutesToKickoff <= config.tierBoundaries.tomorrow) {
    return 'tomorrow'
  }
  return 'distant'
}

/**
 * Calculate minutes to kickoff for an event.
 */
export function calculateMinutesToKickoff(event: DeepScanEvent, now: number = Date.now()): number {
  if (!event.date) {
    return Infinity
  }
  const kickoffMs = new Date(event.date).getTime()
  if (!Number.isFinite(kickoffMs)) {
    return Infinity
  }
  return Math.floor((kickoffMs - now) / (60 * 1000))
}

/**
 * Create a TieredEvent from a DeepScanEvent.
 * Story 8.7 Task 1.2: Create TieredEvent interface
 */
export function createTieredEvent(event: DeepScanEvent, now: number = Date.now()): TieredEvent {
  const tier = calculateEventTier(event, now)
  const minutesToKickoff = calculateMinutesToKickoff(event, now)

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    league: event.league,
    sport: event.sport,
    tier,
    minutesToKickoff,
    lastPolledAt: null,
    pollCount: 0,
    volatilityScore: 0,
    isBoosted: false,
    boostExpiresAt: null
  }
}

/**
 * Check if an event should be included in pre-match scanning.
 * Story 8.7 Task 1.7: Filter out started events
 */
export function isPreMatchEvent(event: DeepScanEvent, now: number = Date.now()): boolean {
  if (!event.date) {
    return true // Include events without dates (assume future)
  }
  const kickoffMs = new Date(event.date).getTime()
  return Number.isFinite(kickoffMs) && kickoffMs > now
}

// ============================================================================
// Tier Cache Management
// ============================================================================

/**
 * Initialize the tiered event cache.
 * Story 8.7 Task 1.4: Create tieredEventCache
 */
function initTierCache(): void {
  tieredEventCache.clear()
  for (const tier of ['imminent', 'soon', 'today', 'later', 'tomorrow', 'distant'] as EventTier[]) {
    tieredEventCache.set(tier, new Map())
  }
}

/**
 * Add or update an event in the tier cache.
 */
export function upsertTieredEvent(event: DeepScanEvent, now: number = Date.now()): TieredEvent {
  const tieredEvent = createTieredEvent(event, now)
  const tierMap = tieredEventCache.get(tieredEvent.tier)

  if (tierMap) {
    // Preserve existing metadata if event already exists
    const existing = tierMap.get(event.id)
    if (existing) {
      tieredEvent.lastPolledAt = existing.lastPolledAt
      tieredEvent.pollCount = existing.pollCount
      tieredEvent.volatilityScore = existing.volatilityScore
      tieredEvent.isBoosted = existing.isBoosted
      tieredEvent.boostExpiresAt = existing.boostExpiresAt
    }
    tierMap.set(event.id, tieredEvent)
  }

  return tieredEvent
}

/**
 * Get all events for a specific tier.
 */
export function getEventsForTier(tier: EventTier): TieredEvent[] {
  const tierMap = tieredEventCache.get(tier)
  return tierMap ? Array.from(tierMap.values()) : []
}

/**
 * Get a specific event by ID across all tiers.
 */
export function getEventById(eventId: string): TieredEvent | undefined {
  for (const tierMap of tieredEventCache.values()) {
    const event = tierMap.get(eventId)
    if (event) {
      return event
    }
  }
  return undefined
}

/**
 * Promote events between tiers as time passes.
 * Story 8.7 Task 1.5: Implement promoteEvents
 */
export function promoteEvents(now: number = Date.now()): void {
  for (const [tier, tierMap] of tieredEventCache.entries()) {
    const eventsToPromote: { event: TieredEvent; newTier: EventTier }[] = []

    for (const event of tierMap.values()) {
      const newTier = calculateEventTier(event, now)
      if (newTier !== tier) {
        eventsToPromote.push({ event, newTier })
      }
    }

    for (const { event, newTier } of eventsToPromote) {
      // Remove from old tier
      tierMap.delete(event.id)

      // Update and add to new tier
      const updatedEvent: TieredEvent = {
        ...event,
        tier: newTier,
        minutesToKickoff: calculateMinutesToKickoff(event, now)
      }

      const newTierMap = tieredEventCache.get(newTier)
      if (newTierMap) {
        newTierMap.set(event.id, updatedEvent)
      }

      logDebug('aggressiveScan.event.promoted', {
        context: 'service:aggressiveScan',
        operation: 'promoteEvents',
        providerId: 'odds-api-io',
        correlationId: correlationId ?? undefined,
        durationMs: null,
        errorCategory: null,
        eventId: event.id,
        eventName: event.name,
        oldTier: tier,
        newTier
      } satisfies StructuredLogBase)
    }
  }
}

/**
 * Get total event count across all tiers.
 */
export function getTotalEventCount(): number {
  let count = 0
  for (const tierMap of tieredEventCache.values()) {
    count += tierMap.size
  }
  return count
}

/**
 * Get event counts per tier.
 */
export function getEventCountsByTier(): Record<EventTier, number> {
  const counts: Record<EventTier, number> = {
    imminent: 0,
    soon: 0,
    today: 0,
    later: 0,
    tomorrow: 0,
    distant: 0
  }

  for (const [tier, tierMap] of tieredEventCache.entries()) {
    counts[tier] = tierMap.size
  }

  return counts
}

// ============================================================================
// Quota Budget Management
// ============================================================================

/**
 * Initialize or reset the quota budget.
 * Story 8.7 Task 3: Implement quota budget system
 *
 * Uses quotaConfig.targetPercent if set, otherwise falls back to config.quotaTargetPercent.
 * The hourly limit is determined by setQuotaConfig() or defaults to 5000 (paid tier).
 */
export function initQuotaBudget(): QuotaBudget {
  // Use quotaConfig target percent if available, otherwise use config
  const targetPercent = quotaConfig.targetPercent ?? config.quotaTargetPercent
  const targetRequestsPerHour = Math.floor(HOURLY_REQUEST_LIMIT * (targetPercent / 100))
  const bufferRequests = Math.floor(targetRequestsPerHour * (DEFAULT_BUFFER_PERCENT / 100))
  const usableRequests = targetRequestsPerHour - bufferRequests

  // Calculate per-tier allocations based on weights
  const totalWeight = Object.values(config.tierWeights).reduce((sum, w) => sum + w, 0)
  const perTier: Record<EventTier, TierBudget> = {
    imminent: {
      tier: 'imminent',
      weight: config.tierWeights.imminent,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    soon: {
      tier: 'soon',
      weight: config.tierWeights.soon,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    today: {
      tier: 'today',
      weight: config.tierWeights.today,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    later: {
      tier: 'later',
      weight: config.tierWeights.later,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    tomorrow: {
      tier: 'tomorrow',
      weight: config.tierWeights.tomorrow,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    distant: {
      tier: 'distant',
      weight: config.tierWeights.distant,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    }
  }

  // Update event counts and allocate requests
  for (const tier of Object.keys(perTier) as EventTier[]) {
    const eventCount = getEventsForTier(tier).length
    perTier[tier].eventCount = eventCount
    perTier[tier].allocatedRequests = Math.floor(
      (config.tierWeights[tier] / totalWeight) * usableRequests
    )
    perTier[tier].currentPollIntervalSeconds = calculatePollInterval(
      tier,
      perTier[tier].allocatedRequests,
      eventCount
    )
  }

  quotaBudget = {
    totalHourlyLimit: HOURLY_REQUEST_LIMIT,
    targetPercent,
    targetRequestsPerHour,
    bufferPercent: DEFAULT_BUFFER_PERCENT,
    bufferRequests,
    usableRequests,
    perTier,
    currentHourUsed: 0,
    currentHourRemaining: usableRequests,
    hourResetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }

  return quotaBudget
}

/**
 * Recalculate quota allocations and poll intervals without resetting usage counters.
 * Needed when tier cache contents change (e.g., event discovery / refresh).
 */
function recalculateQuotaBudgetPreservingUsage(): void {
  if (!quotaBudget) return

  const previousUsed = quotaBudget.currentHourUsed
  const previousPerTierUsed: Partial<Record<EventTier, number>> = {}
  for (const tier of Object.keys(quotaBudget.perTier) as EventTier[]) {
    previousPerTierUsed[tier] = quotaBudget.perTier[tier].usedThisHour
  }

  const targetPercent = quotaConfig.targetPercent ?? config.quotaTargetPercent
  const targetRequestsPerHour = Math.floor(HOURLY_REQUEST_LIMIT * (targetPercent / 100))
  const bufferRequests = Math.floor(targetRequestsPerHour * (DEFAULT_BUFFER_PERCENT / 100))
  const usableRequests = targetRequestsPerHour - bufferRequests

  quotaBudget.totalHourlyLimit = HOURLY_REQUEST_LIMIT
  quotaBudget.targetPercent = targetPercent
  quotaBudget.targetRequestsPerHour = targetRequestsPerHour
  quotaBudget.bufferPercent = DEFAULT_BUFFER_PERCENT
  quotaBudget.bufferRequests = bufferRequests
  quotaBudget.usableRequests = usableRequests

  const totalWeight = Object.values(config.tierWeights).reduce((sum, w) => sum + w, 0)

  for (const tier of Object.keys(quotaBudget.perTier) as EventTier[]) {
    const eventCount = getEventsForTier(tier).length
    quotaBudget.perTier[tier].weight = config.tierWeights[tier]
    quotaBudget.perTier[tier].eventCount = eventCount
    quotaBudget.perTier[tier].allocatedRequests = Math.floor(
      (config.tierWeights[tier] / totalWeight) * usableRequests
    )
    quotaBudget.perTier[tier].currentPollIntervalSeconds = calculatePollInterval(
      tier,
      quotaBudget.perTier[tier].allocatedRequests,
      eventCount
    )
    quotaBudget.perTier[tier].usedThisHour = previousPerTierUsed[tier] ?? 0
  }

  quotaBudget.currentHourUsed = previousUsed
  quotaBudget.currentHourRemaining = Math.max(0, usableRequests - quotaBudget.currentHourUsed)
}

/**
 * Calculate poll interval for a tier based on budget and event count.
 * Story 8.7 Task 3.4: Implement calculatePollInterval
 */
export function calculatePollInterval(
  tier: EventTier,
  allocatedRequests: number,
  eventCount: number
): number {
  const tierConfig = DEFAULT_TIER_CONFIGS.find((c) => c.name === tier)
  if (!tierConfig) {
    return 3600 // Default to 1 hour if tier not found
  }

  if (eventCount === 0) {
    return tierConfig.maxPollIntervalSeconds
  }

  // Calculate how many batches we need per poll cycle
  const batchesPerPoll = Math.ceil(eventCount / BATCH_SIZE_MAX)

  // How many poll cycles can we do per hour with our budget?
  const pollsPerHour = Math.floor(allocatedRequests / batchesPerPoll)

  if (pollsPerHour === 0) {
    return tierConfig.maxPollIntervalSeconds
  }

  // Seconds per poll cycle
  const secondsPerPoll = Math.floor(3600 / pollsPerHour)

  // Clamp to min/max
  return Math.max(
    tierConfig.minPollIntervalSeconds,
    Math.min(tierConfig.maxPollIntervalSeconds, secondsPerPoll)
  )
}

/**
 * Calculate tier budgets based on total budget, weights, and event counts.
 * Story 8.7 Task 3.3: Implement calculateTierBudgets
 */
export function calculateTierBudgets(
  totalBudget: number,
  tierWeights: {
    imminent: number
    soon: number
    today: number
    later: number
    tomorrow: number
    distant: number
  },
  eventCounts: Record<EventTier, number>
): Record<EventTier, TierBudget> {
  const totalWeight = Object.values(tierWeights).reduce((sum: number, w: number) => sum + w, 0)

  const budgets: Record<EventTier, TierBudget> = {
    imminent: {
      tier: 'imminent',
      weight: tierWeights.imminent,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    soon: {
      tier: 'soon',
      weight: tierWeights.soon,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    today: {
      tier: 'today',
      weight: tierWeights.today,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    later: {
      tier: 'later',
      weight: tierWeights.later,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    tomorrow: {
      tier: 'tomorrow',
      weight: tierWeights.tomorrow,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    },
    distant: {
      tier: 'distant',
      weight: tierWeights.distant,
      allocatedRequests: 0,
      usedThisHour: 0,
      eventCount: 0,
      currentPollIntervalSeconds: 0
    }
  }

  for (const tier of Object.keys(budgets) as EventTier[]) {
    const eventCount = eventCounts[tier] || 0
    const allocatedRequests = Math.floor((tierWeights[tier] / totalWeight) * totalBudget)

    budgets[tier].eventCount = eventCount
    budgets[tier].allocatedRequests = allocatedRequests
    budgets[tier].currentPollIntervalSeconds = calculatePollInterval(
      tier,
      allocatedRequests,
      eventCount
    )
  }

  return budgets
}

/**
 * Record a request usage for quota tracking.
 * Story 8.7 Task 3.5: Real-time quota tracking
 */
export function recordRequest(count: number = 1): void {
  if (quotaBudget) {
    quotaBudget.currentHourUsed += count
    quotaBudget.currentHourRemaining = Math.max(
      0,
      quotaBudget.usableRequests - quotaBudget.currentHourUsed
    )
  }
  pollsThisHour += count
}

/**
 * Check if we can use burst buffer.
 */
export function canUseBurstBuffer(): boolean {
  if (!quotaBudget) {
    return false
  }
  return quotaBudget.currentHourUsed < quotaBudget.usableRequests + quotaBudget.bufferRequests
}

/**
 * Check if we're over budget for a specific tier.
 */
export function isOverBudget(tier: EventTier): boolean {
  if (!quotaBudget) {
    return false
  }
  const tierBudget = quotaBudget.perTier[tier]
  return tierBudget.usedThisHour >= tierBudget.allocatedRequests
}

/**
 * Reset hourly quota counters.
 */
export function resetHourlyQuota(): void {
  hourStartedAt = Date.now()
  pollsThisHour = 0
  arbsFoundThisHour = 0
  totalPollLatencyMs = 0

  if (quotaBudget) {
    quotaBudget.currentHourUsed = 0
    quotaBudget.currentHourRemaining = quotaBudget.usableRequests
    for (const tier of Object.keys(quotaBudget.perTier) as EventTier[]) {
      quotaBudget.perTier[tier].usedThisHour = 0
    }
    quotaBudget.hourResetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  }
}

// ============================================================================
// Boost System
// ============================================================================

/**
 * Boost an event to faster polling.
 * Story 8.7 Task 6: Implement arb boost system
 */
export function boostEvent(
  eventId: string,
  reason: 'arb_detected' | 'high_volatility' | 'manual' = 'arb_detected'
): boolean {
  // Check max concurrent boosts
  if (boostedEvents.size >= config.maxBoostedEvents) {
    // Remove oldest boost
    const oldest = Array.from(boostedEvents.values()).sort(
      (a, b) => new Date(a.boostedAt).getTime() - new Date(b.boostedAt).getTime()
    )[0]
    if (oldest) {
      boostedEvents.delete(oldest.eventId)
    }
  }

  const event = getEventById(eventId)
  if (!event) {
    return false
  }

  const now = Date.now()
  const boostDurationMs = config.arbBoostDurationMinutes * 60 * 1000

  const boostInfo: EventBoostInfo = {
    eventId,
    boostedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + boostDurationMs).toISOString(),
    reason
  }

  boostedEvents.set(eventId, boostInfo)

  // Update event in cache
  event.isBoosted = true
  event.boostExpiresAt = boostInfo.expiresAt

  logInfo('aggressiveScan.event.boosted', {
    context: 'service:aggressiveScan',
    operation: 'boostEvent',
    providerId: 'odds-api-io',
    correlationId: correlationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    eventId,
    eventName: event.name,
    reason,
    expiresAt: boostInfo.expiresAt,
    totalBoosted: boostedEvents.size
  } satisfies StructuredLogBase)

  return true
}

/**
 * Remove boost from an event.
 */
export function removeBoost(eventId: string): void {
  const event = getEventById(eventId)
  if (event) {
    event.isBoosted = false
    event.boostExpiresAt = null
  }
  boostedEvents.delete(eventId)
}

/**
 * Clean up expired boosts.
 * Story 8.7 Task 6.6: Auto-remove boost when duration expires
 */
export function cleanupExpiredBoosts(now: number = Date.now()): void {
  const expired: string[] = []

  for (const [eventId, boostInfo] of boostedEvents.entries()) {
    if (new Date(boostInfo.expiresAt).getTime() <= now) {
      expired.push(eventId)
    }
  }

  for (const eventId of expired) {
    removeBoost(eventId)

    logDebug('aggressiveScan.boost.expired', {
      context: 'service:aggressiveScan',
      operation: 'cleanupExpiredBoosts',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      eventId
    } satisfies StructuredLogBase)
  }
}

/**
 * Check if an event is currently boosted.
 */
export function isEventBoosted(eventId: string): boolean {
  return boostedEvents.has(eventId)
}

/**
 * Get all boosted event IDs.
 */
export function getBoostedEventIds(): string[] {
  return Array.from(boostedEvents.keys())
}

// ============================================================================
// Odds Cache with History
// ============================================================================

/**
 * Update the odds cache for an event.
 * Story 8.7 Task 7: Implement odds cache with history
 */
export function updateOddsCache(eventId: string, odds: RawOddsPayload, arbsFound: number): void {
  const event = getEventById(eventId)
  if (!event) {
    return
  }

  let cached = oddsCache.get(eventId)

  if (!cached) {
    cached = {
      event,
      currentOdds: odds,
      oddsHistory: [],
      oddsChangeCount: 0,
      lastOddsChangeAt: null,
      hasActiveArbs: arbsFound > 0,
      arbCount: arbsFound
    }
  } else {
    // Check if odds changed
    const oddsChanged = hasOddsChanged(cached.currentOdds, odds)

    if (oddsChanged) {
      // Add current odds to history
      if (cached.currentOdds) {
        cached.oddsHistory.push({
          odds: cached.currentOdds,
          fetchedAt: cached.lastOddsChangeAt || event.lastPolledAt || new Date().toISOString()
        })

        // Keep only last N snapshots
        if (cached.oddsHistory.length > MAX_ODDS_HISTORY_SNAPSHOTS) {
          cached.oddsHistory.shift()
        }
      }

      cached.oddsChangeCount++
      cached.lastOddsChangeAt = new Date().toISOString()

      // Update volatility score
      event.volatilityScore = calculateVolatilityScore(cached)
    }

    cached.currentOdds = odds
    cached.hasActiveArbs = arbsFound > 0
    cached.arbCount = arbsFound
  }

  oddsCache.set(eventId, cached)
}

/**
 * Check if odds have changed between two snapshots.
 */
function hasOddsChanged(oldOdds: RawOddsPayload | null, newOdds: RawOddsPayload): boolean {
  if (!oldOdds) {
    return true
  }

  // Simple comparison - check if bookmaker count changed
  if (oldOdds.bookmakers.length !== newOdds.bookmakers.length) {
    return true
  }

  // Check if any odds values changed
  for (const oldBookmaker of oldOdds.bookmakers) {
    const newBookmaker = newOdds.bookmakers.find((b) => b.name === oldBookmaker.name)
    if (!newBookmaker) {
      return true
    }

    for (const oldMarket of oldBookmaker.markets) {
      const newMarket = newBookmaker.markets.find((m) => m.key === oldMarket.key)
      if (!newMarket) {
        return true
      }

      for (const oldOutcome of oldMarket.outcomes) {
        const newOutcome = newMarket.outcomes.find((o) => o.name === oldOutcome.name)
        if (!newOutcome || newOutcome.odds !== oldOutcome.odds) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Calculate volatility score based on odds change frequency.
 * Story 8.7 Task 7.3: Calculate volatility score
 */
function calculateVolatilityScore(cached: CachedEventWithOdds): number {
  // Use cached parameter for volatility calculation
  void cached.oddsChangeCount
  if (cached.oddsChangeCount === 0) {
    return 0
  }

  // Base score on change count (capped at 100)
  let score = Math.min(100, cached.oddsChangeCount * 10)

  // Boost score if recent changes
  if (cached.lastOddsChangeAt) {
    const minutesSinceChange =
      (Date.now() - new Date(cached.lastOddsChangeAt).getTime()) / (60 * 1000)
    if (minutesSinceChange < 5) {
      score += 20 // Recent activity bonus
    }
  }

  return Math.min(100, score)
}

/**
 * Get cached odds for an event.
 */
export function getCachedOdds(eventId: string): CachedEventWithOdds | undefined {
  return oddsCache.get(eventId)
}

/**
 * Evict old events from cache.
 * Story 8.7 Task 7.5: Auto-evict finished events
 */
export function evictOldEvents(now: number = Date.now()): number {
  const evictThresholdMs = EVENT_EVICT_AFTER_MINUTES * 60 * 1000
  let evictedCount = 0

  for (const [tier, tierMap] of tieredEventCache.entries()) {
    void tier // Iteration key not used directly, tierMap is what we need
    const toEvict: string[] = []

    for (const [eventId, event] of tierMap.entries()) {
      // Check if event has finished
      if (event.date) {
        const kickoffMs = new Date(event.date).getTime()
        if (kickoffMs < now - evictThresholdMs) {
          toEvict.push(eventId)
        }
      }

      // Check cache size limit
      if (oddsCache.size >= config.maxCachedEvents) {
        // Find oldest entry in cache
        let oldestId: string | null = null
        let oldestTime = now

        for (const [id, cached] of oddsCache.entries()) {
          const lastUpdate = cached.lastOddsChangeAt || cached.event.lastPolledAt
          if (lastUpdate) {
            const updateTime = new Date(lastUpdate).getTime()
            if (updateTime < oldestTime) {
              oldestTime = updateTime
              oldestId = id
            }
          }
        }

        if (oldestId) {
          toEvict.push(oldestId)
        }
      }
    }

    for (const eventId of toEvict) {
      tierMap.delete(eventId)
      oddsCache.delete(eventId)
      boostedEvents.delete(eventId)
      evictedCount++
    }
  }

  return evictedCount
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get current aggressive scan statistics.
 * Story 8.7 Task 9: Implement quota dashboard stats
 */
export function getAggressiveScanStats(): AggressiveScanStats {
  const eventCounts = getEventCountsByTier()
  const totalEvents = Object.values(eventCounts).reduce((sum, c) => sum + c, 0)

  // Calculate memory usage (rough estimate)
  let cacheMemoryMb = 0
  for (const _cached of oddsCache.values()) {
    void _cached
    // Rough estimate: ~16KB per cached event
    cacheMemoryMb += 16 / 1024
  }

  // Calculate average poll latency
  const avgPollLatencyMs = pollsThisHour > 0 ? Math.floor(totalPollLatencyMs / pollsThisHour) : 0

  // Calculate quota efficiency
  const quotaEfficiencyPercent = quotaBudget
    ? Math.min(
        100,
        Math.floor((quotaBudget.currentHourUsed / quotaBudget.targetRequestsPerHour) * 100)
      )
    : 0

  // Get poll intervals by tier
  const pollIntervalsByTier: Record<EventTier, number> = {
    imminent: config.imminentPollIntervalSeconds,
    soon: quotaBudget?.perTier.soon.currentPollIntervalSeconds || 180,
    today: quotaBudget?.perTier.today.currentPollIntervalSeconds || 600,
    later: quotaBudget?.perTier.later.currentPollIntervalSeconds || 1800,
    tomorrow: quotaBudget?.perTier.tomorrow.currentPollIntervalSeconds || 3600,
    distant: quotaBudget?.perTier.distant.currentPollIntervalSeconds || 7200
  }

  return {
    enabled: config.enabled && isRunning,
    quotaTargetPercent: config.quotaTargetPercent,
    quotaUsedThisHour: quotaBudget?.currentHourUsed || 0,
    quotaRemainingThisHour: quotaBudget?.currentHourRemaining || 0,
    quotaEfficiencyPercent,
    eventsByTier: eventCounts,
    totalEvents,
    pollIntervalsByTier,
    pollsThisHour,
    avgPollLatencyMs,
    arbsFoundThisHour,
    arbsFoundTotal,
    boostedEvents: boostedEvents.size,
    avgArbDetectionTimeSeconds: 0, // Would need more tracking
    cachedEvents: oddsCache.size,
    cacheMemoryMb: Math.round(cacheMemoryMb * 100) / 100,
    lastPollAt,
    scanStartedAt,
    uptimeMinutes: scanStartedAt
      ? Math.floor((Date.now() - new Date(scanStartedAt).getTime()) / (60 * 1000))
      : 0
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

/**
 * Discover events and populate tier cache.
 * Story 9.5.5 Task 1: Add event discovery to aggressive scan startup
 */
async function discoverAndPopulateEvents(): Promise<number> {
  if (!isRunning || !abortController) {
    return 0
  }

  const apiKey = await getApiKeyForAdapter('odds-api-io')
  if (!apiKey) {
    logWarn('aggressiveScan.discovery.noApiKey', {
      context: 'service:aggressiveScan',
      operation: 'discoverAndPopulateEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: 'UserError',
      message: 'No API key configured for event discovery'
    } satisfies StructuredLogBase)
    return 0
  }

  // Get enabled leagues filter (Story 9.5.5 Task 2)
  const enabledLeagues = getEnabledLeaguesFilter()
  if (enabledLeagues.length === 0) {
    return 0
  }

  try {
    // Story 9.6: Use API-side league filtering for efficiency
    // This replaces client-side filtering and reduces API quota usage proportionally
    const enabledSports = getEnabledSportsFilter()
    const sportsToDiscover = enabledSports.length > 0 ? enabledSports : undefined

    // Use the new per-league discovery function (AC: 1, 2, 4, 5)
    const allEvents = await discoverEventsForEnabledLeagues({
      apiKey,
      signal: abortController.signal,
      correlationId: correlationId ?? 'aggressive-scan-discovery',
      enabledLeagues,
      sports: sportsToDiscover
    })

    // Filter to pre-match events only (Story 9.5.5 Task 1)
    // Note: Events are already filtered by league at API level (Story 9.6)
    const now = Date.now()
    const preMatchEvents = allEvents.filter((e) => isPreMatchEvent(e, now))

    // Populate tier cache (Story 9.5.5 Task 1)
    for (const event of preMatchEvents) {
      upsertTieredEvent(event, now)
    }

    // Update quota budget (no usage reset) now that event counts may have changed
    const previousPollIntervals: Partial<Record<EventTier, number>> = {}
    if (quotaBudget) {
      for (const tier of Object.keys(quotaBudget.perTier) as EventTier[]) {
        previousPollIntervals[tier] = quotaBudget.perTier[tier].currentPollIntervalSeconds
      }
    }
    recalculateQuotaBudgetPreservingUsage()
    lastDiscoveryChangedPollingPlan = false
    if (quotaBudget) {
      for (const tier of Object.keys(quotaBudget.perTier) as EventTier[]) {
        if (previousPollIntervals[tier] !== quotaBudget.perTier[tier].currentPollIntervalSeconds) {
          lastDiscoveryChangedPollingPlan = true
          break
        }
      }
    }

    logInfo('aggressiveScan.discovery.complete', {
      context: 'service:aggressiveScan',
      operation: 'discoverAndPopulateEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      totalDiscovered: allEvents.length,
      afterPreMatchFilter: preMatchEvents.length,
      tierDistribution: getEventCountsByTier(),
      leaguesEnabled: enabledLeagues.length
    } satisfies StructuredLogBase)

    return preMatchEvents.length
  } catch (error) {
    const message = (error as Error)?.message ?? 'unknown error'
    if (message === 'aborted' || /abort/i.test(message)) {
      return 0
    }
    logError('aggressiveScan.discovery.error', {
      context: 'service:aggressiveScan',
      operation: 'discoverAndPopulateEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: 'ProviderError',
      message
    } satisfies StructuredLogBase)
    return 0
  }
}

function enqueueDiscoveryOperation<T>(op: () => Promise<T>): Promise<T> {
  const next = discoveryQueue.then(op, op)
  discoveryQueue = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

/**
 * Refresh aggressive scan events when league filter changes.
 * Story 9.5.5 Task 4: Handle league filter changes
 */
export async function refreshAggressiveScanEvents(): Promise<void> {
  if (!isRunning) {
    return
  }

  await enqueueDiscoveryOperation(async () => {
    logInfo('aggressiveScan.events.refreshing', {
      context: 'service:aggressiveScan',
      operation: 'refreshAggressiveScanEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null
    } satisfies StructuredLogBase)

    // Clear existing tier cache
    initTierCache()

    // Clear odds cache to prevent stale data
    oddsCache.clear()

    // Re-discover with new filter
    const eventCount = await discoverAndPopulateEvents()

    // Restart polling loops only when we actually have events to poll.
    stopTierPollingLoops()
    if (eventCount > 0) {
      startTierPollingLoops()
    }

    logInfo('aggressiveScan.events.refreshed', {
      context: 'service:aggressiveScan',
      operation: 'refreshAggressiveScanEvents',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      eventCount,
      tierDistribution: getEventCountsByTier()
    } satisfies StructuredLogBase)
  })
}

/**
 * Stop all tier polling loops.
 */
function stopTierPollingLoops(): void {
  for (const timer of tierPollTimers.values()) {
    clearInterval(timer)
  }
  tierPollTimers.clear()
}

function getEventDiscoveryIntervalMs(): number | null {
  const minutes = config.eventDiscoveryIntervalMinutes
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null
  }
  return Math.floor(minutes * 60 * 1000)
}

function restartEventDiscoveryTimer(): void {
  if (!isRunning) {
    return
  }

  if (eventDiscoveryTimer) {
    clearInterval(eventDiscoveryTimer)
    eventDiscoveryTimer = null
  }

  const intervalMs = getEventDiscoveryIntervalMs()
  eventDiscoveryIntervalMsActive = intervalMs
  if (!intervalMs) {
    return
  }

  eventDiscoveryTimer = setInterval(() => {
    void enqueueDiscoveryOperation(async () => {
      const eventCount = await discoverAndPopulateEvents()

      // If we previously had no tier loops (e.g., started with no events),
      // start them once discovery yields events. Otherwise, refresh intervals.
      if (eventCount > 0 && tierPollTimers.size === 0) {
        startTierPollingLoops()
      } else if (eventCount > 0 && tierPollTimers.size > 0 && lastDiscoveryChangedPollingPlan) {
        stopTierPollingLoops()
        startTierPollingLoops()
      }
    })
  }, intervalMs)
}

/**
 * Start aggressive scanning.
 * Story 8.7: Main entry point for aggressive mode
 */
export async function startAggressiveScan(): Promise<void> {
  if (isRunning) {
    return
  }

  if (!config.enabled) {
    return
  }

  isRunning = true
  abortController = new AbortController()
  correlationId = createCorrelationId()
  scanStartedAt = new Date().toISOString()

  // Initialize caches
  initTierCache()

  // Initialize quota budget
  initQuotaBudget()

  // Story 9.5.5 Task 1: Discover and populate events on startup.
  // Await discovery to ensure tier cache is populated before polling starts.
  const discoveredCount = await enqueueDiscoveryOperation(discoverAndPopulateEvents)

  logInfo('aggressiveScan.start', {
    context: 'service:aggressiveScan',
    operation: 'startAggressiveScan',
    providerId: 'odds-api-io',
    correlationId,
    durationMs: null,
    errorCategory: null,
    config: sanitizeConfigForLogging(config)
  } satisfies StructuredLogBase)

  // Start tier promotion timer
  tierPromotionTimer = setInterval(() => {
    promoteEvents()
    cleanupExpiredBoosts()
    evictOldEvents()
  }, TIER_PROMOTION_INTERVAL_MS)

  // Story 9.5.5 Task 3: Start periodic event re-discovery (configurable)
  restartEventDiscoveryTimer()

  // Start tier polling loops
  if (discoveredCount > 0) {
    startTierPollingLoops()
  }
}

/**
 * Stop aggressive scanning.
 */
export function stopAggressiveScan(): void {
  if (!isRunning) {
    return
  }

  isRunning = false

  if (abortController) {
    abortController.abort()
    abortController = null
  }

  // Clear all timers
  if (tierPromotionTimer) {
    clearInterval(tierPromotionTimer)
    tierPromotionTimer = null
  }

  // Story 9.5.5 Task 3: Clear event discovery timer
  if (eventDiscoveryTimer) {
    clearInterval(eventDiscoveryTimer)
    eventDiscoveryTimer = null
  }
  eventDiscoveryIntervalMsActive = null

  stopTierPollingLoops()

  logInfo('aggressiveScan.stop', {
    context: 'service:aggressiveScan',
    operation: 'stopAggressiveScan',
    providerId: 'odds-api-io',
    correlationId: correlationId ?? undefined,
    durationMs: null,
    errorCategory: null
  } satisfies StructuredLogBase)

  correlationId = null
  scanStartedAt = null
}

/**
 * Check if aggressive scanning is running.
 */
export function isAggressiveScanRunning(): boolean {
  return isRunning
}

// ============================================================================
// Polling Loops
// ============================================================================

/**
 * Start polling loops for all tiers.
 * Story 8.7 Task 4: Implement tiered polling scheduler
 */
function startTierPollingLoops(): void {
  if (!quotaBudget) {
    return
  }

  for (const tier of Object.keys(quotaBudget.perTier) as EventTier[]) {
    startTierLoop(tier)
  }
}

/**
 * Start a polling loop for a specific tier.
 * Story 8.7 Task 4.2: Implement separate poll loop for each tier
 */
function startTierLoop(tier: EventTier): void {
  if (!quotaBudget) {
    return
  }

  // Clear existing timer if any
  const existingTimer = tierPollTimers.get(tier)
  if (existingTimer) {
    clearInterval(existingTimer)
  }

  const poll = async (): Promise<void> => {
    if (!isRunning || !abortController) {
      return
    }

    const startTime = Date.now()

    try {
      await pollTier(tier)

      // Track latency
      const latencyMs = Date.now() - startTime
      totalPollLatencyMs += latencyMs

      logDebug('aggressiveScan.poll.complete', {
        context: 'service:aggressiveScan',
        operation: 'pollTier',
        providerId: 'odds-api-io',
        correlationId: correlationId ?? undefined,
        durationMs: latencyMs,
        errorCategory: null,
        tier
      } satisfies StructuredLogBase)
    } catch (error) {
      logWarn('aggressiveScan.poll.error', {
        context: 'service:aggressiveScan',
        operation: 'pollTier',
        providerId: 'odds-api-io',
        correlationId: correlationId ?? undefined,
        durationMs: Date.now() - startTime,
        errorCategory: 'ProviderError',
        tier,
        message: (error as Error)?.message ?? 'Poll failed'
      } satisfies StructuredLogBase)
    }
  }

  // Calculate interval
  const intervalMs = (quotaBudget.perTier[tier].currentPollIntervalSeconds || 60) * 1000

  // Start the loop
  const timer = setInterval(poll, intervalMs)
  tierPollTimers.set(tier, timer)

  // Immediate first poll
  void poll()

  logInfo('aggressiveScan.tierLoop.started', {
    context: 'service:aggressiveScan',
    operation: 'startTierLoop',
    providerId: 'odds-api-io',
    correlationId: correlationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    tier,
    intervalMs
  } satisfies StructuredLogBase)
}

/**
 * Poll all events in a tier.
 * Story 8.7 Task 4.3: Implement poll loops for each tier
 */
async function pollTier(tier: EventTier): Promise<TieredPollResult> {
  const events = getEventsForTier(tier)

  if (events.length === 0) {
    return {
      tier,
      eventsPolled: 0,
      arbsFound: 0,
      latencyMs: 0,
      timestamp: new Date().toISOString()
    }
  }

  // Check quota budget
  if (isOverBudget(tier) && !canUseBurstBuffer()) {
    logDebug('aggressiveScan.tier.overBudget', {
      context: 'service:aggressiveScan',
      operation: 'pollTier',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      tier,
      used: quotaBudget?.perTier[tier].usedThisHour,
      allocated: quotaBudget?.perTier[tier].allocatedRequests
    } satisfies StructuredLogBase)

    return {
      tier,
      eventsPolled: 0,
      arbsFound: 0,
      latencyMs: 0,
      timestamp: new Date().toISOString()
    }
  }

  // Handle boosted events first
  const boostedEventIds = getBoostedEventIds()
  const boostedEventsList = events.filter((e) => boostedEventIds.includes(e.id))
  const normalEvents = events.filter((e) => !boostedEventIds.includes(e.id))

  // Sort by priority (volatility score, then time to kickoff)
  const sortedEvents = [...boostedEventsList, ...normalEvents].sort((a, b) => {
    // Boosted events first
    if (a.isBoosted && !b.isBoosted) return -1
    if (!a.isBoosted && b.isBoosted) return 1

    // Higher volatility first
    if (b.volatilityScore !== a.volatilityScore) {
      return b.volatilityScore - a.volatilityScore
    }

    // Closer to kickoff first
    return a.minutesToKickoff - b.minutesToKickoff
  })

  // Batch events
  const batches: TieredEvent[][] = []
  for (let i = 0; i < sortedEvents.length; i += BATCH_SIZE_MAX) {
    batches.push(sortedEvents.slice(i, i + BATCH_SIZE_MAX))
  }

  let totalArbsFound = 0
  const startTime = Date.now()

  // Get API key for odds fetching
  const apiKey = await getApiKeyForAdapter('odds-api-io')
  if (!apiKey) {
    logWarn('aggressiveScan.pollTier.noApiKey', {
      context: 'service:aggressiveScan',
      operation: 'pollTier',
      providerId: 'odds-api-io',
      correlationId: correlationId ?? undefined,
      durationMs: null,
      errorCategory: 'UserError',
      tier,
      message: 'No API key configured for odds-api-io'
    } satisfies StructuredLogBase)

    return {
      tier,
      eventsPolled: 0,
      arbsFound: 0,
      latencyMs: 0,
      timestamp: new Date().toISOString()
    }
  }

  for (const batch of batches) {
    if (!isRunning || abortController?.signal.aborted) {
      break
    }

    // Convert TieredEvent to DeepScanEvent for the fetcher (AC4)
    // Include slug fields from Story 9.2 for proper cross-provider matching
    const deepScanEvents: DeepScanEvent[] = batch.map((tieredEvent) => ({
      id: tieredEvent.id,
      name: tieredEvent.name,
      date: tieredEvent.date,
      league: tieredEvent.league,
      sport: tieredEvent.sport,
      leagueSlug: (tieredEvent as { leagueSlug?: string }).leagueSlug,
      sportSlug: (tieredEvent as { sportSlug?: string }).sportSlug,
      kickoffEpochMs: tieredEvent.date ? new Date(tieredEvent.date).getTime() : undefined
    }))

    // Fetch FRESH odds using batch endpoint (Story 9.5 AC1, AC5)
    // Bookmaker list may be cached (5min TTL), but odds are always fresh
    const oddsResults = await fetchOddsForEvents(deepScanEvents, apiKey, abortController!.signal)

    // Record request usage (1 request per batch)
    recordRequest(1)
    if (quotaBudget) {
      quotaBudget.perTier[tier].usedThisHour++
    }

    // Process results and update caches (Story 9.5 AC5)
    for (const odds of oddsResults) {
      // Compute arbs from odds
      const arbsFound = computeArbitrageFromOdds(odds)
      totalArbsFound += arbsFound

      // Update odds cache
      updateOddsCache(odds.event.id, odds, arbsFound)

      // Boost events with arbs (Story 9.5 AC5)
      if (arbsFound > 0) {
        boostEvent(odds.event.id, 'arb_detected')
      }
    }

    // Arb tracking is done once per pollTier call, not per-batch (see after batch loop)

    // Update event poll metadata (Story 9.5 AC5)
    const now = new Date().toISOString()
    for (const event of batch) {
      event.lastPolledAt = now
      event.pollCount++
    }

    lastPollAt = now
  }

  return {
    tier,
    eventsPolled: sortedEvents.length,
    arbsFound: totalArbsFound,
    latencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  }
}

// ============================================================================
// Cold Start
// ============================================================================

/**
 * Initialize cold start progress tracking.
 * Story 8.7 Task 4.1: Cold start behavior
 */
export function initColdStart(totalEvents: number): ColdStartProgress {
  coldStartProgress = {
    phase: 'discovering',
    totalEvents,
    processedEvents: 0,
    percentComplete: 0,
    estimatedRemainingSeconds: Math.ceil(totalEvents / 10) * 2, // Rough estimate
    currentTier: null
  }
  return coldStartProgress
}

/**
 * Update cold start progress.
 */
export function updateColdStartProgress(processedEvents: number): void {
  if (!coldStartProgress) {
    return
  }

  coldStartProgress.processedEvents = processedEvents
  coldStartProgress.percentComplete = Math.floor(
    (processedEvents / coldStartProgress.totalEvents) * 100
  )

  const remainingEvents = coldStartProgress.totalEvents - processedEvents
  coldStartProgress.estimatedRemainingSeconds = Math.ceil(remainingEvents / 10) * 2
}

/**
 * Get current cold start progress.
 */
export function getColdStartProgress(): ColdStartProgress | null {
  return coldStartProgress
}

/**
 * Complete cold start.
 */
export function completeColdStart(): void {
  if (coldStartProgress) {
    coldStartProgress.phase = 'complete'
    coldStartProgress.percentComplete = 100
    coldStartProgress.estimatedRemainingSeconds = 0
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

export const __test = {
  resetState(): void {
    stopAggressiveScan()
    config = { ...DEFAULT_AGGRESSIVE_SCAN_CONFIG }
    quotaConfig = createQuotaConfig('paid')
    HOURLY_REQUEST_LIMIT = 5000
    tieredEventCache.clear()
    oddsCache.clear()
    boostedEvents.clear()
    quotaBudget = null
    pollsThisHour = 0
    arbsFoundThisHour = 0
    arbsFoundTotal = 0
    totalPollLatencyMs = 0
    lastPollAt = null
    scanStartedAt = null
    coldStartProgress = null
    cachedBookmakers = null // Reset bookmaker cache
  },

  getTierCache(): Map<EventTier, Map<string, TieredEvent>> {
    return tieredEventCache
  },

  getOddsCache(): Map<string, CachedEventWithOdds> {
    return oddsCache
  },

  getBoostedEvents(): Map<string, EventBoostInfo> {
    return boostedEvents
  },

  getQuotaBudget(): QuotaBudget | null {
    return quotaBudget
  },

  setQuotaBudget(budget: QuotaBudget): void {
    quotaBudget = budget
  },

  getConfig(): AggressiveScanConfig {
    return { ...config }
  },

  getQuotaConfig(): QuotaConfig {
    return { ...quotaConfig }
  },

  setHourlyLimit(limit: number): void {
    HOURLY_REQUEST_LIMIT = limit
  },

  // Story 9.5: Test helper to get bookmaker cache
  getBookmakerCache(): { fetchedAtMs: number; bookmakers: string[] } | null {
    return cachedBookmakers
  },

  // Story 9.5: Test helper to set bookmaker cache
  setBookmakerCache(cache: { fetchedAtMs: number; bookmakers: string[] } | null): void {
    cachedBookmakers = cache
  },

  // Story 9.5.5: Test helpers for discovery timer + polling loops
  getTierPollTimerCount(): number {
    return tierPollTimers.size
  },

  getEventDiscoveryIntervalMsActive(): number | null {
    return eventDiscoveryIntervalMsActive
  }
}
