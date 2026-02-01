import * as React from 'react'
import { format, parseISO } from 'date-fns'

import type { ArbitrageOpportunity } from '../../../../../shared/types'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { copyAndAdvanceCurrentOpportunity } from './copyAndAdvance'
import { sortOpportunities } from './sortOpportunities'
import type { FeedSortDirection, FeedSortKey } from './stores/feedStore'
import { useFeedStore } from './stores/feedStore'
import { useCalculatorStore } from './stores/calculatorStore'
import { getStalenessInfo } from './staleness'
import { CardRulesWarningIcon } from './CardRulesWarningIcon'
import { CardRulesWarningModal } from './CardRulesWarningModal'

const isServerEnvironment = typeof document === 'undefined'

export interface FeedTableProps {
  opportunities?: ArbitrageOpportunity[]
  initialSortBy?: FeedSortKey
  initialSortDirection?: FeedSortDirection
  /**
   * Epoch milliseconds used to compute staleness.
   * When omitted, Date.now() is used.
   */
  stalenessNow?: number
}

const ROW_HEIGHT_PX = 40
const VIRTUALIZATION_THRESHOLD = 50
const VISIBLE_WINDOW_ROWS = 40
const OVERSCAN_ROWS = 8

function formatTime(opportunity: ArbitrageOpportunity): string {
  const source = opportunity.event.date || opportunity.foundAt

  try {
    const date = parseISO(source)
    return format(date, 'HH:mm')
  } catch {
    return source
  }
}

function formatRoi(roi: number): string {
  return `${(roi * 100).toFixed(1)}%`
}

/**
 * Story 7.8: Get trend indicator for odds movement
 */
function getTrendIndicator(trend: string | undefined): { icon: string; label: string; colorClass: string } {
  switch (trend) {
    case 'improving':
      return { icon: '↑', label: 'Improving', colorClass: 'text-emerald-400' }
    case 'worsening':
      return { icon: '↓', label: 'Worsening', colorClass: 'text-rose-400' }
    case 'stable':
    default:
      return { icon: '→', label: 'Stable', colorClass: 'text-ot-muted' }
  }
}

