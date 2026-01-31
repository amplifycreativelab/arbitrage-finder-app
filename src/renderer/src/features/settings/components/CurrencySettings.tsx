/**
 * Currency Settings Component
 * Story 8.4: Currency Exchange Rate Service
 *
 * Features:
 * - Base currency selector (USD, AUD, EUR)
 * - Manual rate fetch button
 * - Rate display with inverse rates
 * - Rate age indicator
 * - Stale data warning
 */

import * as React from 'react'

// ============================================================================
// Error Boundary for Currency Settings
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class CurrencySettingsErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('CurrencySettings error:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <section className="mt-4 space-y-4 rounded-md border border-red-500/40 bg-red-500/10 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400">
            Currency Settings Error
          </h2>
          <p className="text-[11px] text-red-200">
            Something went wrong loading the currency settings.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-md border border-red-400/40 bg-red-400/10 px-3 py-1.5 text-[11px] text-red-200 hover:bg-red-400/20"
          >
            Try Again
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
import { Button } from '../../../components/ui/button'
import { InlineError } from '../../../components/ui/InlineError'
import { useAppSettingsStore } from '../stores/appSettingsStore'
import { trpcClient } from '../../../lib/trpc'
import {
  CURRENCY_DETAILS,
  CURRENCIES,
  formatRelativeTime,
  getRateAgeStatus,
  getRateStatusColor,
  getRateStatusLabel,
  getInverseRates,
  type Currency
} from '../../../../../../shared/lib/currency'

// ============================================================================
// Rate Age Badge Component
// ============================================================================

interface RateAgeBadgeProps {
  lastFetched: string | null
}

function RateAgeBadge({ lastFetched }: RateAgeBadgeProps): React.JSX.Element {
  const { status, hoursSince } = getRateAgeStatus(lastFetched)
  const colorClass = getRateStatusColor(status)
  const label = getRateStatusLabel(status)

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-ot-surface px-2 py-0.5 text-[10px]"
      title={hoursSince !== null ? `${Math.round(hoursSince)} hours since last update` : 'Never fetched'}
    >
      <span className={`h-2 w-2 rounded-full ${colorClass}`} />
      <span className={status === 'expired' ? 'text-red-400' : status === 'stale' ? 'text-yellow-400' : 'text-green-400'}>
        {label}
      </span>
    </div>
  )
}

// ============================================================================
// Rates Table Component
// ============================================================================

interface RatesTableProps {
  rates: Record<Currency, number>
}

