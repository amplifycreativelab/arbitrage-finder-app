import * as React from 'react'
import { format, parseISO } from 'date-fns'

import type { ArbitrageOpportunity } from '../../../../../shared/types'
import { cn } from '../../lib/utils'
import { copyAndAdvanceCurrentOpportunity } from './copyAndAdvance'
import { sortOpportunities } from './sortOpportunities'
import type { FeedSortDirection, FeedSortKey } from './stores/feedStore'
import { useFeedStore } from './stores/feedStore'
import { getStalenessInfo } from './staleness'

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
    }
  }

  return (
    <div
      className="flex h-full flex-col"
      data-testid="feed-table"
      data-virtualized={virtualizationEnabled ? 'true' : 'false'}
    >
      <div className="mb-2 flex items-center border-b border-white/10 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-foreground/60">
        <button
          type="button"
          className={cn(
            'mr-3 flex items-center gap-1 text-left',
            sortBy === 'time' ? 'text-ot-foreground' : 'text-ot-foreground/70'
          )}
          aria-label="Sort by time"
          aria-sort={getAriaSort(sortBy, 'time', sortDirection)}
          data-testid="feed-header-time"
          onClick={() => handleSortChange('time')}
        >
          <span className="w-12">Time</span>
          <span aria-hidden="true">{sortBy === 'time' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
        <button
          type="button"
          className={cn(
            'mr-3 flex flex-1 items-center gap-1 text-left',
            sortBy === 'time' ? 'text-ot-foreground' : 'text-ot-foreground/70'
          )}
          aria-disabled="true"
          data-testid="feed-header-event"
        >
          <span>Event</span>
        </button>
        <button
          type="button"
          className={cn(
            'ml-auto flex items-center gap-1 text-right',
            sortBy === 'roi' ? 'text-ot-foreground' : 'text-ot-foreground/70'
          )}
          aria-label="Sort by ROI"
          aria-sort={getAriaSort(sortBy, 'roi', sortDirection)}
          data-testid="feed-header-roi"
          onClick={() => handleSortChange('roi')}
        >
          <span className="w-14">ROI</span>
          <span aria-hidden="true">{sortBy === 'roi' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
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
          <div className="flex h-full items-center justify-center text-[11px] text-ot-foreground/50">
            No opportunities yet. Configure a provider to start the feed.
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

                return (
                  <FeedRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    stalenessNow={effectiveNow}
                    isSelected={opportunity.id === effectiveSelectedId}
                    onSelect={() => handleRowSelect(opportunity.id, rowIndex)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {totalCount > 0 && !virtualizationEnabled && (
          <div>
            {visibleOpportunities.map((opportunity, index) => (
              <FeedRow
                key={opportunity.id}
                opportunity={opportunity}
                stalenessNow={effectiveNow}
                isSelected={opportunity.id === effectiveSelectedId}
                onSelect={() => handleRowSelect(opportunity.id, index)}
              />
            ))}
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

function FeedRow({
  opportunity,
  stalenessNow,
  isSelected,
  onSelect
}: FeedRowProps & { isSelected: boolean; onSelect: () => void }): React.JSX.Element {
  const timeLabel = formatTime(opportunity)
  const eventLabel = opportunity.event.name
  const roiLabel = formatRoi(opportunity.roi)
  const nowMs = stalenessNow ?? Date.now()
  const { label: stalenessLabel, isStale } = getStalenessInfo(opportunity, nowMs)
  const combinedTimeLabel =
    stalenessLabel.length > 0 ? `${timeLabel} · ${stalenessLabel}` : timeLabel

  return (
    <div
      id={`feed-row-${opportunity.id}`}
      className={cn(
        'flex cursor-pointer items-center justify-between border-b border-white/5 py-1.5 text-[11px]',
        isStale ? 'opacity-50' : '',
        isSelected ? 'bg-ot-accent/10' : 'hover:bg-white/5'
      )}
      data-testid="feed-row"
      data-staleness={isStale ? 'stale' : 'fresh'}
      data-state={isSelected ? 'selected' : 'idle'}
      onClick={onSelect}
      role="option"
      aria-selected={isSelected ? 'true' : 'false'}
    >
      <div
        className="w-[72px] shrink-0 text-ot-foreground/70"
        data-testid="feed-cell-time"
      >
        {combinedTimeLabel}
      </div>
      <div
        className="mx-2 min-w-0 flex-1 truncate text-ot-foreground"
        data-testid="feed-cell-event"
        title={eventLabel}
      >
        {eventLabel}
      </div>
      <div
        className="w-[64px] shrink-0 text-right font-semibold text-ot-accent"
        data-testid="feed-cell-roi"
      >
        {roiLabel}
      </div>
    </div>
  )
}

export default FeedTable