function getAriaSort(sortBy: FeedSortKey, current: FeedSortKey, direction: FeedSortDirection): React.AriaAttributes['aria-sort'] {
  if (sortBy !== current) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

export function FeedTable({
  opportunities = [],
  initialSortBy = 'time',
  initialSortDirection = 'asc',
  stalenessNow
}: FeedTableProps): React.JSX.Element {
  const [sortBy, setSortBy] = React.useState<FeedSortKey>(initialSortBy)
  const [sortDirection, setSortDirection] =
    React.useState<FeedSortDirection>(initialSortDirection)
  const [scrollOffset, setScrollOffset] = React.useState(0)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)
  const effectiveNow = stalenessNow ?? Date.now()
  const selectedOpportunityId = useFeedStore((state) => state.selectedOpportunityId)
  const selectedOpportunityIndex = useFeedStore(
    (state) => state.selectedOpportunityIndex
  )
  const processedFromStore = useFeedStore((state) => state.processedOpportunityIds)
  const processedOpportunityIds = isServerEnvironment
    ? useFeedStore.getState().processedOpportunityIds
    : processedFromStore
  const setSelectedOpportunityId = useFeedStore((state) => state.setSelectedOpportunityId)
  const moveSelectionByOffset = useFeedStore((state) => state.moveSelectionByOffset)
  const setSortGlobal = useFeedStore((state) => state.setSort)

  const sorted = React.useMemo(
    () => sortOpportunities(opportunities, sortBy, sortDirection),
    [opportunities, sortBy, sortDirection]
  )

  const totalCount = sorted.length
  const virtualizationEnabled = totalCount > VIRTUALIZATION_THRESHOLD

  const baseWindow = virtualizationEnabled ? VISIBLE_WINDOW_ROWS : totalCount
  const visibleWindow = Math.max(0, baseWindow)

  const startIndex = virtualizationEnabled
    ? Math.max(0, Math.min(totalCount - visibleWindow, Math.floor(scrollOffset / ROW_HEIGHT_PX)))
    : 0
  const endIndex = virtualizationEnabled
    ? Math.min(totalCount, startIndex + visibleWindow + OVERSCAN_ROWS)
    : totalCount

  const visibleOpportunities = sorted.slice(startIndex, endIndex)
  const totalHeight = virtualizationEnabled ? totalCount * ROW_HEIGHT_PX : undefined
  const offsetY = virtualizationEnabled ? startIndex * ROW_HEIGHT_PX : 0

  const effectiveSelectedId = React.useMemo(() => {
    if (sorted.length === 0) {
      return null
    }

    if (selectedOpportunityId) {
      const found = sorted.find((opportunity) => opportunity.id === selectedOpportunityId)
      if (found) {
        return selectedOpportunityId
      }
    }

    if (
      selectedOpportunityIndex != null &&
      selectedOpportunityIndex >= 0 &&
      selectedOpportunityIndex < sorted.length
    ) {
      const candidate = sorted[selectedOpportunityIndex]
      if (candidate) {
        return candidate.id
      }
    }

    return sorted[0]?.id ?? null
  }, [sorted, selectedOpportunityId, selectedOpportunityIndex])

  const handleRowSelect = (id: string, index: number): void => {
    setSelectedOpportunityId(id, index)
  }

  const handleSortChange = (key: FeedSortKey): void => {
    setSortGlobal(key)
    setSortBy((currentSort) => {
      if (currentSort === key) {
        setSortDirection((currentDirection) =>
          currentDirection === 'asc' ? 'desc' : 'asc'
        )
        return currentSort
      }

      setSortDirection(key === 'roi' ? 'desc' : 'asc')
      return key
    })
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    if (!virtualizationEnabled) return
    setScrollOffset(event.currentTarget.scrollTop)
  }

  const ensureIndexVisible = React.useCallback(
    (index: number | null) => {
      const container = scrollContainerRef.current

      if (!container) return
      if (index == null || index < 0 || index >= sorted.length) return

      const rowTop = index * ROW_HEIGHT_PX
      const rowBottom = rowTop + ROW_HEIGHT_PX
      const { scrollTop, clientHeight } = container

      let nextScrollTop = scrollTop

      if (rowTop < scrollTop) {
        nextScrollTop = rowTop
      } else if (rowBottom > scrollTop + clientHeight) {
        nextScrollTop = rowBottom - clientHeight
      }

      if (nextScrollTop !== scrollTop) {
        container.scrollTop = nextScrollTop
      }
    },
    [sorted.length]
  )

  const openCalculator = useCalculatorStore((state) => state.openCalculator)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!Array.isArray(sorted) || sorted.length === 0) {
        return
      }

      event.preventDefault()

      const offset = event.key === 'ArrowDown' ? 1 : -1
      const visibleIds = sorted.map((opportunity) => opportunity.id)

      moveSelectionByOffset(offset, visibleIds)

      const { selectedOpportunityIndex: nextIndex } = useFeedStore.getState()
      ensureIndexVisible(nextIndex ?? null)
      return
    }

    if (event.key === 'Enter') {
      if (!Array.isArray(sorted) || sorted.length === 0) {
        return
      }

      event.preventDefault()

      void copyAndAdvanceCurrentOpportunity().then(() => {
        const { selectedOpportunityIndex: nextIndex } = useFeedStore.getState()
        ensureIndexVisible(nextIndex ?? null)
      })
      return
    }

    // Story 8.3: Calculator keyboard shortcut (only if no modifier keys)
    if ((event.key === 'c' || event.key === 'C') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (!Array.isArray(sorted) || sorted.length === 0) {
        return
      }

      event.preventDefault()

      const { selectedOpportunityId } = useFeedStore.getState()
      if (selectedOpportunityId) {
        const opportunity = sorted.find((o) => o.id === selectedOpportunityId)
        if (opportunity) {
          openCalculator(opportunity)
        }
      }
    }
  }

  return (
    <div
      className="flex h-full flex-col"
      data-testid="feed-table"
      data-virtualized={virtualizationEnabled ? 'true' : 'false'}
    >
      <div className="feed-table-header mb-3">
        <button
          type="button"
          className={cn(
            'mr-3 flex items-center gap-1.5 text-left transition-colors duration-150',
            sortBy === 'time' ? 'text-ot-foreground' : 'text-ot-muted hover:text-ot-foreground-secondary'
          )}
          aria-label="Sort by time"
          aria-sort={getAriaSort(sortBy, 'time', sortDirection)}
          data-testid="feed-header-time"
          onClick={() => handleSortChange('time')}
        >
          <span className="w-12">Time</span>
          <span aria-hidden="true" className={cn(
            'transition-transform duration-150',
            sortBy === 'time' ? 'opacity-100' : 'opacity-0'
          )}>
            {sortBy === 'time' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲'}
          </span>
        </button>
        <button
          type="button"
          className="mr-3 flex flex-1 items-center gap-1 text-left text-ot-muted"
          aria-disabled="true"
          data-testid="feed-header-event"
        >
          <span>Event</span>
        </button>
        {/* Story 7.8: Movement column header */}
        <button
          type="button"
          className={cn(
            'mr-3 flex items-center gap-1.5 text-right transition-colors duration-150',
            sortBy === 'trend' ? 'text-ot-foreground' : 'text-ot-muted hover:text-ot-foreground-secondary'
          )}
          aria-label="Sort by trend"
          aria-sort={getAriaSort(sortBy, 'trend', sortDirection)}
          data-testid="feed-header-trend"
          onClick={() => handleSortChange('trend')}
        >
          <span className="w-16">Move</span>
          <span aria-hidden="true" className={cn(
            'transition-transform duration-150',
            sortBy === 'trend' ? 'opacity-100' : 'opacity-0'
          )}>
            {sortBy === 'trend' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲'}
          </span>
        </button>
        <button
          type="button"
          className={cn(
            'ml-auto flex items-center gap-1.5 text-right transition-colors duration-150',
            sortBy === 'roi' ? 'text-ot-accent' : 'text-ot-muted hover:text-ot-foreground-secondary'
          )}
          aria-label="Sort by ROI"
          aria-sort={getAriaSort(sortBy, 'roi', sortDirection)}
          data-testid="feed-header-roi"
          onClick={() => handleSortChange('roi')}
        >
          <span className="w-14">ROI</span>
          <span aria-hidden="true" className={cn(
            'transition-transform duration-150',
            sortBy === 'roi' ? 'opacity-100' : 'opacity-0'
          )}>
            {sortBy === 'roi' ? (sortDirection === 'asc' ? '▲' : '▼') : '▲'}
          </span>
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto outline-none"
        data-testid="feed-scroll-container"
        tabIndex={totalCount > 0 ? 0 : -1}
        role="listbox"
        aria-label="Arbitrage opportunities"
        aria-activedescendant={
          effectiveSelectedId != null ? `feed-row-${effectiveSelectedId}` : undefined
        }
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      >
        {totalCount === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-ot-muted animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 opacity-50">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-sm">No opportunities yet</div>
            <div className="text-xs opacity-70">Configure a provider to start the feed</div>
          </div>
        )}

        {totalCount > 0 && virtualizationEnabled && (
          <div style={{ height: totalHeight }}>
            <div
              className="absolute left-0 right-0"
              style={{ transform: `translateY(${offsetY}px)` }}
            >
              {visibleOpportunities.map((opportunity, index) => {
                const rowIndex = startIndex + index

                const isSelected = opportunity.id === effectiveSelectedId
                const isProcessed = processedOpportunityIds.has(opportunity.id)

                return (
                  <FeedRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    stalenessNow={effectiveNow}
                    isSelected={isSelected}
                    isProcessed={isProcessed}
                    onSelect={() => handleRowSelect(opportunity.id, rowIndex)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {totalCount > 0 && !virtualizationEnabled && (
          <div>
            {visibleOpportunities.map((opportunity, index) => {
              const isSelected = opportunity.id === effectiveSelectedId
              const isProcessed = processedOpportunityIds.has(opportunity.id)

              return (
                <FeedRow
                  key={opportunity.id}
                  opportunity={opportunity}
                  stalenessNow={effectiveNow}
                  isSelected={isSelected}
                  isProcessed={isProcessed}
                  onSelect={() => handleRowSelect(opportunity.id, index)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface FeedRowProps {
  opportunity: ArbitrageOpportunity
  stalenessNow?: number
}

/**
 * Get short display label for provider in badge.
 */
function getProviderBadgeLabel(providerId: string | undefined): string | null {
  if (!providerId) return null
  switch (providerId) {
    case 'odds-api-io':
      return 'OA.io'
    case 'the-odds-api':
      return 'TOA'
    default:
      return providerId.slice(0, 4)
  }
}

/**
 * Get human-friendly display name for provider (used in accessibility labels).
 */
function getProviderDisplayName(providerId: string): string {
  switch (providerId) {
    case 'odds-api-io':
      return 'Odds-API.io'
    case 'the-odds-api':
      return 'The-Odds-API.com'
    default:
      return providerId
  }
}

interface FeedRowExternalProps extends FeedRowProps {
  isSelected: boolean
  isProcessed: boolean
  onSelect: () => void
}

function FeedRow({
  opportunity,
  stalenessNow,
  isSelected,
  isProcessed,
  onSelect
}: FeedRowExternalProps): React.JSX.Element {
  const timeLabel = formatTime(opportunity)
  const eventLabel = opportunity.event.name
  const roiLabel = formatRoi(opportunity.roi)
  const nowMs = stalenessNow ?? Date.now()
  const { label: stalenessLabel, isStale } = getStalenessInfo(opportunity, nowMs)
  const combinedTimeLabel =
    stalenessLabel.length > 0 ? `${timeLabel} · ${stalenessLabel}` : timeLabel

  // Provider source badge (Story 5.1)
  const providerBadge = getProviderBadgeLabel(opportunity.providerId)

  // Merged provider badge (Story 5.2)
  const isMerged = opportunity.mergedFrom && opportunity.mergedFrom.length > 1
  const mergedBadgeLabel = isMerged
    ? opportunity.mergedFrom!.map(getProviderBadgeLabel).filter(Boolean).join('+')
    : null

  // Cross-provider badge (Story 5.4)
  const isCrossProvider = opportunity.isCrossProvider === true
  const isDeepScan = opportunity.source === 'deepScan'

  // Story 6.5: Card rules warning
  const hasCardRulesWarning = opportunity.cardRulesWarning?.mismatch === true
  const [cardRulesModalOpen, setCardRulesModalOpen] = React.useState(false)

  const openCalculator = useCalculatorStore((state) => state.openCalculator)
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false)

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    setContextMenuOpen(true)
  }

  const handleCalculateClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    openCalculator(opportunity)
  }

  const handleContextMenuCalculate = (): void => {
    openCalculator(opportunity)
    setContextMenuOpen(false)
  }

  const handleCardRulesWarningClick = (): void => {
    setCardRulesModalOpen(true)
  }

  return (
    <div
      id={`feed-row-${opportunity.id}`}
      className={cn(
        'feed-row',
        isStale && 'stale',
        isProcessed && 'processed',
        isSelected && 'selected'
      )}
      data-testid="feed-row"
      data-staleness={isStale ? 'stale' : 'fresh'}
      data-state={isSelected ? 'selected' : 'idle'}
      data-processed={isProcessed ? 'true' : 'false'}
      data-provider={opportunity.providerId ?? 'unknown'}
      data-merged={isMerged ? 'true' : 'false'}
      data-cross-provider={isCrossProvider ? 'true' : 'false'}
      data-deep-scan={isDeepScan ? 'true' : 'false'}
      data-card-rules-warning={hasCardRulesWarning ? 'true' : 'false'}
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      role="option"
      aria-selected={isSelected ? 'true' : 'false'}
    >
      <div
        className="w-[72px] shrink-0 text-ot-muted font-mono text-xs"
        data-testid="feed-cell-time"
      >
        {combinedTimeLabel}
      </div>
      {isProcessed && (
        <div
          className="mx-1 flex h-5 w-5 items-center justify-center rounded-full bg-ot-success text-white shadow-sm"
          data-testid="feed-row-processed-badge"
          aria-label="Processed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      {/* Cross-provider badge (Story 5.4) - highest priority badge */}
      {isCrossProvider && (
        <div
          className="ot-badge ot-badge-cross-provider animate-slide-in"
          data-testid="feed-row-cross-provider-badge"
          aria-label="Cross-provider arbitrage combining odds from multiple feeds"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Cross-Feed
        </div>
      )}
      {/* Deep scan badge (Story 7.1) */}
      {!isCrossProvider && isDeepScan && (
        <div
          className="ot-badge ot-badge-deep-scan animate-slide-in"
          data-testid="feed-row-deep-scan-badge"
          aria-label="Deep scan result"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Deep Scan
        </div>
      )}
      {/* Merged provider badge (Story 5.2) - only show if not cross-provider */}
      {!isCrossProvider && !isDeepScan && isMerged && mergedBadgeLabel && (
        <div
          className="ot-badge ot-badge-merged"
          data-testid="feed-row-merged-badge"
          aria-label={`Merged from: ${opportunity.mergedFrom?.map(id => getProviderDisplayName(id)).join(' + ')}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {mergedBadgeLabel}
        </div>
      )}
      {/* Single provider source badge (Story 5.1) - only show if not merged and not cross-provider */}
      {!isCrossProvider && !isDeepScan && !isMerged && providerBadge && (
        <div
          className="ot-badge ot-badge-provider"
          data-testid="feed-row-provider-badge"
          aria-label={`Source: ${opportunity.providerId}`}
        >
          {providerBadge}
        </div>
      )}
      {/* Story 6.5: Card rules warning icon */}
      {hasCardRulesWarning && opportunity.cardRulesWarning && (
        <div className="mx-1" data-testid="feed-row-card-rules-warning">
          <CardRulesWarningIcon 
            warning={opportunity.cardRulesWarning} 
            onClick={handleCardRulesWarningClick}
          />
        </div>
      )}
      <div
        className="mx-2 min-w-0 flex-1 truncate text-ot-foreground font-medium"
        data-testid="feed-cell-event"
        title={eventLabel}
      >
        {eventLabel}
      </div>
      {/* Story 7.8: Movement column showing odds trend */}
      <div
        className="w-[64px] shrink-0 text-right"
        data-testid="feed-cell-trend"
        aria-label={`Odds trend: ${getTrendIndicator(opportunity.oddsTrend).label}`}
      >
        <span className={cn(
          'inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold transition-all duration-200',
          getTrendIndicator(opportunity.oddsTrend).colorClass,
          opportunity.oddsTrend === 'improving' && 'bg-ot-success-dim',
          opportunity.oddsTrend === 'worsening' && 'bg-ot-error-dim',
          opportunity.oddsTrend === 'stable' && 'bg-ot-surface-hover'
        )}>
          {getTrendIndicator(opportunity.oddsTrend).icon}
        </span>
      </div>
      <div
        className="w-[64px] shrink-0 text-right font-mono font-bold text-ot-accent text-sm"
        data-testid="feed-cell-roi"
      >
        {roiLabel}
      </div>

      {/* Calculate Stakes Button - visible on hover or when selected */}
      <div
        className={cn(
          'absolute right-[70px] top-1/2 -translate-y-1/2 opacity-0 transition-opacity',
          (isSelected || contextMenuOpen) && 'opacity-100',
          'group-hover:opacity-100'
        )}
      >
        <Button
          variant="primary"
          size="sm"
          onClick={handleCalculateClick}
          className="h-7 px-3 text-[10px] font-semibold shadow-ot-glow"
          data-testid="calculate-stakes-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 mr-1">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="16" y1="14" x2="16" y2="14.01" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
          </svg>
          Calc
        </Button>
      </div>

      {/* Context Menu */}
      {contextMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenuOpen(false)}
          />
          <div
            className="absolute right-2 top-full z-50 mt-1 w-44 rounded-lg border border-ot-border bg-ot-surface-elevated py-1 shadow-ot-lg animate-slide-in"
            data-testid="context-menu"
          >
            <button
              type="button"
              onClick={handleContextMenuCalculate}
              className="w-full px-3 py-2 text-left text-xs text-ot-foreground hover:bg-ot-surface-hover flex items-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ot-accent">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="16" y1="14" x2="16" y2="14.01" />
                <path d="M8 14h.01" />
                <path d="M12 14h.01" />
              </svg>
              Calculate Stakes
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect()
                void copyAndAdvanceCurrentOpportunity()
                setContextMenuOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-xs text-ot-foreground hover:bg-ot-surface-hover flex items-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ot-success">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy Signal
            </button>
          </div>
        </>
      )}

      {/* Story 6.5: Card Rules Warning Modal */}
      <CardRulesWarningModal
        warning={opportunity.cardRulesWarning ?? null}
        isOpen={cardRulesModalOpen}
        onClose={() => setCardRulesModalOpen(false)}
      />
    </div>
  )
}

export default FeedTable
