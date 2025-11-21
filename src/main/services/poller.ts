import Bottleneck from 'bottleneck'
import type { ArbitrageAdapter, ArbitrageOpportunity, ProviderId } from '../../../shared/types'
import { arbitrageOpportunityListSchema } from '../../../shared/schemas'
import { createCorrelationId, logHeartbeat, logWarn, type StructuredLogBase } from './logger'

/**
 * Rate limit parameters derived from PRD FR8 (5,000 req/hour) and Architecture R-001 (NFR1).
 * minTime = 3600_000ms / 5000req = 720ms; reservoir enforces per-hour ceiling.
 */
export interface RateLimiterConfig {
  minTime: number
  maxConcurrent: number
  reservoir: number
  reservoirRefreshAmount: number
  reservoirRefreshInterval: number
}

const PRD_REQUESTS_PER_HOUR = 5000
const DEFAULT_LIMITER_CONFIG: RateLimiterConfig = {
  minTime: 720, // 3600s / 5000 req => ~0.72s spacing (FR8, NFR1)
  maxConcurrent: 1,
  reservoir: PRD_REQUESTS_PER_HOUR,
  reservoirRefreshAmount: PRD_REQUESTS_PER_HOUR,
  reservoirRefreshInterval: 60 * 60 * 1000
}

const rateLimiterConfigByProvider: Record<ProviderId, RateLimiterConfig> = {
  'odds-api-io': DEFAULT_LIMITER_CONFIG,
  'the-odds-api': DEFAULT_LIMITER_CONFIG
}

export type ProviderQuotaStatus = 'OK' | 'QuotaLimited' | 'Degraded'

interface BackoffState {
  consecutive429s: number
  cooldownUntil: number | null
  lastBackoffMs: number
}

const limiterByProvider = new Map<ProviderId, Bottleneck>()
const backoffByProvider: Partial<Record<ProviderId, BackoffState>> = {}
const providerStatus: Partial<Record<ProviderId, ProviderQuotaStatus>> = {}
let currentCorrelationId: string | null = null

const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 15000
const JITTER_MS = 300

function resolveLimiterConfig(providerId: ProviderId): RateLimiterConfig {
  return rateLimiterConfigByProvider[providerId] ?? DEFAULT_LIMITER_CONFIG
}

function getLimiter(providerId: ProviderId): Bottleneck {
  const existing = limiterByProvider.get(providerId)
  if (existing) {
    return existing
  }

  const cfg = resolveLimiterConfig(providerId)
  const limiter = new Bottleneck({
    minTime: cfg.minTime,
    maxConcurrent: cfg.maxConcurrent,
    reservoir: cfg.reservoir,
    reservoirRefreshAmount: cfg.reservoirRefreshAmount,
    reservoirRefreshInterval: cfg.reservoirRefreshInterval
  })

  limiterByProvider.set(providerId, limiter)
  return limiter
}

function setProviderStatus(providerId: ProviderId, status: ProviderQuotaStatus): void {
  providerStatus[providerId] = status
}

function clearBackoff(providerId: ProviderId): void {
  backoffByProvider[providerId] = {
    consecutive429s: 0,
    cooldownUntil: null,
    lastBackoffMs: 0
  }
  setProviderStatus(providerId, 'OK')
}

function ensureBackoffState(providerId: ProviderId): BackoffState {
  if (!backoffByProvider[providerId]) {
    backoffByProvider[providerId] = {
      consecutive429s: 0,
      cooldownUntil: null,
      lastBackoffMs: 0
    }
  }

  return backoffByProvider[providerId] as BackoffState
}

function computeBackoffMs(consecutive429s: number): number {
  const exponent = Math.max(0, consecutive429s - 1)
  const base = BASE_BACKOFF_MS * Math.pow(2, exponent)
  const jitter = Math.floor(Math.random() * JITTER_MS)
  return Math.min(MAX_BACKOFF_MS, base + jitter)
}

async function dropQueuedJobsAndResetLimiter(providerId: ProviderId): Promise<void> {
  const limiter = limiterByProvider.get(providerId)

  if (!limiter) {
    return
  }

  limiterByProvider.delete(providerId)

  try {
    await limiter.stop({
      dropWaitingJobs: true,
      dropErrorMessage: 'Dropped due to provider rate limiting backoff'
    })
  } catch (error) {
    logWarn('provider.rate-limit.stop-error', {
      context: 'service:poller',
      operation: 'dropQueuedJobsAndResetLimiter',
      providerId,
      correlationId: currentCorrelationId ?? undefined,
      durationMs: null,
      errorCategory: 'ProviderError',
      message: (error as Error)?.message ?? 'failed to stop limiter after rate limit signal'
    } satisfies StructuredLogBase)
  }
}

