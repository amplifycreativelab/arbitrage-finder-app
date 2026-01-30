import * as React from 'react'
// Story 8.2: Icon components (emoji fallbacks for now, lucide-react can be added later)
const Pin = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>📌</span>
const X = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>✕</span>
const PanelLeft = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>◀</span>
const Maximize2 = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>⛶</span>
const Copy = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>📋</span>
const Loader2 = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>⟳</span>
const RefreshCw = ({ className }: { className?: string }): React.JSX.Element => <span className={className}>↻</span>

import { cn } from '../../../lib/utils'
import { Button } from '../../../components/ui/button'
import type { OddsBrowserRow } from '../types'

// Story 8.2: Props for the comparison panel
export interface OddsComparisonPanelProps {
  /** The selected row data */
  selectedRow: OddsBrowserRow
  /** Whether panel is pinned (stays open on new selection) */
  isPinned: boolean
  /** Display mode: docked (sidebar) or floating (modal) */
  displayMode: 'docked' | 'floating'
  /** Callback when pin state toggles */
  onTogglePin: () => void
  /** Callback when display mode changes */
  onChangeDisplayMode: (mode: 'docked' | 'floating') => void
  /** Callback when panel closes */
  onClose: () => void
  /** Callback to copy best odds info */
  onCopyBestOdds?: () => void
}

// Story 8.2: Best odds data structure from TRPC
interface OutcomeComparison {
  outcome: string
  bestBookmaker: string
  bestOdds: number
  allBookmakers: Array<{ bookmaker: string; odds: number; isBest: boolean }>
}

interface BestOddsData {
  eventId: string
  marketKey: string
  marketLabel: string
  outcomes: OutcomeComparison[]
}

// Story 8.2: Panel states
interface PanelState {
  data: BestOddsData[] | null
  isLoading: boolean
  isUpdating: boolean
  error: string | null
  lastUpdated: Date | null
}

/**
 * Story 8.2: Odds Comparison Panel Component
 * 
 * Displays a comparison of odds across all bookmakers for a selected market.
 * Supports docked (sidebar) and floating (modal) display modes.
 * Includes pin functionality, real-time updates, and copy-to-clipboard.
 */
