import { net } from 'electron'
import {
  inferMarketMetadata,
  isKnownMarketPattern,
  type ArbitrageOpportunity,
  type DeepScanConfig,
  type DeepScanProgress,
  type MarketGroup,
  type ProviderId,
  type ScanHistoryEntry,
  type DeepScanQuotaStatus,
  type OddsTrend,
  type OddsSnapshot
} from '../../../shared/types'
// Story 8.7: Re-export types for API consumers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { 
  AggressiveScanConfig as _AggressiveScanConfig, 
  AggressiveScanStats as _AggressiveScanStats, 
  EventTier as _EventTier, 
  TieredEvent as _TieredEvent, 
  ColdStartProgress as _ColdStartProgress 
} from '../../../shared/types'
import { deepScanConfigSchema } from '../../../shared/schemas'
import { getApiKeyForAdapter } from '../credentials'
import { scheduleProviderRequest } from './poller'
import { getSelectedBookmakers } from './odds-api-io-bookmakers'
import { createCorrelationId, logDebug, logInfo, logWarn, type StructuredLogBase } from './logger'
import { calculateTwoLegArbitrageRoi, detectCardRulesMismatch, clearCardRulesCache } from './calculator'
// Story 8.7: Aggressive Pre-Match Scanning
import {
  startAggressiveScan,
  stopAggressiveScan,
  isAggressiveScanRunning,
  setAggressiveScanConfig,
  getAggressiveScanConfig,
  getAggressiveScanStats,
  initColdStart,
  updateColdStartProgress,
  getColdStartProgress,
  completeColdStart,
  upsertTieredEvent,
  boostEvent,
  isEventBoosted,
  getBoostedEventIds,
  getEventCountsByTier,
  getTotalEventCount,
  calculateEventTier,
  calculateMinutesToKickoff,
  isPreMatchEvent,
  createTieredEvent,
  getEventsForTier,
  getEventById,
  promoteEvents
} from './aggressiveScan'

const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_EVENTS_PATH = '/v3/events'
const ODDS_API_IO_ODDS_PATH = '/v3/odds'
// Story 7.8: New API endpoints for efficiency
const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi'
const ODDS_API_IO_ODDS_UPDATED_PATH = '/v3/odds/updated'
const ODDS_API_IO_EVENTS_LIVE_PATH = '/v3/events/live'
// Story 7.9: Sports and leagues discovery endpoints
const ODDS_API_IO_SPORTS_PATH = '/v3/sports'
const ODDS_API_IO_LEAGUES_PATH = '/v3/leagues'
const DEEP_SCAN_PROVIDER_ID: ProviderId = 'odds-api-io'

// Story 7.8: Batch fetching constants
const BATCH_SIZE_MAX = 10 // API limit for /v3/odds/multi
const DEFAULT_SCAN_HORIZON_HOURS = 4

export interface DeepScanEvent {
  id: string
  name: string
  date?: string
  league?: string
  sport?: string
}

interface ScanCacheEntry {
  scannedAt: number
  bookmakerHash: string
}

export const SCAN_CACHE_TTL_MS_DEFAULT = 5 * 60 * 1000
export const CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE = 50
export const CONTINUOUS_SCAN_MIN_INTERVAL_MS = 60_000
const CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT = 10

let scanCacheTtlMs = SCAN_CACHE_TTL_MS_DEFAULT
let continuousScanBatchSize = CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT
let scanIntervalMinutes = 5
let concurrentRequests = 2
let scanScope: 'all-sports' | 'selected-sports' | 'selected-leagues' = 'all-sports'

// Story 7.8: API efficiency settings
let useBatchOdds = true
let useIncrementalUpdates = true
let scanHorizonHours = DEFAULT_SCAN_HORIZON_HOURS
let scanMode: 'all' | 'live' | 'upcoming' = 'all'
let marketFreshnessThresholdMinutes = 5
// Track last fetch timestamp for incremental updates
let lastIncrementalFetchTimestamp: string | null = null

const HOURLY_REQUEST_LIMIT = 5000
const HOURLY_WARN_THRESHOLD = 0.8
const HOURLY_THROTTLE_THRESHOLD = 0.9

type EventResolver = (args: {
  config: DeepScanConfig
  apiKey: string
  signal: AbortSignal
  correlationId: string
}) => Promise<DeepScanEvent[]>

type EventsFetcher = (args: {
  apiKey: string
  signal: AbortSignal
  correlationId: string
  page?: number
  sport?: string
  // Story 7.8: Time-range filtering parameters
  from?: string // ISO timestamp
  to?: string   // ISO timestamp
}) => Promise<unknown>

type OddsFetcher = (args: {
  event: DeepScanEvent
  apiKey: string
  bookmakers: string[]
  signal: AbortSignal
  correlationId: string
}) => Promise<unknown>

// Story 7.8: Batch odds fetcher type for /v3/odds/multi endpoint
type BatchOddsFetcher = (args: {
  events: DeepScanEvent[]
  apiKey: string
  bookmakers: string[]
  signal: AbortSignal
  correlationId: string
}) => Promise<BatchOddsResponse>

// Story 7.8: Live events fetcher type for /v3/events/live endpoint
type LiveEventsFetcher = (args: {
  apiKey: string
  signal: AbortSignal
  correlationId: string
  sport?: string
}) => Promise<unknown>

// Story 7.8: Incremental odds fetcher type for /v3/odds/updated endpoint
type IncrementalOddsFetcher = (args: {
  apiKey: string
  signal: AbortSignal
  correlationId: string
  since: string // ISO timestamp
  bookmakers?: string[]
}) => Promise<unknown>

// Story 7.8: Batch odds response structure matching API
interface BatchOddsResponse {
  results: Array<{
    eventId: string
    success: boolean
    data?: unknown
    error?: string
  }>
}

type BookmakersResolver = (args: { config: DeepScanConfig; apiKey: string }) => Promise<string[]>

let currentScan: DeepScanProgress | null = null
let manualResults: ArbitrageOpportunity[] = []
let continuousResults: ArbitrageOpportunity[] = []
let manualAbortController: AbortController | null = null
let continuousAbortController: AbortController | null = null
let manualCorrelationId: string | null = null
let continuousCorrelationId: string | null = null
let manualScanPromise: Promise<void> | null = null
let continuousScanPromise: Promise<void> | null = null

let manualScanInProgress = false
let continuousDeepScanEnabled = true
let isContinuousScanActive = false
let continuousScanQueued = false
let lastContinuousScanAt: string | null = null
let lastContinuousScanStartedAtMs: number | null = null
let currentScanMode: 'manual' | 'continuous' = 'manual'
let minIntervalTimer: ReturnType<typeof setTimeout> | null = null

let lastThresholdConfig: Pick<DeepScanConfig, 'minRoi' | 'marketGroupThresholds' | 'maxConcurrentRequests'> = {}
let continuousScanMaxEventsPerCycle = CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE

const scanCache = new Map<string, ScanCacheEntry>()

// Story 7.8: Odds Movement History Buffer
// Maps opportunity ID to historical snapshots (max 3 per opportunity)
const oddsHistoryBuffer = new Map<string, OddsSnapshot[]>()
const ODDS_HISTORY_MAX_SNAPSHOTS = 3
// Threshold for determining if ROI change is significant (0.1% = 0.001)
const ODDS_TREND_THRESHOLD = 0.001

/**
 * Story 7.8: Calculate odds trend based on historical snapshots.
 * Compares the most recent ROI to the oldest in history:
 * - 'improving': ROI increased by more than threshold
 * - 'worsening': ROI decreased by more than threshold
 * - 'stable': ROI change is within threshold
 */
function calculateOddsTrend(history: OddsSnapshot[], currentRoi: number): OddsTrend {
  if (history.length === 0) {
    return 'stable' // No history, default to stable
  }
  // Compare current ROI to the oldest snapshot (first in array)
  const oldestRoi = history[0].roi
  const roiDelta = currentRoi - oldestRoi

  if (roiDelta > ODDS_TREND_THRESHOLD) {
    return 'improving'
  } else if (roiDelta < -ODDS_TREND_THRESHOLD) {
    return 'worsening'
  }
  return 'stable'
}

/**
 * Story 7.8: Update the odds history buffer for an opportunity.
 * Maintains a sliding window of the most recent N snapshots.
 * Returns the updated history array (including the new snapshot).
 */
function updateOddsHistory(
  opportunityId: string,
  currentRoi: number,
  legOdds: [number, number],
  timestamp: string
): OddsSnapshot[] {
  const existing = oddsHistoryBuffer.get(opportunityId) || []

  const newSnapshot: OddsSnapshot = {
    roi: currentRoi,
    timestamp,
    legOdds
  }

  // Add new snapshot to the end
  const updated = [...existing, newSnapshot]

  // Keep only the most recent N snapshots
  if (updated.length > ODDS_HISTORY_MAX_SNAPSHOTS) {
    updated.shift() // Remove oldest
  }

  oddsHistoryBuffer.set(opportunityId, updated)
  return updated
}

// Story 7.7: Best Odds Cache for Odds Comparison View
interface BestOddsCacheEntry {
  data: Array<{
    eventId: string
    marketKey: string
    marketLabel: string
    marketGroup: MarketGroup
    outcomes: Array<{
      outcome: string
      bestBookmaker: string
      bestOdds: number
      allBookmakers: Array<{ bookmaker: string; odds: number }>
    }>
    hasArbitrage: boolean
    arbitrageRoi?: number
  }>
  cachedAt: number
}

const bestOddsCache = new Map<string, BestOddsCacheEntry>()
const BEST_ODDS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Story 8.1: Raw Odds Cache for Odds Browser
interface RawOddsCacheEntry {
  payload: RawOddsPayload
  cachedAt: number
}

const rawOddsCache = new Map<string, RawOddsCacheEntry>()
const RAW_ODDS_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const RAW_ODDS_CACHE_MAX_ENTRIES = 1000 // Limit cache size

/**
 * Cache raw odds for an event.
 * Called when processing odds data during Deep Scan.
 */
function cacheRawOdds(eventId: string, payload: RawOddsPayload): void {
  // Cleanup expired entries before adding new ones
  cleanupRawOddsCache()
  
  // Enforce max entries limit (remove oldest if needed)
  if (rawOddsCache.size >= RAW_ODDS_CACHE_MAX_ENTRIES) {
    const oldestKey = rawOddsCache.keys().next().value
    if (oldestKey !== undefined) {
      rawOddsCache.delete(oldestKey)
    }
  }
  
  rawOddsCache.set(eventId, { payload, cachedAt: nowMs() })
}

/**
 * Get all cached raw odds.
 * Returns array of all non-expired raw odds payloads.
 * Story 8.1: Exported for TRPC endpoint.
 */
export function getAllRawOdds(): RawOddsPayload[] {
  cleanupRawOddsCache()
  return Array.from(rawOddsCache.values()).map(entry => entry.payload)
}

/**
 * Cleanup expired raw odds cache entries.
 */
function cleanupRawOddsCache(): void {
  const now = nowMs()
  for (const [eventId, entry] of rawOddsCache.entries()) {
    if (now - entry.cachedAt > RAW_ODDS_CACHE_TTL_MS) {
      rawOddsCache.delete(eventId)
    }
  }
}

/**
 * Clear raw odds cache.
 * Called when scan cache is cleared or bookmakers change.
 */
export function clearRawOddsCache(): void {
  rawOddsCache.clear()
}

let timeOffsetMs = 0

let hourlyWindowStartedAtMs: number | null = null
let hourlyRequestsUsed = 0
let hourlyWarnLogged = false

// Story 7.8: Rate limit headers from API responses
let apiRateLimit: { limit: number; remaining: number; resetAt: string } | null = null
let apiRateLimitLastUpdatedAtMs: number | null = null
const API_RATE_LIMIT_TTL_MS = 60 * 1000 // 1 minute TTL for API rate limit data

let dailyStatsKey: string | null = null
let dailyEventsScanned = 0
let dailyOpportunitiesFound = 0
let dailyRequestsMade = 0

// Story 7.6: Pause/Resume state
let continuousScanPaused = false

// Story 7.6: Scan history ring buffer (max 5 entries)
const MAX_HISTORY_ENTRIES = 5
const scanHistory: ScanHistoryEntry[] = []

let lastDiscoveredSports: string[] = []
let enabledSportsFilter: string[] = []
let enabledLeaguesFilter: string[] = []

let eventResolverOverride: EventResolver | null = null
let eventsFetcherOverride: EventsFetcher | null = null
let oddsFetcherOverride: OddsFetcher | null = null
let bookmakersResolverOverride: BookmakersResolver | null = null
// Story 7.8: Batch, live, and incremental fetcher overrides for testing
let batchOddsFetcherOverride: BatchOddsFetcher | null = null
let liveEventsFetcherOverride: LiveEventsFetcher | null = null
let incrementalOddsFetcherOverride: IncrementalOddsFetcher | null = null

const SPORT_SLUG_ALIAS_MAP: Record<string, string> = {
  // Odds-API.io uses "football" as the sport slug for soccer/football.
  soccer: 'football',
  futbol: 'football',
  'association-football': 'football'
}

// Story 7.9: League presets for quick configuration
// These are the league slugs used by odds-api.io with good bookmaker coverage
export interface LeaguePreset {
  id: string
  name: string
  description: string
  sport: string
  leagues: string[]
}

export const LEAGUE_PRESETS: LeaguePreset[] = [
  {
    id: 'top-5-european',
    name: 'Top 5 European Leagues',
    description: 'Premier League, La Liga, Serie A, Bundesliga, Ligue 1',
    sport: 'football',
    leagues: [
      'england-premier-league',
      'spain-la-liga',
      'italy-serie-a',
      'germany-bundesliga',
      'france-ligue-1'
    ]
  },
  {
    id: 'european-elite',
    name: 'European Elite',
    description: 'Top 5 + Champions League, Europa League, Conference League',
    sport: 'football',
    leagues: [
      'england-premier-league',
      'spain-la-liga',
      'italy-serie-a',
      'germany-bundesliga',
      'france-ligue-1',
      'europe-champions-league',
      'europe-europa-league',
      'europe-conference-league'
    ]
  },
  {
    id: 'major-european',
    name: 'Major European',
    description: 'Top 5 + Portugal, Netherlands, Belgium, Turkey, Scotland',
    sport: 'football',
    leagues: [
      'england-premier-league',
      'spain-la-liga',
      'italy-serie-a',
      'germany-bundesliga',
      'france-ligue-1',
      'portugal-primeira-liga',
      'netherlands-eredivisie',
      'belgium-first-division-a',
      'turkey-super-lig',
      'scotland-premiership'
    ]
  },
  {
    id: 'english-football',
    name: 'English Football',
    description: 'Premier League, Championship, League One, League Two',
    sport: 'football',
    leagues: [
      'england-premier-league',
      'england-championship',
      'england-league-one',
      'england-league-two',
      'england-fa-cup',
      'england-efl-cup'
    ]
  },
  {
    id: 'international',
    name: 'International',
    description: 'World Cup, Euro, Nations League, WC Qualifiers',
    sport: 'football',
    leagues: [
      'world-world-cup',
      'europe-euro',
      'europe-nations-league',
      'world-world-cup-qualification',
      'south-america-copa-america',
      'africa-africa-cup-of-nations'
    ]
  }
]

// Story 7.9: Discovered leagues cache (populated by API calls)
export interface DiscoveredLeague {
  name: string
  slug: string
  eventsCount: number
  sport: string
}

export interface DiscoveredSport {
  name: string
  slug: string
}

let lastDiscoveredLeagues: DiscoveredLeague[] = []
let lastDiscoveredSportsDetails: DiscoveredSport[] = []

import type { RawOddsPayload } from '../../../shared/types'

// Type re-exports for local usage (ensures consistency with shared types)
type RawOutcome = RawOddsPayload['bookmakers'][number]['markets'][number]['outcomes'][number]
type RawMarket = RawOddsPayload['bookmakers'][number]['markets'][number]
type RawBookmaker = RawOddsPayload['bookmakers'][number]

interface Quote {
  bookmaker: string
  outcomeKey: string
  odds: number
}

function nowMs(): number {
  return Date.now() + timeOffsetMs
}

function nowIso(): string {
  return new Date(nowMs()).toISOString()
}

