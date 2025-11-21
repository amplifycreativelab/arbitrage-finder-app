import log from 'electron-log'
import type { ProviderId } from '../../../shared/types'
import * as poller from './poller'

export interface CalibrationOptions {
  /**
   * Providers to calibrate. Defaults to all known providers wired into the app.
   */
  providers?: ProviderId[]
  /**
   * Maximum wall-clock duration for the calibration loop, in milliseconds.
   * This bounds how long calibration runs even if the limiter allows more work.
   */
  durationMs?: number
  /**
   * Maximum number of polling iterations per provider. If reached before
   * durationMs elapses, the provider stops early.
   */
  maxIterationsPerProvider?: number
  /**
   * Minimum delay between polls that we attempt to schedule in the harness.
   * Actual request cadence is governed by Bottleneck in poller.ts.
   */
  minLoopIntervalMs?: number
  /**
   * Optional logger override (primarily for tests).
   */
  logger?: Pick<typeof log, 'info' | 'warn' | 'error'>
}

export interface ProviderSampleMetrics {
  providerId: ProviderId
  totalRequests: number
  successCount: number
  errorCount: number
  http2xx: number
  http4xx: number
  http5xx: number
  http429: number
  latenciesMs: number[]
  backoffEvents: number
}

export interface ProviderCalibrationSummary {
  providerId: ProviderId
  config: poller.RateLimiterConfig
  samples: ProviderSampleMetrics
  averageLatencyMs: number | null
  p50LatencyMs: number | null
  p95LatencyMs: number | null
  theoreticalRequestsPerHour: number
  quotaSafe: boolean
}

export interface CalibrationResult {
  startedAt: string
  endedAt: string
  providerSummaries: ProviderCalibrationSummary[]
  overallPass: boolean
}

function defaultProviders(): ProviderId[] {
  // These provider IDs are owned by poller.ts and adapters.
  return ['odds-api-io', 'the-odds-api']
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) {
    return null
  }

  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)

  if (lower === upper) {
    return sorted[lower]
  }

  const weight = idx - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function summarizeProvider(
  providerId: ProviderId,
  samples: ProviderSampleMetrics,
  config: poller.RateLimiterConfig
): ProviderCalibrationSummary {
  const latencies = [...samples.latenciesMs].sort((a, b) => a - b)
  const averageLatencyMs =
    latencies.length > 0 ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length : null

  const p50LatencyMs = percentile(latencies, 50)
  const p95LatencyMs = percentile(latencies, 95)

  // Static quota safety check derived from PRD FR8 and R-001:
  // - per-provider cadence: minTime governs maximum theoretical RPS
  // - reservoir caps absolute requests per hour
  const theoreticalRequestsPerHour = Math.floor(3_600_000 / config.minTime)
  const QUOTA_PER_HOUR = 5000
  const quotaSafe =
    theoreticalRequestsPerHour <= QUOTA_PER_HOUR && config.reservoir <= QUOTA_PER_HOUR

  return {
    providerId,
    config,
    samples,
    averageLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
    theoreticalRequestsPerHour,
    quotaSafe
  }
}

async function runProviderLoop(
  providerId: ProviderId,
  endAt: number,
  options: Required<Pick<CalibrationOptions, 'maxIterationsPerProvider' | 'minLoopIntervalMs'>>,
  logger: Pick<typeof log, 'info' | 'warn' | 'error'>
): Promise<ProviderSampleMetrics> {
  const metrics: ProviderSampleMetrics = {
    providerId,
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    http2xx: 0,
    http4xx: 0,
    http5xx: 0,
    http429: 0,
    latenciesMs: [],
    backoffEvents: 0
  }

  let iterations = 0
  let previousStatus = poller.getProviderQuotaStatus(providerId)

  while (Date.now() < endAt && iterations < options.maxIterationsPerProvider) {
    iterations += 1
    poller.notifyActiveProviderChanged(providerId)

    const startedAt = Date.now()
    try {
      await poller.pollOnceForActiveProvider()
      metrics.totalRequests += 1
      metrics.successCount += 1
      metrics.http2xx += 1
    } catch (error) {
      metrics.totalRequests += 1
      metrics.errorCount += 1

      const status =
        (error as { status?: number }).status ??
        (error as { statusCode?: number }).statusCode ??
        (error as { response?: { status?: number } }).response?.status

      if (status === 429) {
        metrics.http429 += 1
        metrics.http4xx += 1
      } else if (typeof status === 'number' && status >= 500 && status < 600) {
        metrics.http5xx += 1
      } else if (typeof status === 'number' && status >= 400 && status < 500) {
        metrics.http4xx += 1
      }

      logger.warn('calibration.request.error', {
        providerId,
        message: (error as Error)?.message ?? 'calibration error',
        status
      })
    } finally {
      const elapsed = Date.now() - startedAt
      metrics.latenciesMs.push(elapsed)

      const currentStatus = poller.getProviderQuotaStatus(providerId)
      if (currentStatus !== previousStatus) {
        metrics.backoffEvents += 1
        previousStatus = currentStatus
      }
    }

    if (options.minLoopIntervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.minLoopIntervalMs))
    }
  }

  return metrics
}

