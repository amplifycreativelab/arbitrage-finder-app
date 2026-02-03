import { net } from 'electron'
import { createCorrelationId, logError, logInfo, type StructuredLogBase } from './logger'

const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_BOOKMAKERS_PATH = '/v3/bookmakers'
const ODDS_API_IO_SELECTED_BOOKMAKERS_PATH = '/v3/bookmakers/selected'
const ODDS_API_IO_SELECTED_BOOKMAKERS_SELECT_PATH = '/v3/bookmakers/selected/select'
const ODDS_API_IO_SELECTED_BOOKMAKERS_CLEAR_PATH = '/v3/bookmakers/selected/clear'

export type OddsApiIoBookmaker = {
  name: string
  active: boolean
}

function getHttpFetch(): (
  input: string,
  init?: { method?: string; headers?: Record<string, string> }
) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  text(): Promise<string>
}> {
  // Use Electron's net.fetch which handles network properly in the main process
  // This is more reliable than globalThis.fetch in Electron
  if (typeof net?.fetch === 'function') {
    return net.fetch as typeof fetch
  }

  const fetchCandidate = (globalThis as { fetch?: unknown }).fetch
  if (typeof fetchCandidate !== 'function') {
    throw new Error('Global fetch is not available for Odds-API.io bookmaker management')
  }

  return (fetchCandidate as typeof fetch).bind(globalThis)
}

function extractStringList(payload: unknown): string[] {
  const candidates: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { bookmakers?: unknown[] }).bookmakers)
      ? ((payload as { bookmakers: unknown[] }).bookmakers as unknown[])
      : Array.isArray((payload as { selectedBookmakers?: unknown[] }).selectedBookmakers)
        ? ((payload as { selectedBookmakers: unknown[] }).selectedBookmakers as unknown[])
        : Array.isArray((payload as { selected?: unknown[] }).selected)
          ? ((payload as { selected: unknown[] }).selected as unknown[])
          : Array.isArray((payload as { data?: unknown[] }).data)
            ? ((payload as { data: unknown[] }).data as unknown[])
            : []

  const strings: string[] = []
  for (const item of candidates) {
    if (typeof item === 'string') {
      strings.push(item)
    } else if (item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string') {
      strings.push((item as { name: string }).name)
    }
  }

  return Array.from(new Set(strings.map((s) => s.trim()).filter(Boolean)))
}

export async function getSupportedBookmakers(): Promise<OddsApiIoBookmaker[]> {
  const correlationId = createCorrelationId()
  const startedAt = Date.now()
  let responseStatus: number | undefined

  try {
    const httpFetch = getHttpFetch()
    const url = new URL(ODDS_API_IO_BOOKMAKERS_PATH, ODDS_API_IO_BASE_URL)

    const response = await httpFetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    }).catch((fetchError: Error) => {
      throw new Error(`Network error fetching bookmakers: ${fetchError.message}`)
    })

    responseStatus = response.status

    if (!response.ok) {
      const message = await response
        .text()
        .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
        .catch(() => `Odds-API.io request failed with status ${response.status}`)
      throw new Error(message)
    }

    const body = (await response.json()) as unknown
    const raw = Array.isArray(body) ? body : []

    const bookmakers = raw
      .map((item) => {
        const name = item && typeof item === 'object' ? (item as { name?: unknown }).name : undefined
        const active = item && typeof item === 'object' ? (item as { active?: unknown }).active : undefined
        return {
          name: typeof name === 'string' ? name : '',
          active: typeof active === 'boolean' ? active : false
        }
      })
      .filter((b) => Boolean(b.name))

    logInfo('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'getSupportedBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: null,
      success: true,
      httpStatus: responseStatus,
      bookmakersCount: bookmakers.length
    } satisfies StructuredLogBase)

    return bookmakers
  } catch (error) {
    logError('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'getSupportedBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
      success: false,
      httpStatus: responseStatus,
      message: (error as Error)?.message ?? 'Odds-API.io bookmaker request failed'
    } satisfies StructuredLogBase)
    throw error
  }
}