function toDailyKey(ms: number): string {
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ensureDailyStats(ms: number): void {
  const key = toDailyKey(ms)
  if (dailyStatsKey === key) {
    return
  }
  dailyStatsKey = key
  dailyEventsScanned = 0
  dailyOpportunitiesFound = 0
  dailyRequestsMade = 0
}

function ensureHourlyWindow(ms: number): void {
  if (hourlyWindowStartedAtMs === null || ms - hourlyWindowStartedAtMs >= 60 * 60 * 1000) {
    hourlyWindowStartedAtMs = ms
    hourlyRequestsUsed = 0
    hourlyWarnLogged = false
  }
}

function recordContinuousRequest(): void {
  const ms = nowMs()
  ensureHourlyWindow(ms)
  ensureDailyStats(ms)
  hourlyRequestsUsed += 1
  dailyRequestsMade += 1
}

function recordContinuousRequestWithWarnings(correlationId: string): void {
  const before = getHourlyQuotaStatus()
  recordContinuousRequest()
  const after = getHourlyQuotaStatus()
  if (!hourlyWarnLogged && after.percentUsed >= HOURLY_WARN_THRESHOLD && before.percentUsed < HOURLY_WARN_THRESHOLD) {
    hourlyWarnLogged = true
    logWarn('continuousScan.quota.warn', {
      context: 'service:deepScan',
      operation: 'recordContinuousRequest',
      providerId: DEEP_SCAN_PROVIDER_ID,
      correlationId,
      durationMs: null,
      errorCategory: null,
      hourlyRequestsUsed: after.used,
      hourlyRequestLimit: after.limit,
      percentUsed: Number((after.percentUsed * 100).toFixed(1))
    } satisfies StructuredLogBase)
  }
}

function recordContinuousEventScanned(count = 1): void {
  const ms = nowMs()
  ensureDailyStats(ms)
  dailyEventsScanned += Math.max(0, count)
}

function recordContinuousOpportunitiesFound(delta: number): void {
  const ms = nowMs()
  ensureDailyStats(ms)
  if (delta > 0) {
    dailyOpportunitiesFound += delta
  }
}

function getHourlyQuotaStatus(): {
  used: number
  limit: number
  percentUsed: number
  windowStartedAtMs: number
  apiRateLimit?: { limit: number; remaining: number; resetAt: string }
  isApiQuota: boolean
} {
  const ms = nowMs()
  ensureHourlyWindow(ms)
  const started = hourlyWindowStartedAtMs ?? ms

  // Story 7.8: Use API rate limit values if available and not expired
  if (apiRateLimit && apiRateLimitLastUpdatedAtMs) {
    const ageMs = ms - apiRateLimitLastUpdatedAtMs
    if (ageMs < API_RATE_LIMIT_TTL_MS) {
      const percentUsed = apiRateLimit.limit > 0
        ? (apiRateLimit.limit - apiRateLimit.remaining) / apiRateLimit.limit
        : 0
      return {
        used: apiRateLimit.limit - apiRateLimit.remaining,
        limit: apiRateLimit.limit,
        percentUsed: percentUsed > 0 ? percentUsed : 0,
        windowStartedAtMs: started,
        apiRateLimit,
        isApiQuota: true
      }
    }
  }

  // Fall back to estimated quota
  const percentUsed = HOURLY_REQUEST_LIMIT > 0 ? hourlyRequestsUsed / HOURLY_REQUEST_LIMIT : 0
  return {
    used: hourlyRequestsUsed,
    limit: HOURLY_REQUEST_LIMIT,
    percentUsed: percentUsed > 0 ? percentUsed : 0,
    windowStartedAtMs: started,
    isApiQuota: false
  }
}

/**
 * Story 7.8: Parse rate limit headers from API response.
 * Updates apiRateLimit state when valid headers are found.
 * Headers expected: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */
function parseRateLimitHeaders(response: Response): void {
  try {
    const limitHeader = response.headers.get('X-RateLimit-Limit') ?? response.headers.get('x-ratelimit-limit')
    const remainingHeader = response.headers.get('X-RateLimit-Remaining') ?? response.headers.get('x-ratelimit-remaining')
    const resetHeader = response.headers.get('X-RateLimit-Reset') ?? response.headers.get('x-ratelimit-reset')

    if (limitHeader && remainingHeader) {
      const limit = parseInt(limitHeader, 10)
      const remaining = parseInt(remainingHeader, 10)

      if (!Number.isNaN(limit) && !Number.isNaN(remaining) && limit > 0) {
        let resetAt: string
        if (resetHeader) {
          // Try to parse as Unix timestamp (seconds) or ISO string
          const resetNum = parseInt(resetHeader, 10)
          if (!Number.isNaN(resetNum)) {
            // Unix timestamp in seconds
            resetAt = new Date(resetNum * 1000).toISOString()
          } else {
            // Try as ISO string
            resetAt = resetHeader
          }
        } else {
          // Default: 1 hour from now
          resetAt = new Date(nowMs() + 60 * 60 * 1000).toISOString()
        }

        apiRateLimit = { limit, remaining, resetAt }
        apiRateLimitLastUpdatedAtMs = nowMs()

        logDebug('deepScan.rateLimit.parsed', {
          context: 'service:deepScan',
          operation: 'parseRateLimitHeaders',
          providerId: DEEP_SCAN_PROVIDER_ID,
          correlationId: undefined,
          durationMs: null,
          errorCategory: null,
          limit,
          remaining,
          resetAt
        } satisfies StructuredLogBase)
      }
    }
  } catch {
    // Ignore parsing errors - fall back to estimated quota
  }
}

function computeContinuousEventBudget(availableEvents: number): number {
  const base = Math.max(0, Math.min(continuousScanMaxEventsPerCycle, availableEvents))
  if (base === 0) return 0

  const quota = getHourlyQuotaStatus()
  const percent = quota.percentUsed

  // Story 7.8: Auto-throttle based on remaining quota percentage
  // Use actual API quota when available for more accurate throttling
  if (quota.isApiQuota && quota.apiRateLimit) {
    const remainingPercent = quota.apiRateLimit.remaining / quota.apiRateLimit.limit

    // Severe throttling when < 5% remaining
    if (remainingPercent < 0.05) {
      return Math.min(base, 5)
    }
    // Aggressive throttling when < 10% remaining
    if (remainingPercent < 0.10) {
      return Math.min(base, 10)
    }
    // Moderate throttling when < 20% remaining
    if (remainingPercent < 0.20) {
      return Math.min(base, 20)
    }
  }

  // Fallback to estimated quota throttling
  if (percent >= HOURLY_THROTTLE_THRESHOLD) {
    return Math.min(base, 10)
  }

  return base
}

function computeBookmakerHash(bookmakers: string[]): string {
  const normalized = bookmakers.map((b) => b.trim()).filter(Boolean).sort()
  return normalized.join('|')
}

export function clearScanCache(reason: string): void {
  scanCache.clear()
  logInfo('continuousScan.cache.clear', {
    context: 'service:deepScan',
    operation: 'clearScanCache',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    reason
  } satisfies StructuredLogBase)
}

export function shouldScanEvent(eventId: string, bookmakers: string[]): boolean {
  const now = nowMs()
  const entry = scanCache.get(eventId)
  const bookmakerHash = computeBookmakerHash(bookmakers)

  if (!entry) {
    return true
  }

  const ageMs = now - entry.scannedAt
  const isExpired = ageMs >= scanCacheTtlMs
  const hashChanged = entry.bookmakerHash !== bookmakerHash

  if (isExpired || hashChanged) {
    scanCache.delete(eventId)
    return true
  }

  return false
}

function updateScanCache(eventId: string, bookmakers: string[]): void {
  scanCache.set(eventId, {
    scannedAt: nowMs(),
    bookmakerHash: computeBookmakerHash(bookmakers)
  })
}

function chunk<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, size)
  const result: T[][] = []
  for (let index = 0; index < items.length; index += safeSize) {
    result.push(items.slice(index, index + safeSize))
  }
  return result
}

function clearMinIntervalTimer(): void {
  if (minIntervalTimer) {
    clearTimeout(minIntervalTimer)
    minIntervalTimer = null
  }
}

function idleProgress(): DeepScanProgress {
  return {
    status: 'idle',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    marketsScanned: 0,
    marketGroupsWithArbs: [],
    startedAt: null,
    elapsedMs: 0,
    mode: 'manual',
    lastContinuousScanAt: lastContinuousScanAt ?? undefined,
    isContinuousScanActive,
    isPaused: continuousScanPaused
  } as DeepScanProgress
}

function computeElapsedMs(startedAt: string | null): number {
  if (!startedAt) return 0
  const started = new Date(startedAt).getTime()
  if (!Number.isFinite(started)) return 0
  const diff = nowMs() - started
  return diff > 0 ? diff : 0
}

function updateProgress(patch: Partial<DeepScanProgress>): void {
  const patchMode = (patch as { mode?: 'manual' | 'continuous' }).mode
  const currentMode = (currentScan as { mode?: 'manual' | 'continuous' } | null)?.mode
  if (manualScanInProgress && patchMode === 'continuous' && currentMode === 'manual') {
    return
  }

  const base = currentScan ?? idleProgress()
  const next: DeepScanProgress = {
    ...base,
    ...patch
  }

  next.elapsedMs = computeElapsedMs(next.startedAt)
  ;(next as DeepScanProgress & { lastContinuousScanAt?: string; isContinuousScanActive?: boolean }).lastContinuousScanAt =
    lastContinuousScanAt ?? (next as { lastContinuousScanAt?: string }).lastContinuousScanAt
  ;(next as DeepScanProgress & { isContinuousScanActive?: boolean }).isContinuousScanActive =
    isContinuousScanActive
  currentScan = next
}

function ensureScope(config: DeepScanConfig): void {
  if (config.eventIds?.length || config.leagueId || config.sportSlug) {
    return
  }
  throw new Error('Deep scan requires at least one of eventIds, leagueId, or sportSlug')
}

function isAbortError(error: unknown): boolean {
  const err = error as { name?: string; message?: string }
  return err?.name === 'AbortError' || /abort/i.test(err?.message ?? '')
}

function getStatusCode(error: unknown): number | undefined {
  const err = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } }
  const direct = typeof err.status === 'number' ? err.status : undefined
  if (direct) return direct
  const code = typeof err.statusCode === 'number' ? err.statusCode : undefined
  if (code) return code
  const responseStatus = typeof err.response?.status === 'number' ? err.response.status : undefined
  return responseStatus
}

function createHttpError(status: number, message: string): Error {
  const error = new Error(message)
  ;(error as { status?: number }).status = status
  return error
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new Error('aborted'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function getHttpFetch(): typeof fetch {
  if (typeof net?.fetch === 'function') {
    return net.fetch as unknown as typeof fetch
  }

  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis)
  }

  throw new Error('No fetch implementation available for deep scan')
}

async function trackedRequest<T>(
  fn: (context: { correlationId: string }) => Promise<T>,
  correlationId: string,
  options: { mode?: 'manual' | 'continuous' } = {}
): Promise<T> {
  const mode = options.mode ?? 'manual'

  updateProgress({ requestsMade: (currentScan?.requestsMade ?? 0) + 1 })

  if (mode === 'continuous') {
    recordContinuousRequestWithWarnings(correlationId)
  }

  return scheduleProviderRequest(DEEP_SCAN_PROVIDER_ID, () => fn({ correlationId }))
}

function extractEvents(
  payload: unknown,
  defaults: { league?: string; sport?: string } = {}
): DeepScanEvent[] {
  const candidates: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] }).data)
      ? ((payload as { data: unknown[] }).data as unknown[])
      : Array.isArray((payload as { events?: unknown[] }).events)
        ? ((payload as { events: unknown[] }).events as unknown[])
        : []

  const seen = new Set<string>()
  const events: DeepScanEvent[] = []

  for (const item of candidates) {
    if (!item || typeof item !== 'object') continue
    const rawId = (item as { id?: unknown; eventId?: unknown }).id ?? (item as { eventId?: unknown }).eventId
    const id = rawId != null ? String(rawId) : ''
    if (!id || seen.has(id)) continue

    const homeCandidate =
      (item as { home?: unknown }).home ??
      (item as { home_team?: unknown }).home_team ??
      (item as { event?: { home?: unknown; home_team?: unknown } }).event?.home ??
      (item as { event?: { home_team?: unknown } }).event?.home_team
    const awayCandidate =
      (item as { away?: unknown }).away ??
      (item as { away_team?: unknown }).away_team ??
      (item as { event?: { away?: unknown; away_team?: unknown } }).event?.away ??
      (item as { event?: { away_team?: unknown } }).event?.away_team
    const inferredName =
      typeof homeCandidate === 'string' &&
      homeCandidate.trim().length &&
      typeof awayCandidate === 'string' &&
      awayCandidate.trim().length
        ? `${homeCandidate.trim()} vs ${awayCandidate.trim()}`
        : null

    const rawName =
      (item as { name?: unknown }).name ??
      (item as { event?: { name?: unknown } }).event?.name ??
      inferredName ??
      id
    const name = typeof rawName === 'string' && rawName.trim().length ? rawName : id
    const rawDate =
      (item as { date?: unknown }).date ??
      (item as { commence_time?: unknown }).commence_time ??
      (item as { event?: { date?: unknown } }).event?.date
    const date = typeof rawDate === 'string' && rawDate.trim().length ? rawDate : undefined

    const leagueCandidate =
      (item as { league?: unknown }).league ??
      (item as { event?: { league?: unknown } }).event?.league ??
      defaults.league
    const rawLeague =
      typeof leagueCandidate === 'object' && leagueCandidate !== null
        ? ((leagueCandidate as { name?: unknown; slug?: unknown }).name ??
          (leagueCandidate as { slug?: unknown }).slug)
        : leagueCandidate
    const league = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : undefined

    const sportCandidate = (item as { sport?: unknown }).sport ?? defaults.sport
    const rawSport =
      typeof sportCandidate === 'object' && sportCandidate !== null
        ? ((sportCandidate as { name?: unknown; slug?: unknown }).slug ??
          (sportCandidate as { name?: unknown }).name)
        : sportCandidate
    const sport = typeof rawSport === 'string' && rawSport.trim().length ? rawSport : undefined
    seen.add(id)
    events.push({ id, name, date, league, sport })
  }

  return events
}

const defaultEventResolver: EventResolver = async ({ config, apiKey, signal, correlationId }) => {
  if (config.eventIds?.length) {
    return config.eventIds.map((id) => ({ id: String(id), name: String(id) }))
  }

  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_EVENTS_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)

  if (config.leagueId) {
    url.searchParams.set('league', config.leagueId)
  }
  if (config.sportSlug) {
    url.searchParams.set('sport', config.sportSlug)
  }

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: currentScanMode }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Events request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Events request failed with status ${response.status}`)
  }

  const body = (await response.json()) as unknown
  return extractEvents(body, { league: config.leagueId, sport: config.sportSlug })
}

const defaultEventsFetcher: EventsFetcher = async ({ apiKey, signal, correlationId, page, sport, from, to }) => {
  // CRITICAL: odds-api.io /v3/events endpoint requires 'sport' parameter
  // See: https://docs.odds-api.io/api-reference/events
  // Required params: apiKey, sport
  // Optional params: league, participantId, status, from, to, bookmaker
  if (!sport) {
    throw new Error(
      'Sport parameter is required for odds-api.io /events endpoint. ' +
      'This is an internal error - please report it.'
    )
  }

  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_EVENTS_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('sport', sport) // REQUIRED by the API
  if (typeof page === 'number' && Number.isFinite(page) && page > 0) {
    url.searchParams.set('page', String(Math.floor(page)))
  }

  // Story 7.8: Add time-range filtering parameters
  if (from) {
    url.searchParams.set('from', from)
  }
  if (to) {
    url.searchParams.set('to', to)
  }

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: 'continuous' }
  )

  // Story 7.8: Parse rate limit headers from API response
  if (response && typeof response === 'object' && 'headers' in response) {
    parseRateLimitHeaders(response as Response)
  }

  if (!response.ok) {
    const message = await response.text().catch(() => `Events request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Events request failed with status ${response.status}`)
  }

  return response.json()
}

function getEventsFetcher(): EventsFetcher {
  return eventsFetcherOverride ?? defaultEventsFetcher
}

// Story 7.9: Fetch available sports from odds-api.io
export async function fetchAvailableSports(args: {
  apiKey: string
  signal?: AbortSignal
  correlationId?: string
}): Promise<DiscoveredSport[]> {
  const { apiKey, signal, correlationId = 'fetch-sports' } = args
  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_SPORTS_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: 'continuous' }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Sports request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Sports request failed with status ${response.status}`)
  }

  const data = (await response.json()) as Array<{ name: string; slug: string }>
  const sports: DiscoveredSport[] = data.map((s) => ({
    name: s.name,
    slug: s.slug
  }))

  // Cache for later use
  lastDiscoveredSportsDetails = sports
  lastDiscoveredSports = sports.map((s) => s.slug)

  logInfo('deepScan.sports.fetched', {
    context: 'service:deepScan',
    operation: 'fetchAvailableSports',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    sportsCount: sports.length
  } satisfies StructuredLogBase)

  return sports
}

