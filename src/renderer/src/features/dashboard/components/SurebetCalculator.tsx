import * as React from 'react'

import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'
import type { ArbitrageOpportunity } from '../../../../../../shared/types'
import {
  isOpportunityStale,
  getStalenessMinutes,
  useCalculatorStore
} from '../stores/calculatorStore'

export interface SurebetCalculatorProps {
  opportunity: ArbitrageOpportunity
}

function formatCurrency(value: number): string {
  return value.toFixed(2)
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
    calculatedStakeA,
    calculatedStakeB,
    totalInvestment,
    profit,
    roi
  } = useCalculatorStore()

  const isStale = isOpportunityStale(opportunity)
  const stalenessMinutes = getStalenessMinutes(opportunity)

  const legA = opportunity.legs[0]
  const legB = opportunity.legs[1]

  const handleModeToggle = (): void => {
    setMode(mode === 'totalStake' ? 'targetProfit' : 'totalStake')
  }

  return (
    <div className="flex flex-col gap-4" data-testid="surebet-calculator">
      {/* Staleness Warning */}
      {isStale && (
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
              Total Bankroll
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ot-muted">
                $
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
              Target Profit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ot-muted">
                $
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
              $
            </span>
            <Input
              type="text"
              readOnly
              value={calculatedStakeA > 0 ? formatCurrency(calculatedStakeA) : '-'}
              className="h-7 border-slate-600 bg-slate-900 pl-5 text-[11px] text-ot-accent"
              data-testid="stake-a-output"
            />
          </div>
        </div>
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
              $
            </span>
            <Input
              type="text"
              readOnly
              value={calculatedStakeB > 0 ? formatCurrency(calculatedStakeB) : '-'}
              className="h-7 border-slate-600 bg-slate-900 pl-5 text-[11px] text-ot-accent"
              data-testid="stake-b-output"
            />
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="border-t border-slate-700 pt-3">
        <div className="space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-ot-muted">Total Investment:</span>
            <span className="font-medium text-ot-foreground" data-testid="total-investment">
              ${formatCurrency(totalInvestment)}
            </span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-ot-muted">Guaranteed Profit:</span>
            <span className="font-semibold text-ot-accent" data-testid="guaranteed-profit">
              ${formatCurrency(profit)} ({formatPercent(roi)})
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SurebetCalculator
