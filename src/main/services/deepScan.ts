import { net } from 'electron'
import {
  inferMarketMetadata,
  type ArbitrageOpportunity,
  type DeepScanConfig,
  type DeepScanProgress,
  type MarketGroup,
  type ProviderId
} from '../../../shared/types'
import { deepScanConfigSchema } from '../../../shared/schemas'
import { getApiKeyForAdapter } from '../credentials'
import { scheduleProviderRequest } from './poller'
import { getSelectedBookmakers } from './odds-api-io-bookmakers'
import { createCorrelationId, logInfo, logWarn, type StructuredLogBase } from './logger'
import { calculateTwoLegArbitrageRoi } from './calculator'

const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_EVENTS_PATH = '/v3/events'
const ODDS_API_IO_ODDS_PATH = '/v3/odds'
const DEEP_SCAN_PROVIDER_ID: ProviderId = 'odds-api-io'

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

export const SCAN_CACHE_TTL_MS = 5 * 60 * 1000
export const CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE = 50
export const CONTINUOUS_SCAN_MIN_INTERVAL_MS = 60_000
const CONTINUOUS_SCAN_BATCH_SIZE = 10

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
}) => Promise<unknown>

type OddsFetcher = (args: {
  event: DeepScanEvent
  apiKey: string
  bookmakers: string[]
  signal: AbortSignal
  correlationId: string
}) => Promise<unknown>

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

let timeOffsetMs = 0

let hourlyWindowStartedAtMs: number | null = null
let hourlyRequestsUsed = 0
let hourlyWarnLogged = false

let dailyStatsKey: string | null = null
let dailyEventsScanned = 0
let dailyOpportunitiesFound = 0
let dailyRequestsMade = 0

let eventResolverOverride: EventResolver | null = null
let eventsFetcherOverride: EventsFetcher | null = null
let oddsFetcherOverride: OddsFetcher | null = null
let bookmakersResolverOverride: BookmakersResolver | null = null

interface RawOutcome {
  name: string
  odds: number
}

interface RawMarket {
  key: string
  outcomes: RawOutcome[]
}

interface RawBookmaker {
  name: string
  markets: RawMarket[]
}

interface RawEventDetails {
  id: string
  name: string
  date: string
  league: string
  sport: string
}

interface RawOddsPayload {
  event: RawEventDetails
  bookmakers: RawBookmaker[]
}

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
} {
  const ms = nowMs()
  ensureHourlyWindow(ms)
  const started = hourlyWindowStartedAtMs ?? ms
  const percentUsed = HOURLY_REQUEST_LIMIT > 0 ? hourlyRequestsUsed / HOURLY_REQUEST_LIMIT : 0
  return {
    used: hourlyRequestsUsed,
    limit: HOURLY_REQUEST_LIMIT,
    percentUsed: percentUsed > 0 ? percentUsed : 0,
    windowStartedAtMs: started
  }
}

function computeContinuousEventBudget(availableEvents: number): number {
  const base = Math.max(0, Math.min(continuousScanMaxEventsPerCycle, availableEvents))
  if (base === 0) return 0

  const quota = getHourlyQuotaStatus()
  const percent = quota.percentUsed

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
  const isExpired = ageMs >= SCAN_CACHE_TTL_MS
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
    startedAt: null,
    elapsedMs: 0,
    mode: 'manual',
    lastContinuousScanAt: lastContinuousScanAt ?? undefined,
    isContinuousScanActive
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
    const rawId = (item as { id?: unknown }).id
    const id = rawId != null ? String(rawId) : ''
    if (!id || seen.has(id)) continue
    const rawName =
      (item as { name?: unknown }).name ??
      (item as { event?: { name?: unknown } }).event?.name ??
      id
    const name = typeof rawName === 'string' && rawName.trim().length ? rawName : id
    const rawDate =
      (item as { date?: unknown }).date ??
      (item as { commence_time?: unknown }).commence_time ??
      (item as { event?: { date?: unknown } }).event?.date
    const date = typeof rawDate === 'string' && rawDate.trim().length ? rawDate : undefined
    const rawLeague =
      (item as { league?: unknown }).league ??
      (item as { event?: { league?: unknown } }).event?.league ??
      defaults.league
    const league = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : undefined
    const rawSport = (item as { sport?: unknown }).sport ?? defaults.sport
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

const defaultEventsFetcher: EventsFetcher = async ({ apiKey, signal, correlationId, page }) => {
  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_EVENTS_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  if (typeof page === 'number' && Number.isFinite(page) && page > 0) {
    url.searchParams.set('page', String(Math.floor(page)))
  }

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId,
    { mode: 'continuous' }
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Events request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Events request failed with status ${response.status}`)
  }

  return response.json()
}

function getEventsFetcher(): EventsFetcher {
  return eventsFetcherOverride ?? defaultEventsFetcher
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

  let page: number | null = null
  let pageGuard = 0

  do {
    const payload = await fetchEvents({ apiKey, signal, correlationId, page: page ?? undefined })
    const extracted = extractEvents(payload)
    for (const event of extracted) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      all.push(event)
    }
    page = extractNextPage(payload)
    pageGuard += 1
  } while (page !== null && pageGuard < 5 && !signal.aborted)

  const sportsFilter = Array.isArray(sports) && sports.length > 0 ? new Set(sports) : null
  const now = nowMs()
  const upcoming = all.filter((event) => {
    if (!isUpcomingEvent(event, now)) return false
    if (!sportsFilter) return true
    return event.sport ? sportsFilter.has(event.sport) : true
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
  const httpFetch = getHttpFetch()
  const url = new URL(ODDS_API_IO_ODDS_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('eventId', event.id)
  if (bookmakers.length) {
    url.searchParams.set('bookmakers', bookmakers.join(','))
  }

  const response = await trackedRequest(
    async () => httpFetch(url.toString(), { method: 'GET', signal, headers: { Accept: 'application/json' } }),
    correlationId
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Odds request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Odds request failed with status ${response.status}`)
  }

  return response.json()
}