// Story 7.9: Fetch available leagues for a sport from odds-api.io
export async function fetchAvailableLeagues(args: {
  apiKey: string
  sport: string
  signal?: AbortSignal
  correlationId?: string
}): Promise<DiscoveredLeague[]> {
  const { apiKey, sport, signal, correlationId = 'fetch-leagues' } = args
  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_LEAGUES_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('sport', sport)

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: 'continuous' }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Leagues request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Leagues request failed with status ${response.status}`)
  }

  const data = (await response.json()) as Array<{ name: string; slug: string; eventsCount: number }>
  const leagues: DiscoveredLeague[] = data.map((l) => ({
    name: l.name,
    slug: l.slug,
    eventsCount: l.eventsCount,
    sport
  }))

  // Update cache - merge with existing for other sports
  const existingOtherSports = lastDiscoveredLeagues.filter((l) => l.sport !== sport)
  lastDiscoveredLeagues = [...existingOtherSports, ...leagues]

  logInfo('deepScan.leagues.fetched', {
    context: 'service:deepScan',
    operation: 'fetchAvailableLeagues',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    sport,
    leaguesCount: leagues.length
  } satisfies StructuredLogBase)

  return leagues
}

// Story 7.9: Get cached sports (detailed with names)
export function getAvailableSportsDetails(): DiscoveredSport[] {
  return [...lastDiscoveredSportsDetails]
}

// Story 7.9: Get cached leagues
export function getAvailableLeagues(): DiscoveredLeague[] {
  return [...lastDiscoveredLeagues]
}

// Story 7.9: Get league presets
export function getLeaguePresets(): LeaguePreset[] {
  return [...LEAGUE_PRESETS]
}

// Story 7.9: Apply a league preset
export function applyLeaguePreset(presetId: string): { success: boolean; error?: string } {
  const preset = LEAGUE_PRESETS.find((p) => p.id === presetId)
  if (!preset) {
    return { success: false, error: `Preset '${presetId}' not found` }
  }

  // Set the scope to selected-leagues
  scanScope = 'selected-leagues'

  // Set the sports filter to the preset's sport
  enabledSportsFilter = [preset.sport]

  // Set the leagues filter to the preset's leagues
  enabledLeaguesFilter = [...preset.leagues]

  logInfo('deepScan.preset.applied', {
    context: 'service:deepScan',
    operation: 'applyLeaguePreset',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: undefined,
    durationMs: null,
    errorCategory: null,
    presetId: preset.id,
    presetName: preset.name,
    leaguesCount: preset.leagues.length
  } satisfies StructuredLogBase)

  return { success: true }
}

function isUpcomingEvent(event: DeepScanEvent, now: number): boolean {
  if (!event.date) {
    return true
  }
  const ms = new Date(event.date).getTime()
  if (!Number.isFinite(ms)) {
    return true
  }
  return ms > now
}

function computePriorityTier(event: DeepScanEvent, now: number): number {
  if (!event.date) return 3
  const ms = new Date(event.date).getTime()
  if (!Number.isFinite(ms)) return 3

  const diffMs = ms - now
  if (diffMs <= 60 * 60 * 1000) {
    return 0
  }

  const nowKey = toDailyKey(now)
  const eventKey = toDailyKey(ms)
  if (eventKey === nowKey) {
    return 1
  }

  const tomorrowKey = toDailyKey(now + 24 * 60 * 60 * 1000)
  if (eventKey === tomorrowKey) {
    return 2
  }

  return 3
}

function sortEventsByPriority(events: DeepScanEvent[]): DeepScanEvent[] {
  const now = nowMs()
  return events
    .slice()
    .sort((a, b) => {
      const tierA = computePriorityTier(a, now)
      const tierB = computePriorityTier(b, now)
      if (tierA !== tierB) {
        return tierA - tierB
      }

      const timeA = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY
      const timeB = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY
      if (timeA !== timeB) {
        return timeA - timeB
      }

      return a.id.localeCompare(b.id)
    })
}

function extractNextPage(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const direct = (payload as { nextPage?: unknown }).nextPage
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return Math.floor(direct)
  }
  const paginationNext = (payload as { pagination?: { nextPage?: unknown } }).pagination?.nextPage
  if (typeof paginationNext === 'number' && Number.isFinite(paginationNext) && paginationNext > 0) {
    return Math.floor(paginationNext)
  }
  return null
}

function normalizeSportSlug(value: string): string {
  const normalized = value.trim().toLowerCase()
  return SPORT_SLUG_ALIAS_MAP[normalized] ?? normalized
}

export async function discoverAllEvents(args: {
  apiKey: string
  signal: AbortSignal
  correlationId: string
  sports?: string[]
}): Promise<DeepScanEvent[]> {
  const { apiKey, signal, correlationId, sports } = args
  const fetchEvents = getEventsFetcher()

  const seen = new Set<string>()
  const all: DeepScanEvent[] = []

  const requestedSports =
    Array.isArray(sports) && sports.length > 0
      ? sports.map((s) => normalizeSportSlug(s)).filter(Boolean)
      : ['football']

  const requestedSportsDeduped = Array.from(new Set(requestedSports))
  const sportsFilter = Array.isArray(sports) && sports.length > 0 ? new Set(requestedSportsDeduped) : null

  // Story 7.8: Calculate time-range filtering parameters based on scanHorizonHours
  // 0 = all events (no time filtering), otherwise filter by hours from now
  let fromTime: string | undefined
  let toTime: string | undefined
  if (scanHorizonHours > 0) {
    const now = new Date()
    fromTime = now.toISOString()
    const toDate = new Date(now.getTime() + scanHorizonHours * 60 * 60 * 1000)
    toTime = toDate.toISOString()
  }

  for (const sport of requestedSportsDeduped) {
    let page: number | null = null
    let pageGuard = 0

    do {
      const payload = await fetchEvents({
        apiKey,
        signal,
        correlationId,
        page: page ?? undefined,
        sport,
        from: fromTime,
        to: toTime
      })
      const extracted = extractEvents(payload, { sport })
      for (const event of extracted) {
        if (seen.has(event.id)) continue
        seen.add(event.id)
        all.push(event)
      }
      page = extractNextPage(payload)
      pageGuard += 1
    } while (page !== null && pageGuard < 5 && !signal.aborted)
  }

  const now = nowMs()
  const upcoming = all.filter((event) => {
    if (!isUpcomingEvent(event, now)) return false
    if (!sportsFilter) return true
    if (!event.sport) return true
    const normalizedEventSport = normalizeSportSlug(event.sport)
    return sportsFilter.has(normalizedEventSport)
  })

  const sorted = sortEventsByPriority(upcoming)

  const sportsCovered = Array.from(
    new Set(sorted.map((event) => event.sport).filter((value): value is string => Boolean(value)))
  )
  const datedEvents = sorted.filter((event) => typeof event.date === 'string')
  const minDate = datedEvents.reduce<string | null>((min, event) => {
    if (!event.date) return min
    if (!min || event.date < min) return event.date
    return min
  }, null)
  const maxDate = datedEvents.reduce<string | null>((max, event) => {
    if (!event.date) return max
    if (!max || event.date > max) return event.date
    return max
  }, null)

  // Track discovered sports for getAvailableSports query
  lastDiscoveredSports = sportsCovered

  logInfo('continuousScan.discovery', {
    context: 'service:deepScan',
    operation: 'discoverAllEvents',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    eventsDiscovered: sorted.length,
    sportsCovered,
    dateRange: {
      from: minDate,
      to: maxDate
    }
  } satisfies StructuredLogBase)

  return sorted
}

const defaultBookmakersResolver: BookmakersResolver = async ({ config, apiKey }) => {
  if (config.bookmakers?.length) {
    return Array.from(new Set(config.bookmakers.map((b) => b.trim()).filter(Boolean)))
  }

  const selected = await getSelectedBookmakers(apiKey)
  return selected
}

const defaultOddsFetcher: OddsFetcher = async ({ event, apiKey, bookmakers, signal, correlationId }) => {
  // CRITICAL: odds-api.io /v3/odds endpoint requires 'bookmakers' parameter
  // See: https://docs.odds-api.io/api-reference/odds
  // Required params: apiKey, eventId, bookmakers (comma-separated, max 30)
  if (!bookmakers.length) {
    throw new Error(
      'No bookmakers configured for Deep Scan. The odds-api.io /odds endpoint requires at least one bookmaker. ' +
      'Please select bookmakers in Settings (Odds-API.io bookmaker selection) and try again.'
    )
  }

  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_ODDS_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('eventId', event.id)
  // bookmakers is REQUIRED by the API (not optional) - always set it
  url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(',')) // API max: 30 bookmakers

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId
  )

  // Story 7.8: Parse rate limit headers from API response
  if (response && typeof response === 'object' && 'headers' in response) {
    parseRateLimitHeaders(response as Response)
  }

  if (!response.ok) {
    const message = await response.text().catch(() => `Odds request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Odds request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Story 7.8: Batch odds fetcher for /v3/odds/multi endpoint.
 * Fetches odds for up to 10 events in a single request.
 * Returns a BatchOddsResponse with per-event success/failure handling.
 */
const defaultBatchOddsFetcher: BatchOddsFetcher = async ({ events, apiKey, bookmakers, signal, correlationId }) => {
  if (!bookmakers.length) {
    throw new Error(
      'No bookmakers configured for Deep Scan. The odds-api.io /odds/multi endpoint requires at least one bookmaker. ' +
      'Please select bookmakers in Settings (Odds-API.io bookmaker selection) and try again.'
    )
  }

  if (events.length === 0) {
    return { results: [] }
  }

  // Clamp to API maximum of 10 events per batch
  const batchEvents = events.slice(0, BATCH_SIZE_MAX)
  const eventIds = batchEvents.map((e) => e.id).join(',')

  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_ODDS_MULTI_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('eventIds', eventIds)
  url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(','))

  logInfo('deepScan.batch.request', {
    context: 'service:deepScan',
    operation: 'fetchOddsMulti',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    eventCount: batchEvents.length,
    eventIds: batchEvents.map((e) => e.id),
    bookmakersCount: Math.min(bookmakers.length, 30)
  } satisfies StructuredLogBase)

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: currentScanMode }
  )

  // Story 7.8: Parse rate limit headers from API response
  if (response && typeof response === 'object' && 'headers' in response) {
    parseRateLimitHeaders(response as Response)
  }

  if (!response.ok) {
    const message = await response.text().catch(() => `Batch odds request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Batch odds request failed with status ${response.status}`)
  }

  const body = await response.json() as unknown

  // Parse batch response: array of event odds objects
  // Each item should have an eventId (or id) and bookmakers data
  const results = parseBatchOddsResponse(body, batchEvents)

  logInfo('deepScan.batch.response', {
    context: 'service:deepScan',
    operation: 'fetchOddsMulti',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    totalEvents: batchEvents.length,
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length
  } satisfies StructuredLogBase)

  return { results }
}

/**
 * Story 7.8: Parse batch odds response from /v3/odds/multi endpoint.
 * The API returns an array of EventResponse objects, one per requested event.
 * Events that fail may be missing from the response or have error fields.
 */
function parseBatchOddsResponse(
  body: unknown,
  requestedEvents: DeepScanEvent[]
): BatchOddsResponse['results'] {
  const results: BatchOddsResponse['results'] = []

  // Handle array response (expected format)
  if (Array.isArray(body)) {
    const seenEventIds = new Set<string>()

    for (const item of body) {
      if (!item || typeof item !== 'object') continue

      // Extract event ID from response item
      const rawId = (item as { id?: unknown; eventId?: unknown }).id ??
                    (item as { eventId?: unknown }).eventId
      const eventId = rawId != null ? String(rawId) : null

      if (!eventId) continue
      seenEventIds.add(eventId)

      // Check for error field in response
      const errorField = (item as { error?: unknown }).error
      if (typeof errorField === 'string' && errorField.length > 0) {
        results.push({ eventId, success: false, error: errorField })
        continue
      }

      // Successful response - item contains bookmakers data
      results.push({ eventId, success: true, data: item })
    }

    // Add failures for any requested events not in response
    for (const event of requestedEvents) {
      if (!seenEventIds.has(event.id)) {
        results.push({ eventId: event.id, success: false, error: 'Event not in batch response' })
      }
    }

    return results
  }

  // Handle object response with data array
  if (typeof body === 'object' && body !== null) {
    const dataArray = (body as { data?: unknown }).data
    if (Array.isArray(dataArray)) {
      return parseBatchOddsResponse(dataArray, requestedEvents)
    }

    // Single object response - treat as single event result
    const rawId = (body as { id?: unknown; eventId?: unknown }).id ??
                  (body as { eventId?: unknown }).eventId
    const eventId = rawId != null ? String(rawId) : requestedEvents[0]?.id

    if (eventId) {
      const errorField = (body as { error?: unknown }).error
      if (typeof errorField === 'string' && errorField.length > 0) {
        results.push({ eventId, success: false, error: errorField })
      } else {
        results.push({ eventId, success: true, data: body })
      }

      // Mark other events as failed
      for (const event of requestedEvents) {
        if (event.id !== eventId) {
          results.push({ eventId: event.id, success: false, error: 'Event not in batch response' })
        }
      }
    }
  }

  // Fallback: mark all events as failed
  if (results.length === 0) {
    for (const event of requestedEvents) {
      results.push({ eventId: event.id, success: false, error: 'Invalid batch response format' })
    }
  }

  return results
}

/**
 * Story 7.8: Live events fetcher for /v3/events/live endpoint.
 * Returns all currently live events across all sports (or filtered by sport).
 */
const defaultLiveEventsFetcher: LiveEventsFetcher = async ({ apiKey, signal, correlationId, sport }) => {
  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_EVENTS_LIVE_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  if (sport) {
    url.searchParams.set('sport', sport)
  }

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: currentScanMode }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Live events request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Live events request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Story 7.8: Get the batch odds fetcher (default or override for testing).
 * Exported for use in Task 2 integration.
 */
export function getBatchOddsFetcher(): BatchOddsFetcher {
  return batchOddsFetcherOverride ?? defaultBatchOddsFetcher
}

/**
 * Story 7.8: Get the live events fetcher (default or override for testing).
 * Exported for use in Task 5 integration.
 */
export function getLiveEventsFetcher(): LiveEventsFetcher {
  return liveEventsFetcherOverride ?? defaultLiveEventsFetcher
}

/**
 * Story 7.8: Incremental odds fetcher for /v3/odds/updated endpoint.
 * Returns only odds that have changed since the given timestamp.
 * Reduces data transfer on subsequent scans by fetching only updates.
 */
const defaultIncrementalOddsFetcher: IncrementalOddsFetcher = async ({
  apiKey,
  signal,
  correlationId,
  since,
  bookmakers
}) => {
  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_ODDS_UPDATED_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('since', since)
  if (bookmakers && bookmakers.length > 0) {
    url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(','))
  }

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: currentScanMode }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Incremental odds request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Incremental odds request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * Story 7.8: Get the incremental odds fetcher (default or override for testing).
 * Used to fetch only odds that have changed since a given timestamp.
 */
export function getIncrementalOddsFetcher(): IncrementalOddsFetcher {
  return incrementalOddsFetcherOverride ?? defaultIncrementalOddsFetcher
}

/**
 * Story 7.8: Get the last incremental fetch timestamp.
 * Returns null if no incremental fetch has been performed yet.
 */
export function getLastIncrementalFetchTimestamp(): string | null {
  return lastIncrementalFetchTimestamp
}

/**
 * Story 7.8: Update the last incremental fetch timestamp.
 * Called after a successful incremental or full fetch.
 */
export function setLastIncrementalFetchTimestamp(timestamp: string | null): void {
  lastIncrementalFetchTimestamp = timestamp
}

function isOpportunityArray(value: unknown): value is ArbitrageOpportunity[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const opp = item as ArbitrageOpportunity
    return typeof opp.id === 'string' && Array.isArray(opp.legs) && opp.legs.length === 2
  })
}

function formatLineValue(value: number): string {
  const rounded = Math.round(value * 100) / 100
  let formatted = rounded.toString()
  if (formatted.includes('e') || formatted.includes('E')) {
    formatted = rounded.toFixed(2)
  }
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '')
  }
  return formatted
}

function normalizeOutcomeName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (!normalized) return 'unknown'

  // Yes/No variants
  if (normalized === 'yes' || normalized === 'y') return 'yes'
  if (normalized === 'no' || normalized === 'n') return 'no'

  // Home/Away variants
  if (normalized === 'home' || normalized === '1' || normalized === 'team 1' || normalized === 'team1') return 'home'
  if (normalized === 'away' || normalized === '2' || normalized === 'team 2' || normalized === 'team2') return 'away'

  // Draw variants
  if (normalized === 'draw' || normalized === 'x') return 'draw'

  // Over/Under patterns with line extraction and suffix stripping
  if (normalized.startsWith('over')) {
    const line = extractLineFromOutcomeName(name)
    if (line !== undefined) {
      return `over_${formatLineValue(Math.abs(line))}`
    }
    const stripped = normalized.replace(/\s*goals?\s*$/i, '').trim()
    return stripped.replace(/\s+/g, '_')
  }
  if (normalized.startsWith('under')) {
    const line = extractLineFromOutcomeName(name)
    if (line !== undefined) {
      return `under_${formatLineValue(Math.abs(line))}`
    }
    const stripped = normalized.replace(/\s*goals?\s*$/i, '').trim()
    return stripped.replace(/\s+/g, '_')
  }

  // Handicap lines: "+1.5", "-1.5", "Home +1.5", etc.
  const handicapMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)$/)
  if (handicapMatch) {
    const raw = handicapMatch[1]
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed)) {
      return raw
    }
    const hadPlusSign = raw.startsWith('+')
    const formatted = formatLineValue(parsed)
    return hadPlusSign && parsed > 0 ? `+${formatted}` : formatted
  }
  // "Home +1.5" -> "home_+1.5"
  const teamHandicapMatch = normalized.match(/^(home|away|team\s*[12])\s*([+-]?\d+(?:\.\d+)?)$/i)
  if (teamHandicapMatch) {
    const team = teamHandicapMatch[1].toLowerCase().replace(/\s+/g, '')
    const rawLine = teamHandicapMatch[2]
    const parsedLine = Number.parseFloat(rawLine)
    const lineHadPlusSign = rawLine.startsWith('+')
    const formattedLine = Number.isFinite(parsedLine) ? formatLineValue(parsedLine) : rawLine
    const signedLine = lineHadPlusSign && parsedLine > 0 ? `+${formattedLine}` : formattedLine
    const normalizedTeam = team === 'team1' ? 'home' : team === 'team2' ? 'away' : team
    return `${normalizedTeam}_${signedLine}`
  }

  // BTTS variants
  if (normalized === 'both teams to score' || normalized === 'btts' || normalized === 'gg') {
    return 'yes'
  }
  if (normalized === 'not both teams to score' || normalized === 'no btts' || normalized === 'ng') {
    return 'no'
  }

  // Default: replace spaces with underscores
  return normalized.replace(/\s+/g, '_')
}

function extractLineFromOutcomeName(name: string): number | undefined {
  if (!name || typeof name !== 'string') {
    return undefined
  }

  const overUnderMatch = name.match(/\b(?:over|under)\s*([+-]?\d+(?:\.\d+)?)\b/i)
  if (overUnderMatch) {
    const parsed = Number.parseFloat(overUnderMatch[1])
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const genericNumberMatch = name.match(/\b([+-]?\d+(?:\.\d+)?)\b/)
  if (!genericNumberMatch) {
    return undefined
  }

  const parsed = Number.parseFloat(genericNumberMatch[1])
  return Number.isFinite(parsed) ? parsed : undefined
}

function summarizeRawOddsResult(result: unknown): {
  rawBookmakersCount: number
  rawMarketsCount: number
  rawOutcomesCount: number
  validBookmakersCount: number
  validMarketsCount: number
  validOutcomesCount: number
  dropReason?: string
  sampleBookmakers: Array<{
    name: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; odds: number }>
    }>
  }>
} {
  const emptySummary = {
    rawBookmakersCount: 0,
    rawMarketsCount: 0,
    rawOutcomesCount: 0,
    validBookmakersCount: 0,
    validMarketsCount: 0,
    validOutcomesCount: 0,
    sampleBookmakers: [] as Array<{
      name: string
      markets: Array<{
        key: string
        outcomes: Array<{ name: string; odds: number }>
      }>
    }>
  }

  if (!result || typeof result !== 'object') {
    return { ...emptySummary, dropReason: 'result_not_object' }
  }

  const rawBookmakers = (result as { bookmakers?: unknown }).bookmakers
  const isLegacyArray = Array.isArray(rawBookmakers)
  const isMapObject = !isLegacyArray && typeof rawBookmakers === 'object' && rawBookmakers !== null

  if (!isLegacyArray && !isMapObject) {
    return { ...emptySummary, dropReason: 'missing_bookmakers' }
  }

  const bookmakerEntries: Array<{ name: string; marketsRaw: unknown[] }> = []

  if (isLegacyArray) {
    const list = rawBookmakers as unknown[]
    if (list.length === 0) {
      return { ...emptySummary, dropReason: 'empty_bookmakers_array' }
    }
    for (const book of list) {
      if (!book || typeof book !== 'object') continue
      const nameCandidate =
        (book as { name?: unknown }).name ??
        (book as { key?: unknown }).key ??
        (book as { bookmaker?: unknown }).bookmaker
      const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate.trim() : null
      if (!name) continue
      const marketsRaw = Array.isArray((book as { markets?: unknown }).markets)
        ? ((book as { markets: unknown[] }).markets as unknown[])
        : []
      bookmakerEntries.push({ name, marketsRaw })
    }
  } else {
    const map = rawBookmakers as Record<string, unknown>
    const keys = Object.keys(map)
    if (keys.length === 0) {
      return { ...emptySummary, dropReason: 'empty_bookmakers_map' }
    }
    for (const [name, marketsContainer] of Object.entries(map)) {
      const trimmed = name.trim()
      if (!trimmed) continue
      const marketsRaw = Array.isArray(marketsContainer)
        ? marketsContainer
        : marketsContainer && typeof marketsContainer === 'object' && Array.isArray((marketsContainer as { markets?: unknown }).markets)
          ? ((marketsContainer as { markets: unknown[] }).markets as unknown[])
          : []
      bookmakerEntries.push({ name: trimmed, marketsRaw })
    }
  }

  if (bookmakerEntries.length === 0) {
    return { ...emptySummary, dropReason: isLegacyArray ? 'no_valid_bookmakers' : 'no_valid_bookmakers_map' }
  }

  let rawMarketsCount = 0
  let rawOutcomesCount = 0
  let validBookmakersCount = 0
  let validMarketsCount = 0
  let validOutcomesCount = 0
  const sampleBookmakers: Array<{
    name: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; odds: number }>
    }>
  }> = []

  for (const bookmaker of bookmakerEntries) {
    const name = bookmaker.name
    const marketsRaw = bookmaker.marketsRaw
    rawMarketsCount += marketsRaw.length

    const validMarketsForBook: Array<{ key: string; outcomes: Array<{ name: string; odds: number }> }> = []

    for (const market of marketsRaw) {
      if (!market || typeof market !== 'object') continue

      const keyCandidate =
        (market as { key?: unknown }).key ??
        (market as { name?: unknown }).name ??
        (market as { market?: unknown }).market
      const key = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate.trim() : null

      const legacyOutcomesRaw = Array.isArray((market as { outcomes?: unknown }).outcomes)
        ? ((market as { outcomes: unknown[] }).outcomes as unknown[])
        : null

      const oddsRowsRaw = Array.isArray((market as { odds?: unknown }).odds)
        ? ((market as { odds: unknown[] }).odds as unknown[])
        : null

      const outcomesRaw = legacyOutcomesRaw ?? oddsRowsRaw ?? []
      rawOutcomesCount += outcomesRaw.length

      if (!key) continue

      const validOutcomesForMarket: Array<{ name: string; odds: number }> = []

      if (legacyOutcomesRaw) {
        for (const outcome of legacyOutcomesRaw) {
          if (!outcome || typeof outcome !== 'object') continue
          const nameRaw = (outcome as { name?: unknown }).name
          const outcomeName = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw.trim() : null
          if (!outcomeName) continue
          const oddsRaw =
            (outcome as { odds?: unknown }).odds ??
            (outcome as { price?: unknown }).price ??
            (outcome as { decimal?: unknown }).decimal
          const odds =
            typeof oddsRaw === 'number'
              ? oddsRaw
              : typeof oddsRaw === 'string'
                ? Number.parseFloat(oddsRaw)
                : Number.NaN
          if (!Number.isFinite(odds) || odds <= 0) continue
          validOutcomesForMarket.push({ name: outcomeName, odds })
        }
      } else if (oddsRowsRaw) {
        for (const row of oddsRowsRaw) {
          if (!row || typeof row !== 'object') continue
          for (const [outcomeName, priceRaw] of Object.entries(row as Record<string, unknown>)) {
            const normalizedName = outcomeName.trim()
            if (!normalizedName || ['hdp', 'line', 'points'].includes(normalizedName.toLowerCase())) continue
            const odds =
              typeof priceRaw === 'number'
                ? priceRaw
                : typeof priceRaw === 'string'
                  ? Number.parseFloat(priceRaw)
                  : Number.NaN
            if (!Number.isFinite(odds) || odds <= 0) continue
            validOutcomesForMarket.push({ name: normalizedName, odds })
          }
        }
      }

      validOutcomesCount += validOutcomesForMarket.length
      if (validOutcomesForMarket.length < 2) continue

      validMarketsCount += 1
      if (validMarketsForBook.length < 3) {
        validMarketsForBook.push({ key, outcomes: validOutcomesForMarket.slice(0, 3) })
      }
    }

    if (validMarketsForBook.length === 0) continue
    validBookmakersCount += 1

    if (sampleBookmakers.length < 2) {
      sampleBookmakers.push({ name, markets: validMarketsForBook.slice(0, 3) })
    }
  }

  let dropReason: string | undefined
  if (validBookmakersCount === 0) {
    if (rawMarketsCount === 0) {
      dropReason = 'no_markets_in_response'
    } else if (validMarketsCount === 0) {
      dropReason = 'no_valid_markets_after_filtering'
    } else {
      dropReason = 'no_valid_bookmakers_after_filtering'
    }
  }

  return {
    rawBookmakersCount: bookmakerEntries.length,
    rawMarketsCount,
    rawOutcomesCount,
    validBookmakersCount,
    validMarketsCount,
    validOutcomesCount,
    dropReason,
    sampleBookmakers
  }
}

