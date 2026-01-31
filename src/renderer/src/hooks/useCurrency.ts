/**
 * Currency React Hooks
 * Story 8.4: Currency Exchange Rate Service
 *
 * Provides convenient hooks for accessing and manipulating currency settings
 */

import * as React from 'react'
import { useAppSettingsStore } from '../features/settings/stores/appSettingsStore'
import { trpcClient } from '../lib/trpc'
import {
  convert as convertCurrency,
  formatCurrency as formatCurrencyUtil,
  getRate as getRateUtil,
  getRateAgeStatus,
  isRateStale as checkRateStale,
  formatRelativeTime,
  type Currency
} from '../../../../shared/lib/currency'

// ============================================================================
// Hook: useCurrency
// ============================================================================

export interface UseCurrencyReturn {
  /** Currently selected base currency */
  baseCurrency: Currency
  /** Set the base currency */
  setBaseCurrency: (currency: Currency) => void
  /** All available currencies */
  currencies: Currency[]
}

/**
 * Hook for accessing and modifying base currency setting
 */
export function useCurrency(): UseCurrencyReturn {
  const baseCurrency = useAppSettingsStore((s) => s.baseCurrency)
  const setBaseCurrency = useAppSettingsStore((s) => s.setBaseCurrency)

  return {
    baseCurrency,
    setBaseCurrency,
    currencies: ['USD', 'AUD', 'EUR']
  }
}

// ============================================================================
// Hook: useExchangeRates
// ============================================================================

export interface UseExchangeRatesReturn {
  /** Current exchange rates (USD-based) */
  rates: Record<Currency, number>
  /** Last fetch timestamp */
  lastFetched: string | null
  /** Whether rates are stale (> 24 hours old) */
  isStale: boolean
  /** Rate age status (fresh/stale/expired) */
  rateStatus: ReturnType<typeof getRateAgeStatus>
  /** Formatted relative time (e.g., "2 hours ago") */
  lastFetchedRelative: string
  /** Fetch fresh rates from API */
  fetchRates: () => Promise<void>
  /** Whether a fetch is in progress */
  isLoading: boolean
  /** Error from last fetch attempt */
  error: string | null
  /** Clear error */
  clearError: () => void
}

/**
 * Hook for accessing and refreshing exchange rates
 */
export function useExchangeRates(): UseExchangeRatesReturn {
  const exchangeRates = useAppSettingsStore((s) => s.exchangeRates)
  const ratesLastFetched = useAppSettingsStore((s) => s.ratesLastFetched)
  const setExchangeRates = useAppSettingsStore((s) => s.setExchangeRates)

  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isStale = checkRateStale(ratesLastFetched)
  const rateStatus = getRateAgeStatus(ratesLastFetched)
  const lastFetchedRelative = formatRelativeTime(ratesLastFetched)

  const fetchRates = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await trpcClient.currencyFetchRates.mutate()
      setExchangeRates(
        result.rates as Record<Currency, number>,
        result.fetchedAt
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rates'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setExchangeRates])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    rates: exchangeRates,
    lastFetched: ratesLastFetched,
    isStale,
    rateStatus,
    lastFetchedRelative,
    fetchRates,
    isLoading,
    error,
    clearError
  }
}

// ============================================================================
// Hook: useCurrencyConversion
// ============================================================================

export interface UseCurrencyConversionReturn {
  /** Convert amount between currencies using cached rates */
  convert: (amount: number, from: Currency, to: Currency) => number
  /** Get exchange rate between two currencies */
  getRate: (from: Currency, to: Currency) => number
  /** Format amount as currency string */
  formatCurrency: (amount: number, currency: Currency) => string
}

/**
 * Hook for performing currency conversions
 */
export function useCurrencyConversion(): UseCurrencyConversionReturn {
  const exchangeRates = useAppSettingsStore((s) => s.exchangeRates)

  const convert = React.useCallback(
    (amount: number, from: Currency, to: Currency): number => {
      return convertCurrency(amount, from, to, exchangeRates)
    },
    [exchangeRates]
  )

  const getRate = React.useCallback(
    (from: Currency, to: Currency): number => {
      return getRateUtil(from, to, exchangeRates)
    },
    [exchangeRates]
  )

  const formatCurrency = React.useCallback(
    (amount: number, currency: Currency): string => {
      return formatCurrencyUtil(amount, currency)
    },
    []
  )

  return {
    convert,
    getRate,
    formatCurrency
  }
}

// ============================================================================
// Hook: useCurrencyWithConversion
// ============================================================================

export interface UseCurrencyWithConversionReturn extends UseCurrencyReturn, UseCurrencyConversionReturn {
  /** Current exchange rates */
  rates: Record<Currency, number>
  /** Convert from base currency to target */
  convertFromBase: (amount: number, targetCurrency: Currency) => number
  /** Convert to base currency from source */
  convertToBase: (amount: number, sourceCurrency: Currency) => number
}

/**
 * Combined hook for full currency functionality
 */
export function useCurrencyWithConversion(): UseCurrencyWithConversionReturn {
  const { baseCurrency, setBaseCurrency, currencies } = useCurrency()
  const { rates } = useExchangeRates()
  const { convert, getRate, formatCurrency } = useCurrencyConversion()

  const convertFromBase = React.useCallback(
    (amount: number, targetCurrency: Currency): number => {
      return convert(amount, baseCurrency, targetCurrency)
    },
    [convert, baseCurrency]
  )

  const convertToBase = React.useCallback(
    (amount: number, sourceCurrency: Currency): number => {
      return convert(amount, sourceCurrency, baseCurrency)
    },
    [convert, baseCurrency]
  )

  return {
    baseCurrency,
    setBaseCurrency,
    currencies,
    rates,
    convert,
    getRate,
    formatCurrency,
    convertFromBase,
    convertToBase
  }
}
