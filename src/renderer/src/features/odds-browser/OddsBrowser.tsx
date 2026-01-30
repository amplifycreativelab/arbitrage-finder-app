import * as React from 'react'
import { cn } from '../../lib/utils'
import { OddsBrowserFilters } from './components/OddsBrowserFilters'
import { OddsBrowserTable } from './components/OddsBrowserTable'
import { OddsComparisonPanel } from './components/OddsComparisonPanel'
import { useOddsBrowserStore } from './stores/oddsBrowserStore'
import { useDeepScanOdds } from './hooks/useDeepScanOdds'

export interface OddsBrowserProps {
  /** Optional className for styling */
  className?: string
}

export function OddsBrowser({ className }: OddsBrowserProps): React.JSX.Element {
  // Connect to Deep Scan data
  const { isLoading: isLoadingOdds, error: oddsError } = useDeepScanOdds()

  // Subscribe to store state
  const {
    selectedSports,
    selectedLeagues,
    searchQuery,
    selectedMarketTypes,
    selectedBookmakers,
    sortColumn,
    sortDirection,
    selectedOutcomeId,
    rawOddsRows,
    isComparisonPinned,
    comparisonDisplayMode,
    setSelectedSports,
    setSelectedLeagues,
    setSearchQuery,
    setSelectedMarketTypes,
    setSelectedBookmakers,
    setSortColumn,
    selectOutcome,
    toggleComparisonPin,
    setComparisonDisplayMode,
    closeComparison,
    clearAllFilters,
    availableLeagues,
    availableSports,
    availableMarketTypes,
    availableBookmakers,
    filteredRows
  } = useOddsBrowserStore()

  // Get computed values
  const sports = availableSports()
  const leagues = availableLeagues()
  const marketTypes = availableMarketTypes()
  const bookmakers = availableBookmakers()
  const rows = filteredRows()

  // Handle sort column change
  const handleSort = (column: typeof sortColumn): void => {
    setSortColumn(column)
  }

  // Story 8.2: Handle outcome selection with pin behavior
  const [_pendingSelection, setPendingSelection] = React.useState<string | null>(null)

  const handleSelectOutcome = React.useCallback((id: string | null) => {
    // If not pinned and there's an existing selection, close first then open new
    if (!isComparisonPinned && selectedOutcomeId && id && id !== selectedOutcomeId) {
      closeComparison()
      // Small delay for animation
      setPendingSelection(id)
      setTimeout(() => {
        setPendingSelection(null)
        selectOutcome(id)
      }, 150)
    } else {
      selectOutcome(id)
    }
  }, [isComparisonPinned, selectedOutcomeId, closeComparison, selectOutcome])

  // Story 8.2: Get selected row data
  const selectedRow = React.useMemo(() => {
    if (!selectedOutcomeId) return null
    return rawOddsRows.find(row => row.id === selectedOutcomeId) || null
  }, [selectedOutcomeId, rawOddsRows])

  // Story 8.2: Check if we have data
  const hasData = rawOddsRows.length > 0
  const hasFilteredData = rows.length > 0
  const hasSelection = selectedOutcomeId !== null && selectedRow !== null

  return (
    <div className={className} data-testid="odds-browser">
      {/* Filters Section */}
      <div className="mb-4">
        <OddsBrowserFilters
          filters={{
            selectedSports,
            selectedLeagues,
            searchQuery,
            selectedMarketTypes,
            selectedBookmakers
          }}
          availableSports={sports}
          availableLeagues={leagues}
          availableMarketTypes={marketTypes}
          availableBookmakers={bookmakers}
          onSportsChange={setSelectedSports}
          onLeaguesChange={setSelectedLeagues}
          onSearchChange={setSearchQuery}
          onMarketTypesChange={setSelectedMarketTypes}
          onBookmakersChange={setSelectedBookmakers}
          onClearAll={clearAllFilters}
        />
      </div>

      {/* Table Section */}
      <div className="flex-1 min-h-0">
        {isLoadingOdds && !hasData ? (
          <div
            className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center"
            data-testid="odds-browser-loading-state"
          >
            <div className="mb-4 rounded-full bg-ot-accent/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 animate-spin text-ot-accent"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-ot-foreground">Loading Odds Data...</h3>
            <p className="max-w-xs text-[11px] text-ot-muted">
              Connecting to Deep Scan and retrieving available odds from your configured bookmakers.
            </p>
          </div>
        ) : oddsError ? (
          <div
            className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center"
            data-testid="odds-browser-error-state"
          >
            <div className="mb-4 rounded-full bg-red-500/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-red-500"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-ot-foreground">Error Loading Odds</h3>
            <p className="max-w-xs text-[11px] text-ot-muted">{oddsError}</p>
          </div>
        ) : !hasData ? (
          <div
            className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center"
            data-testid="odds-browser-empty-state"
          >
            <div className="mb-4 rounded-full bg-ot-accent/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-ot-accent"
              >
                <path d="M3 3v18h18" />
                <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-ot-foreground">No Odds Data Available</h3>
            <p className="max-w-xs text-[11px] text-ot-muted">
              The odds browser displays data from Deep Scan. Run a scan to populate the browser with
              available odds from your configured bookmakers.
            </p>
          </div>
        ) : !hasFilteredData ? (
          <div
            className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-lg border border-ot-border bg-ot-surface/50 p-8 text-center"
            data-testid="odds-browser-no-filtered-results"
          >
            <div className="mb-4 rounded-full bg-ot-muted/10 p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-ot-muted"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-ot-foreground">No Matching Results</h3>
            <p className="max-w-xs text-[11px] text-ot-muted">
              No odds match your current filter criteria. Try clearing some filters to see more
              results.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-4 rounded-md bg-ot-accent/10 px-4 py-2 text-[11px] font-medium text-ot-accent hover:bg-ot-accent/20"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="relative h-full min-h-[400px] overflow-hidden rounded-lg border border-ot-border bg-ot-surface">
            {/* Story 8.2: Table with comparison panel overlay (docked mode) */}
            <div className={cn(
              'h-full transition-all duration-200',
              hasSelection && comparisonDisplayMode === 'docked' && 'pr-[350px]'
            )}>
              <div className="h-full p-3">
                <OddsBrowserTable
                  rows={rows}
                  selectedOutcomeId={selectedOutcomeId}
                  onSelectOutcome={handleSelectOutcome}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </div>
            </div>

            {/* Story 8.2: Docked comparison panel */}
            {hasSelection && comparisonDisplayMode === 'docked' && selectedRow && (
              <div 
                className={cn(
                  'absolute right-0 top-0 h-full w-[350px] border-l border-ot-border',
                  'transform transition-transform duration-200 ease-out'
                )}
                data-testid="odds-comparison-panel-docked"
              >
                <OddsComparisonPanel
                  selectedRow={selectedRow}
                  isPinned={isComparisonPinned}
                  displayMode={comparisonDisplayMode}
                  onTogglePin={toggleComparisonPin}
                  onChangeDisplayMode={setComparisonDisplayMode}
                  onClose={closeComparison}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      {hasData && (
        <div className="mt-3 flex items-center justify-between text-[10px] text-ot-muted">
          <span>
            Showing {rows.length} of {rawOddsRows.length} odds
          </span>
          <span>
            {sports.length} sports · {leagues.length} leagues · {bookmakers.length} bookmakers
          </span>
        </div>
      )}

      {/* Story 8.2: Floating comparison panel (modal overlay) */}
      {hasSelection && comparisonDisplayMode === 'floating' && selectedRow && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          data-testid="odds-comparison-panel-floating"
          onClick={(e) => {
            // Close when clicking backdrop (outside panel)
            if (e.target === e.currentTarget) {
              closeComparison()
            }
          }}
        >
          <div 
            className={cn(
              'w-[500px] max-h-[85vh] overflow-hidden',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            <OddsComparisonPanel
              selectedRow={selectedRow}
              isPinned={isComparisonPinned}
              displayMode={comparisonDisplayMode}
              onTogglePin={toggleComparisonPin}
              onChangeDisplayMode={setComparisonDisplayMode}
              onClose={closeComparison}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default OddsBrowser