export function OddsComparisonPanel({
  selectedRow,
  isPinned,
  displayMode,
  onTogglePin,
  onChangeDisplayMode,
  onClose,
  onCopyBestOdds
}: OddsComparisonPanelProps): React.JSX.Element {
  const [state, setState] = React.useState<PanelState>({
    data: null,
    isLoading: true,
    isUpdating: false,
    error: null,
    lastUpdated: null
  })
  const [copyState, setCopyState] = React.useState<'idle' | 'copied'>('idle')

  // Story 8.2: Extract event ID from selected row's composite ID
  // Row ID format: `${eventId}:${marketKey}:${bookmaker}:${outcome}`
  const eventId = React.useMemo(() => {
    return selectedRow.id.split(':')[0] || selectedRow.event.home + '-' + selectedRow.event.away
  }, [selectedRow])

  // Story 8.2: Fetch best odds data
  const fetchBestOdds = React.useCallback(async (isBackgroundUpdate = false) => {
    if (!isBackgroundUpdate) {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
    } else {
      setState(prev => ({ ...prev, isUpdating: true }))
    }

    try {
      const result = await window.api.deepScanGetBestOdds({ eventId })
      
      // Transform the data to include isBest flag
      const transformedData: BestOddsData[] = result.bestOdds?.map((market) => ({
        eventId: market.eventId,
        marketKey: market.marketKey,
        marketLabel: market.marketLabel,
        outcomes: market.outcomes.map((outcome) => ({
          outcome: outcome.outcome,
          bestBookmaker: outcome.bestBookmaker,
          bestOdds: outcome.bestOdds,
          allBookmakers: outcome.allBookmakers
            .map(bm => ({ ...bm, isBest: bm.bookmaker === outcome.bestBookmaker }))
            .sort((a, b) => b.odds - a.odds)
        }))
      })) ?? []

      setState({
        data: transformedData,
        isLoading: false,
        isUpdating: false,
        error: null,
        lastUpdated: new Date()
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isUpdating: false,
        error: err instanceof Error ? err.message : 'Failed to load comparison data',
        lastUpdated: prev.lastUpdated
      }))
    }
  }, [eventId])

  // Story 8.2: Initial fetch
  React.useEffect(() => {
    void fetchBestOdds(false)
  }, [fetchBestOdds])

  // Story 8.2: Real-time updates - subscribe to deep scan updates
  React.useEffect(() => {
    // Poll for updates every 5 seconds when data is stale
    const intervalId = setInterval(() => {
      if (state.lastUpdated && Date.now() - state.lastUpdated.getTime() > 5000) {
        void fetchBestOdds(true)
      }
    }, 5000)

    return () => clearInterval(intervalId)
  }, [fetchBestOdds, state.lastUpdated])

  // Story 8.2: Handle ESC key to close
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Story 8.2: Calculate rank of selected bookmaker for selected outcome
  const selectedOddsRank = React.useMemo(() => {
    if (!state.data) return null

    // Find the market matching the selected row's market key
    const market = state.data.find(m => m.marketKey === selectedRow.marketKey)
    if (!market) return null

    // Find the outcome matching the selected row's outcome
    const outcome = market.outcomes.find(o => o.outcome === selectedRow.outcome)
    if (!outcome) return null

    // Find the rank of the selected bookmaker
    const rank = outcome.allBookmakers.findIndex(bm => bm.bookmaker === selectedRow.bookmaker)
    return rank >= 0 ? rank + 1 : null
  }, [state.data, selectedRow])

  // Story 8.2: Get total bookmakers count
  const totalBookmakers = React.useMemo(() => {
    if (!state.data) return 0
    const market = state.data.find(m => m.marketKey === selectedRow.marketKey)
    const outcome = market?.outcomes.find(o => o.outcome === selectedRow.outcome)
    return outcome?.allBookmakers.length ?? 0
  }, [state.data, selectedRow])

  // Story 8.2: Handle copy best odds
  const handleCopyBestOdds = React.useCallback(() => {
    if (!state.data) return

    // Format: "{Event} - {Market}: Best {OutcomeA} @ {BookmakerA} ({OddsA}), Best {OutcomeB} @ {BookmakerB} ({OddsB})"
    const market = state.data.find(m => m.marketKey === selectedRow.marketKey)
    if (!market) return

    const eventName = `${selectedRow.event.home} vs ${selectedRow.event.away}`
    const outcomesText = market.outcomes.map(o => 
      `Best ${o.outcome} @ ${o.bestBookmaker} (${o.bestOdds.toFixed(2)})`
    ).join(', ')

    const text = `${eventName} - ${market.marketLabel}: ${outcomesText}`

    // Copy to clipboard
    void window.api.copySignalToClipboard({ text })

    if (onCopyBestOdds) {
      onCopyBestOdds()
    }

    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 1500)
  }, [state.data, selectedRow, onCopyBestOdds])

  // Story 8.2: Format rank display (e.g., "1st", "2nd", "3rd")
  const formatRank = (rank: number): string => {
    if (rank === 1) return '1st'
    if (rank === 2) return '2nd'
    if (rank === 3) return '3rd'
    return `${rank}th`
  }

  // Story 8.2: Check if data is stale (>5 min old)
  const isDataStale = React.useMemo(() => {
    if (!state.lastUpdated) return false
    return Date.now() - state.lastUpdated.getTime() > 5 * 60 * 1000
  }, [state.lastUpdated])

  

  // Story 8.2: Render header
  const renderHeader = (): React.JSX.Element => (
    <div className="flex items-center justify-between border-b border-ot-border bg-ot-surface p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ot-foreground">Odds Comparison</span>
        {state.isUpdating && (
          <Loader2 className="h-3 w-3 animate-spin text-ot-accent" />
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Copy button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2 text-[10px]',
            copyState === 'copied' && 'text-emerald-400'
          )}
          onClick={handleCopyBestOdds}
          disabled={!state.data || state.isLoading}
          title="Copy best odds to clipboard"
        >
          {copyState === 'copied' ? (
            <>
              <span className="mr-1">✓</span> Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3 w-3" /> Copy
            </>
          )}
        </Button>

        {/* Display mode toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChangeDisplayMode(displayMode === 'docked' ? 'floating' : 'docked')}
          title={displayMode === 'docked' ? 'Switch to floating mode' : 'Switch to docked mode'}
        >
          {displayMode === 'docked' ? (
            <Maximize2 className="h-3.5 w-3.5 text-ot-muted" />
          ) : (
            <PanelLeft className="h-3.5 w-3.5 text-ot-muted" />
          )}
        </Button>

        {/* Pin toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            isPinned && 'text-ot-accent'
          )}
          onClick={onTogglePin}
          title={isPinned ? 'Unpin panel' : 'Pin panel'}
        >
          <Pin className={cn('h-3.5 w-3.5', isPinned && 'fill-current')} />
        </Button>

        {/* Close button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          title="Close panel (ESC)"
        >
          <X className="h-3.5 w-3.5 text-ot-muted" />
        </Button>
      </div>
    </div>
  )

  // Story 8.2: Render event context
  const renderEventContext = (): React.JSX.Element => (
    <div className="border-b border-ot-border bg-ot-background p-3">
      <div className="text-sm font-semibold text-ot-foreground">
        {selectedRow.event.home} vs {selectedRow.event.away}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-ot-muted">
        <span>{selectedRow.league}</span>
        <span>•</span>
        <span>{selectedRow.marketType}</span>
        <span>•</span>
        <span>{selectedRow.outcome}</span>
      </div>
      {selectedOddsRank && (
        <div className="mt-2 flex items-center gap-2">
          <span 
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-medium',
              selectedOddsRank === 1 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-ot-accent/10 text-ot-accent'
            )}
          >
            {formatRank(selectedOddsRank)} best
          </span>
          <span className="text-[10px] text-ot-muted">
            out of {totalBookmakers} bookmakers
          </span>
        </div>
      )}
    </div>
  )

  // Story 8.2: Render loading state
  const renderLoading = (): React.JSX.Element => (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-ot-accent" />
      <span className="text-[11px] text-ot-muted">Loading comparison data...</span>
    </div>
  )

  // Story 8.2: Render error state
  const renderError = (): React.JSX.Element => (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 rounded-full bg-red-500/10 p-3">
        <X className="h-5 w-5 text-red-500" />
      </div>
      <span className="mb-2 text-[11px] font-medium text-ot-foreground">Failed to load comparison</span>
      <span className="mb-4 max-w-[200px] text-[10px] text-ot-muted">{state.error}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-[10px]"
        onClick={() => void fetchBestOdds(false)}
      >
        <RefreshCw className="mr-1 h-3 w-3" /> Retry
      </Button>
    </div>
  )

  // Story 8.2: Render empty state
  const renderEmpty = (): React.JSX.Element => (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 rounded-full bg-ot-muted/10 p-3">
        <span className="text-lg text-ot-muted">📊</span>
      </div>
      <span className="text-[11px] text-ot-muted">No comparison data available</span>
    </div>
  )

  // Story 8.2: Render stale state overlay
  const renderStaleOverlay = (): React.JSX.Element | null => {
    if (!isDataStale) return null
    return (
      <div className="absolute inset-x-0 top-0 z-10 bg-amber-500/10 px-3 py-2 text-center">
        <span className="text-[10px] text-amber-400">
          Data is stale (&gt;5 min old). Waiting for refresh...
        </span>
      </div>
    )
  }

  // Story 8.2: Render comparison content
  const renderContent = (): React.JSX.Element => {
    if (state.isLoading && !state.data) return renderLoading()
    if (state.error) return renderError()
    if (!state.data || state.data.length === 0) return renderEmpty()

    // Find the specific market for this selection
    const market = state.data.find(m => m.marketKey === selectedRow.marketKey)
    if (!market) return renderEmpty()

    return (
      <div className="relative flex-1 overflow-auto p-3">
        {renderStaleOverlay()}
        
        {/* Market header */}
        <div className="mb-3 text-xs font-medium text-ot-foreground">
          {market.marketLabel}
        </div>

        {/* Outcomes comparison */}
        <div className="space-y-3">
          {market.outcomes.map((outcome) => (
            <div key={outcome.outcome} className="rounded border border-ot-border bg-ot-card p-2">
              {/* Outcome header */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-ot-muted">{outcome.outcome}</span>
                {outcome.outcome === selectedRow.outcome && (
                  <span className="text-[9px] text-ot-accent">Your selection</span>
                )}
              </div>

              {/* Best odds highlight */}
              <div 
                className={cn(
                  'mb-2 flex items-center justify-between rounded p-2',
                  outcome.bestBookmaker === selectedRow.bookmaker
                    ? 'bg-emerald-500/10'
                    : 'bg-ot-accent/10'
                )}
              >
                <div>
                  <div className="text-[13px] font-bold text-ot-accent">
                    {outcome.bestOdds.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-ot-muted">{outcome.bestBookmaker}</div>
                </div>
                {outcome.bestBookmaker === selectedRow.bookmaker && (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                    Best
                  </span>
                )}
              </div>

              {/* All bookmakers list */}
              <div className="space-y-0.5">
                {outcome.allBookmakers.slice(0, 6).map((bm) => (
                  <div
                    key={bm.bookmaker}
                    className={cn(
                      'flex items-center justify-between text-[10px]',
                      bm.bookmaker === selectedRow.bookmaker
                        ? 'font-medium text-ot-foreground'
                        : 'text-ot-muted'
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {bm.bookmaker === selectedRow.bookmaker && (
                        <span className="text-ot-accent">→</span>
                      )}
                      {bm.bookmaker}
                    </span>
                    <span className={cn(
                      'font-mono',
                      bm.isBest && 'font-semibold text-ot-accent'
                    )}>
                      {bm.odds.toFixed(2)}
                    </span>
                  </div>
                ))}
                {outcome.allBookmakers.length > 6 && (
                  <div className="text-[9px] text-ot-muted">
                    +{outcome.allBookmakers.length - 6} more bookmakers
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Story 8.2: Main render
  return (
    <div 
      className={cn(
        'flex flex-col bg-ot-background',
        displayMode === 'floating' && 'h-full rounded-lg shadow-xl'
      )}
      data-testid="odds-comparison-panel"
    >
      {renderHeader()}
      {renderEventContext()}
      {renderContent()}
    </div>
  )
}

export default OddsComparisonPanel
