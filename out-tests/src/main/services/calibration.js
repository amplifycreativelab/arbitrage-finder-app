"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCalibration = runCalibration;
const poller = __importStar(require("./poller"));
const logger_1 = require("./logger");
function defaultProviders() {
    // These provider IDs are owned by poller.ts and adapters.
    return ['odds-api-io', 'the-odds-api'];
}
function percentile(sorted, p) {
    if (!sorted.length) {
        return null;
    }
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) {
        return sorted[lower];
    }
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
function summarizeProvider(providerId, samples, config) {
    const latencies = [...samples.latenciesMs].sort((a, b) => a - b);
    const averageLatencyMs = latencies.length > 0 ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length : null;
    const p50LatencyMs = percentile(latencies, 50);
    const p95LatencyMs = percentile(latencies, 95);
    // Static quota safety check derived from PRD FR8 and R-001:
    // - per-provider cadence: minTime governs maximum theoretical RPS
    // - reservoir caps absolute requests per hour
    const theoreticalRequestsPerHour = Math.floor(3_600_000 / config.minTime);
    const QUOTA_PER_HOUR = 5000;
    const quotaSafe = theoreticalRequestsPerHour <= QUOTA_PER_HOUR && config.reservoir <= QUOTA_PER_HOUR;
    return {
        providerId,
        config,
        samples,
        averageLatencyMs,
        p50LatencyMs,
        p95LatencyMs,
        theoreticalRequestsPerHour,
        quotaSafe
    };
}
async function runProviderLoop(providerId, endAt, options, logger) {
    const metrics = {
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
    };
    let iterations = 0;
    let previousStatus = poller.getProviderQuotaStatus(providerId);
    while (Date.now() < endAt && iterations < options.maxIterationsPerProvider) {
        iterations += 1;
        poller.notifyActiveProviderChanged(providerId);
        const startedAt = Date.now();
        try {
            await poller.pollOnceForActiveProvider();
            metrics.totalRequests += 1;
            metrics.successCount += 1;
            metrics.http2xx += 1;
        }
        catch (error) {
            metrics.totalRequests += 1;
            metrics.errorCount += 1;
            const status = error.status ??
                error.statusCode ??
                error.response?.status;
            if (status === 429) {
                metrics.http429 += 1;
                metrics.http4xx += 1;
            }
            else if (typeof status === 'number' && status >= 500 && status < 600) {
                metrics.http5xx += 1;
            }
            else if (typeof status === 'number' && status >= 400 && status < 500) {
                metrics.http4xx += 1;
            }
            const safeMessage = typeof status === 'number'
                ? `calibration request error (status ${status})`
                : 'calibration request error';
            logger.warn('calibration.request.error', {
                providerId,
                status,
                message: safeMessage
            });
        }
        finally {
            const elapsed = Date.now() - startedAt;
            metrics.latenciesMs.push(elapsed);
            const currentStatus = poller.getProviderQuotaStatus(providerId);
            if (currentStatus !== previousStatus) {
                metrics.backoffEvents += 1;
                previousStatus = currentStatus;
            }
        }
        if (options.minLoopIntervalMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, options.minLoopIntervalMs));
        }
    }
    return metrics;
}
async function runCalibration(options = {}) {
    const providers = options.providers && options.providers.length > 0 ? options.providers : defaultProviders();
    // Ensure adapters are wired to the central poller, mirroring src/main/services/router.ts.
    // This preserves architecture invariants that all calibration runs exercise the same path
    // as production polling.
    const { OddsApiIoAdapter } = await Promise.resolve().then(() => __importStar(require('../adapters/odds-api-io')));
    const { TheOddsApiAdapter } = await Promise.resolve().then(() => __importStar(require('../adapters/the-odds-api')));
    poller.registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()]);
    const logger = options.logger ??
        {
            info(event, payload) {
                const base = {
                    context: 'service:calibration',
                    operation: event,
                    ...payload
                };
                (0, logger_1.logInfo)(event, base);
            },
            warn(event, payload) {
                const base = {
                    context: 'service:calibration',
                    operation: event,
                    ...payload
                };
                (0, logger_1.logWarn)(event, base);
            },
            error(event, payload) {
                const base = {
                    context: 'service:calibration',
                    operation: event,
                    ...payload
                };
                (0, logger_1.logError)(event, base);
            }
        };
    const durationMs = options.durationMs ?? 10_000;
    const maxIterationsPerProvider = options.maxIterationsPerProvider ?? 50;
    const minLoopIntervalMs = options.minLoopIntervalMs ?? 0;
    const startedAt = new Date().toISOString();
    const endAt = Date.now() + durationMs;
    logger.info('calibration.start', {
        providers,
        durationMs,
        maxIterationsPerProvider,
        minLoopIntervalMs
    });
    const summaries = [];
    for (const providerId of providers) {
        const config = poller.getRateLimiterConfig(providerId);
        const samples = await runProviderLoop(providerId, endAt, { maxIterationsPerProvider, minLoopIntervalMs }, logger);
        const summary = summarizeProvider(providerId, samples, config);
        logger.info('calibration.metrics', {
            providerId,
            config,
            samples,
            averageLatencyMs: summary.averageLatencyMs,
            p50LatencyMs: summary.p50LatencyMs,
            p95LatencyMs: summary.p95LatencyMs,
            theoreticalRequestsPerHour: summary.theoreticalRequestsPerHour,
            quotaSafe: summary.quotaSafe
        });
        summaries.push(summary);
    }
    const overallPass = summaries.every((s) => s.quotaSafe);
    const endedAt = new Date().toISOString();
    logger.info('calibration.complete', {
        startedAt,
        endedAt,
        overallPass,
        providers: summaries.map((s) => ({
            providerId: s.providerId,
            totalRequests: s.samples.totalRequests,
            quotaSafe: s.quotaSafe
        }))
    });
    return {
        startedAt,
        endedAt,
        providerSummaries: summaries,
        overallPass
    };
}
async function runCli() {
    const args = process.argv.slice(2);
    const isCiMode = args.includes('--ci') || process.env['CALIBRATION_MODE'] === 'ci';
    // In CI we keep runs short and rely primarily on static quota checks plus a
    // small number of iterations to validate wiring and metrics.
    const ciOptions = {
        durationMs: 2_000,
        maxIterationsPerProvider: 5,
        minLoopIntervalMs: 0
    };
    try {
        const result = await runCalibration(isCiMode ? ciOptions : {});
        if (!result.overallPass) {
            (0, logger_1.logError)('calibration.failure', {
                context: 'service:calibration',
                operation: 'runCli',
                providerSummaries: result.providerSummaries.map((s) => ({
                    providerId: s.providerId,
                    theoreticalRequestsPerHour: s.theoreticalRequestsPerHour,
                    quotaSafe: s.quotaSafe
                }))
            });
            process.exitCode = 1;
        }
        else if (isCiMode) {
            (0, logger_1.logInfo)('calibration.ci.pass', {
                context: 'service:calibration',
                operation: 'runCli',
                providerSummaries: result.providerSummaries.map((s) => ({
                    providerId: s.providerId,
                    theoreticalRequestsPerHour: s.theoreticalRequestsPerHour,
                    quotaSafe: s.quotaSafe
                }))
            });
        }
    }
    catch (error) {
        (0, logger_1.logError)('calibration.exception', {
            context: 'service:calibration',
            operation: 'runCli',
            errorCategory: 'SystemError',
            message: error?.message ?? 'Calibration run failed',
            stack: error?.stack
        });
        process.exitCode = 1;
    }
}
if (require.main === module) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    runCli();
}