function summarizeOddsResponseShape(result: unknown): {
  responseType: string
  responseKeys?: string[]
  responseLength?: number
  responseError?: string
} {
  if (result === null) {
    return { responseType: 'null' }
  }
  if (result === undefined) {
    return { responseType: 'undefined' }
  }
  if (Array.isArray(result)) {
    return { responseType: 'array', responseLength: result.length }
  }
  if (typeof result === 'string') {
    const trimmed = result.trim()
    return { responseType: 'string', responseLength: result.length, responseError: trimmed.slice(0, 200) || undefined }
  }
  if (typeof result === 'object') {
    const keys = Object.keys(result as Record<string, unknown>)
    const errorField =
      (result as { error?: unknown }).error ??
      (result as { message?: unknown }).message ??
      (result as { detail?: unknown }).detail
    const responseError = typeof errorField === 'string' && errorField.trim().length ? errorField.trim() : undefined
    return { responseType: 'object', responseKeys: keys, responseLength: keys.length, responseError }
  }
  return { responseType: typeof result }
}

function formatOddsPayloadSnippet(
  result: unknown,
  maxLength: number
): { preview: string; truncated: boolean } {
  try {
    const serialized = JSON.stringify(result)
    if (typeof serialized !== 'string') {
      return { preview: String(result), truncated: false }
    }
    if (serialized.length <= maxLength) {
      return { preview: serialized, truncated: false }
    }
    return { preview: `${serialized.slice(0, maxLength)}…`, truncated: true }
  } catch {
    const fallback = String(result)
    if (fallback.length <= maxLength) {
      return { preview: fallback, truncated: false }
    }
    return { preview: `${fallback.slice(0, maxLength)}…`, truncated: true }
  }
}

function summarizeRawEventResult(
  result: unknown,
  event: DeepScanEvent,
  config: DeepScanConfig
): {
  eventId: string
  eventName: string
  eventDate: string | null
  eventLeague: string | null
  eventSport: string | null
} {
  const rawEvent =
    result && typeof result === 'object' ? (result as { event?: unknown }).event : undefined

  const rawEventId =
    rawEvent && typeof rawEvent === 'object' && (rawEvent as { id?: unknown }).id != null
      ? String((rawEvent as { id?: unknown }).id)
      : event.id

  const rawEventName =
    rawEvent && typeof rawEvent === 'object' && typeof (rawEvent as { name?: unknown }).name === 'string'
      ? ((rawEvent as { name: string }).name || event.name)
      : event.name

  const rawDate =
    rawEvent && typeof rawEvent === 'object'
      ? (rawEvent as { date?: unknown; commence_time?: unknown }).date ??
        (rawEvent as { commence_time?: unknown }).commence_time
      : undefined
  const eventDate =
    typeof rawDate === 'string' && rawDate.trim().length
      ? rawDate
      : typeof event.date === 'string' && event.date.trim().length
        ? event.date
        : null

  const rawLeague = rawEvent && typeof rawEvent === 'object' ? (rawEvent as { league?: unknown }).league : undefined
  const eventLeague =
    typeof rawLeague === 'string' && rawLeague.trim().length
      ? rawLeague
      : typeof event.league === 'string' && event.league.trim().length
        ? event.league
        : null

  const rawSport = rawEvent && typeof rawEvent === 'object' ? (rawEvent as { sport?: unknown }).sport : undefined
  const eventSport =
    typeof rawSport === 'string' && rawSport.trim().length
      ? rawSport
      : typeof event.sport === 'string' && event.sport.trim().length
        ? event.sport
        : config.sportSlug ?? null

  return {
    eventId: rawEventId,
    eventName: rawEventName,
    eventDate,
    eventLeague,
    eventSport
  }
}

function toRawOddsPayload(result: unknown, event: DeepScanEvent, config: DeepScanConfig): RawOddsPayload | null {
  if (!result || typeof result !== 'object') {
    return null
  }

  const record = result as Record<string, unknown>
  const rawEvent = (record as { event?: unknown }).event
  const rawBookmakers = (record as { bookmakers?: unknown }).bookmakers

  const bookmakersIsArray = Array.isArray(rawBookmakers)
  const bookmakersIsMap = !bookmakersIsArray && typeof rawBookmakers === 'object' && rawBookmakers !== null

  if (!bookmakersIsArray && !bookmakersIsMap) {
    return null
  }

  const eventId =
    rawEvent && typeof rawEvent === 'object' && (rawEvent as { id?: unknown }).id != null
      ? String((rawEvent as { id?: unknown }).id)
      : record.id != null
        ? String(record.id)
        : event.id

  const home = typeof record.home === 'string' ? record.home.trim() : ''
  const away = typeof record.away === 'string' ? record.away.trim() : ''
  const inferredEventName = home && away ? `${home} vs ${away}` : null

  const eventName =
    rawEvent && typeof rawEvent === 'object' && typeof (rawEvent as { name?: unknown }).name === 'string'
      ? ((rawEvent as { name: string }).name || inferredEventName || event.name)
      : typeof record.name === 'string' && record.name.trim().length
        ? record.name.trim()
        : inferredEventName || event.name
  const rawDate =
    rawEvent && typeof rawEvent === 'object'
      ? (rawEvent as { date?: unknown; commence_time?: unknown }).date ??
        (rawEvent as { commence_time?: unknown }).commence_time
      : undefined
  const eventDate =
    typeof rawDate === 'string' && rawDate.trim().length
      ? rawDate
      : typeof record.date === 'string' && record.date.trim().length
        ? record.date.trim()
        : event.date ?? new Date().toISOString()

  const leagueCandidate =
    rawEvent && typeof rawEvent === 'object'
      ? (rawEvent as { league?: unknown }).league
      : record.league
  const leagueNormalized =
    typeof leagueCandidate === 'object' && leagueCandidate !== null
      ? ((leagueCandidate as { name?: unknown; slug?: unknown }).name ??
        (leagueCandidate as { slug?: unknown }).slug)
      : leagueCandidate
  const eventLeague =
    typeof leagueNormalized === 'string' && leagueNormalized.trim().length
      ? leagueNormalized.trim()
      : event.league ?? ''

  const sportCandidate =
    rawEvent && typeof rawEvent === 'object'
      ? (rawEvent as { sport?: unknown }).sport
      : record.sport
  const sportNormalized =
    typeof sportCandidate === 'object' && sportCandidate !== null
      ? ((sportCandidate as { slug?: unknown; name?: unknown }).slug ??
        (sportCandidate as { name?: unknown }).name)
      : sportCandidate
  const eventSport =
    typeof sportNormalized === 'string' && sportNormalized.trim().length
      ? sportNormalized.trim()
      : event.sport ?? config.sportSlug ?? 'soccer'

  const normalizeKey = (key: string): string =>
    key.toLowerCase().trim().replace(/([a-z])-([a-z])/g, '$1_$2').replace(/ /g, '_')

  const canonicalizeMarketBase = (rawMarketName: string): string => {
    const normalized = normalizeKey(rawMarketName)
    
    // Match result / Moneyline
    if (normalized === 'ml' || normalized === 'moneyline' || normalized === '1x2' || normalized === 'match_winner') {
      return 'h2h'
    }
    
    // Asian Handicap - preserve as distinct market
    if (normalized === 'asian_handicap' || normalized === 'ah') {
      return 'asian_handicap'
    }
    
    // Handicap / Spread markets
    if (
      normalized === 'spread' ||
      normalized === 'spreads' ||
      normalized === 'handicap'
    ) {
      return 'spreads'
    }
    
    // BTTS
    if (normalized === 'btts' || normalized === 'both_teams_to_score' || normalized === 'gg') {
      return 'btts'
    }
    
    // Corners-related markets - preserve context
    if (normalized.includes('corner')) {
      if (normalized.includes('total') || normalized.includes('over') || normalized.includes('under')) {
        return 'corners_totals'
      }
      if (normalized.includes('handicap') || normalized.includes('spread')) {
        return 'corners_handicap'
      }
      if (normalized.includes('race')) {
        return 'corners_race'
      }
      if (normalized.includes('1h') || normalized.includes('first_half')) {
        return 'corners_1h'
      }
      if (normalized.includes('2h') || normalized.includes('second_half')) {
        return 'corners_2h'
      }
      return 'corners_totals' // Default corners to totals
    }
    
    // Cards/Bookings-related markets - preserve context
    if (normalized.includes('card') || normalized.includes('booking')) {
      if (normalized.includes('red')) {
        return 'red_card'
      }
      if (normalized.includes('total') || normalized.includes('over') || normalized.includes('under')) {
        return 'cards_totals'
      }
      if (normalized.includes('1h') || normalized.includes('first_half')) {
        return 'cards_1h'
      }
      if (normalized.includes('2h') || normalized.includes('second_half')) {
        return 'cards_2h'
      }
      if (normalized.includes('points')) {
        return 'booking_points'
      }
      return 'cards_totals' // Default cards to totals
    }
    
    // Shots-related markets
    if (normalized.includes('shot')) {
      if (normalized.includes('target') || normalized === 'sot') {
        return 'shots_on_target'
      }
      if (normalized.includes('total') || normalized.includes('over') || normalized.includes('under')) {
        return 'shots_totals'
      }
      return 'shots_totals' // Default shots to totals
    }
    
    // Goals totals (only if explicitly "goal" or generic "total/totals")
    if (normalized.includes('goal') && (normalized.includes('total') || normalized.includes('over') || normalized.includes('under'))) {
      if (normalized.includes('1h') || normalized.includes('first_half')) {
        return 'goals_totals_1h'
      }
      if (normalized.includes('2h') || normalized.includes('second_half')) {
        return 'goals_totals_2h'
      }
      return 'goals_totals'
    }
    
    // Clean sheet
    if (normalized.includes('clean_sheet') || normalized === 'cleansheet') {
      if (normalized.includes('home')) return 'home_clean_sheet'
      if (normalized.includes('away')) return 'away_clean_sheet'
      return 'clean_sheet'
    }
    
    // Draw no bet
    if (normalized === 'dnb' || normalized.includes('draw_no_bet') || normalized.includes('draw-no-bet')) {
      return 'draw_no_bet'
    }
    
    // Penalty
    if (normalized.includes('penalty')) {
      return 'penalty'
    }
    
    // Offsides
    if (normalized.includes('offside')) {
      return 'offsides'
    }
    
    // Fouls
    if (normalized.includes('foul')) {
      return 'fouls'
    }
    
    // Generic totals - assume goals (match totals)
    if (normalized === 'total' || normalized === 'totals' || normalized === 'over_under' || normalized === 'over/under') {
      return 'goals_totals'
    }
    
    return normalized
  }

  const formatSignedLine = (value: number): string => {
    const formatted = formatLineValue(value)
    if (value > 0) return `+${formatted}`
    return formatted
  }

  const extractUrlMap = (): Record<string, string> => {
    const candidate =
      (record as { urls?: unknown }).urls ??
      (record as { bookmakerUrls?: unknown }).bookmakerUrls ??
      (record as { bookmaker_urls?: unknown }).bookmaker_urls
    if (!candidate || typeof candidate !== 'object') return {}
    const map: Record<string, string> = {}
    for (const [name, url] of Object.entries(candidate as Record<string, unknown>)) {
      if (typeof url === 'string' && url.trim().length) {
        map[name] = url.trim()
      }
    }
    return map
  }

  const urlByBookmaker = extractUrlMap()

  const parseLegacyBookmakersArray = (raw: unknown[]): RawBookmaker[] => {
    return raw
      .map((book) => {
        if (!book || typeof book !== 'object') return null
        const nameCandidate =
          (book as { name?: unknown }).name ??
          (book as { key?: unknown }).key ??
          (book as { bookmaker?: unknown }).bookmaker
        const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate.trim() : null
        if (!name) return null

        const urlCandidate =
          (book as { url?: unknown }).url ??
          (book as { link?: unknown }).link ??
          (book as { directLink?: unknown }).directLink ??
          urlByBookmaker[name]
        const url = typeof urlCandidate === 'string' && urlCandidate.trim().length ? urlCandidate.trim() : undefined

        const marketsRaw = Array.isArray((book as { markets?: unknown }).markets)
          ? ((book as { markets: unknown[] }).markets as unknown[])
          : []
        const markets: RawMarket[] = marketsRaw
          .map((market) => {
            if (!market || typeof market !== 'object') return null
            const keyCandidate =
              (market as { key?: unknown }).key ??
              (market as { name?: unknown }).name ??
              (market as { market?: unknown }).market
            const keyRaw = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate.trim() : null
            if (!keyRaw) return null
            const key = canonicalizeMarketBase(keyRaw)
            const updatedAtCandidate =
              (market as { updatedAt?: unknown }).updatedAt ??
              (market as { updated_at?: unknown }).updated_at ??
              (market as { last_update?: unknown }).last_update
            const updatedAt =
              typeof updatedAtCandidate === 'string' && updatedAtCandidate.trim().length
                ? updatedAtCandidate.trim()
                : undefined
            const outcomesRaw = Array.isArray((market as { outcomes?: unknown }).outcomes)
              ? ((market as { outcomes: unknown[] }).outcomes as unknown[])
              : []
            const outcomes: RawOutcome[] = outcomesRaw
              .map((outcome) => {
                if (!outcome || typeof outcome !== 'object') return null
                const nameRaw = (outcome as { name?: unknown }).name
                const name = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw.trim() : null
                if (!name) return null
                const oddsRaw =
                  (outcome as { odds?: unknown }).odds ??
                  (outcome as { price?: unknown }).price ??
                  (outcome as { decimal?: unknown }).decimal
                const odds =
                  typeof oddsRaw === 'number'
                    ? oddsRaw
                    : typeof oddsRaw === 'string'
                      ? Number.parseFloat(oddsRaw)
                      : Number.NaN
                if (!Number.isFinite(odds) || odds <= 0) return null
                return { name, odds }
              })
              .filter((o): o is RawOutcome => o !== null)
            if (outcomes.length < 2) return null
            return { key, ...(updatedAt ? { updatedAt } : {}), outcomes }
          })
          .filter((m): m is RawMarket => m !== null)
        if (markets.length === 0) return null
        return { name, ...(url ? { url } : {}), markets }
      })
      .filter((b): b is RawBookmaker => b !== null)
  }

  const parseBookmakersMap = (raw: Record<string, unknown>): RawBookmaker[] => {
    const bookmakers: RawBookmaker[] = []

    for (const [bookmakerNameRaw, marketsContainer] of Object.entries(raw)) {
      const bookmakerName = bookmakerNameRaw.trim()
      if (!bookmakerName) continue

      const url = urlByBookmaker[bookmakerName]
      const marketsRaw = Array.isArray(marketsContainer)
        ? marketsContainer
        : marketsContainer && typeof marketsContainer === 'object' && Array.isArray((marketsContainer as { markets?: unknown }).markets)
          ? ((marketsContainer as { markets: unknown[] }).markets as unknown[])
          : []

      const mergedMarkets = new Map<string, { updatedAt?: string; outcomes: Map<string, number> }>()

      for (const market of marketsRaw) {
        if (!market || typeof market !== 'object') continue

        const marketNameCandidate =
          (market as { name?: unknown }).name ??
          (market as { key?: unknown }).key ??
          (market as { market?: unknown }).market
        const marketName =
          typeof marketNameCandidate === 'string' && marketNameCandidate.trim().length ? marketNameCandidate.trim() : null
        if (!marketName) continue

        const baseKey = canonicalizeMarketBase(marketName)

        const marketUpdatedAtCandidate =
          (market as { updatedAt?: unknown }).updatedAt ??
          (market as { updated_at?: unknown }).updated_at ??
          (market as { last_update?: unknown }).last_update
        const marketUpdatedAt =
          typeof marketUpdatedAtCandidate === 'string' && marketUpdatedAtCandidate.trim().length
            ? marketUpdatedAtCandidate.trim()
            : undefined

        const oddsRows = Array.isArray((market as { odds?: unknown }).odds)
          ? ((market as { odds: unknown[] }).odds as unknown[])
          : []

        for (const row of oddsRows) {
          if (!row || typeof row !== 'object') continue
          const rowObj = row as Record<string, unknown>

          const lineCandidate =
            rowObj.hdp ??
            rowObj.line ??
            rowObj.points ??
            rowObj.handicap
          const line =
            typeof lineCandidate === 'number'
              ? lineCandidate
              : typeof lineCandidate === 'string'
                ? Number.parseFloat(lineCandidate)
                : Number.NaN
          const hasLine = Number.isFinite(line)
          const marketKey = hasLine ? `${baseKey}_${formatLineValue(line)}` : baseKey

          let state = mergedMarkets.get(marketKey)
          if (!state) {
            state = { updatedAt: marketUpdatedAt, outcomes: new Map<string, number>() }
            mergedMarkets.set(marketKey, state)
          } else if (marketUpdatedAt && (!state.updatedAt || marketUpdatedAt > state.updatedAt)) {
            state.updatedAt = marketUpdatedAt
          }

          const shouldDecorateOutcomeWithLine = hasLine && (baseKey === 'spreads' || baseKey === 'handicap')
          const shouldDecorateOverUnder = hasLine && baseKey === 'totals'

          for (const [outcomeKeyRaw, oddsRaw] of Object.entries(rowObj)) {
            const outcomeKey = outcomeKeyRaw.trim()
            if (!outcomeKey) continue
            const lowered = outcomeKey.toLowerCase()
            if (['hdp', 'line', 'points', 'handicap', 'updatedat', 'updated_at', 'timestamp', 'id'].includes(lowered)) {
              continue
            }

            const odds =
              typeof oddsRaw === 'number'
                ? oddsRaw
                : typeof oddsRaw === 'string'
                  ? Number.parseFloat(oddsRaw)
                  : Number.NaN
            if (!Number.isFinite(odds) || odds <= 0) continue

            let outcomeName = outcomeKey
            if (shouldDecorateOutcomeWithLine && (lowered === 'home' || lowered === 'away')) {
              const signedLine = lowered === 'home' ? formatSignedLine(line) : formatSignedLine(-line)
              outcomeName = `${lowered} ${signedLine}`
            } else if (shouldDecorateOverUnder && (lowered === 'over' || lowered === 'under')) {
              outcomeName = `${lowered} ${formatLineValue(Math.abs(line))}`
            }

            const existing = state.outcomes.get(outcomeName)
            if (existing === undefined || odds > existing) {
              state.outcomes.set(outcomeName, odds)
            }
          }
        }
      }

      const markets: RawMarket[] = []
      for (const [key, state] of mergedMarkets.entries()) {
        const outcomes: RawOutcome[] = [...state.outcomes.entries()]
          .map(([name, odds]) => ({ name, odds }))
          .filter((outcome) => outcome.name.trim().length && Number.isFinite(outcome.odds) && outcome.odds > 0)
        if (outcomes.length < 2) continue
        markets.push({ key, ...(state.updatedAt ? { updatedAt: state.updatedAt } : {}), outcomes })
      }

      if (markets.length === 0) continue
      bookmakers.push({ name: bookmakerName, ...(url ? { url } : {}), markets })
    }

    return bookmakers
  }

  const bookmakers: RawBookmaker[] = bookmakersIsArray
    ? parseLegacyBookmakersArray(rawBookmakers as unknown[])
    : parseBookmakersMap(rawBookmakers as Record<string, unknown>)

  if (bookmakers.length === 0) {
    return null
  }

  return {
    event: {
      id: eventId,
      name: eventName,
      date: eventDate,
      league: eventLeague,
      sport: eventSport
    },
    bookmakers
  }
}

