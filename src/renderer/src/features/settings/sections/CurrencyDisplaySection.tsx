import * as React from 'react'

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-ot-border bg-ot-surface/50 p-3">
        <div className="mb-2 text-[10px] font-medium text-ot-muted">Current Rates (1 USD =)</div>
        <div className="space-y-1.5">
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

      <div className="rounded-md border border-ot-border bg-ot-surface/50 p-3">
        <div className="mb-2 text-[10px] font-medium text-ot-muted">Inverse Rates (to USD)</div>
        <div className="space-y-1.5">
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
    <div className="space-y-2">
      <label className="text-[11px] font-medium text-ot-foreground">Base Currency</label>
      <div className="flex flex-wrap gap-2">
        {CURRENCIES.map((currency) => (
          <button
            key={currency}
            type="button"
            onClick={() => onChange(currency)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-[11px] transition-colors ${
              value === currency
                ? 'border-ot-accent bg-ot-accent/10 text-ot-accent'
                : 'border-ot-border bg-ot-surface text-ot-muted hover:text-ot-foreground'
            }`}
          >
            <span className="font-medium">{CURRENCY_DETAILS[currency].symbol}</span>
            <span>{currency}</span>
            <span className="text-ot-muted/60">- {CURRENCY_DETAILS[currency].name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Main Currency Display Section Component
// ============================================================================

export function CurrencyDisplaySection(): React.JSX.Element {
  const baseCurrency = useAppSettingsStore((s) => s.baseCurrency)
  const exchangeRates = useAppSettingsStore((s) => s.exchangeRates)
  const ratesLastFetched = useAppSettingsStore((s) => s.ratesLastFetched)
  const setBaseCurrency = useAppSettingsStore((s) => s.setBaseCurrency)
  const setExchangeRates = useAppSettingsStore((s) => s.setExchangeRates)

  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const isStale = ratesLastFetched ? getRateAgeStatus(ratesLastFetched).status !== 'fresh' : true

  const handleFetchRates = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const result = await trpcClient.currencyFetchRates.mutate()

      setExchangeRates(
        result.rates as Record<Currency, number>,
        result.fetchedAt
      )

      setSuccessMessage('Rates updated successfully')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rates'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [setExchangeRates])

  const handleBaseCurrencyChange = React.useCallback(
    (currency: Currency) => {
      setBaseCurrency(currency)
    },
    [setBaseCurrency]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ot-muted">
          Configure exchange rates for multi-currency calculations.
        </p>
        <span className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-medium text-ot-accent">
          {baseCurrency}
        </span>
      </div>

      <BaseCurrencySelector value={baseCurrency} onChange={handleBaseCurrencyChange} />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={() => void handleFetchRates()}
          disabled={isLoading}
          className="h-8 px-4 text-[11px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching...
            </span>
          ) : (
            'Fetch Rates'
          )}
        </Button>

        <RateAgeBadge lastFetched={ratesLastFetched} />
      </div>

      {error && (
        <InlineError
          message={error}
          guidance="Check your internet connection and try again."
          onDismiss={() => setError(null)}
        />
      )}

      {successMessage && (
        <p className="text-[10px] text-emerald-400" role="status">
          {successMessage}
        </p>
      )}

      <RatesTable rates={exchangeRates} />

      <div className="space-y-1 text-[10px] text-ot-muted">
        <div>Last updated: {formatRelativeTime(ratesLastFetched)}</div>
        <div className="text-ot-muted/70">
          Rates from Frankfurter API (api.frankfurter.app). No API key required.
        </div>
      </div>

      {isStale && ratesLastFetched && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-[11px] text-yellow-200">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="font-medium">Exchange rates are stale</span>
          </div>
          <p className="mt-1 pl-5 text-yellow-200/80">
            Consider refreshing for accurate calculations.
          </p>
        </div>
      )}

      {!ratesLastFetched && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="font-medium">No exchange rates fetched yet</span>
          </div>
          <p className="mt-1 pl-5 text-amber-200/80">
            Click &quot;Fetch Rates&quot; to get the latest exchange rates.
          </p>
        </div>
      )}
    </div>
  )
}

export default CurrencyDisplaySection
