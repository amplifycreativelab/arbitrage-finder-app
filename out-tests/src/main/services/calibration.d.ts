import type { ProviderId } from '../../../shared/types';
import * as poller from './poller';
interface CalibrationLogger {
    info(event: string, payload: Record<string, unknown>): void;
    warn(event: string, payload: Record<string, unknown>): void;
    error(event: string, payload: Record<string, unknown>): void;
}
export interface CalibrationOptions {
    /**
     * Providers to calibrate. Defaults to all known providers wired into the app.
     */
    providers?: ProviderId[];
    /**
     * Maximum wall-clock duration for the calibration loop, in milliseconds.
     * This bounds how long calibration runs even if the limiter allows more work.
     */
    durationMs?: number;
    /**
     * Maximum number of polling iterations per provider. If reached before
     * durationMs elapses, the provider stops early.
     */
    maxIterationsPerProvider?: number;
    /**
     * Minimum delay between polls that we attempt to schedule in the harness.
     * Actual request cadence is governed by Bottleneck in poller.ts.
     */
    minLoopIntervalMs?: number;
    /**
     * Optional logger override (primarily for tests).
     * Receives an event name and a payload object that will be treated as
     * structured log fields by the central logger.
     */
    logger?: CalibrationLogger;
}
export interface ProviderSampleMetrics {
    providerId: ProviderId;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    http2xx: number;
    http4xx: number;
    http5xx: number;
    http429: number;
    latenciesMs: number[];
    backoffEvents: number;
}
export interface ProviderCalibrationSummary {
    providerId: ProviderId;
    config: poller.RateLimiterConfig;
    samples: ProviderSampleMetrics;
    averageLatencyMs: number | null;
    p50LatencyMs: number | null;
    p95LatencyMs: number | null;
    theoreticalRequestsPerHour: number;
    quotaSafe: boolean;
}
export interface CalibrationResult {
    startedAt: string;
    endedAt: string;
    providerSummaries: ProviderCalibrationSummary[];
    overallPass: boolean;
}
export declare function runCalibration(options?: CalibrationOptions): Promise<CalibrationResult>;
export {};