function getMarketMinRoi(config: DeepScanConfig, group: MarketGroup): number {
  const globalMin = typeof config.minRoi === 'number' && config.minRoi > 0 ? config.minRoi : 0
  const groupMin = config.marketGroupThresholds?.[group]
  const hasPositiveOverride = typeof groupMin === 'number' && groupMin > 0
  return hasPositiveOverride ? groupMin : globalMin
}

function selectBestDistinctPair(quotesA: Quote[], quotesB: Quote[]): { a: Quote; b: Quote; roi: number } | null {
  let best: { a: Quote; b: Quote; roi: number } | null = null

  for (const a of quotesA) {
    for (const b of quotesB) {
      if (a.bookmaker === b.bookmaker) continue
      const roi = calculateTwoLegArbitrageRoi(a.odds, b.odds)
      if (roi <= 0) continue
      if (!best || roi > best.roi) {
        best = { a, b, roi }
      }
    }
  }

  return best
}

function buildOpportunitiesFromRawOdds(
  payload: RawOddsPayload,
  config: DeepScanConfig,
  foundAt: string,
  unknownMarketKeys?: Set<string>
): ArbitrageOpportunity[] {
  const marketOutcomeQuotes = new Map<string, Map<string, Quote[]>>()
  const marketMetadataByKey = new Map<string, ReturnType<typeof inferMarketMetadata>>()

  // Story 7.8: Extract bookmaker URLs
  const bookmakerUrls: Record<string, string> = {}
  for (const bookmaker of payload.bookmakers) {
    if (bookmaker.url) {
      bookmakerUrls[bookmaker.name] = bookmaker.url
    }
  }

  // Story 7.8: Track most recent market update timestamp
  let mostRecentMarketUpdate: string | null = null
  for (const bookmaker of payload.bookmakers) {
    for (const market of bookmaker.markets) {
      if (market.updatedAt) {
        if (!mostRecentMarketUpdate || market.updatedAt > mostRecentMarketUpdate) {
          mostRecentMarketUpdate = market.updatedAt
        }
      }
    }
  }

  const normalizeMarketKeyForLogging = (key: string): string =>
    key.toLowerCase().trim().replace(/([a-z])-([a-z])/g, '$1_$2').replace(/ /g, '_')

  for (const bookmaker of payload.bookmakers) {
    for (const market of bookmaker.markets) {
      const isKnownMarket = isKnownMarketPattern(market.key)
      if (!isKnownMarket) {
        if (unknownMarketKeys) {
          const rawKey = normalizeMarketKeyForLogging(market.key)
          if (!unknownMarketKeys.has(rawKey)) {
            unknownMarketKeys.add(rawKey)
            logDebug('market.unknown', {
              context: 'service:deepScan',
              operation: 'inferMarketMetadata',
              providerId: DEEP_SCAN_PROVIDER_ID,
              correlationId: undefined,
              durationMs: null,
              errorCategory: null,
              rawMarketKey: market.key,
              normalizedKey: rawKey,
              assignedGroup: 'other'
            } satisfies StructuredLogBase)
          }
        }
        continue
      }

      const baseMetadata = inferMarketMetadata(market.key)

      const baseKey = baseMetadata.key
      const baseHasLine = baseMetadata.line !== undefined

      let outcomesMap = marketOutcomeQuotes.get(baseKey)
      if (!outcomesMap) {
        outcomesMap = new Map<string, Quote[]>()
        marketOutcomeQuotes.set(baseKey, outcomesMap)
        marketMetadataByKey.set(baseKey, baseMetadata)
      }

      for (const outcome of market.outcomes) {
        const line = extractLineFromOutcomeName(outcome.name)
        const shouldAppendLine = !baseHasLine && line !== undefined
        const marketKeyWithLine = shouldAppendLine ? `${baseKey}_${line}` : baseKey

        if (marketKeyWithLine !== baseKey) {
          const existing = marketOutcomeQuotes.get(marketKeyWithLine)
          outcomesMap = existing ?? new Map<string, Quote[]>()
          marketOutcomeQuotes.set(marketKeyWithLine, outcomesMap)
          if (!marketMetadataByKey.has(marketKeyWithLine)) {
            marketMetadataByKey.set(marketKeyWithLine, inferMarketMetadata(marketKeyWithLine))
          }
        } else {
          outcomesMap = marketOutcomeQuotes.get(baseKey)!
        }

        const outcomeKey = normalizeOutcomeName(outcome.name)
        const quotes = outcomesMap.get(outcomeKey)
        const quote: Quote = { bookmaker: bookmaker.name, outcomeKey, odds: outcome.odds }
        if (quotes) {
          quotes.push(quote)
        } else {
          outcomesMap.set(outcomeKey, [quote])
        }
      }
    }
  }

  const opportunities: ArbitrageOpportunity[] = []

  for (const [marketKey, outcomesMap] of marketOutcomeQuotes.entries()) {
    if (outcomesMap.size !== 2) {
      continue
    }

    const metadata = marketMetadataByKey.get(marketKey) ?? inferMarketMetadata(marketKey)
    const minRoi = getMarketMinRoi(config, metadata.group)

    const entries = [...outcomesMap.entries()]
    const [outcomeA, quotesARaw] = entries[0]
    const [outcomeB, quotesBRaw] = entries[1]

    const bestByBookmaker = (quotes: Quote[]): Quote[] => {
      const map = new Map<string, Quote>()
      for (const quote of quotes) {
        const existing = map.get(quote.bookmaker)
        if (!existing || quote.odds > existing.odds) {
          map.set(quote.bookmaker, quote)
        }
      }
      return [...map.values()]
    }
    const quotesA = bestByBookmaker(quotesARaw)
    const quotesB = bestByBookmaker(quotesBRaw)
    const bestPair = selectBestDistinctPair(quotesA, quotesB)
    if (!bestPair || bestPair.roi < minRoi) {
      continue
    }

    const sortedBooks = [bestPair.a.bookmaker, bestPair.b.bookmaker].sort()
    const sortedOutcomes = [outcomeA, outcomeB].sort()

    const id = [
      'deep',
      payload.event.id,
      metadata.key,
      sortedBooks[0],
      sortedBooks[1],
      sortedOutcomes[0],
      sortedOutcomes[1]
    ].join(':')

    const impliedProbA = Number((1 / bestPair.a.odds * 100).toFixed(2))
    const impliedProbB = Number((1 / bestPair.b.odds * 100).toFixed(2))

    // Story 7.8: Odds movement tracking
    // Get existing history BEFORE updating (to calculate trend against previous data)
    const existingHistory = oddsHistoryBuffer.get(id) || []
    const oddsTrend = calculateOddsTrend(existingHistory, bestPair.roi)

    // Update history buffer with current snapshot
    const legOdds: [number, number] = [bestPair.a.odds, bestPair.b.odds]
    const oddsHistory = updateOddsHistory(id, bestPair.roi, legOdds, foundAt)

    // Story 6.5: Detect card rules mismatch for cards market group
    const cardRulesWarning = detectCardRulesMismatch(
      bestPair.a.bookmaker,
      bestPair.b.bookmaker,
      metadata.group
    )

    opportunities.push({
      id,
      providerId: DEEP_SCAN_PROVIDER_ID,
      sport: payload.event.sport,
      event: {
        name: payload.event.name,
        date: payload.event.date,
        league: payload.event.league
      },
      legs: [
        {
          bookmaker: bestPair.a.bookmaker,
          market: metadata.key,
          odds: bestPair.a.odds,
          outcome: outcomeA,
          impliedProbability: impliedProbA
        },
        {
          bookmaker: bestPair.b.bookmaker,
          market: metadata.key,
          odds: bestPair.b.odds,
          outcome: outcomeB,
          impliedProbability: impliedProbB
        }
      ],
      roi: bestPair.roi,
      foundAt,
      source: 'deepScan',
      // Story 7.8: Include bookmaker URLs if available
      ...(Object.keys(bookmakerUrls).length > 0 && { bookmakerUrls }),
      // Story 7.8: Include most recent market update timestamp if available
      ...(mostRecentMarketUpdate && { marketUpdatedAt: mostRecentMarketUpdate }),
      // Story 7.8: Odds movement tracking
      oddsTrend,
      oddsHistory,
      // Story 6.5: Include card rules warning if present (only for cards market group)
      ...(cardRulesWarning?.mismatch && { cardRulesWarning })
    })
  }

  return opportunities
}

function computeBestOddsComparison(
  payload: RawOddsPayload,
  _config: DeepScanConfig
): Array<{
  eventId: string
  marketKey: string
  marketLabel: string
  marketGroup: MarketGroup
  outcomes: Array<{
    outcome: string
    bestBookmaker: string
    bestOdds: number
    allBookmakers: Array<{ bookmaker: string; odds: number }>
  }>
  hasArbitrage: boolean
  arbitrageRoi?: number
}> {
  const marketOutcomeQuotes = new Map<string, Map<string, Quote[]>>()
  const marketMetadataByKey = new Map<string, ReturnType<typeof inferMarketMetadata>>()

  for (const bookmaker of payload.bookmakers) {
    for (const market of bookmaker.markets) {
      const isKnownMarket = isKnownMarketPattern(market.key)
      if (!isKnownMarket) continue

      const baseMetadata = inferMarketMetadata(market.key)
      const baseKey = baseMetadata.key
      const baseHasLine = baseMetadata.line !== undefined

      let outcomesMap = marketOutcomeQuotes.get(baseKey)
      if (!outcomesMap) {
        outcomesMap = new Map<string, Quote[]>()
        marketOutcomeQuotes.set(baseKey, outcomesMap)
        marketMetadataByKey.set(baseKey, baseMetadata)
      }

      for (const outcome of market.outcomes) {
        const line = extractLineFromOutcomeName(outcome.name)
        const shouldAppendLine = !baseHasLine && line !== undefined
        const marketKeyWithLine = shouldAppendLine ? `${baseKey}_${line}` : baseKey

        if (marketKeyWithLine !== baseKey) {
          const existing = marketOutcomeQuotes.get(marketKeyWithLine)
          outcomesMap = existing ?? new Map<string, Quote[]>()
          marketOutcomeQuotes.set(marketKeyWithLine, outcomesMap)
          if (!marketMetadataByKey.has(marketKeyWithLine)) {
            marketMetadataByKey.set(marketKeyWithLine, inferMarketMetadata(marketKeyWithLine))
          }
        } else {
          outcomesMap = marketOutcomeQuotes.get(baseKey)!
        }

        const outcomeKey = normalizeOutcomeName(outcome.name)
        const quotes = outcomesMap.get(outcomeKey)
        const quote: Quote = { bookmaker: bookmaker.name, outcomeKey, odds: outcome.odds }
        if (quotes) {
          quotes.push(quote)
        } else {
          outcomesMap.set(outcomeKey, [quote])
        }
      }
    }
  }

  const comparisons: Array<{
    eventId: string
    marketKey: string
    marketLabel: string
    marketGroup: MarketGroup
    outcomes: Array<{
      outcome: string
      bestBookmaker: string
      bestOdds: number
      allBookmakers: Array<{ bookmaker: string; odds: number }>
    }>
    hasArbitrage: boolean
    arbitrageRoi?: number
  }> = []

  for (const [marketKey, outcomesMap] of marketOutcomeQuotes.entries()) {
    if (outcomesMap.size !== 2) continue

    const metadata = marketMetadataByKey.get(marketKey) ?? inferMarketMetadata(marketKey)
    const entries = [...outcomesMap.entries()]

    const outcomeResults: Array<{
      outcome: string
      bestBookmaker: string
      bestOdds: number
      allBookmakers: Array<{ bookmaker: string; odds: number }>
    }> = []

    const bestOddsPerOutcome: number[] = []

    for (const [outcomeName, quotes] of entries) {
      const bookmakerBest = new Map<string, number>()
      for (const quote of quotes) {
        const existing = bookmakerBest.get(quote.bookmaker)
        if (!existing || quote.odds > existing) {
          bookmakerBest.set(quote.bookmaker, quote.odds)
        }
      }

      const allBookmakers = [...bookmakerBest.entries()]
        .map(([bookmaker, odds]) => ({ bookmaker, odds }))
        .sort((a, b) => b.odds - a.odds)

      const best = allBookmakers[0]
      bestOddsPerOutcome.push(best.odds)

      outcomeResults.push({
        outcome: outcomeName,
        bestBookmaker: best.bookmaker,
        bestOdds: best.odds,
        allBookmakers
      })
    }

    let hasArbitrage = false
    let arbitrageRoi: number | undefined

    if (outcomeResults.length === 2) {
      const [, quotesARaw] = entries[0]
      const [, quotesBRaw] = entries[1]

      const bestByBookmaker = (quotes: Quote[]): Quote[] => {
        const map = new Map<string, Quote>()
        for (const quote of quotes) {
          const existing = map.get(quote.bookmaker)
          if (!existing || quote.odds > existing.odds) {
            map.set(quote.bookmaker, quote)
          }
        }
        return [...map.values()]
      }

      const quotesA = bestByBookmaker(quotesARaw)
      const quotesB = bestByBookmaker(quotesBRaw)
      const bestPair = selectBestDistinctPair(quotesA, quotesB)

      if (bestPair && bestPair.roi > 0) {
        hasArbitrage = true
        arbitrageRoi = bestPair.roi
      }
    }

    comparisons.push({
      eventId: payload.event.id,
      marketKey: metadata.key,
      marketLabel: metadata.label ?? metadata.key,
      marketGroup: metadata.group,
      outcomes: outcomeResults,
      hasArbitrage,
      arbitrageRoi
    })
  }

  return comparisons
}

// Story 7.7: Best Odds Cache Management Functions

/**
 * Cache best odds for an event.
 * Called when processing odds data during Deep Scan.
 */
function cacheBestOddsForEvent(
  eventId: string,
  comparisons: Array<{
    eventId: string
    marketKey: string
    marketLabel: string
    marketGroup: MarketGroup
    outcomes: Array<{
      outcome: string
      bestBookmaker: string
      bestOdds: number
      allBookmakers: Array<{ bookmaker: string; odds: number }>
    }>
    hasArbitrage: boolean
    arbitrageRoi?: number
  }>
): void {
  bestOddsCache.set(eventId, { data: comparisons, cachedAt: nowMs() })
}

/**
 * Get cached best odds for an event.
 * Returns null if cache miss or expired (> 5 minutes old).
 * Story 7.7: Exported for TRPC endpoint.
 */