function markRateLimited(providerId: ProviderId): number {
  const state = ensureBackoffState(providerId)
  state.consecutive429s += 1
  const backoffMs = computeBackoffMs(state.consecutive429s)
  state.lastBackoffMs = backoffMs
  state.cooldownUntil = Date.now() + backoffMs

  const status: ProviderQuotaStatus = state.consecutive429s >= 2 ? 'Degraded' : 'QuotaLimited'
  setProviderStatus(providerId, status)
  void dropQueuedJobsAndResetLimiter(providerId)

  return backoffMs
}

function isRateLimitSignal(signal: unknown): boolean {
  const err = signal as { status?: number; statusCode?: number; response?: { status?: number }; code?: string }
  return (
    err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.response?.status === 429 ||
    err?.code === 'RATE_LIMITED'
  )
}

async function waitForCooldown(providerId: ProviderId): Promise<void> {
  const state = backoffByProvider[providerId]
  if (!state?.cooldownUntil) {
    return
  }

  const now = Date.now()
  if (state.cooldownUntil <= now) {
    return
  }

  const waitMs = state.cooldownUntil - now
  await new Promise((resolve) => setTimeout(resolve, waitMs))
}

let activeProviderIdForPolling: ProviderId | null = null

const adaptersByProviderId: Partial<Record<ProviderId, ArbitrageAdapter>> = {}
const latestSnapshotByProviderId: Partial<Record<ProviderId, ArbitrageOpportunity[]>> = {}
const latestSnapshotTimestampByProviderId: Partial<Record<ProviderId, string>> = {}

clearBackoff('odds-api-io')
clearBackoff('the-odds-api')

export interface ProviderRequestContext {
  correlationId: string
}

export function getRateLimiterConfig(providerId: ProviderId): RateLimiterConfig {
  return resolveLimiterConfig(providerId)
}

export function getProviderQuotaStatus(providerId: ProviderId): ProviderQuotaStatus {
  return providerStatus[providerId] ?? 'OK'
}

export async function scheduleProviderRequest<T>(
  providerId: ProviderId,
  fn: (context: ProviderRequestContext) => Promise<T>
): Promise<T> {
  const correlationId = currentCorrelationId ?? createCorrelationId()
  await waitForCooldown(providerId)
  try {
    const result = await getLimiter(providerId).schedule(() => fn({ correlationId }))

    if (isRateLimitSignal(result)) {
      const delayMs = markRateLimited(providerId)
      const signal = result as {
        status?: number
        statusCode?: number
        response?: { status?: number }
        code?: string
        message?: string
      }

      const statusCode = signal.status ?? signal.statusCode ?? signal.response?.status

      logWarn('provider.rate-limit', {
        context: 'service:poller',
        operation: 'scheduleProviderRequest',
        providerId,
        correlationId,
        durationMs: null,
        errorCategory: 'ProviderError',
        providerStatus: getProviderQuotaStatus(providerId),
        delayMs,
        message: signal.message ?? 'rate limit signal (response)',
        code: signal.code,
        statusCode
      } satisfies StructuredLogBase)

      const error = new Error(signal.message ?? 'Rate limited')
      ;(error as { status?: number }).status =
        signal.status ?? signal.statusCode ?? signal.response?.status ?? 429
      ;(error as { __fromRateLimitResult?: boolean }).__fromRateLimitResult = true

      throw error
    }

    clearBackoff(providerId)
    return result
  } catch (error) {
    if (
      isRateLimitSignal(error) &&
      !(error as { __fromRateLimitResult?: boolean }).__fromRateLimitResult
    ) {
      const delayMs = markRateLimited(providerId)
      const statusCode =
        (error as { status?: number }).status ??
        (error as { statusCode?: number }).statusCode ??
        (error as { response?: { status?: number } }).response?.status

      logWarn('provider.rate-limit', {
        context: 'service:poller',
        operation: 'scheduleProviderRequest',
        providerId,
        correlationId,
        durationMs: null,
        errorCategory: 'ProviderError',
        providerStatus: getProviderQuotaStatus(providerId),
        delayMs,
        message: (error as Error)?.message ?? 'rate limit signal',
        code: (error as { code?: string }).code,
        statusCode
      } satisfies StructuredLogBase)
    }
    throw error
  }
}

export function registerAdapter(adapter: ArbitrageAdapter): void {
  const usesCentralLimiter = (adapter as { __usesCentralRateLimiter?: true }).__usesCentralRateLimiter === true

  if (usesCentralLimiter) {
    adaptersByProviderId[adapter.id] = adapter
    return
  }

  const providerId = adapter.id
  const originalFetch = adapter.fetchOpportunities.bind(adapter)

  adaptersByProviderId[providerId] = {
    id: providerId,
    async fetchOpportunities(): Promise<ArbitrageOpportunity[]> {
      return scheduleProviderRequest(providerId, () => originalFetch())
    },
    __usesCentralRateLimiter: true
  }
}