function isOpportunityArray(value: unknown): value is ArbitrageOpportunity[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const opp = item as ArbitrageOpportunity
    return typeof opp.id === 'string' && Array.isArray(opp.legs) && opp.legs.length === 2
  })
}

function normalizeOutcomeName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (!normalized) return 'unknown'
  if (normalized === 'yes' || normalized === 'y') return 'yes'
  if (normalized === 'no' || normalized === 'n') return 'no'
  if (normalized === 'home' || normalized === '1') return 'home'
  if (normalized === 'away' || normalized === '2') return 'away'
  if (normalized === 'over' || normalized.startsWith('over ')) {
    return normalized.replace(/\s+/g, '_')
  }
  if (normalized === 'under' || normalized.startsWith('under ')) {
    return normalized.replace(/\s+/g, '_')
  }
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

function toRawOddsPayload(result: unknown, event: DeepScanEvent, config: DeepScanConfig): RawOddsPayload | null {
  if (!result || typeof result !== 'object') {
    return null
  }

  const rawEvent = (result as { event?: unknown }).event
  const rawBookmakers = (result as { bookmakers?: unknown }).bookmakers

  if (!Array.isArray(rawBookmakers)) {
    return null
  }

  const eventId =
    rawEvent && typeof rawEvent === 'object' && (rawEvent as { id?: unknown }).id != null
      ? String((rawEvent as { id?: unknown }).id)
      : event.id
  const eventName =
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
      : event.date ?? new Date().toISOString()
  const rawLeague = rawEvent && typeof rawEvent === 'object' ? (rawEvent as { league?: unknown }).league : undefined
  const eventLeague =
    typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : event.league ?? ''
  const rawSport = rawEvent && typeof rawEvent === 'object' ? (rawEvent as { sport?: unknown }).sport : undefined
  const eventSport =
    typeof rawSport === 'string' && rawSport.trim().length ? rawSport : event.sport ?? config.sportSlug ?? 'soccer'

  const bookmakers: RawBookmaker[] = rawBookmakers
    .map((book) => {
      if (!book || typeof book !== 'object') return null
      const nameCandidate =
        (book as { name?: unknown }).name ??
        (book as { key?: unknown }).key ??
        (book as { bookmaker?: unknown }).bookmaker
      const name = typeof nameCandidate === 'string' && nameCandidate.trim().length ? nameCandidate : null
      if (!name) return null
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
          const key = typeof keyCandidate === 'string' && keyCandidate.trim().length ? keyCandidate : null
          if (!key) return null
          const outcomesRaw = Array.isArray((market as { outcomes?: unknown }).outcomes)
            ? ((market as { outcomes: unknown[] }).outcomes as unknown[])
            : []
          const outcomes: RawOutcome[] = outcomesRaw
            .map((outcome) => {
              if (!outcome || typeof outcome !== 'object') return null
              const nameRaw = (outcome as { name?: unknown }).name
              const name = typeof nameRaw === 'string' && nameRaw.trim().length ? nameRaw : null
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
          return { key, outcomes }
        })
        .filter((m): m is RawMarket => m !== null)
      if (markets.length === 0) return null
      return { name, markets }
    })
    .filter((b): b is RawBookmaker => b !== null)

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
  foundAt: string
): ArbitrageOpportunity[] {
  const marketOutcomeQuotes = new Map<string, Map<string, Quote[]>>()
  const marketMetadataByKey = new Map<string, ReturnType<typeof inferMarketMetadata>>()

  for (const bookmaker of payload.bookmakers) {
    for (const market of bookmaker.markets) {
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

    const id = [
      'deep',
      payload.event.id,
      metadata.key,
      bestPair.a.bookmaker,
      bestPair.b.bookmaker,
      outcomeA,
      outcomeB
    ].join(':')

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
          outcome: outcomeA
        },
        {
          bookmaker: bestPair.b.bookmaker,
          market: metadata.key,
          odds: bestPair.b.odds,
          outcome: outcomeB
        }
      ],
      roi: bestPair.roi,
      foundAt,
      source: 'deepScan'
    })
  }

  return opportunities
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

  updateProgress({
    eventsTotal: events.length,
    eventsScanned: 0,
    opportunitiesFound: 0,
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
      quota: {
        hourlyRequestsUsed: quotaStatusAfter.used,
        hourlyRequestLimit: quotaStatusAfter.limit,
        percentUsed: Number((quotaStatusAfter.percentUsed * 100).toFixed(1))
      }
    } satisfies StructuredLogBase)
    return
  }

  const concurrency = Math.max(1, Math.min(10, config.maxConcurrentRequests ?? 2))
  let eventErrors = 0
  const batches = mode === 'continuous' ? chunk(events, CONTINUOUS_SCAN_BATCH_SIZE) : [events]

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
      const opportunities = isOpportunityArray(result)
        ? result
        : (() => {
            const payload = toRawOddsPayload(result, event, config)
            return payload ? buildOpportunitiesFromRawOdds(payload, config, foundAt) : []
          })()

      if (opportunities.length) {
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

      updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1, mode } as Partial<DeepScanProgress>)

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

  for (const batch of batches) {
    if (signal.aborted) break
    await scanBatch(batch)
  }

  if ((currentScan?.status ?? 'idle') !== 'cancelled') {
    updateProgress({ status: 'completed', currentEventName: undefined, mode } as Partial<DeepScanProgress>)
  }

  if (mode === 'continuous') {
    lastContinuousScanAt = nowIso()
    updateProgress({ lastContinuousScanAt: lastContinuousScanAt ?? undefined, mode } as Partial<DeepScanProgress>)
  }

  const quotaStatusAfter = getHourlyQuotaStatus()
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