export function getBestOddsForEvent(eventId: string): Array<{
  eventId: string
  marketKey: string
  marketLabel: string
  marketGroup: MarketGroup
  outcomes: Array<{
    outcome: string
    bestBookmaker: string
    bestOdds: number
    allBookmakers: Array<{ bookmaker: string; odds: number }>
  }>
  hasArbitrage: boolean
  arbitrageRoi?: number
}> | null {
  // Lazily cleanup expired entries on access to prevent unbounded growth
  cleanupBestOddsCache()

  const entry = bestOddsCache.get(eventId)
  if (!entry) return null

  const age = nowMs() - entry.cachedAt
  if (age > BEST_ODDS_CACHE_TTL_MS) {
    bestOddsCache.delete(eventId)
    return null
  }

  return entry.data
}

/**
 * Cleanup expired best odds cache entries.
 * Called periodically to prevent unbounded growth.
 */
function cleanupBestOddsCache(): void {
  const now = nowMs()
  for (const [eventId, entry] of bestOddsCache.entries()) {
    if (now - entry.cachedAt > BEST_ODDS_CACHE_TTL_MS) {
      bestOddsCache.delete(eventId)
    }
  }
}

async function fetchOddsWithRetry(
  fetchOdds: OddsFetcher,
  args: {
    event: DeepScanEvent
    apiKey: string
    bookmakers: string[]
    signal: AbortSignal
    correlationId: string
  },
  options: { trackAttempts: boolean }
): Promise<unknown> {
  const maxAttempts = 3
  let attempt = 0
  let lastError: unknown

  while (attempt < maxAttempts) {
    if (args.signal.aborted) {
      throw new Error('aborted')
    }
    try {
      if (options.trackAttempts) {
        updateProgress({ requestsMade: (currentScan?.requestsMade ?? 0) + 1 })
        if (currentScanMode === 'continuous') {
          recordContinuousRequestWithWarnings(args.correlationId)
        }
      }
      return await fetchOdds(args)
    } catch (error) {
      lastError = error
      const status = getStatusCode(error)
      if (status !== 429 || attempt >= maxAttempts - 1) {
        throw error
      }
      const backoffMs = Math.min(15000, 1000 * 2 ** attempt + Math.floor(Math.random() * 250))
      await sleep(backoffMs, args.signal)
      attempt += 1
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Deep scan odds fetch failed')
}

async function runScanForEvents(args: {
  mode: 'manual' | 'continuous'
  config: DeepScanConfig
  apiKey: string
  signal: AbortSignal
  correlationId: string
  events: DeepScanEvent[]
  bookmakers: string[]
  discoverySummary?: {
    eventsDiscovered: number
    eventsToScan: number
    cacheHits: number
    cacheMisses: number
  }
}): Promise<void> {
  const { mode, config, apiKey, signal, correlationId, events, bookmakers, discoverySummary } = args

  // Story 6.5: Clear card rules cache at start of each scan for fresh lookups
  clearCardRulesCache()

  currentScanMode = mode

  const fetchOdds = oddsFetcherOverride ?? defaultOddsFetcher
  const trackOddsAttempts = oddsFetcherOverride !== null

  const scanStartedAtMs = nowMs()
  const operation = mode === 'continuous' ? 'runContinuousScanCycle' : 'runScan'
  const startEventName = mode === 'continuous' ? 'continuousScan.cycle.start' : 'deepScan.start'
  const completeEventName = mode === 'continuous' ? 'continuousScan.cycle.complete' : 'deepScan.complete'
  const perEventEventName = mode === 'continuous' ? 'continuousScan.event' : 'deepScan.event'

  if (mode === 'continuous') {
    continuousResults = []
  } else {
    manualResults = []
  }

  let totalMarketsRetrieved = 0
  let eventsWithMarkets = 0
  const arbMarketKeys = new Set<string>()
  const arbMarketGroups = new Set<string>()
  const unknownMarketKeys = new Set<string>()

  const collectUniqueMarketKeys = (payload: RawOddsPayload): string[] => {
    const keys = new Set<string>()
    for (const bookmaker of payload.bookmakers) {
      for (const market of bookmaker.markets) {
        const key = typeof market.key === 'string' ? market.key.trim() : ''
        if (key) {
          keys.add(key)
        }
      }
    }
    return [...keys]
  }

  const updateArbTrackingFromOpportunities = (opportunities: ArbitrageOpportunity[]): void => {
    for (const opportunity of opportunities) {
      for (const leg of opportunity.legs) {
        const marketKey = leg.market?.trim()
        if (!marketKey) continue
        arbMarketKeys.add(marketKey)
        const metadata = inferMarketMetadata(marketKey)
        arbMarketGroups.add(metadata.group)
      }
    }
  }

  updateProgress({
    eventsTotal: events.length,
    eventsScanned: 0,
    opportunitiesFound: 0,
    marketsScanned: 0,
    marketGroupsWithArbs: [],
    currentEventName: undefined,
    mode
  } as Partial<DeepScanProgress>)

  const quotaStatus = getHourlyQuotaStatus()

  logInfo(startEventName, {
    context: 'service:deepScan',
    operation,
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    eventCount: events.length,
    bookmakersCount: bookmakers.length,
    requestsMade: currentScan?.requestsMade ?? 0,
    discoverySummary,
    cacheStatus: {
      totalCached: scanCache.size,
      ttlMinutes: getScanCacheTtlMinutes()
    },
    batchConfig: {
      batchSize: continuousScanBatchSize,
      maxEventsPerCycle: continuousScanMaxEventsPerCycle
    },
    quota: {
      hourlyRequestsUsed: quotaStatus.used,
      hourlyRequestLimit: quotaStatus.limit,
      percentUsed: Number((quotaStatus.percentUsed * 100).toFixed(1))
    }
  } satisfies StructuredLogBase)

  if (events.length === 0) {
    if (mode === 'continuous') {
      lastContinuousScanAt = nowIso()
    }
    const averageMarketsPerEvent = 0
    updateProgress({
      status: 'completed',
      currentEventName: undefined,
      lastContinuousScanAt: lastContinuousScanAt ?? undefined,
      mode
    } as Partial<DeepScanProgress>)
    const quotaStatusAfter = getHourlyQuotaStatus()
    logInfo(completeEventName, {
      context: 'service:deepScan',
      operation,
      providerId: DEEP_SCAN_PROVIDER_ID,
      correlationId,
      durationMs: nowMs() - scanStartedAtMs,
      errorCategory: null,
      eventsScanned: 0,
      eventsTotal: 0,
      opportunitiesFound: 0,
      eventsFailed: 0,
      requestsMade: currentScan?.requestsMade ?? 0,
      cacheHits: discoverySummary?.cacheHits ?? 0,
      cacheMisses: discoverySummary?.cacheMisses ?? 0,
      marketStats: {
        totalMarketsRetrieved,
        marketsWithArbs: arbMarketKeys.size,
        averageMarketsPerEvent
      },
      quota: {
        hourlyRequestsUsed: quotaStatusAfter.used,
        hourlyRequestLimit: quotaStatusAfter.limit,
        percentUsed: Number((quotaStatusAfter.percentUsed * 100).toFixed(1))
      }
    } satisfies StructuredLogBase)
    return
  }

  const concurrency = Math.max(1, Math.min(10, config.maxConcurrentRequests ?? concurrentRequests))
  let eventErrors = 0
  const batches = mode === 'continuous' ? chunk(events, continuousScanBatchSize) : [events]

  const processEvent = async (event: DeepScanEvent): Promise<void> => {
    if (signal.aborted) return
    updateProgress({ currentEventName: event.name, mode } as Partial<DeepScanProgress>)
    const startedAtMs = nowMs()
    try {
      const resultsBefore = (mode === 'continuous' ? continuousResults : manualResults).length
      const result = await fetchOddsWithRetry(
        fetchOdds,
        { event, apiKey, bookmakers, signal, correlationId },
        { trackAttempts: trackOddsAttempts }
      )

      const foundAt = nowIso()
      let marketsRetrievedForEvent = 0
      const opportunities = isOpportunityArray(result)
        ? result
        : (() => {
            const oddsSummary = summarizeRawOddsResult(result)
            const eventSummary = summarizeRawEventResult(result, event, config)
            const responseShape = summarizeOddsResponseShape(result)
            const rawSnippet = formatOddsPayloadSnippet(result, 4000)

            logInfo('deepScan.odds.payload.summary', {
              context: 'service:deepScan',
              operation,
              providerId: DEEP_SCAN_PROVIDER_ID,
              correlationId,
              durationMs: null,
              errorCategory: null,
              eventId: event.id,
              eventName: event.name,
              rawBookmakersCount: oddsSummary.rawBookmakersCount,
              rawMarketsCount: oddsSummary.rawMarketsCount,
              rawOutcomesCount: oddsSummary.rawOutcomesCount,
              validBookmakersCount: oddsSummary.validBookmakersCount,
              validMarketsCount: oddsSummary.validMarketsCount,
              validOutcomesCount: oddsSummary.validOutcomesCount,
              responseType: responseShape.responseType,
              responseKeys: responseShape.responseKeys,
              responseLength: responseShape.responseLength,
              responseError: responseShape.responseError
            } satisfies StructuredLogBase)

            logDebug('deepScan.odds.payload.raw', {
              context: 'service:deepScan',
              operation,
              providerId: DEEP_SCAN_PROVIDER_ID,
              correlationId,
              durationMs: null,
              errorCategory: null,
              eventId: eventSummary.eventId,
              eventName: eventSummary.eventName,
              eventDate: eventSummary.eventDate,
              eventLeague: eventSummary.eventLeague,
              eventSport: eventSummary.eventSport,
              truncated: rawSnippet.truncated,
              payloadPreview: rawSnippet.preview
            } satisfies StructuredLogBase)

            if (oddsSummary.sampleBookmakers.length > 0) {
              logInfo('deepScan.odds.payload.sample', {
                context: 'service:deepScan',
                operation,
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: null,
                errorCategory: null,
                eventId: eventSummary.eventId,
                eventName: eventSummary.eventName,
                eventDate: eventSummary.eventDate,
                eventLeague: eventSummary.eventLeague,
                eventSport: eventSummary.eventSport,
                sampleBookmakers: oddsSummary.sampleBookmakers
              } satisfies StructuredLogBase)
            }

            const payload = toRawOddsPayload(result, event, config)
            if (!payload) {
              logWarn('deepScan.odds.payload.dropped', {
                context: 'service:deepScan',
                operation,
                providerId: DEEP_SCAN_PROVIDER_ID,
                correlationId,
                durationMs: null,
                errorCategory: null,
                eventId: event.id,
                eventName: event.name,
                reason: oddsSummary.dropReason ?? 'parser_returned_null',
                rawBookmakersCount: oddsSummary.rawBookmakersCount,
                rawMarketsCount: oddsSummary.rawMarketsCount,
                validBookmakersCount: oddsSummary.validBookmakersCount,
                validMarketsCount: oddsSummary.validMarketsCount,
                responseType: responseShape.responseType,
                responseKeys: responseShape.responseKeys,
                responseLength: responseShape.responseLength,
                responseError: responseShape.responseError
              } satisfies StructuredLogBase)
              return []
            }
            const uniqueMarketKeys = collectUniqueMarketKeys(payload)
            marketsRetrievedForEvent = uniqueMarketKeys.length

            // Story 7.7: Cache best odds for Odds Comparison View
            const bestOddsComparisons = computeBestOddsComparison(payload, config)
            if (bestOddsComparisons.length > 0) {
              cacheBestOddsForEvent(payload.event.id, bestOddsComparisons)
            }

            // Story 8.1: Cache raw odds for Odds Browser
            cacheRawOdds(payload.event.id, payload)

            return buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys)
          })()

      if (marketsRetrievedForEvent > 0) {
        totalMarketsRetrieved += marketsRetrievedForEvent
        eventsWithMarkets += 1
      }

      if (opportunities.length) {
        updateArbTrackingFromOpportunities(opportunities)

        if (mode === 'continuous') {
          continuousResults.push(...opportunities)
          updateProgress({ opportunitiesFound: continuousResults.length, mode } as Partial<DeepScanProgress>)
        } else {
          manualResults.push(...opportunities)
          updateProgress({ opportunitiesFound: manualResults.length, mode } as Partial<DeepScanProgress>)
        }
      }

      const resultsAfter = (mode === 'continuous' ? continuousResults : manualResults).length
      const arbsFound = Math.max(0, resultsAfter - resultsBefore)

      updateProgress({
        eventsScanned: (currentScan?.eventsScanned ?? 0) + 1,
        marketsScanned: (currentScan?.marketsScanned ?? 0) + marketsRetrievedForEvent,
        marketGroupsWithArbs: [...arbMarketGroups],
        mode
      } as Partial<DeepScanProgress>)

      if (mode === 'continuous') {
        updateScanCache(event.id, bookmakers)
        recordContinuousEventScanned(1)
        recordContinuousOpportunitiesFound(arbsFound)
      }

      logInfo(perEventEventName, {
        context: 'service:deepScan',
        operation,
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: nowMs() - startedAtMs,
        errorCategory: null,
        eventId: event.id,
        eventName: event.name,
        success: true,
        arbsFound,
        requestsMade: currentScan?.requestsMade ?? 0
      } satisfies StructuredLogBase)
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        updateProgress({ status: 'cancelled', currentEventName: undefined, mode } as Partial<DeepScanProgress>)
        return
      }

      eventErrors += 1

      if (mode === 'continuous') {
        recordContinuousEventScanned(1)
      }

      logWarn(perEventEventName, {
        context: 'service:deepScan',
        operation,
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: nowMs() - startedAtMs,
        errorCategory: 'ProviderError',
        eventId: event.id,
        eventName: event.name,
        success: false,
        arbsFound: 0,
        message: (error as Error)?.message ?? 'Deep scan event error'
      } satisfies StructuredLogBase)
      updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode } as Partial<DeepScanProgress>)
    }
  }

  // Story 7.8: Process a batch of events using the batch odds endpoint
  const processBatchWithBatchOdds = async (batchEvents: DeepScanEvent[]): Promise<void> => {
    if (signal.aborted || batchEvents.length === 0) return

    // Group into API batches of 10 events max
    const apiBatches = chunk(batchEvents, BATCH_SIZE_MAX)
    const batchFetcher = getBatchOddsFetcher()

    for (const apiBatch of apiBatches) {
      if (signal.aborted) break

      updateProgress({ currentEventName: `Batch: ${apiBatch.length} events`, mode } as Partial<DeepScanProgress>)
      const batchStartedAtMs = nowMs()

      try {
        const batchResponse = await batchFetcher({
          events: apiBatch,
          apiKey,
          bookmakers,
          signal,
          correlationId
        })

        // Process each event result in the batch
        for (const eventResult of batchResponse.results) {
          if (signal.aborted) break

          const event = apiBatch.find((e) => e.id === eventResult.eventId)
          if (!event) continue

          updateProgress({ currentEventName: event.name, mode } as Partial<DeepScanProgress>)

          if (!eventResult.success) {
            // Event failed in batch
            eventErrors += 1
            if (mode === 'continuous') {
              recordContinuousEventScanned(1)
            }
            logWarn(perEventEventName, {
              context: 'service:deepScan',
              operation,
              providerId: DEEP_SCAN_PROVIDER_ID,
              correlationId,
              durationMs: null,
              errorCategory: 'ProviderError',
              eventId: event.id,
              eventName: event.name,
              success: false,
              arbsFound: 0,
              message: eventResult.error ?? 'Event failed in batch'
            } satisfies StructuredLogBase)
            updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode } as Partial<DeepScanProgress>)
            continue
          }

          // Process successful event result
          const result = eventResult.data
          const foundAt = nowIso()
          const resultsBefore = (mode === 'continuous' ? continuousResults : manualResults).length
          let marketsRetrievedForEvent = 0

          const opportunities = isOpportunityArray(result)
            ? result
            : (() => {
                const payload = toRawOddsPayload(result, event, config)
                if (!payload) {
                  return []
                }
                const uniqueMarketKeys = collectUniqueMarketKeys(payload)
                marketsRetrievedForEvent = uniqueMarketKeys.length

                // Cache best odds and raw odds
                const bestOddsComparisons = computeBestOddsComparison(payload, config)
                if (bestOddsComparisons.length > 0) {
                  cacheBestOddsForEvent(payload.event.id, bestOddsComparisons)
                }
                cacheRawOdds(payload.event.id, payload)

                return buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys)
              })()

          if (marketsRetrievedForEvent > 0) {
            totalMarketsRetrieved += marketsRetrievedForEvent
            eventsWithMarkets += 1
          }

          if (opportunities.length) {
            updateArbTrackingFromOpportunities(opportunities)

            if (mode === 'continuous') {
              continuousResults.push(...opportunities)
              updateProgress({ opportunitiesFound: continuousResults.length, mode } as Partial<DeepScanProgress>)
            } else {
              manualResults.push(...opportunities)
              updateProgress({ opportunitiesFound: manualResults.length, mode } as Partial<DeepScanProgress>)
            }
          }

          const resultsAfter = (mode === 'continuous' ? continuousResults : manualResults).length
          const arbsFound = Math.max(0, resultsAfter - resultsBefore)

          updateProgress({
            eventsScanned: (currentScan?.eventsScanned ?? 0) + 1,
            marketsScanned: (currentScan?.marketsScanned ?? 0) + marketsRetrievedForEvent,
            marketGroupsWithArbs: [...arbMarketGroups],
            mode
          } as Partial<DeepScanProgress>)

          if (mode === 'continuous') {
            updateScanCache(event.id, bookmakers)
            recordContinuousEventScanned(1)
            recordContinuousOpportunitiesFound(arbsFound)
          }

          logInfo(perEventEventName, {
            context: 'service:deepScan',
            operation,
            providerId: DEEP_SCAN_PROVIDER_ID,
            correlationId,
            durationMs: null,
            errorCategory: null,
            eventId: event.id,
            eventName: event.name,
            success: true,
            arbsFound,
            requestsMade: currentScan?.requestsMade ?? 0,
            batchMode: true
          } satisfies StructuredLogBase)
        }

        logInfo('deepScan.batch.processed', {
          context: 'service:deepScan',
          operation,
          providerId: DEEP_SCAN_PROVIDER_ID,
          correlationId,
          durationMs: nowMs() - batchStartedAtMs,
          errorCategory: null,
          batchSize: apiBatch.length,
          successCount: batchResponse.results.filter((r) => r.success).length,
          failureCount: batchResponse.results.filter((r) => !r.success).length
        } satisfies StructuredLogBase)
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          updateProgress({ status: 'cancelled', currentEventName: undefined, mode } as Partial<DeepScanProgress>)
          return
        }

        // Batch request failed entirely - count all events as errors
        eventErrors += apiBatch.length
        for (let i = 0; i < apiBatch.length; i++) {
          if (mode === 'continuous') {
            recordContinuousEventScanned(1)
          }
          updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode } as Partial<DeepScanProgress>)
        }

        logWarn('deepScan.batch.failed', {
          context: 'service:deepScan',
          operation,
          providerId: DEEP_SCAN_PROVIDER_ID,
          correlationId,
          durationMs: nowMs() - batchStartedAtMs,
          errorCategory: 'ProviderError',
          batchSize: apiBatch.length,
          message: (error as Error)?.message ?? 'Batch request failed'
        } satisfies StructuredLogBase)
      }
    }
  }

  // Story 7.8: Legacy single-event scan batch (used when batch mode disabled)
  const scanBatch = async (batchEvents: DeepScanEvent[]): Promise<void> => {
    let nextIndex = 0
    const worker = async (): Promise<void> => {
      while (!signal.aborted) {
        const index = nextIndex
        nextIndex += 1
        if (index >= batchEvents.length) {
          return
        }
        await processEvent(batchEvents[index])
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  }

  // Story 7.8: Choose batch or single-event processing based on setting
  if (useBatchOdds) {
    // Batch mode: process events in batches of 10 using /v3/odds/multi
    // Concurrency: N concurrent batch requests (each batch = 10 events)
    const batchConcurrency = Math.max(1, Math.min(5, concurrency))
    const apiBatches = chunk(events, BATCH_SIZE_MAX)

    logInfo('deepScan.batch.mode', {
      context: 'service:deepScan',
      operation,
      providerId: DEEP_SCAN_PROVIDER_ID,
      correlationId,
      durationMs: null,
      errorCategory: null,
      totalEvents: events.length,
      totalBatches: apiBatches.length,
      batchSize: BATCH_SIZE_MAX,
      batchConcurrency
    } satisfies StructuredLogBase)

    // Process batches with concurrency
    const batchChunks = chunk(apiBatches, batchConcurrency)
    for (const concurrentBatches of batchChunks) {
      if (signal.aborted) break
      // Flatten concurrent batches and process
      const flatEvents = concurrentBatches.flat()
      await processBatchWithBatchOdds(flatEvents)
    }
  } else {
    // Legacy mode: single-event processing
    for (const batch of batches) {
      if (signal.aborted) break
      await scanBatch(batch)
    }
  }

  if ((currentScan?.status ?? 'idle') !== 'cancelled') {
    updateProgress({ status: 'completed', currentEventName: undefined, mode } as Partial<DeepScanProgress>)
  }

  if (mode === 'continuous') {
    lastContinuousScanAt = nowIso()
    updateProgress({ lastContinuousScanAt: lastContinuousScanAt ?? undefined, mode } as Partial<DeepScanProgress>)
    
    recordScanCompletion({
      startedAt: new Date(scanStartedAtMs).toISOString(),
      completedAt: lastContinuousScanAt,
      eventsScanned: currentScan?.eventsScanned ?? 0,
      opportunitiesFound: continuousResults.length,
      durationMs: nowMs() - scanStartedAtMs,
      mode: 'continuous'
    })
  } else if (mode === 'manual') {
    recordScanCompletion({
      startedAt: new Date(scanStartedAtMs).toISOString(),
      completedAt: nowIso(),
      eventsScanned: currentScan?.eventsScanned ?? 0,
      opportunitiesFound: manualResults.length,
      durationMs: nowMs() - scanStartedAtMs,
      mode: 'manual'
    })
  }

  const quotaStatusAfter = getHourlyQuotaStatus()
  const averageMarketsPerEvent =
    eventsWithMarkets > 0 ? Number((totalMarketsRetrieved / eventsWithMarkets).toFixed(2)) : 0
  logInfo(completeEventName, {
    context: 'service:deepScan',
    operation,
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: nowMs() - scanStartedAtMs,
    errorCategory: null,
    eventsScanned: currentScan?.eventsScanned ?? 0,
    eventsTotal: currentScan?.eventsTotal ?? 0,
    opportunitiesFound: mode === 'continuous' ? continuousResults.length : manualResults.length,
    eventsFailed: eventErrors,
    requestsMade: currentScan?.requestsMade ?? 0,
    cacheHits: discoverySummary?.cacheHits ?? 0,
    cacheMisses: discoverySummary?.cacheMisses ?? 0,
    marketStats: {
      totalMarketsRetrieved,
      marketsWithArbs: arbMarketKeys.size,
      averageMarketsPerEvent,
      unknownMarketsCount: unknownMarketKeys.size
    },
    quota: {
      hourlyRequestsUsed: quotaStatusAfter.used,
      hourlyRequestLimit: quotaStatusAfter.limit,
      percentUsed: Number((quotaStatusAfter.percentUsed * 100).toFixed(1))
    }
  } satisfies StructuredLogBase)
}

async function runManualScan(
  config: DeepScanConfig,
  apiKey: string,
  signal: AbortSignal,
  correlationId: string
): Promise<void> {
  const resolveEvents = eventResolverOverride ?? defaultEventResolver
  const resolveBookmakers = bookmakersResolverOverride ?? defaultBookmakersResolver

  const bookmakers = await resolveBookmakers({ config, apiKey })

  // Early validation: odds-api.io /odds endpoint requires bookmakers
  if (!bookmakers.length) {
    throw new Error(
      'No bookmakers configured for Deep Scan. ' +
      'Please select bookmakers in Settings (Odds-API.io bookmaker selection) before running a scan.'
    )
  }

  const events = await resolveEvents({ config, apiKey, signal, correlationId })

  await runScanForEvents({
    mode: 'manual',
    config,
    apiKey,
    signal,
    correlationId,
    events,
    bookmakers
  })
}

function scheduleContinuousStart(waitMs: number, reason: string): void {
  const safeWaitMs = Math.max(0, waitMs)
  clearMinIntervalTimer()
  minIntervalTimer = setTimeout(() => {
    minIntervalTimer = null
    if (!continuousScanQueued || !continuousDeepScanEnabled || manualScanInProgress) {
      return
    }
    void startContinuousDeepScan({ reason, force: true })
  }, safeWaitMs)

  logInfo('continuousScan.scheduled', {
    context: 'service:deepScan',
    operation: 'scheduleContinuousStart',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    waitMs: safeWaitMs,
    reason
  } satisfies StructuredLogBase)
}

function cancelContinuousDeepScan(reason: string): void {
  clearMinIntervalTimer()
  continuousScanQueued = false
  if (continuousAbortController) {
    continuousAbortController.abort()
  }
  isContinuousScanActive = false
  updateProgress({ status: 'cancelled', currentEventName: undefined, mode: 'continuous' } as Partial<DeepScanProgress>)
  logInfo('continuousScan.cancel', {
    context: 'service:deepScan',
    operation: 'cancelContinuousDeepScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    reason
  } satisfies StructuredLogBase)
}

export function getContinuousDeepScanEnabled(): boolean {
  return continuousDeepScanEnabled
}

export function setContinuousDeepScanEnabled(enabled: boolean): void {
  const next = Boolean(enabled)
  continuousDeepScanEnabled = next

  if (!next) {
    cancelContinuousDeepScan('disabled')
  } else if (continuousScanQueued && !isContinuousScanActive && !manualScanInProgress) {
    void startContinuousDeepScan({ reason: 'enabled' })
  }

  updateProgress({
    status: currentScan?.status ?? 'idle',
    mode: (currentScan as { mode?: 'manual' | 'continuous' })?.mode ?? 'manual',
    lastContinuousScanAt: lastContinuousScanAt ?? undefined,
    isContinuousScanActive
  } as Partial<DeepScanProgress>)

  logInfo('continuousScan.enabled', {
    context: 'service:deepScan',
    operation: 'setContinuousDeepScanEnabled',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    enabled: next
  } satisfies StructuredLogBase)
}

function normalizeMaxEventsPerCycle(value: number): number {
  const parsed = Number.isFinite(value) ? Math.floor(value) : Number.NaN
  if (!Number.isFinite(parsed) || parsed < 1) {
    return CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE
  }
  return Math.min(parsed, 500)
}

export function getContinuousScanMaxEventsPerCycle(): number {
  return continuousScanMaxEventsPerCycle
}

export function setContinuousScanMaxEventsPerCycle(value: number): void {
  continuousScanMaxEventsPerCycle = normalizeMaxEventsPerCycle(value)
  logInfo('continuousScan.maxEvents.set', {
    context: 'service:deepScan',
    operation: 'setContinuousScanMaxEventsPerCycle',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    maxEventsPerCycle: continuousScanMaxEventsPerCycle
  } satisfies StructuredLogBase)
}

export function getScanCacheTtlMinutes(): number {
  return Math.round(scanCacheTtlMs / 60_000)
}

export function setScanCacheTtl(minutes: number): void {
  const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(60, Math.floor(minutes))) : 5
  scanCacheTtlMs = normalized * 60_000
  logInfo('continuousScan.cacheTtl.set', {
    context: 'service:deepScan',
    operation: 'setScanCacheTtl',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    cacheTtlMinutes: normalized
  } satisfies StructuredLogBase)
}

