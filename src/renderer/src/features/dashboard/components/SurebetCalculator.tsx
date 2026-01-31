import * as React from 'react'

import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { cn } from '../../../lib/utils'
import type { ArbitrageOpportunity } from '../../../../../../shared/types'
import type { Currency } from '../../../../../../shared/lib/currency'
import { CURRENCY_DETAILS } from '../../../../../../shared/lib/currency'
import {
  isOpportunityStale,
  getStalenessMinutes,
  isValidArbitrage,
  useCalculatorStore
} from '../stores/calculatorStore'
import { useCurrencyWithConversion } from '../../../hooks/useCurrency'

export interface SurebetCalculatorProps {
  opportunity: ArbitrageOpportunity
}

// formatAmount was removed - use formatCurrency from useCurrency hook instead

function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_DETAILS[currency]?.symbol || '$'
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function SurebetCalculator({ opportunity }: SurebetCalculatorProps): React.JSX.Element {
  const {
    mode,
    setMode,
    totalStake,
    setTotalStake,
    targetProfit,
    setTargetProfit,
    stakeA,
    stakeB,
    setStakeA,
    setStakeB,
    calculatedStakeA,
    calculatedStakeB,
    totalInvestment,
    profit,
    roi,
    // NEW: Multi-currency fields (Story 8.5)
    currencyA,
    currencyB,
    setCurrencyA,
    setCurrencyB
  } = useCalculatorStore()

  // NEW: Currency conversion hooks (Story 8.5)
  const { baseCurrency, convert, formatCurrency, currencies } = useCurrencyWithConversion()

  const isStale = isOpportunityStale(opportunity)
  const stalenessMinutes = getStalenessMinutes(opportunity)
  const isValid = isValidArbitrage(opportunity.legs[0].odds, opportunity.legs[1].odds)

  const legA = opportunity.legs[0]
  const legB = opportunity.legs[1]

  const handleModeToggle = (): void => {
    setMode(mode === 'totalStake' ? 'targetProfit' : 'totalStake')
  }

  // NEW: Calculate converted values for display (Story 8.5)
  const convertedStakeA = currencyA !== baseCurrency
    ? convert(calculatedStakeA, currencyA, baseCurrency)
    : calculatedStakeA
  const convertedStakeB = currencyB !== baseCurrency
    ? convert(calculatedStakeB, currencyB, baseCurrency)
    : calculatedStakeB

  return (
    <div className="flex flex-col gap-4" data-testid="surebet-calculator">
      {/* Validity Warning - Opportunity no longer forms valid arbitrage */}
      {!isValid && (
        <div
          className="rounded border border-red-600/50 bg-red-900/30 px-3 py-2 text-[11px] text-red-200"
          data-testid="validity-warning"
        >
          <span className="font-semibold">❌ Invalid:</span> These odds no longer form a valid
          arbitrage opportunity.
        </div>
      )}

      {/* Staleness Warning */}
      {isStale && isValid && (
        <div
          className="rounded border border-yellow-600/50 bg-yellow-900/30 px-3 py-2 text-[11px] text-yellow-200"
          data-testid="staleness-warning"
        >
          <span className="font-semibold">⚠️ Warning:</span> This opportunity is{' '}
          {stalenessMinutes} minutes old. Odds may have changed.
        </div>
      )}

      {/* Event Info */}
      <div className="border-b border-slate-700 pb-3">
        <div className="text-[12px] font-medium text-ot-foreground">
          {opportunity.event.name}
        </div>
        <div className="text-[11px] text-ot-muted">
          {legA.market} · ROI: {formatPercent(opportunity.roi)}
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleModeToggle}
          aria-pressed={mode === 'totalStake'}
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-[11px] font-medium transition-colors',
            mode === 'totalStake'
              ? 'bg-ot-accent text-black'
              : 'bg-slate-800 text-ot-muted hover:bg-slate-700'
          )}
          data-testid="mode-total-stake"
          data-active={mode === 'totalStake'}
        >
          Total Stake
        </button>
        <button
          type="button"
          onClick={handleModeToggle}
          aria-pressed={mode === 'targetProfit'}
          className={cn(
            'flex-1 rounded-md px-3 py-2 text-[11px] font-medium transition-colors',
            mode === 'targetProfit'
              ? 'bg-ot-accent text-black'
              : 'bg-slate-800 text-ot-muted hover:bg-slate-700'
          )}
          data-testid="mode-target-profit"
          data-active={mode === 'targetProfit'}
        >
          Target Profit
        </button>
      </div>

      {/* Input Section */}
      <div className="space-y-2">
        {mode === 'totalStake' ? (
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ot-muted">
              Total Bankroll ({baseCurrency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ot-muted">
                {getCurrencySymbol(baseCurrency)}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="100.00"
                value={totalStake}
                onChange={(e) => setTotalStake(e.target.value)}
                className="pl-6 text-[12px]"
                data-testid="total-stake-input"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ot-muted">
              Target Profit ({baseCurrency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ot-muted">
                {getCurrencySymbol(baseCurrency)}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="10.00"
                value={targetProfit}
                onChange={(e) => setTargetProfit(e.target.value)}
                className="pl-6 text-[12px]"
                data-testid="target-profit-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Outcome A Section */}
      <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ot-muted">
          Outcome A
        </div>
        <div className="mb-1 text-[12px] font-medium text-ot-foreground">{legA.outcome}</div>
        <div className="mb-2 text-[11px] text-ot-muted">
          {legA.bookmaker} @ {legA.odds.toFixed(2)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ot-muted">Stake:</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-ot-muted">
              {getCurrencySymbol(currencyA)}
            </span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={stakeA}
              onChange={(e) => setStakeA(e.target.value)}
              className="h-7 border-slate-600 bg-slate-900 pl-5 text-[11px] text-ot-accent"
              data-testid="stake-a-input"
            />
          </div>
          {/* NEW: Currency selector for Outcome A (Story 8.5) */}
          <Select
            value={currencyA}
            onValueChange={(value) => setCurrencyA(value as Currency)}
            className="h-7 w-20 text-[11px]"
            data-testid="currency-a-select"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        {/* NEW: Show calculated stake with conversion (Story 8.5) */}
        {calculatedStakeA > 0 && (
          <div className="text-[10px] text-ot-muted">
            {parseFloat(stakeA || '0') !== calculatedStakeA && (
              <span>Calculated: {formatCurrency(calculatedStakeA, currencyA)}</span>
            )}
            {/* Show converted value if different currency */}
            {currencyA !== baseCurrency && convertedStakeA > 0 && (
              <div className="text-slate-500">
                = {formatCurrency(convertedStakeA, baseCurrency)} {baseCurrency}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outcome B Section */}
      <div className="rounded-md border border-slate-700 bg-slate-800/50 p-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-ot-muted">
          Outcome B
        </div>
        <div className="mb-1 text-[12px] font-medium text-ot-foreground">{legB.outcome}</div>
        <div className="mb-2 text-[11px] text-ot-muted">
          {legB.bookmaker} @ {legB.odds.toFixed(2)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ot-muted">Stake:</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-ot-muted">
              {getCurrencySymbol(currencyB)}
            </span>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={stakeB}
              onChange={(e) => setStakeB(e.target.value)}
              className="h-7 border-slate-600 bg-slate-900 pl-5 text-[11px] text-ot-accent"
              data-testid="stake-b-input"
            />
          </div>
          {/* NEW: Currency selector for Outcome B (Story 8.5) */}
          <Select
            value={currencyB}
            onValueChange={(value) => setCurrencyB(value as Currency)}
            className="h-7 w-20 text-[11px]"
            data-testid="currency-b-select"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        {/* NEW: Show calculated stake with conversion (Story 8.5) */}
        {calculatedStakeB > 0 && (
          <div className="text-[10px] text-ot-muted">
            {parseFloat(stakeB || '0') !== calculatedStakeB && (
              <span>Calculated: {formatCurrency(calculatedStakeB, currencyB)}</span>
            )}
            {/* Show converted value if different currency */}
            {currencyB !== baseCurrency && convertedStakeB > 0 && (
              <div className="text-slate-500">
                = {formatCurrency(convertedStakeB, baseCurrency)} {baseCurrency}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="border-t border-slate-700 pt-3">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-ot-muted">Total Investment:</span>
            <span className="font-medium text-ot-foreground" data-testid="total-investment">
              {formatCurrency(totalInvestment, baseCurrency)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-ot-muted">Guaranteed Profit:</span>
            <span className="font-semibold text-ot-accent" data-testid="guaranteed-profit">
              {formatCurrency(profit, baseCurrency)} ({formatPercent(roi)})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SurebetCalculator
