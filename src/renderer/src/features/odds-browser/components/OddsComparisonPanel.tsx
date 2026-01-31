import * as React from 'react'

// Proper SVG icon components for professional UI
const Pin = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" x2="12" y1="17" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
)

const X = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

const PanelLeft = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <line x1="9" x2="9" y1="3" y2="21" />
  </svg>
)

const Maximize2 = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" x2="14" y1="3" y2="10" />
    <line x1="3" x2="10" y1="21" y2="14" />
  </svg>
)

const Copy = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const Loader2 = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

const RefreshCw = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
)

const Trophy = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
)

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
        <Trophy className="h-5 w-5 text-ot-muted" />
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