export function getContinuousScanBatchSize(): number {
  return continuousScanBatchSize
}

export function setContinuousScanBatchSize(size: number): void {
  const normalized = Number.isFinite(size) ? Math.max(5, Math.min(50, Math.floor(size))) : CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT
  continuousScanBatchSize = normalized
  logInfo('continuousScan.batchSize.set', {
    context: 'service:deepScan',
    operation: 'setContinuousScanBatchSize',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    batchSize: normalized
  } satisfies StructuredLogBase)
}

export function getScanIntervalMinutes(): number {
  return scanIntervalMinutes
}

export function setScanIntervalMinutes(minutes: number): void {
  const normalized = Number.isFinite(minutes) ? Math.max(1, Math.min(30, Math.floor(minutes))) : 5
  scanIntervalMinutes = normalized
  logInfo('continuousScan.interval.set', {
    context: 'service:deepScan',
    operation: 'setScanIntervalMinutes',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    intervalMinutes: normalized
  } satisfies StructuredLogBase)
}

export function getConcurrentRequests(): number {
  return concurrentRequests
}

export function setConcurrentRequests(value: number): void {
  const normalized = Number.isFinite(value) ? Math.max(1, Math.min(10, Math.floor(value))) : 2
  concurrentRequests = normalized
  logInfo('continuousScan.concurrentRequests.set', {
    context: 'service:deepScan',
    operation: 'setConcurrentRequests',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    concurrentRequests: normalized
  } satisfies StructuredLogBase)
}

export function getScanScope(): 'all-sports' | 'selected-sports' | 'selected-leagues' {
  return scanScope
}

export function setScanScope(value: 'all-sports' | 'selected-sports' | 'selected-leagues'): void {
  const validScopes = ['all-sports', 'selected-sports', 'selected-leagues'] as const
  const normalized = validScopes.includes(value) ? value : 'all-sports'
  scanScope = normalized
  logInfo('continuousScan.scope.set', {
    context: 'service:deepScan',
    operation: 'setScanScope',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    scanScope: normalized
  } satisfies StructuredLogBase)
}

export function pauseContinuousScan(): void {
  continuousScanPaused = true
  updateProgress({ isPaused: true } as Partial<DeepScanProgress>)
  logInfo('continuousScan.pause', {
    context: 'service:deepScan',
    operation: 'pauseContinuousScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null
  } satisfies StructuredLogBase)
}

export function resumeContinuousScan(): void {
  continuousScanPaused = false
  updateProgress({ isPaused: false } as Partial<DeepScanProgress>)
  logInfo('continuousScan.resume', {
    context: 'service:deepScan',
    operation: 'resumeContinuousScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null
  } satisfies StructuredLogBase)
  // Trigger a new scan cycle if conditions are met and interval has elapsed
  if (continuousDeepScanEnabled && !isContinuousScanActive && !manualScanInProgress) {
    const now = nowMs()
    if (lastContinuousScanStartedAtMs !== null) {
      const elapsed = now - lastContinuousScanStartedAtMs
      const minIntervalMs = Math.max(CONTINUOUS_SCAN_MIN_INTERVAL_MS, scanIntervalMinutes * 60 * 1000)
      if (elapsed >= minIntervalMs) {
        void startContinuousDeepScan({ reason: 'resumed', force: true })
      } else {
        // Schedule to start after the interval elapses
        const remainingMs = minIntervalMs - elapsed
        scheduleContinuousStart(remainingMs, 'resumed-after-interval')
      }
    } else {
      void startContinuousDeepScan({ reason: 'resumed', force: true })
    }
  }
}

export function isContinuousScanPaused(): boolean {
  return continuousScanPaused
}

function recordScanCompletion(entry: ScanHistoryEntry): void {
  scanHistory.push(entry)
  if (scanHistory.length > MAX_HISTORY_ENTRIES) {
    scanHistory.shift()
  }
}

export function getScanHistory(): ScanHistoryEntry[] {
  return [...scanHistory]
}

export function getDeepScanQuotaStatus(): DeepScanQuotaStatus {
  const status = getHourlyQuotaStatus()
  const isThrottled = status.percentUsed >= HOURLY_THROTTLE_THRESHOLD
  
  // Calculate when the hourly window resets (throttle resume time)
  let throttleResumeAt: string | undefined
  if (isThrottled && hourlyWindowStartedAtMs !== null) {
    const windowEndMs = hourlyWindowStartedAtMs + 60 * 60 * 1000 // 1 hour from start
    throttleResumeAt = new Date(windowEndMs).toISOString()
  }
  
  return {
    hourlyUsed: status.used,
    hourlyLimit: status.limit,
    percentUsed: status.percentUsed,
    isThrottled,
    throttleResumeAt
  }
}

function getCacheStats(): { entries: number; oldestAgeMs: number | null } {
  const now = nowMs()
  let oldestAgeMs: number | null = null

  for (const entry of scanCache.values()) {
    const age = now - entry.scannedAt
    if (oldestAgeMs === null || age > oldestAgeMs) {
      oldestAgeMs = age
    }
  }

  return {
    entries: scanCache.size,
    oldestAgeMs
  }
}

export function getAvailableSports(): string[] {
  return [...lastDiscoveredSports]
}

export function getEnabledSportsFilter(): string[] {
  return [...enabledSportsFilter]
}

export function setEnabledSportsFilter(sports: string[]): void {
  const normalized = Array.isArray(sports)
    ? sports.map((s) => s.trim()).filter(Boolean)
    : []
  enabledSportsFilter = normalized
  logInfo('continuousScan.sportsFilter.set', {
    context: 'service:deepScan',
    operation: 'setEnabledSportsFilter',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    enabledSports: normalized.length > 0 ? normalized : 'all'
  } satisfies StructuredLogBase)
}

export function getEnabledLeaguesFilter(): string[] {
  return [...enabledLeaguesFilter]
}

export function setEnabledLeaguesFilter(leagues: string[]): void {
  const normalized = Array.isArray(leagues)
    ? leagues.map((l) => l.trim()).filter(Boolean)
    : []
  enabledLeaguesFilter = normalized
  logInfo('continuousScan.leaguesFilter.set', {
    context: 'service:deepScan',
    operation: 'setEnabledLeaguesFilter',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: continuousCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    enabledLeagues: normalized.length > 0 ? normalized : 'all'
  } satisfies StructuredLogBase)
}

export function getContinuousScanStatus(): {
  enabled: boolean
  isActive: boolean
  isPaused: boolean
  lastContinuousScanAt: string | null
  eventsScannedToday: number
  opportunitiesFoundToday: number
  requestsToday: number
  maxEventsPerCycle: number
  cacheEntries: number
  cacheTtlMinutes: number
  batchSize: number
  cacheOldestEntryAgeMs: number | null
  intervalMinutes: number
  concurrentRequests: number
  scanScope: 'all-sports' | 'selected-sports' | 'selected-leagues'
  enabledSports: string[]
  enabledLeagues: string[]
  quotaStatus: DeepScanQuotaStatus
  history: ScanHistoryEntry[]
} {
  ensureDailyStats(nowMs())
  const cacheStats = getCacheStats()
  return {
    enabled: continuousDeepScanEnabled,
    isActive: isContinuousScanActive,
    isPaused: continuousScanPaused,
    lastContinuousScanAt,
    eventsScannedToday: dailyEventsScanned,
    opportunitiesFoundToday: dailyOpportunitiesFound,
    requestsToday: dailyRequestsMade,
    maxEventsPerCycle: continuousScanMaxEventsPerCycle,
    cacheEntries: cacheStats.entries,
    cacheTtlMinutes: getScanCacheTtlMinutes(),
    batchSize: continuousScanBatchSize,
    cacheOldestEntryAgeMs: cacheStats.oldestAgeMs,
    intervalMinutes: scanIntervalMinutes,
    concurrentRequests,
    scanScope,
    enabledSports: getEnabledSportsFilter(),
    enabledLeagues: getEnabledLeaguesFilter(),
    quotaStatus: getDeepScanQuotaStatus(),
    history: getScanHistory()
  }
}

export function setContinuousScanDefaultThresholds(thresholds: {
  minRoi?: number
  marketGroupThresholds?: Record<string, number>
}): void {
  if (lastThresholdConfig.minRoi === undefined && lastThresholdConfig.marketGroupThresholds === undefined) {
    lastThresholdConfig = {
      minRoi: thresholds.minRoi,
      marketGroupThresholds: thresholds.marketGroupThresholds as Record<MarketGroup, number> | undefined,
      maxConcurrentRequests: lastThresholdConfig.maxConcurrentRequests ?? 2
    }
  }
}

