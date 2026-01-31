/**
 * Currency Exchange Rate Service
 * Fetches exchange rates from Frankfurter API (api.frankfurter.app)
 * Free service, no API key required
 */

import { logInfo, logError } from './logger'

// ============================================================================
// Types
// ============================================================================

import type { Currency, CurrencyDetails, ExchangeRates } from '../../../shared/lib/currency'
import { DEFAULT_RATES } from '../../../shared/lib/currency'

export type { Currency, CurrencyDetails, ExchangeRates }

export const CURRENCIES: Currency[] = ['USD', 'AUD', 'EUR']

// ============================================================================
// Constants
// ============================================================================

const FRANKFURTER_API_BASE = 'https://api.frankfurter.app'

export const CURRENCY_DETAILS: Record<Currency, CurrencyDetails> = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' }
}

// In-memory cache
let cachedRates: ExchangeRates | null = null
let lastFetchTimestamp: string | null = null
let isFetching = false

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch latest exchange rates from Frankfurter API
 * Uses USD as base currency for simplicity
 */
export async function fetchRatesFromAPI(): Promise<ExchangeRates> {
  if (isFetching) {
    throw new Error('Rate fetch already in progress')
  }

  isFetching = true
  const correlationId = `currency-fetch-${Date.now()}`

  try {
    logInfo('currency.fetch.start', {
      context: 'service:currency',
      operation: 'fetchRatesFromAPI',
      correlationId,
      durationMs: null,
      errorCategory: null
    })

    // Frankfurter API endpoint with USD as base
    const url = `${FRANKFURTER_API_BASE}/latest?from=USD&to=AUD,EUR`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      const errorMessage = `Frankfurter API error: ${response.status} ${response.statusText}`
      logError('currency.fetch.error', {
        context: 'service:currency',
        operation: 'fetchRatesFromAPI',
        correlationId,
        durationMs: null,
        errorCategory: 'ProviderError' as const,
        statusCode: response.status,
        message: errorMessage
      })
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // Validate response structure
    if (!data.rates || typeof data.rates.AUD !== 'number' || typeof data.rates.EUR !== 'number') {
      const errorMessage = 'Invalid response structure from Frankfurter API'
      logError('currency.fetch.error', {
        context: 'service:currency',
        operation: 'fetchRatesFromAPI',
        correlationId,
        durationMs: null,
        errorCategory: 'ProviderError' as const,
        message: errorMessage,
        response: data
      })
      throw new Error(errorMessage)
    }

    const rates: ExchangeRates = {
      base: 'USD',
      rates: {
        USD: 1,
        AUD: data.rates.AUD,
        EUR: data.rates.EUR
      },
      date: data.date || new Date().toISOString().split('T')[0]
    }

    // Update cache
    cachedRates = rates
    lastFetchTimestamp = new Date().toISOString()

    logInfo('currency.fetch.success', {
      context: 'service:currency',
      operation: 'fetchRatesFromAPI',
      correlationId,
      durationMs: null,
      errorCategory: null,
      rates: rates.rates,
      date: rates.date
    })

    return rates
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching rates'
    logError('currency.fetch.error', {
      context: 'service:currency',
      operation: 'fetchRatesFromAPI',
      correlationId,
      durationMs: null,
      errorCategory: 'InfrastructureError' as const,
      message: errorMessage
    })
    throw new Error(errorMessage)
  } finally {
    isFetching = false
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached exchange rates
 */
export function getCachedRates(): ExchangeRates | null {
  return cachedRates
}

/**
 * Get last fetch timestamp
 */
export function getLastFetchTimestamp(): string | null {
  return lastFetchTimestamp
}

/**
 * Set cached rates (used when loading from persistent storage)
 */
export function setCachedRates(rates: ExchangeRates, timestamp: string): void {
  cachedRates = rates
  lastFetchTimestamp = timestamp
}

/**
 * Clear cached rates
 */
export function clearCachedRates(): void {
  cachedRates = null
  lastFetchTimestamp = null
}

// ============================================================================
// Rate Status
// ============================================================================

export type RateAgeStatus = 'fresh' | 'stale' | 'expired'

export interface RateStatus {
  status: RateAgeStatus
  hoursSince: number | null
}

/**
 * Get the age status of the current rates
 * - fresh: < 24 hours
 * - stale: 24-48 hours
 * - expired: > 48 hours or never fetched
 */
export function getRateAgeStatus(timestamp: string | null = lastFetchTimestamp): RateStatus {
  if (!timestamp) {
    return { status: 'expired', hoursSince: null }
  }

  const hoursSince = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60)

  if (hoursSince < 24) {
    return { status: 'fresh', hoursSince }
  } else if (hoursSince < 48) {
    return { status: 'stale', hoursSince }
  } else {
    return { status: 'expired', hoursSince }
  }
}

/**
 * Check if rates are considered stale (> 24 hours old)
 */
export function isRateStale(timestamp: string | null = lastFetchTimestamp): boolean {
  const { status } = getRateAgeStatus(timestamp)
  return status === 'stale' || status === 'expired'
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert amount from one currency to another using cached rates
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number> = cachedRates?.rates ?? DEFAULT_RATES
): number {
  if (from === to) return amount

  // Convert to USD base first, then to target
  const inUSD = from === 'USD' ? amount : amount / rates[from]
  const result = to === 'USD' ? inUSD : inUSD * rates[to]

  return Number(result.toFixed(2))
}

/**
 * Get exchange rate between two currencies
 */
export function getRate(
  from: Currency,
  to: Currency,
  rates: Record<Currency, number> = cachedRates?.rates ?? DEFAULT_RATES
): number {
  if (from === to) return 1

  // Rate from A to B = (1 / rate[A]) * rate[B]
  return to === 'USD' ? 1 / rates[from] : rates[to] / rates[from]
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale: string = CURRENCY_DETAILS[currency].locale
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    // Fallback formatting
    const symbol = CURRENCY_DETAILS[currency].symbol
    return `${symbol}${amount.toFixed(2)}`
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get inverse rates (1 AUD = X USD, etc.)
 */
export function getInverseRates(
  rates: Record<Currency, number> = cachedRates?.rates ?? { USD: 1, AUD: 1.5, EUR: 0.85 }
): Record<Currency, number> {
  return {
    USD: 1 / rates.USD,
    AUD: 1 / rates.AUD,
    EUR: 1 / rates.EUR
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return date.toLocaleDateString()
}