function RatesTable({ rates }: RatesTableProps): React.JSX.Element {
  const inverseRates = getInverseRates(rates)

  return (
    <div className="space-y-2">
      {/* Forward rates */}
      <div className="rounded-md border border-ot-border bg-ot-surface/50 p-2">
        <div className="mb-1 text-[10px] font-medium text-ot-muted">Current Rates (1 USD =)</div>
        <div className="space-y-1">
          {CURRENCIES.filter((c) => c !== 'USD').map((currency) => (
            <div key={currency} className="flex items-center justify-between text-[11px]">
              <span className="text-ot-foreground">
                {currency} ({CURRENCY_DETAILS[currency].symbol})
              </span>
              <span className="font-mono text-ot-accent">{rates[currency].toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inverse rates */}
      <div className="rounded-md border border-ot-border bg-ot-surface/50 p-2">
        <div className="mb-1 text-[10px] font-medium text-ot-muted">Inverse Rates (to USD)</div>
        <div className="space-y-1">
          {CURRENCIES.filter((c) => c !== 'USD').map((currency) => (
            <div key={`inv-${currency}`} className="flex items-center justify-between text-[11px]">
              <span className="text-ot-foreground">
                1 {currency} = {CURRENCY_DETAILS.USD.symbol}
              </span>
              <span className="font-mono text-ot-accent">{inverseRates[currency].toFixed(4)} USD</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Base Currency Selector Component
// ============================================================================

interface BaseCurrencySelectorProps {
  value: Currency
  onChange: (currency: Currency) => void
}

function BaseCurrencySelector({ value, onChange }: BaseCurrencySelectorProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-ot-foreground">Base Currency</label>
      <div className="flex gap-2">
        {CURRENCIES.map((currency) => (
          <button
            key={currency}
            type="button"
            onClick={() => onChange(currency)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] transition-colors ${
              value === currency
                ? 'border-ot-accent bg-ot-accent/10 text-ot-accent'
                : 'border-ot-border bg-ot-surface text-ot-muted hover:text-ot-foreground'
            }`}
          >
            <span>{CURRENCY_DETAILS[currency].symbol}</span>
            <span>{currency}</span>
            <span className="text-ot-muted/60">- {CURRENCY_DETAILS[currency].name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Currency Settings Component
// ============================================================================

export function CurrencySettings(): React.JSX.Element {
  // Store state
  const baseCurrency = useAppSettingsStore((s) => s.baseCurrency)
  const exchangeRates = useAppSettingsStore((s) => s.exchangeRates)
  const ratesLastFetched = useAppSettingsStore((s) => s.ratesLastFetched)
  const setBaseCurrency = useAppSettingsStore((s) => s.setBaseCurrency)
  const setExchangeRates = useAppSettingsStore((s) => s.setExchangeRates)

  // Local state
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  // Check staleness
  const isStale = ratesLastFetched ? getRateAgeStatus(ratesLastFetched).status !== 'fresh' : true

  // Handle fetch rates
  const handleFetchRates = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await trpcClient.currencyFetchRates.mutate()

      // Update store with new rates
      setExchangeRates(
        result.rates as Record<Currency, number>,
        result.fetchedAt
      )

      setSuccessMessage(`Rates updated successfully`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rates'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [setExchangeRates])

  // Handle base currency change
  const handleBaseCurrencyChange = React.useCallback(
    (currency: Currency) => {
      setBaseCurrency(currency)
    },
    [setBaseCurrency]
  )

  return (
    <section className="mt-4 space-y-4 rounded-md border border-ot-accent/40 bg-ot-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-ot-accent">
            Currency Settings
          </h2>
          <p className="mt-1 text-[11px] text-ot-muted">
            Configure exchange rates for multi-currency calculations.
          </p>
        </div>
        <span className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent">
          {baseCurrency}
        </span>
      </div>

      {/* Base Currency Selector */}
      <BaseCurrencySelector value={baseCurrency} onChange={handleBaseCurrencyChange} />

      {/* Fetch Rates Row */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => void handleFetchRates()}
          disabled={isLoading}
          className="h-7 px-3 text-[10px] bg-ot-surface border border-ot-border hover:bg-ot-muted/20 text-ot-foreground"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3 w-3 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Fetching...
            </span>
          ) : (
            'Fetch Rates'
          )}
        </Button>

        <RateAgeBadge lastFetched={ratesLastFetched} />
      </div>

      {/* Error display with retry */}
      {error && (
        <div className="space-y-2">
          <InlineError
            message={error}
            guidance="Check your internet connection and try again. Rates may be temporarily unavailable."
            onDismiss={() => setError(null)}
          />
          <Button
            type="button"
            onClick={() => void handleFetchRates()}
            disabled={isLoading}
            variant="outline"
            className="h-7 px-3 text-[10px] border-ot-border hover:bg-ot-accent/10 hover:text-ot-accent"
          >
            {isLoading ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <p className="text-[10px] text-emerald-400" role="status">
          {successMessage}
        </p>
      )}

      {/* Rates Table */}
      <RatesTable rates={exchangeRates} />

      {/* Last fetch info */}
      <div className="space-y-1">
        <div className="text-[10px] text-ot-muted">
          Last updated: {formatRelativeTime(ratesLastFetched)}
        </div>
        <div className="text-[10px] text-ot-muted/70">
          Next fetch: <span className="text-ot-accent">Manual only</span> (auto-fetch disabled to respect API limits)
        </div>
      </div>

      {/* Stale data warning */}
      {isStale && ratesLastFetched && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-200">
          <div className="flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="font-medium">Exchange rates are stale</span>
          </div>
          <p className="mt-0.5 pl-5 text-yellow-200/80">
            Consider refreshing for accurate calculations.
          </p>
        </div>
      )}

      {/* Never fetched warning */}
      {!ratesLastFetched && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
          <div className="flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="font-medium">No exchange rates fetched yet</span>
          </div>
          <p className="mt-0.5 pl-5 text-amber-200/80">
            Click &quot;Fetch Rates&quot; to get the latest exchange rates.
          </p>
        </div>
      )}

      {/* Help text */}
      <p className="text-[10px] text-ot-muted/70">
        Rates are fetched from Frankfurter API (api.frankfurter.app). No API key required.
      </p>
    </section>
  )
}

// Export wrapped version with error boundary as default
export function CurrencySettingsWithBoundary(): React.JSX.Element {
  return (
    <CurrencySettingsErrorBoundary>
      <CurrencySettings />
    </CurrencySettingsErrorBoundary>
  )
}

export default CurrencySettingsWithBoundary