async function runContinuousScanCycle(reason: string): Promise<void> {
  if (!continuousDeepScanEnabled || manualScanInProgress || continuousScanPaused) {
    return
  }

  if (process.env.NODE_ENV === 'test' && eventsFetcherOverride === null) {
    return
  }

  const apiKey = await getApiKeyForAdapter(DEEP_SCAN_PROVIDER_ID)
  if (!apiKey) {
    logWarn('continuousScan.error', {
      context: 'service:deepScan',
      operation: 'runContinuousScanCycle',
      providerId: DEEP_SCAN_PROVIDER_ID,
      correlationId: continuousCorrelationId ?? undefined,
      durationMs: null,
      errorCategory: 'UserError',
      message: 'API key not configured for provider odds-api-io'
    } satisfies StructuredLogBase)
    return
  }

  continuousCorrelationId = createCorrelationId()
  continuousAbortController = new AbortController()
  const signal = continuousAbortController.signal
  const correlationId = continuousCorrelationId

  const startedAt = nowIso()
  isContinuousScanActive = true
  lastContinuousScanStartedAtMs = nowMs()

  logInfo('continuousScan.trigger', {
    context: 'service:deepScan',
    operation: 'runContinuousScanCycle',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    reason
  } satisfies StructuredLogBase)

  updateProgress({
    status: 'scanning',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    marketsScanned: 0,
    marketGroupsWithArbs: [],
    startedAt,
    elapsedMs: 0,
    mode: 'continuous',
    lastContinuousScanAt: lastContinuousScanAt ?? undefined,
    isContinuousScanActive
  } as DeepScanProgress)

  const config: DeepScanConfig = {
    minRoi: lastThresholdConfig.minRoi,
    marketGroupThresholds: lastThresholdConfig.marketGroupThresholds,
    maxConcurrentRequests: lastThresholdConfig.maxConcurrentRequests ?? 2
  }

  try {
    const resolveBookmakers = bookmakersResolverOverride ?? defaultBookmakersResolver
    const bookmakers = await resolveBookmakers({ config, apiKey })

    // Early validation: odds-api.io /odds endpoint requires bookmakers
    if (!bookmakers.length) {
      throw new Error(
        'No bookmakers configured for Continuous Deep Scan. ' +
        'Please select bookmakers in Settings (Odds-API.io bookmaker selection) before enabling continuous scanning.'
      )
    }

    // Determine sports filter based on scan scope
    let sportsFilter: string[] | undefined
    if (scanScope === 'selected-sports' && enabledSportsFilter.length > 0) {
      sportsFilter = enabledSportsFilter
    } else if (scanScope === 'selected-leagues') {
      // For selected-leagues scope, we still need a sport context
      // Use enabled sports if available, otherwise default to football
      sportsFilter = enabledSportsFilter.length > 0 ? enabledSportsFilter : ['football']
    }

    const events = await discoverAllEvents({
      apiKey,
      signal,
      correlationId,
      sports: sportsFilter
    })
    
    // Filter by league if 'selected-leagues' scope is active
    let filteredEvents = events
    if (scanScope === 'selected-leagues' && enabledLeaguesFilter.length > 0) {
      const leagueSet = new Set(enabledLeaguesFilter.map(l => l.toLowerCase()))
      filteredEvents = events.filter(event => {
        if (!event.league) return false
        return leagueSet.has(event.league.toLowerCase())
      })
    }

    let cacheHits = 0
    let cacheMisses = 0
    const eventsToScanRaw = filteredEvents.filter((event) => {
      const shouldScan = shouldScanEvent(event.id, bookmakers)
      if (shouldScan) {
        cacheMisses += 1
      } else {
        cacheHits += 1
      }
      return shouldScan
    })

    const budget = computeContinuousEventBudget(eventsToScanRaw.length)
    const eventsToScan = eventsToScanRaw.slice(0, budget)

    if (eventsToScanRaw.length > eventsToScan.length) {
      logInfo('continuousScan.throttle', {
        context: 'service:deepScan',
        operation: 'runContinuousScanCycle',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: null,
        requestedEvents: eventsToScanRaw.length,
        allowedEvents: eventsToScan.length,
        budget
      } satisfies StructuredLogBase)
    }

    await runScanForEvents({
      mode: 'continuous',
      config,
      apiKey,
      signal,
      correlationId,
      events: eventsToScan,
      bookmakers,
      discoverySummary: {
        eventsDiscovered: events.length,
        eventsToScan: eventsToScan.length,
        cacheHits,
        cacheMisses
      }
    })
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      updateProgress({ status: 'cancelled', currentEventName: undefined, mode: 'continuous' } as Partial<DeepScanProgress>)
    } else {
      updateProgress({
        status: 'error',
        errorMessage: (error as Error)?.message ?? 'Continuous deep scan failed',
        mode: 'continuous'
      } as Partial<DeepScanProgress>)

      logWarn('continuousScan.error', {
        context: 'service:deepScan',
        operation: 'runContinuousScanCycle',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: 'SystemError',
        message: (error as Error)?.message ?? 'Continuous deep scan failed'
      } satisfies StructuredLogBase)
    }
  } finally {
    isContinuousScanActive = false
    continuousAbortController = null
    updateProgress({
      isContinuousScanActive,
      lastContinuousScanAt: lastContinuousScanAt ?? undefined,
      mode: 'continuous'
    } as Partial<DeepScanProgress>)
  }
}

export async function startContinuousDeepScan(args: { reason: string; force?: boolean }): Promise<void> {
  const { reason, force } = args

  if (!continuousDeepScanEnabled) {
    return
  }
  if (manualScanInProgress) {
    continuousScanQueued = true
    return
  }
  if (continuousScanPromise) {
    continuousScanQueued = true
    return
  }

  const now = nowMs()
  if (!force && lastContinuousScanStartedAtMs !== null) {
    const elapsed = now - lastContinuousScanStartedAtMs
    // Respect user's scan interval setting (converted to ms), but ensure at least minimum
    const minIntervalMs = Math.max(CONTINUOUS_SCAN_MIN_INTERVAL_MS, scanIntervalMinutes * 60 * 1000)
    if (elapsed < minIntervalMs) {
      continuousScanQueued = true
      const remainingMs = minIntervalMs - elapsed
      scheduleContinuousStart(remainingMs, 'scan-interval-elapsed')
      return
    }
  }

  continuousScanQueued = false
  clearMinIntervalTimer()

  continuousScanPromise = runContinuousScanCycle(reason)
    .catch((error) => {
      logWarn('continuousScan.error', {
        context: 'service:deepScan',
        operation: 'startContinuousDeepScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId: continuousCorrelationId ?? undefined,
        durationMs: null,
        errorCategory: 'SystemError',
        message: (error as Error)?.message ?? 'Continuous deep scan failed to start'
      } satisfies StructuredLogBase)
    })
    .finally(() => {
      continuousScanPromise = null

      if (continuousScanQueued && continuousDeepScanEnabled && !manualScanInProgress) {
        const nowAfter = nowMs()
        if (lastContinuousScanStartedAtMs !== null) {
          const elapsed = nowAfter - lastContinuousScanStartedAtMs
          const minIntervalMs = Math.max(CONTINUOUS_SCAN_MIN_INTERVAL_MS, scanIntervalMinutes * 60 * 1000)
          if (elapsed < minIntervalMs) {
            const remaining = minIntervalMs - elapsed
            scheduleContinuousStart(remaining, 'queued-after-cycle')
            return
          }
        }
        void startContinuousDeepScan({ reason: 'queued-after-cycle', force: true })
      }
    })
}

export async function startDeepScan(config: DeepScanConfig): Promise<void> {
  const parsed = deepScanConfigSchema.parse(config)
  ensureScope(parsed)

  const currentMode = (currentScan as { mode?: 'manual' | 'continuous' } | null)?.mode ?? 'manual'
  if (currentScan?.status === 'scanning' && currentMode === 'manual') {
    throw new Error('A deep scan is already in progress')
  }

  if (isContinuousScanActive || continuousScanPromise) {
    cancelContinuousDeepScan('manual_override')
  }

  const apiKey = await getApiKeyForAdapter(DEEP_SCAN_PROVIDER_ID)
  if (!apiKey) {
    throw new Error('API key not configured for provider odds-api-io')
  }

  lastThresholdConfig = {
    minRoi: parsed.minRoi,
    marketGroupThresholds: parsed.marketGroupThresholds,
    maxConcurrentRequests: parsed.maxConcurrentRequests
  }

  manualCorrelationId = createCorrelationId()
  manualAbortController = new AbortController()
  manualResults = []
  manualScanInProgress = true
  currentScanMode = 'manual'

  const startedAt = nowIso()
  currentScan = {
    status: 'scanning',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    marketsScanned: 0,
    marketGroupsWithArbs: [],
    startedAt,
    elapsedMs: 0,
    mode: 'manual',
    lastContinuousScanAt: lastContinuousScanAt ?? undefined,
    isContinuousScanActive
  } as DeepScanProgress

  logInfo('deepScan.start', {
    context: 'service:deepScan',
    operation: 'startDeepScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: manualCorrelationId,
    durationMs: null,
    errorCategory: null,
    configSummary: {
      eventIds: parsed.eventIds?.length ?? 0,
      hasLeagueId: Boolean(parsed.leagueId),
      hasSportSlug: Boolean(parsed.sportSlug),
      maxConcurrentRequests: parsed.maxConcurrentRequests ?? 2
    },
    requestedEventCount: parsed.eventIds?.length ?? null
  } satisfies StructuredLogBase)

  const signal = manualAbortController.signal
  const correlationId = manualCorrelationId

  manualScanPromise = runManualScan(parsed, apiKey, signal, correlationId)
    .catch((error) => {
      if (signal.aborted || isAbortError(error)) {
        return
      }

      updateProgress({ status: 'error', errorMessage: (error as Error)?.message ?? 'Deep scan failed', mode: 'manual' } as Partial<DeepScanProgress>)

      logWarn('deepScan.error', {
        context: 'service:deepScan',
        operation: 'startDeepScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: null,
        errorCategory: 'SystemError',
        message: (error as Error)?.message ?? 'Deep scan failed'
      } satisfies StructuredLogBase)
    })
    .finally(() => {
      manualAbortController = null
      manualScanInProgress = false
      if (continuousDeepScanEnabled && continuousScanQueued && !isContinuousScanActive) {
        void startContinuousDeepScan({ reason: 'resume-after-manual', force: true })
      }
    })
}

export function cancelDeepScan(): void {
  const currentMode = (currentScan as { mode?: 'manual' | 'continuous' } | null)?.mode ?? 'manual'

  if (manualAbortController && currentScan?.status === 'scanning' && currentMode === 'manual') {
    manualAbortController.abort()
    updateProgress({ status: 'cancelled', currentEventName: undefined, mode: 'manual' } as Partial<DeepScanProgress>)

    logInfo('deepScan.cancel', {
      context: 'service:deepScan',
      operation: 'cancelDeepScan',
      providerId: DEEP_SCAN_PROVIDER_ID,
      correlationId: manualCorrelationId ?? undefined,
      durationMs: null,
      errorCategory: null,
      eventsCompleted: currentScan?.eventsScanned ?? 0,
      opportunitiesFound: manualResults.length,
      requestsMade: currentScan?.requestsMade ?? 0,
      reason: 'user_cancel'
    } satisfies StructuredLogBase)
    return
  }

  if (isContinuousScanActive || continuousScanPromise) {
    cancelContinuousDeepScan('user_cancel')
  }
}

export function getDeepScanProgress(): DeepScanProgress {
  const base = currentScan ?? idleProgress()
  if (base.status === 'scanning') {
    return {
      ...base,
      elapsedMs: computeElapsedMs(base.startedAt),
      lastContinuousScanAt: lastContinuousScanAt ?? (base as { lastContinuousScanAt?: string }).lastContinuousScanAt,
      isContinuousScanActive
    }
  }
  return {
    ...base,
    lastContinuousScanAt: lastContinuousScanAt ?? (base as { lastContinuousScanAt?: string }).lastContinuousScanAt,
    isContinuousScanActive
  } as DeepScanProgress
}

export function getDeepScanResults(): ArbitrageOpportunity[] {
  const combined = [...manualResults, ...continuousResults]
  return combined.map((opp) => ({
    ...opp,
    source: 'deepScan'
  }))
}

// Story 8.7: Export aggressive scan functions
export {
  startAggressiveScan,
  stopAggressiveScan,
  isAggressiveScanRunning,
  setAggressiveScanConfig,
  getAggressiveScanConfig,
  getAggressiveScanStats,
  initColdStart,
  updateColdStartProgress,
  getColdStartProgress,
  completeColdStart,
  upsertTieredEvent,
  boostEvent,
  isEventBoosted,
  getBoostedEventIds,
  getEventCountsByTier,
  getTotalEventCount,
  calculateEventTier,
  calculateMinutesToKickoff,
  isPreMatchEvent,
  createTieredEvent,
  getEventsForTier,
  getEventById,
  promoteEvents
}

export const __test = {
  resetState(): void {
    currentScan = null
    manualResults = []
    continuousResults = []
    manualAbortController = null
    continuousAbortController = null
    manualCorrelationId = null
    continuousCorrelationId = null
    manualScanPromise = null
    continuousScanPromise = null
    manualScanInProgress = false
    continuousDeepScanEnabled = true
    isContinuousScanActive = false
    continuousScanQueued = false
    lastContinuousScanAt = null
    lastContinuousScanStartedAtMs = null
    currentScanMode = 'manual'
    clearMinIntervalTimer()
    lastThresholdConfig = {}
    continuousScanMaxEventsPerCycle = CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE
    scanCacheTtlMs = SCAN_CACHE_TTL_MS_DEFAULT
    continuousScanBatchSize = CONTINUOUS_SCAN_BATCH_SIZE_DEFAULT
    scanCache.clear()
    timeOffsetMs = 0
    hourlyWindowStartedAtMs = null
    hourlyRequestsUsed = 0
    hourlyWarnLogged = false
    dailyStatsKey = null
    dailyEventsScanned = 0
    dailyOpportunitiesFound = 0
    dailyRequestsMade = 0
    lastDiscoveredSports = []
    enabledSportsFilter = []
    enabledLeaguesFilter = []
    eventResolverOverride = null
    eventsFetcherOverride = null
    oddsFetcherOverride = null
    bookmakersResolverOverride = null
    // Story 7.8: Reset batch/live/incremental fetcher overrides
    batchOddsFetcherOverride = null
    liveEventsFetcherOverride = null
    incrementalOddsFetcherOverride = null
    // Story 7.8: Reset efficiency settings
    useBatchOdds = true
    useIncrementalUpdates = true
    scanHorizonHours = DEFAULT_SCAN_HORIZON_HOURS
    scanMode = 'all'
    marketFreshnessThresholdMinutes = 5
    lastIncrementalFetchTimestamp = null
    // Story 7.8: Clear odds history buffer
    oddsHistoryBuffer.clear()
    // Story 7.8: Clear rate limit state
    apiRateLimit = null
    apiRateLimitLastUpdatedAtMs = null
    // Story 8.7: Reset aggressive scan state
    const aggressiveScan = require('./aggressiveScan')
    aggressiveScan.__test?.resetState()
  },
  setEventResolver(resolver: EventResolver | null): void {
    eventResolverOverride = resolver
  },
  setEventsFetcher(fetcher: EventsFetcher | null): void {
    eventsFetcherOverride = fetcher
  },
  setOddsFetcher(fetcher: OddsFetcher | null): void {
    oddsFetcherOverride = fetcher
  },
  setBookmakersResolver(resolver: BookmakersResolver | null): void {
    bookmakersResolverOverride = resolver
  },
  // Story 7.8: Test helpers for batch, live, and incremental fetchers
  setBatchOddsFetcher(fetcher: BatchOddsFetcher | null): void {
    batchOddsFetcherOverride = fetcher
  },
  setLiveEventsFetcher(fetcher: LiveEventsFetcher | null): void {
    liveEventsFetcherOverride = fetcher
  },
  setIncrementalOddsFetcher(fetcher: IncrementalOddsFetcher | null): void {
    incrementalOddsFetcherOverride = fetcher
  },
  getLastIncrementalFetchTimestamp(): string | null {
    return lastIncrementalFetchTimestamp
  },
  setLastIncrementalFetchTimestamp(timestamp: string | null): void {
    lastIncrementalFetchTimestamp = timestamp
  },
  async waitForScanCompletion(): Promise<void> {
    if (!manualScanPromise) return
    await manualScanPromise
  },
  async waitForContinuousScanCompletion(): Promise<void> {
    if (!continuousScanPromise) return
    await continuousScanPromise
  },
  shouldScanEvent(eventId: string, bookmakers: string[]): boolean {
    return shouldScanEvent(eventId, bookmakers)
  },
  markEventScanned(eventId: string, bookmakers: string[]): void {
    updateScanCache(eventId, bookmakers)
  },
  advanceScanCacheClock(deltaMs: number): void {
    timeOffsetMs += deltaMs
  },
  buildOpportunitiesFromRawOdds(payload: RawOddsPayload, config: DeepScanConfig, foundAt: string): ArbitrageOpportunity[] {
    const unknownMarketKeys = new Set<string>()
    return buildOpportunitiesFromRawOdds(payload, config, foundAt, unknownMarketKeys)
  },
  computeBestOddsComparison(payload: RawOddsPayload, config: DeepScanConfig) {
    return computeBestOddsComparison(payload, config)
  },
  SCAN_CACHE_TTL_MS: SCAN_CACHE_TTL_MS_DEFAULT,
  getContinuousStatus(): ReturnType<typeof getContinuousScanStatus> {
    return getContinuousScanStatus()
  },
  getScanCacheTtlMs(): number {
    return scanCacheTtlMs
  },
  getContinuousScanBatchSize(): number {
    return continuousScanBatchSize
  },
  // Story 7.8: Test helpers for API efficiency settings
  getUseBatchOdds(): boolean {
    return useBatchOdds
  },
  setUseBatchOdds(value: boolean): void {
    useBatchOdds = value
  },
  getUseIncrementalUpdates(): boolean {
    return useIncrementalUpdates
  },
  setUseIncrementalUpdates(value: boolean): void {
    useIncrementalUpdates = value
  },
  getScanHorizonHours(): number {
    return scanHorizonHours
  },
  setScanHorizonHours(value: number): void {
    scanHorizonHours = value
  },
  getScanMode(): 'all' | 'live' | 'upcoming' {
    return scanMode
  },
  setScanMode(value: 'all' | 'live' | 'upcoming'): void {
    scanMode = value
  },
  getMarketFreshnessThresholdMinutes(): number {
    return marketFreshnessThresholdMinutes
  },
  setMarketFreshnessThresholdMinutes(value: number): void {
    marketFreshnessThresholdMinutes = value
  },
  parseBatchOddsResponse(body: unknown, requestedEvents: DeepScanEvent[]): BatchOddsResponse['results'] {
    return parseBatchOddsResponse(body, requestedEvents)
  },
  toRawOddsPayload(result: unknown, event: DeepScanEvent, config: DeepScanConfig): RawOddsPayload | null {
    return toRawOddsPayload(result, event, config)
  },
  BATCH_SIZE_MAX,
  // Story 7.8: Test helpers for odds movement tracking
  getOddsHistoryBuffer(): Map<string, OddsSnapshot[]> {
    return oddsHistoryBuffer
  },
  clearOddsHistoryBuffer(): void {
    oddsHistoryBuffer.clear()
  },
  setOddsHistory(opportunityId: string, history: OddsSnapshot[]): void {
    oddsHistoryBuffer.set(opportunityId, history)
  },
  ODDS_HISTORY_MAX_SNAPSHOTS,
  ODDS_TREND_THRESHOLD,
  // Story 7.8: Test helpers for rate limit headers
  getApiRateLimit(): { limit: number; remaining: number; resetAt: string } | null {
    return apiRateLimit
  },
  setApiRateLimit(limit: number, remaining: number, resetAt: string): void {
    apiRateLimit = { limit, remaining, resetAt }
    apiRateLimitLastUpdatedAtMs = nowMs()
  },
  clearApiRateLimit(): void {
    apiRateLimit = null
    apiRateLimitLastUpdatedAtMs = null
  },
  getHourlyQuotaStatus(): ReturnType<typeof getHourlyQuotaStatus> {
    return getHourlyQuotaStatus()
  }
}