export async function getSelectedBookmakers(apiKey: string): Promise<string[]> {
  const correlationId = createCorrelationId()
  const startedAt = Date.now()
  let responseStatus: number | undefined

  try {
    const httpFetch = getHttpFetch()
    const url = new URL(ODDS_API_IO_SELECTED_BOOKMAKERS_PATH, ODDS_API_IO_BASE_URL)
    url.searchParams.set('apiKey', apiKey)

    const response = await httpFetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })

    responseStatus = response.status

    if (!response.ok) {
      const message = await response
        .text()
        .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
        .catch(() => `Odds-API.io request failed with status ${response.status}`)
      throw new Error(message)
    }

    const body = (await response.json()) as unknown
    const selected = extractStringList(body)

    logInfo('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'getSelectedBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: null,
      success: true,
      httpStatus: responseStatus,
      selectedCount: selected.length
    } satisfies StructuredLogBase)

    return selected
  } catch (error) {
    logError('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'getSelectedBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
      success: false,
      httpStatus: responseStatus,
      message: (error as Error)?.message ?? 'Odds-API.io bookmaker request failed'
    } satisfies StructuredLogBase)
    throw error
  }
}

export async function selectBookmakers(apiKey: string, bookmakers: string[]): Promise<void> {
  const correlationId = createCorrelationId()
  const startedAt = Date.now()
  let responseStatus: number | undefined

  const list = Array.from(new Set(bookmakers.map((b) => b.trim()).filter(Boolean)))
  if (!list.length) {
    throw new Error('No bookmakers provided')
  }

  try {
    const httpFetch = getHttpFetch()
    const url = new URL(ODDS_API_IO_SELECTED_BOOKMAKERS_SELECT_PATH, ODDS_API_IO_BASE_URL)
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('bookmakers', list.join(','))

    const response = await httpFetch(url.toString(), {
      method: 'PUT',
      headers: { Accept: 'application/json' }
    })

    responseStatus = response.status

    if (!response.ok) {
      const message = await response
        .text()
        .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
        .catch(() => `Odds-API.io request failed with status ${response.status}`)
      throw new Error(message)
    }

    logInfo('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'selectBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: null,
      success: true,
      httpStatus: responseStatus,
      selectedCount: list.length
    } satisfies StructuredLogBase)
  } catch (error) {
    logError('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'selectBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
      success: false,
      httpStatus: responseStatus,
      message: (error as Error)?.message ?? 'Odds-API.io bookmaker request failed'
    } satisfies StructuredLogBase)
    throw error
  }
}

export async function clearSelectedBookmakers(apiKey: string): Promise<void> {
  const correlationId = createCorrelationId()
  const startedAt = Date.now()
  let responseStatus: number | undefined

  try {
    const httpFetch = getHttpFetch()
    const url = new URL(ODDS_API_IO_SELECTED_BOOKMAKERS_CLEAR_PATH, ODDS_API_IO_BASE_URL)
    url.searchParams.set('apiKey', apiKey)

    const response = await httpFetch(url.toString(), {
      method: 'PUT',
      headers: { Accept: 'application/json' }
    })

    responseStatus = response.status

    if (!response.ok) {
      const message = await response
        .text()
        .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
        .catch(() => `Odds-API.io request failed with status ${response.status}`)
      throw new Error(message)
    }

    logInfo('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'clearSelectedBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: null,
      success: true,
      httpStatus: responseStatus
    } satisfies StructuredLogBase)
  } catch (error) {
    logError('provider.bookmakers', {
      context: 'service:odds-api-io-bookmakers',
      operation: 'clearSelectedBookmakers',
      providerId: 'odds-api-io',
      correlationId,
      durationMs: Date.now() - startedAt,
      errorCategory: typeof responseStatus === 'number' && responseStatus >= 400 ? 'ProviderError' : 'SystemError',
      success: false,
      httpStatus: responseStatus,
      message: (error as Error)?.message ?? 'Odds-API.io bookmaker request failed'
    } satisfies StructuredLogBase)
    throw error
  }
}
