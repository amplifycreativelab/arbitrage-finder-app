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

interface DeepScanEvent {
  id: string
  name: string
  date?: string
  league?: string
  sport?: string
}

type EventResolver = (args: {
  config: DeepScanConfig
  apiKey: string
  signal: AbortSignal
  correlationId: string
}) => Promise<DeepScanEvent[]>

type OddsFetcher = (args: {
  event: DeepScanEvent
  apiKey: string
  bookmakers: string[]
  signal: AbortSignal
  correlationId: string
}) => Promise<unknown>

type BookmakersResolver = (args: { config: DeepScanConfig; apiKey: string }) => Promise<string[]>

let currentScan: DeepScanProgress | null = null
let currentResults: ArbitrageOpportunity[] = []
let currentAbortController: AbortController | null = null
let currentCorrelationId: string | null = null
let scanPromise: Promise<void> | null = null

let eventResolverOverride: EventResolver | null = null
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

function idleProgress(): DeepScanProgress {
  return {
    status: 'idle',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    startedAt: null,
    elapsedMs: 0
  }
}

function computeElapsedMs(startedAt: string | null): number {
  if (!startedAt) return 0
  const started = new Date(startedAt).getTime()
  if (!Number.isFinite(started)) return 0
  const diff = Date.now() - started
  return diff > 0 ? diff : 0
}

