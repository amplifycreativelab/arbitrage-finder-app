import * as React from 'react'
import { format, parseISO } from 'date-fns'

import type { ArbitrageOpportunity } from '../../../../../shared/types'
import { cn } from '../../lib/utils'
import type { FeedSortDirection, FeedSortKey } from './stores/feedStore'

export interface FeedTableProps {
  opportunities?: ArbitrageOpportunity[]
  initialSortBy?: FeedSortKey
  initialSortDirection?: FeedSortDirection
}

const ROW_HEIGHT_PX = 40
const VIRTUALIZATION_THRESHOLD = 50
const VISIBLE_WINDOW_ROWS = 40
const OVERSCAN_ROWS = 8

function getTimeValue(opportunity: ArbitrageOpportunity): number {
  const source = opportunity.event.date || opportunity.foundAt
  const value = Date.parse(source)
  return Number.isNaN(value) ? 0 : value
}

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

function sortOpportunities(
  opportunities: ArbitrageOpportunity[] | undefined | null,
  sortBy: FeedSortKey,
  direction: FeedSortDirection
): ArbitrageOpportunity[] {
  if (!Array.isArray(opportunities)) {
    return []
  }

  const factor = direction === 'asc' ? 1 : -1

  return [...opportunities].sort((a, b) => {
    if (sortBy === 'roi') {
      return (a.roi - b.roi) * factor
    }

    return (getTimeValue(a) - getTimeValue(b)) * factor
  })
}

function getAriaSort(sortBy: FeedSortKey, current: FeedSortKey, direction: FeedSortDirection): React.AriaAttributes['aria-sort'] {
  if (sortBy !== current) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

export function FeedTable({
  opportunities = [],
  initialSortBy = 'time',
  initialSortDirection = 'asc'
}: FeedTableProps): React.JSX.Element {
  const [sortBy, setSortBy] = React.useState<FeedSortKey>(initialSortBy)
  const [sortDirection, setSortDirection] =
    React.useState<FeedSortDirection>(initialSortDirection)
  const [scrollOffset, setScrollOffset] = React.useState(0)

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

  const handleSortChange = (key: FeedSortKey): void => {
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
        className="relative flex-1 overflow-y-auto"
        data-testid="feed-scroll-container"
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
              {visibleOpportunities.map((opportunity) => (
                <FeedRow key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </div>
        )}

        {totalCount > 0 && !virtualizationEnabled && (
          <div>
            {visibleOpportunities.map((opportunity) => (
              <FeedRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface FeedRowProps {
  opportunity: ArbitrageOpportunity
}

function FeedRow({ opportunity }: FeedRowProps): React.JSX.Element {
  const timeLabel = formatTime(opportunity)
  const eventLabel = opportunity.event.name
  const roiLabel = formatRoi(opportunity.roi)

  return (
    <div
      className="flex items-center justify-between border-b border-white/5 py-1.5 text-[11px]"
      data-testid="feed-row"
    >
      <div
        className="w-[72px] shrink-0 text-ot-foreground/70"
        data-testid="feed-cell-time"
      >
        {timeLabel}
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
