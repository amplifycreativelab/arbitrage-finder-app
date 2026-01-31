import * as React from 'react'

import { Button } from '../../../components/ui/button'
import { cn } from '../../../lib/utils'
import { useCalculatorStore } from '../stores/calculatorStore'
import { createBetSlipData, copyBetSlipToClipboard } from '../lib/copyBetSlip'
import { useExchangeRates, useCurrency } from '../../../hooks/useCurrency'
import SurebetCalculator from './SurebetCalculator'
import CalculatorHistory from './CalculatorHistory'
// Icons as SVG components since lucide-react may not be available
const CopyIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
)
const XIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
)
const Maximize2Icon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" /></svg>
)
const PanelLeftIcon = (): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M9 3v18" /></svg>
)

export interface CalculatorPanelProps {
  className?: string
}



export function CalculatorPanel({ className }: CalculatorPanelProps): React.JSX.Element {
  const {
    isOpen,
    closeCalculator,
    displayMode,
    setDisplayMode,
    opportunity,
    calculatedStakeA,
    calculatedStakeB,
    totalInvestment,
    profit,
    addToHistory,
    currencyA: _currencyA,
    currencyB: _currencyB
  } = useCalculatorStore()

  const [copyState, setCopyState] = React.useState<'idle' | 'copied'>('idle')

  // NEW: Exchange rate integration (Story 8.5)
  const { baseCurrency } = useCurrency()
  const { rates, isStale, lastFetchedRelative, fetchRates, isLoading } = useExchangeRates()

  // Handle ESC key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isOpen) {
        closeCalculator()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeCalculator])

  const handleCopyBetSlip = async (): Promise<void> => {
    if (!opportunity) return

    const data = createBetSlipData(opportunity, calculatedStakeA, calculatedStakeB, profit)
    const success = await copyBetSlipToClipboard(data)

    if (success) {
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1500)
    }
  }

  const handleSaveToHistory = (): void => {
    // NEW: Pass exchange rates to history (Story 8.5)
    addToHistory(rates, lastFetchedRelative)
  }

  // NEW: Handle rate refresh (Story 8.5)
  const handleRefreshRates = async (): Promise<void> => {
    try {
      await fetchRates()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleToggleMode = (): void => {
    setDisplayMode(displayMode === 'inline' ? 'modal' : 'inline')
  }

  const handleClose = (): void => {
    // Save to history before closing if there's a valid calculation
    if (opportunity && totalInvestment > 0) {
      addToHistory(rates, lastFetchedRelative)
    }
    closeCalculator()
  }

  // Empty state
  if (!isOpen || !opportunity) {
    return (
      <div
        className={cn(
          'flex h-full flex-col items-center justify-center p-4 text-center',
          className
        )}
        data-testid="calculator-panel-empty"
      >
        <div className="text-[12px] text-ot-muted">
          Select a surebet opportunity and click &quot;Calculate Stakes&quot; to use the calculator.
        </div>
      </div>
    )
  }

  const panelContent = (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 p-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ot-foreground">
            ⚡ Surebet Calculator
          </span>
          {/* NEW: Base currency indicator (Story 8.5) */}
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-ot-muted">
            {baseCurrency}
          </span>
          {/* NEW: Rate status indicator (Story 8.5) */}
          <button
            onClick={handleRefreshRates}
            disabled={isLoading}
            className={cn(
              'ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors',
              isStale
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            )}
            title={isStale ? 'Rates are stale - click to refresh' : `Rates updated ${lastFetchedRelative}`}
          >
            {isLoading ? '⟳' : isStale ? '⚠' : '✓'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMode}
            className="h-7 w-7"
            title={displayMode === 'inline' ? 'Switch to modal' : 'Switch to inline'}
            data-testid="toggle-display-mode"
          >
            {displayMode === 'inline' ? <Maximize2Icon /> : <PanelLeftIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-7 w-7"
            data-testid="close-calculator"
          >
            <XIcon />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* NEW: Rate staleness warning banner (Story 8.5) */}
        {isStale && (
          <div className="mb-3 rounded border border-yellow-600/50 bg-yellow-900/20 px-3 py-2 text-[11px] text-yellow-200">
            <div className="flex items-center justify-between">
              <span>
                <span className="font-semibold">⚠️ Warning:</span> Exchange rates are {lastFetchedRelative}.
                Conversions may be inaccurate.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshRates}
                disabled={isLoading}
                className="ml-2 h-6 border-yellow-600/50 px-2 text-[10px] text-yellow-200 hover:bg-yellow-900/30"
              >
                {isLoading ? 'Refreshing...' : 'Refresh Rates'}
              </Button>
            </div>
          </div>
        )}
        <SurebetCalculator opportunity={opportunity} />

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyBetSlip}
            className={cn(
              'w-full gap-2 text-[11px]',
              copyState === 'copied' && 'bg-emerald-500 text-black hover:bg-emerald-400 border-emerald-500'
            )}
            disabled={totalInvestment <= 0}
            data-testid="copy-bet-slip-button"
          >
            <CopyIcon />
            {copyState === 'copied' ? 'Copied!' : 'Copy Bet Slip'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToHistory}
            className="w-full text-[11px]"
            disabled={totalInvestment <= 0}
            data-testid="save-to-history-button"
          >
            Save to History
          </Button>
        </div>

        {/* History */}
        <div className="mt-4">
          <CalculatorHistory />
        </div>
      </div>
    </div>
  )

  // Modal mode: centered overlay
  if (displayMode === 'modal') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose()
          }
        }}
        data-testid="calculator-panel-modal"
      >
        <div
          className={cn(
            'w-full max-w-md max-h-[85vh] overflow-hidden rounded-lg border border-slate-700 shadow-xl',
            className
          )}
        >
          {panelContent}
        </div>
      </div>
    )
  }

  // Inline mode: slide-out panel
  return (
    <div
      className={cn(
        'h-full w-[380px] border-l border-slate-700 bg-slate-900',
        'transition-all duration-200 ease-in-out',
        className
      )}
      data-testid="calculator-panel-inline"
    >
      {panelContent}
    </div>
  )
}

export default CalculatorPanel