function updateProgress(patch: Partial<DeepScanProgress>): void {
  const base = currentScan ?? idleProgress()
  const next: DeepScanProgress = {
    ...base,
    ...patch
  }

  next.elapsedMs = computeElapsedMs(next.startedAt)
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
    const onAbort = () => {
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
  correlationId: string
): Promise<T> {
  updateProgress({ requestsMade: (currentScan?.requestsMade ?? 0) + 1 })
  return scheduleProviderRequest(DEEP_SCAN_PROVIDER_ID, () => fn({ correlationId }))
}

function extractEvents(payload: unknown, config: DeepScanConfig): DeepScanEvent[] {
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
      config.leagueId
    const league = typeof rawLeague === 'string' && rawLeague.trim().length ? rawLeague : undefined
    const rawSport = (item as { sport?: unknown }).sport ?? config.sportSlug
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
    correlationId
  )

  if (!response.ok) {
    const message = await response.text().catch(() => `Events request failed with status ${response.status}`)
    throw createHttpError(response.status, message || `Events request failed with status ${response.status}`)
  }

  const body = (await response.json()) as unknown
  return extractEvents(body, config)
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

      let baseKey = baseMetadata.key
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

async function runScan(config: DeepScanConfig, apiKey: string, signal: AbortSignal, correlationId: string): Promise<void> {
  const resolveEvents = eventResolverOverride ?? defaultEventResolver
  const resolveBookmakers = bookmakersResolverOverride ?? defaultBookmakersResolver
  const fetchOdds = oddsFetcherOverride ?? defaultOddsFetcher
  const trackOddsAttempts = oddsFetcherOverride !== null

  const scanStartedAt = Date.now()
  const bookmakers = await resolveBookmakers({ config, apiKey })

  const events = await resolveEvents({ config, apiKey, signal, correlationId })
  updateProgress({ eventsTotal: events.length })
  let eventErrors = 0

  logInfo('deepScan.start', {
    context: 'service:deepScan',
    operation: 'runScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: null,
    errorCategory: null,
    eventCount: events.length,
    bookmakersCount: bookmakers.length,
    requestsMade: currentScan?.requestsMade ?? 0
  } satisfies StructuredLogBase)

  if (events.length === 0) {
    updateProgress({ status: 'completed', currentEventName: undefined })
    logInfo('deepScan.complete', {
      context: 'service:deepScan',
      operation: 'runScan',
      providerId: DEEP_SCAN_PROVIDER_ID,
      correlationId,
      durationMs: Date.now() - scanStartedAt,
      errorCategory: null,
      eventsScanned: 0,
      eventsTotal: 0,
      opportunitiesFound: 0,
      eventsFailed: 0,
      requestsMade: currentScan?.requestsMade ?? 0
    } satisfies StructuredLogBase)
    return
  }

  const concurrency = Math.max(1, Math.min(10, config.maxConcurrentRequests ?? 2))
  let nextIndex = 0

  const processEvent = async (event: DeepScanEvent): Promise<void> => {
    if (signal.aborted) return
    updateProgress({ currentEventName: event.name })
    const startedAt = Date.now()
    try {
      const resultsBefore = currentResults.length
      const result = await fetchOddsWithRetry(
        fetchOdds,
        { event, apiKey, bookmakers, signal, correlationId },
        { trackAttempts: trackOddsAttempts }
      )

      const foundAt = new Date().toISOString()
      const opportunities = isOpportunityArray(result)
        ? result
        : (() => {
            const payload = toRawOddsPayload(result, event, config)
            return payload ? buildOpportunitiesFromRawOdds(payload, config, foundAt) : []
          })()

      if (opportunities.length) {
        currentResults.push(...opportunities)
        updateProgress({ opportunitiesFound: currentResults.length })
      }

      const arbsFound = Math.max(0, currentResults.length - resultsBefore)

      updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1 })

      logInfo('deepScan.event', {
        context: 'service:deepScan',
        operation: 'runScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: Date.now() - startedAt,
        errorCategory: null,
        eventId: event.id,
        eventName: event.name,
        success: true,
        arbsFound,
        requestsMade: currentScan?.requestsMade ?? 0
      } satisfies StructuredLogBase)
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        updateProgress({ status: 'cancelled', currentEventName: undefined })
        return
      }

      eventErrors += 1

      logWarn('deepScan.event', {
        context: 'service:deepScan',
        operation: 'runScan',
        providerId: DEEP_SCAN_PROVIDER_ID,
        correlationId,
        durationMs: Date.now() - startedAt,
        errorCategory: 'ProviderError',
        eventId: event.id,
        eventName: event.name,
        success: false,
        arbsFound: 0,
        message: (error as Error)?.message ?? 'Deep scan event error'
      } satisfies StructuredLogBase)
      updateProgress({ eventsScanned: (currentScan?.eventsScanned ?? 0) + 1 })
    }
  }

  const worker = async (): Promise<void> => {
    while (!signal.aborted) {
      const index = nextIndex
      nextIndex += 1
      if (index >= events.length) {
        return
      }
      await processEvent(events[index])
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  if ((currentScan?.status ?? 'idle') !== 'cancelled') {
    updateProgress({ status: 'completed', currentEventName: undefined })
  }

  logInfo('deepScan.complete', {
    context: 'service:deepScan',
    operation: 'runScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId,
    durationMs: Date.now() - scanStartedAt,
    errorCategory: null,
    eventsScanned: currentScan?.eventsScanned ?? 0,
    eventsTotal: currentScan?.eventsTotal ?? 0,
    opportunitiesFound: currentResults.length,
    eventsFailed: eventErrors,
    requestsMade: currentScan?.requestsMade ?? 0
  } satisfies StructuredLogBase)
}

export async function startDeepScan(config: DeepScanConfig): Promise<void> {
  const parsed = deepScanConfigSchema.parse(config)
  ensureScope(parsed)

  if (currentScan?.status === 'scanning') {
    throw new Error('A deep scan is already in progress')
  }

  const apiKey = await getApiKeyForAdapter(DEEP_SCAN_PROVIDER_ID)
  if (!apiKey) {
    throw new Error('API key not configured for provider odds-api-io')
  }

  currentCorrelationId = createCorrelationId()
  currentAbortController = new AbortController()
  currentResults = []

  const startedAt = new Date().toISOString()
  currentScan = {
    status: 'scanning',
    eventsScanned: 0,
    eventsTotal: 0,
    requestsMade: 0,
    opportunitiesFound: 0,
    startedAt,
    elapsedMs: 0
  }

  logInfo('deepScan.start', {
    context: 'service:deepScan',
    operation: 'startDeepScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: currentCorrelationId,
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

  const signal = currentAbortController.signal
  const correlationId = currentCorrelationId

  scanPromise = runScan(parsed, apiKey, signal, correlationId)
    .catch((error) => {
      if (signal.aborted || isAbortError(error)) {
        return
      }

      updateProgress({ status: 'error', errorMessage: (error as Error)?.message ?? 'Deep scan failed' })

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
      currentAbortController = null
    })
}

export function cancelDeepScan(): void {
  if (!currentAbortController || currentScan?.status !== 'scanning') {
    return
  }

  currentAbortController.abort()
  updateProgress({ status: 'cancelled', currentEventName: undefined })

  logInfo('deepScan.cancel', {
    context: 'service:deepScan',
    operation: 'cancelDeepScan',
    providerId: DEEP_SCAN_PROVIDER_ID,
    correlationId: currentCorrelationId ?? undefined,
    durationMs: null,
    errorCategory: null,
    eventsCompleted: currentScan?.eventsScanned ?? 0,
    opportunitiesFound: currentResults.length,
    requestsMade: currentScan?.requestsMade ?? 0,
    reason: 'user_cancel'
  } satisfies StructuredLogBase)
}

export function getDeepScanProgress(): DeepScanProgress {
  const base = currentScan ?? idleProgress()
  if (base.status === 'scanning') {
    return {
      ...base,
      elapsedMs: computeElapsedMs(base.startedAt)
    }
  }
  return base
}

export function getDeepScanResults(): ArbitrageOpportunity[] {
  return currentResults.map((opp) => ({
    ...opp,
    source: 'deepScan'
  }))
}

export const __test = {
  resetState(): void {
    currentScan = null
    currentResults = []
    currentAbortController = null
    currentCorrelationId = null
    scanPromise = null
    eventResolverOverride = null
    oddsFetcherOverride = null
    bookmakersResolverOverride = null
  },
  setEventResolver(resolver: EventResolver | null): void {
    eventResolverOverride = resolver
  },
  setOddsFetcher(fetcher: OddsFetcher | null): void {
    oddsFetcherOverride = fetcher
  },
  setBookmakersResolver(resolver: BookmakersResolver | null): void {
    bookmakersResolverOverride = resolver
  },
  async waitForScanCompletion(): Promise<void> {
    if (!scanPromise) return
    await scanPromise
  }
}