export function getContinuousScanStatus(): {
  enabled: boolean
  isActive: boolean
  lastContinuousScanAt: string | null
  eventsScannedToday: number
  opportunitiesFoundToday: number
  requestsToday: number
  maxEventsPerCycle: number
} {
  ensureDailyStats(nowMs())
  return {
    enabled: continuousDeepScanEnabled,
    isActive: isContinuousScanActive,
    lastContinuousScanAt,
    eventsScannedToday: dailyEventsScanned,
    opportunitiesFoundToday: dailyOpportunitiesFound,
    requestsToday: dailyRequestsMade,
    maxEventsPerCycle: continuousScanMaxEventsPerCycle
  }
}

/**
 * Set default ROI thresholds for continuous scan.
 * Called during startup to sync renderer's persisted settings to main process.
 */
export function setContinuousScanDefaultThresholds(thresholds: {
  minRoi?: number
  marketGroupThresholds?: Record<string, number>
}): void {
  // Only update if lastThresholdConfig is empty (no manual scan has run yet)
  if (lastThresholdConfig.minRoi === undefined && lastThresholdConfig.marketGroupThresholds === undefined) {
    lastThresholdConfig = {
      minRoi: thresholds.minRoi,
      marketGroupThresholds: thresholds.marketGroupThresholds as Record<MarketGroup, number> | undefined,
      maxConcurrentRequests: lastThresholdConfig.maxConcurrentRequests ?? 2
    }
  }
}

async function runContinuousScanCycle(reason: string): Promise<void> {
  if (!continuousDeepScanEnabled || manualScanInProgress) {
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

    const events = await discoverAllEvents({
      apiKey,
      signal,
      correlationId
    })

    let cacheHits = 0
    let cacheMisses = 0
    const eventsToScanRaw = events.filter((event) => {
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
    if (elapsed < CONTINUOUS_SCAN_MIN_INTERVAL_MS) {
      continuousScanQueued = true
      const remainingMs = CONTINUOUS_SCAN_MIN_INTERVAL_MS - elapsed
      scheduleContinuousStart(remainingMs, 'min-interval-elapsed')
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
          if (elapsed < CONTINUOUS_SCAN_MIN_INTERVAL_MS) {
            const remaining = CONTINUOUS_SCAN_MIN_INTERVAL_MS - elapsed
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
    scanCache.clear()
    timeOffsetMs = 0
    hourlyWindowStartedAtMs = null
    hourlyRequestsUsed = 0
    hourlyWarnLogged = false
    dailyStatsKey = null
    dailyEventsScanned = 0
    dailyOpportunitiesFound = 0
    dailyRequestsMade = 0
    eventResolverOverride = null
    eventsFetcherOverride = null
    oddsFetcherOverride = null
    bookmakersResolverOverride = null
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
  SCAN_CACHE_TTL_MS,
  getContinuousStatus(): ReturnType<typeof getContinuousScanStatus> {
    return getContinuousScanStatus()
  }
}