export function registerAdapters(adapters: ArbitrageAdapter[]): void {
  for (const adapter of adapters) {
    registerAdapter(adapter)
  }
}

export function notifyActiveProviderChanged(providerId: ProviderId): void {
  activeProviderIdForPolling = providerId
}

export function getActiveProviderForPolling(): ProviderId | null {
  return activeProviderIdForPolling
}

export function getRegisteredAdapter(providerId: ProviderId): ArbitrageAdapter | null {
  return adaptersByProviderId[providerId] ?? null
}

export async function pollOnceForActiveProvider(): Promise<ArbitrageOpportunity[]> {
  const providerId = activeProviderIdForPolling

  if (!providerId) {
    return []
  }

  const adapter = adaptersByProviderId[providerId]

  if (!adapter) {
    return []
  }

  const correlationId = createCorrelationId()
  const tickStartedAt = Date.now()
  let success = false
  let opportunities: ArbitrageOpportunity[] = []
  let errorCategory: StructuredLogBase['errorCategory'] = null
  let errorMessage: string | undefined

  currentCorrelationId = correlationId

  try {
    const result = await adapter.fetchOpportunities()
    const validated = arbitrageOpportunityListSchema.parse(result)

    opportunities = validated
    latestSnapshotByProviderId[providerId] = validated
    latestSnapshotTimestampByProviderId[providerId] = new Date().toISOString()
    success = true

    return validated
  } catch (error) {
    const status =
      (error as { status?: number }).status ??
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { status?: number } }).response?.status

    if (typeof status === 'number' && status >= 400) {
      errorCategory = 'ProviderError'
    } else {
      errorCategory = 'SystemError'
    }

    errorMessage = (error as Error)?.message ?? 'pollOnceForActiveProvider error'
    throw error
  } finally {
    currentCorrelationId = null

    const durationMs = Date.now() - tickStartedAt
    const nowIso = new Date().toISOString()

    const providerStatuses: Record<ProviderId, ProviderQuotaStatus> = {
      'odds-api-io': getProviderQuotaStatus('odds-api-io'),
      'the-odds-api': getProviderQuotaStatus('the-odds-api')
    }

    const lastSuccessfulFetchTimestamps: Record<ProviderId, string | null> = {
      'odds-api-io': latestSnapshotTimestampByProviderId['odds-api-io'] ?? null,
      'the-odds-api': latestSnapshotTimestampByProviderId['the-odds-api'] ?? null
    }

    const staleThresholdMs = 5 * 60 * 1000
    const hasStaleProvider = Object.values(lastSuccessfulFetchTimestamps).some((ts) => {
      if (!ts) return false
      const ageMs = Date.now() - new Date(ts).getTime()
      return ageMs > staleThresholdMs
    })

    let systemStatus: 'OK' | 'Degraded' | 'Error' | 'Stale' = 'OK'

    if (!success && errorCategory === 'SystemError') {
      systemStatus = 'Error'
    } else if (
      Object.values(providerStatuses).some((status) => status === 'QuotaLimited' || status === 'Degraded')
    ) {
      systemStatus = 'Degraded'
    } else if (hasStaleProvider) {
      systemStatus = 'Stale'
    }

    logHeartbeat({
      context: 'service:poller',
      operation: 'pollOnceForActiveProvider',
      providerId,
      correlationId,
      durationMs,
      errorCategory,
      success,
      opportunitiesCount: opportunities.length,
      providerStatuses,
      lastSuccessfulFetchTimestamps,
      systemStatus,
      tickStartedAt: new Date(tickStartedAt).toISOString(),
      tickCompletedAt: nowIso,
      errorMessage
    } satisfies StructuredLogBase)
  }
}

export function getLatestSnapshotForProvider(
  providerId: ProviderId
): { opportunities: ArbitrageOpportunity[]; fetchedAt: string | null } {
  return {
    opportunities: latestSnapshotByProviderId[providerId] ?? [],
    fetchedAt: latestSnapshotTimestampByProviderId[providerId] ?? null
  }
}

export const __test = {
  resetLimiterState(): void {
    limiterByProvider.clear()
    ;(Object.keys(backoffByProvider) as ProviderId[]).forEach((providerId) => clearBackoff(providerId))
    ;(Object.keys(providerStatus) as ProviderId[]).forEach((providerId) => setProviderStatus(providerId, 'OK'))
  },
  getLimiterCounts(providerId: ProviderId): Bottleneck.Counts {
    return getLimiter(providerId).counts()
  },
  getBackoffState(providerId: ProviderId): BackoffState {
    return ensureBackoffState(providerId)
  }
}
