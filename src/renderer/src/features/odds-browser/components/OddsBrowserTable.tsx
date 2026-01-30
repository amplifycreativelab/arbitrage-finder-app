import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { cn } from '../../../lib/utils'
import type { OddsBrowserRow, OddsBrowserTableProps } from '../types'

// Story 8.2: Keyboard shortcut constants
const SELECTION_KEYS = ['Enter', ' '] as const

const ROW_HEIGHT_PX = 40
const VIRTUALIZATION_THRESHOLD = 50
const VISIBLE_WINDOW_ROWS = 40
const OVERSCAN_ROWS = 8

function formatTimeAgo(timestamp: string): string {
  try {
    const date = parseISO(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.floor(diffHours / 24)}d`
  } catch {
    return '-'
  }
}

function formatOdds(odds: number): string {
  return odds.toFixed(2)
}

function formatEventTime(startTime: string): string {
  try {
    const date = parseISO(startTime)
    return format(date, 'MMM d HH:mm')
  } catch {
    return '-'
  }
}

function getAriaSort(
  column: string,
  currentColumn: string | null,
  direction: 'asc' | 'desc'
): React.AriaAttributes['aria-sort'] {
  if (column !== currentColumn) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

export function OddsBrowserTable({
  rows,
  selectedOutcomeId,
  onSelectOutcome,
  sortColumn,
  sortDirection,
  onSort
}: OddsBrowserTableProps): React.JSX.Element {
  const [scrollOffset, setScrollOffset] = React.useState(0)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)

  const totalCount = rows.length
  const virtualizationEnabled = totalCount > VIRTUALIZATION_THRESHOLD

  const baseWindow = virtualizationEnabled ? VISIBLE_WINDOW_ROWS : totalCount
  const visibleWindow = Math.max(0, baseWindow)

  const startIndex = virtualizationEnabled
    ? Math.max(0, Math.min(totalCount - visibleWindow, Math.floor(scrollOffset / ROW_HEIGHT_PX)))
    : 0
  const endIndex = virtualizationEnabled
    ? Math.min(totalCount, startIndex + visibleWindow + OVERSCAN_ROWS)
    : totalCount

  const visibleRows = rows.slice(startIndex, endIndex)
  const totalHeight = virtualizationEnabled ? totalCount * ROW_HEIGHT_PX : undefined
  const offsetY = virtualizationEnabled ? startIndex * ROW_HEIGHT_PX : 0

  const handleRowSelect = (id: string): void => {
    onSelectOutcome(id)
  }

  const handleSort = (column: typeof sortColumn): void => {
    onSort(column)
  }

  const handleScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    if (!virtualizationEnabled) return
    setScrollOffset(event.currentTarget.scrollTop)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!rows.length) return

    const currentIndex = selectedOutcomeId ? rows.findIndex((r) => r.id === selectedOutcomeId) : -1

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : currentIndex
      if (nextIndex >= 0) {
        onSelectOutcome(rows[nextIndex].id)
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0
      if (nextIndex >= 0) {
        onSelectOutcome(rows[nextIndex].id)
      }
    } else if (SELECTION_KEYS.includes(event.key as typeof SELECTION_KEYS[number])) {
      // Story 8.2: Enter or Space opens comparison for selected row
      event.preventDefault()
      if (selectedOutcomeId) {
        // Re-select to trigger comparison panel (idempotent but signals intent)
        onSelectOutcome(selectedOutcomeId)
      } else if (currentIndex >= 0) {
        onSelectOutcome(rows[currentIndex].id)
      }
    }
  }

  return (
    <div className="flex h-full flex-col" data-testid="odds-browser-table">
      {/* Header */}
      <div className="mb-2 flex items-center border-b border-ot-border pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ot-muted">
        <button
          type="button"
          className={cn(
            'mr-2 flex items-center gap-1 text-left',
            sortColumn === 'sport' ? 'text-ot-foreground' : 'text-ot-muted'
          )}
          onClick={() => handleSort('sport')}
          aria-sort={getAriaSort('sport', sortColumn, sortDirection)}
        >
          <span className="w-16">Sport</span>
          <span aria-hidden="true">{sortColumn === 'sport' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
        <button
          type="button"
          className={cn(
            'mr-2 flex items-center gap-1 text-left',
            sortColumn === 'league' ? 'text-ot-foreground' : 'text-ot-muted'
          )}
          onClick={() => handleSort('league')}
          aria-sort={getAriaSort('league', sortColumn, sortDirection)}
        >
          <span className="w-20">League</span>
          <span aria-hidden="true">{sortColumn === 'league' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
        <button
          type="button"
          className={cn(
            'mr-2 flex flex-1 items-center gap-1 text-left',
            sortColumn === 'eventTime' ? 'text-ot-foreground' : 'text-ot-muted'
          )}
          onClick={() => handleSort('eventTime')}
          aria-sort={getAriaSort('eventTime', sortColumn, sortDirection)}
        >
          <span>Event</span>
          <span aria-hidden="true">{sortColumn === 'eventTime' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
        <button
          type="button"
          className={cn(
            'mr-2 flex items-center gap-1 text-left',
            sortColumn === 'marketType' ? 'text-ot-foreground' : 'text-ot-muted'
          )}
          onClick={() => handleSort('marketType')}
          aria-sort={getAriaSort('marketType', sortColumn, sortDirection)}
        >
          <span className="w-24">Market</span>
          <span aria-hidden="true">{sortColumn === 'marketType' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
        <div className="mr-2 w-20 text-left">Bookmaker</div>
        <button
          type="button"
          className={cn(
            'mr-2 flex items-center gap-1 text-right',
            sortColumn === 'odds' ? 'text-ot-foreground' : 'text-ot-muted'
          )}
          onClick={() => handleSort('odds')}
          aria-sort={getAriaSort('odds', sortColumn, sortDirection)}
        >
          <span className="w-12">Odds</span>
          <span aria-hidden="true">{sortColumn === 'odds' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
        <div className="w-12 text-right">Age</div>
      </div>

      {/* Table Body */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto outline-none"
        data-testid="odds-browser-scroll-container"
        tabIndex={totalCount > 0 ? 0 : -1}
        role="listbox"
        aria-label="Odds browser"
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      >
        {totalCount === 0 && (
          <div className="flex h-full items-center justify-center text-[11px] text-ot-muted">
            No odds data available. Run a Deep Scan to populate.
          </div>
        )}

        {totalCount > 0 && virtualizationEnabled && (
          <div style={{ height: totalHeight }}>
            <div className="absolute left-0 right-0" style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleRows.map((row) => (
                <OddsBrowserRowComponent
                  key={row.id}
                  row={row}
                  isSelected={row.id === selectedOutcomeId}
                  onSelect={() => handleRowSelect(row.id)}
                />
              ))}
            </div>
          </div>
        )}

        {totalCount > 0 && !virtualizationEnabled && (
          <div>
            {visibleRows.map((row) => (
              <OddsBrowserRowComponent
                key={row.id}
                row={row}
                isSelected={row.id === selectedOutcomeId}
                onSelect={() => handleRowSelect(row.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface OddsBrowserRowComponentProps {
  row: OddsBrowserRow
  isSelected: boolean
  onSelect: () => void
}

function OddsBrowserRowComponent({
  row,
  isSelected,
  onSelect
}: OddsBrowserRowComponentProps): React.JSX.Element {
  const timeAgo = formatTimeAgo(row.lastUpdated)
  const eventTime = formatEventTime(row.event.startTime)
  const oddsFormatted = formatOdds(row.odds)
  const eventDisplay = `${row.event.home} vs ${row.event.away}`

  return (
    <div
      className={cn(
        // Story 8.2: Enhanced selection styling with accent border/ring
        'flex cursor-pointer items-center border-b border-ot-border py-2 text-[11px] transition-colors',
        isSelected 
          ? 'bg-ot-accent/10 ring-1 ring-inset ring-ot-accent' 
          : 'hover:bg-black/5'
      )}
      data-testid="odds-browser-row"
      data-selected={isSelected ? 'true' : 'false'}
      onClick={onSelect}
      role="option"
      aria-selected={isSelected ? 'true' : 'false'}
    >
      <div className="w-16 shrink-0 truncate text-ot-muted" title={row.sport}>
        {row.sport}
      </div>
      <div className="w-20 shrink-0 truncate text-ot-muted" title={row.league}>
        {row.league}
      </div>
      <div className="mr-2 min-w-0 flex-1 truncate" title={eventDisplay}>
        <span className="text-ot-foreground">{eventDisplay}</span>
        <span className="ml-2 text-ot-muted">({eventTime})</span>
      </div>
      <div className="w-24 shrink-0 truncate" title={row.marketType}>
        {row.marketType}
      </div>
      <div className="w-20 shrink-0 text-ot-muted" title={row.bookmaker}>
        {row.bookmaker}
      </div>
      <div className="mr-2 w-12 shrink-0 text-right font-semibold text-ot-accent">{oddsFormatted}</div>
      <div className="w-12 shrink-0 text-right text-ot-muted text-[10px]">{timeAgo}</div>
    </div>
  )
}

export default OddsBrowserTable