export async function runCalibration(options: CalibrationOptions = {}): Promise<CalibrationResult> {
  const providers = options.providers && options.providers.length > 0 ? options.providers : defaultProviders()

  // Ensure adapters are wired to the central poller, mirroring src/main/services/router.ts.
  // This preserves architecture invariants that all calibration runs exercise the same path
  // as production polling.
  const { OddsApiIoAdapter } = await import('../adapters/odds-api-io')
  const { TheOddsApiAdapter } = await import('../adapters/the-odds-api')

  poller.registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()])

  const logger = options.logger ?? log
  const durationMs = options.durationMs ?? 10_000
  const maxIterationsPerProvider = options.maxIterationsPerProvider ?? 50
  const minLoopIntervalMs = options.minLoopIntervalMs ?? 0

  const startedAt = new Date().toISOString()
  const endAt = Date.now() + durationMs

  logger.info('calibration.start', {
    providers,
    durationMs,
    maxIterationsPerProvider,
    minLoopIntervalMs
  })

  const summaries: ProviderCalibrationSummary[] = []

  for (const providerId of providers) {
    const config = poller.getRateLimiterConfig(providerId)

    const samples = await runProviderLoop(
      providerId,
      endAt,
      { maxIterationsPerProvider, minLoopIntervalMs },
      logger
    )

    const summary = summarizeProvider(providerId, samples, config)

    logger.info('calibration.metrics', {
      providerId,
      config,
      samples,
      averageLatencyMs: summary.averageLatencyMs,
      p50LatencyMs: summary.p50LatencyMs,
      p95LatencyMs: summary.p95LatencyMs,
      theoreticalRequestsPerHour: summary.theoreticalRequestsPerHour,
      quotaSafe: summary.quotaSafe
    })

    summaries.push(summary)
  }

  const overallPass = summaries.every((s) => s.quotaSafe)
  const endedAt = new Date().toISOString()

  logger.info('calibration.complete', {
    startedAt,
    endedAt,
    overallPass,
    providers: summaries.map((s) => ({
      providerId: s.providerId,
      totalRequests: s.samples.totalRequests,
      quotaSafe: s.quotaSafe
    }))
  })

  return {
    startedAt,
    endedAt,
    providerSummaries: summaries,
    overallPass
  }
}

async function runCli(): Promise<void> {
  const args = process.argv.slice(2)
  const isCiMode = args.includes('--ci') || process.env['CALIBRATION_MODE'] === 'ci'

  // In CI we keep runs short and rely primarily on static quota checks plus a
  // small number of iterations to validate wiring and metrics.
  const ciOptions: CalibrationOptions = {
    durationMs: 2_000,
    maxIterationsPerProvider: 5,
    minLoopIntervalMs: 0
  }

  try {
    const result = await runCalibration(isCiMode ? ciOptions : {})

    if (!result.overallPass) {
      log.error('calibration.failure', {
        providerSummaries: result.providerSummaries.map((s) => ({
          providerId: s.providerId,
          theoreticalRequestsPerHour: s.theoreticalRequestsPerHour,
          quotaSafe: s.quotaSafe
        }))
      })
      process.exitCode = 1
    } else if (isCiMode) {
      log.info('calibration.ci.pass', {
        providerSummaries: result.providerSummaries.map((s) => ({
          providerId: s.providerId,
          theoreticalRequestsPerHour: s.theoreticalRequestsPerHour,
          quotaSafe: s.quotaSafe
        }))
      })
    }
  } catch (error) {
    log.error('calibration.exception', {
      message: (error as Error)?.message ?? 'Calibration run failed',
      stack: (error as Error)?.stack
    })
    process.exitCode = 1
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runCli()
}

