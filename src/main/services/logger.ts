import log from 'electron-log'
import type { ProviderId } from '../../../shared/types'

export type ErrorCategory = 'UserError' | 'ProviderError' | 'SystemError' | 'InfrastructureError'

export interface StructuredLogFields {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  context: string
  operation: string
  providerId?: ProviderId
  correlationId?: string
  durationMs?: number | null
  errorCategory?: ErrorCategory | null
  [key: string]: unknown
}

export interface StructuredLoggerBackend {
  info(event: string, payload: StructuredLogFields): void
  warn(event: string, payload: StructuredLogFields): void
  error(event: string, payload: StructuredLogFields): void
}

const REDACTED = '***REDACTED***'

export interface SecretValue {
  __secret: true
  value: unknown
}

export function secret(value: unknown): SecretValue {
  return { __secret: true, value }
}

export interface StructuredLogBase {
  context: string
  operation: string
  providerId?: ProviderId
  correlationId?: string
  durationMs?: number | null
  errorCategory?: ErrorCategory | null
  [key: string]: unknown
}

let backend: StructuredLoggerBackend = {
  info(event, payload) {
    log.info(event, payload)
  },
  warn(event, payload) {
    log.warn(event, payload)
  },
  error(event, payload) {
    log.error(event, payload)
  }
}

export function getStructuredLoggerBackend(): StructuredLoggerBackend {
  return backend
}

export function setStructuredLoggerBackend(next: StructuredLoggerBackend): void {
  backend = next
}

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    lower.includes('apikey') ||
    lower.includes('api_key') ||
    lower.includes('token') ||
    lower.includes('secret') ||
    lower.includes('password')
  )
}

function isSecretValue(value: unknown): value is SecretValue {
  return !!value && typeof value === 'object' && (value as { __secret?: boolean }).__secret === true
}

function scrubSecrets(value: unknown): unknown {
  if (isSecretValue(value)) {
    return REDACTED
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubSecrets(item))
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (isSecretKey(key)) {
        result[key] = REDACTED
      } else {
        result[key] = scrubSecrets(raw)
      }
    }
    return result
  }

  return value
}

function buildPayload(level: StructuredLogFields['level'], base: StructuredLogBase): StructuredLogFields {
  const payload: StructuredLogFields = {
    timestamp: new Date().toISOString(),
    level,
    context: String(base.context),
    operation: String(base.operation),
    providerId: base.providerId,
    correlationId: base.correlationId,
    durationMs: base.durationMs ?? null,
    errorCategory: base.errorCategory ?? null
  }

  for (const [key, value] of Object.entries(base)) {
    if (key in payload) continue
    payload[key] = value
  }

  return scrubSecrets(payload) as StructuredLogFields
}

export function createCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function logInfo(event: string, base: StructuredLogBase): void {
  const payload = buildPayload('info', base)
  backend.info(event, payload)
}

export function logWarn(event: string, base: StructuredLogBase): void {
  const payload = buildPayload('warn', base)
  backend.warn(event, payload)
}

export function logError(event: string, base: StructuredLogBase): void {
  const payload = buildPayload('error', base)
  backend.error(event, payload)
}

export function logHeartbeat(base: StructuredLogBase): void {
  logInfo('poller.heartbeat', base)
}
