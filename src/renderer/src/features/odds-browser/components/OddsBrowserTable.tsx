import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { cn } from '../../../lib/utils'
import type { OddsBrowserRow, OddsBrowserTableProps } from '../types'

// Story 8.x: Improved visual design with proper icons
const TrendUpIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
)

const SortIcon = ({ direction, active }: { direction: 'asc' | 'desc'; active: boolean }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={cn('h-3 w-3 transition-opacity', active ? 'opacity-100' : 'opacity-30')}>
    {direction === 'asc' ? (
      <path d="m5 12 7-7 7 7" />
    ) : (
      <path d="m19 12-7 7-7-7" />
    )}
  </svg>
)

// Story 8.x: Enhanced keyboard shortcuts
const SELECTION_KEYS = ['Enter', ' '] as const

const ROW_HEIGHT_PX = 44
const VIRTUALIZATION_THRESHOLD = 50
const VISIBLE_WINDOW_ROWS = 40
const OVERSCAN_ROWS = 8

function formatTimeAgo(timestamp: string): { text: string; isStale: boolean } {
  try {
    const date = parseISO(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return { text: 'just now', isStale: false }
    if (diffMins < 5) return { text: `${diffMins}m ago`, isStale: false }
    if (diffMins < 60) return { text: `${diffMins}m ago`, isStale: diffMins > 10 }
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return { text: `${diffHours}h ago`, isStale: true }
    return { text: `${Math.floor(diffHours / 24)}d ago`, isStale: true }
  } catch {
    return { text: '-', isStale: false }
  }
}

function formatOdds(odds: number): string {
  return odds.toFixed(2)
}

function formatEventTime(startTime: string): { date: string; time: string; isLive: boolean } {
  try {
    const date = parseISO(startTime)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const isLive = diffMs < 0 && diffMs > -3 * 60 * 60 * 1000 // Started within last 3h

    return {
      date: format(date, 'MMM d'),
      time: format(date, 'HH:mm'),
      isLive
    }
  } catch {
    return { date: '-', time: '-', isLive: false }
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

// Sport badge colors
const SPORT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  soccer: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  football: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  basketball: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  tennis: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  baseball: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  hockey: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  default: { bg: 'bg-ot-accent/10', text: 'text-ot-accent', border: 'border-ot-accent/30' }
}

function getSportColor(sport: string): { bg: string; text: string; border: string } {
  const key = sport.toLowerCase()
  return SPORT_COLORS[key] || SPORT_COLORS.default
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
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null)
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
      event.preventDefault()
      if (selectedOutcomeId) {
        onSelectOutcome(selectedOutcomeId)
      } else if (currentIndex >= 0) {
        onSelectOutcome(rows[currentIndex].id)
      }
    }
  }

  // Enhanced header button component
  const HeaderButton = ({
    column,
    label,
    width
  }: {
    column: typeof sortColumn;
    label: string;
    width: string
  }): React.JSX.Element => {
    const isActive = sortColumn === column
    return (
      <button
        type="button"
        className={cn(
          'group flex items-center gap-1.5 rounded px-2 py-1 text-left transition-all',
          'hover:bg-ot-accent/5',
          isActive ? 'text-ot-foreground' : 'text-ot-muted'
        )}
        onClick={() => handleSort(column)}
        aria-sort={getAriaSort(column as string, sortColumn, sortDirection)}
      >
        <span className={width}>{label}</span>
        <SortIcon direction={isActive ? sortDirection : 'desc'} active={isActive} />
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col" data-testid="odds-browser-table">
      {/* Enhanced Header - with gradient background */}
      <div className="mb-1 flex items-center rounded-lg bg-gradient-to-r from-ot-surface via-ot-surface to-transparent px-1 py-2">
        <div className="flex items-center text-[9px] font-bold uppercase tracking-[0.16em]">
          <HeaderButton column="sport" label="Sport" width="w-[70px]" />
          <HeaderButton column="league" label="League" width="w-[100px]" />
          <div className="flex-1">
            <HeaderButton column="eventTime" label="Event" width="flex-1" />
          </div>
          <HeaderButton column="marketType" label="Market" width="w-[100px]" />
          <div className="w-[80px] px-2 text-ot-muted">Bookmaker</div>
          <HeaderButton column="odds" label="Odds" width="w-[60px] text-right" />
          <div className="w-[70px] px-2 text-right text-ot-muted">Updated</div>
        </div>
      </div>

      {/* Table Body with enhanced scrollbar */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'relative flex-1 overflow-y-auto outline-none',
          // Custom scrollbar styling
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-ot-border/50',
          'hover:scrollbar-thumb-ot-border'
        )}
        data-testid="odds-browser-scroll-container"
        tabIndex={totalCount > 0 ? 0 : -1}
        role="listbox"
        aria-label="Odds browser"
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
      >
        {totalCount === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <TrendUpIcon className="mx-auto mb-3 h-8 w-8 text-ot-muted/50" />
              <p className="text-[11px] text-ot-muted">No odds data available.</p>
              <p className="mt-1 text-[10px] text-ot-muted/70">Run a Deep Scan to populate the browser.</p>
            </div>
          </div>
        )}

        {totalCount > 0 && virtualizationEnabled && (
          <div style={{ height: totalHeight }}>
            <div className="absolute left-0 right-0" style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleRows.map((row, idx) => (
                <OddsBrowserRowEnhanced
                  key={row.id}
                  row={row}
                  isSelected={row.id === selectedOutcomeId}
                  isHovered={row.id === hoveredRowId}
                  onSelect={() => handleRowSelect(row.id)}
                  onHover={() => setHoveredRowId(row.id)}
                  onLeave={() => setHoveredRowId(null)}
                  index={startIndex + idx}
                />
              ))}
            </div>
          </div>
        )}

        {totalCount > 0 && !virtualizationEnabled && (
          <div className="space-y-0.5">
            {visibleRows.map((row, idx) => (
              <OddsBrowserRowEnhanced
                key={row.id}
                row={row}
                isSelected={row.id === selectedOutcomeId}
                isHovered={row.id === hoveredRowId}
                onSelect={() => handleRowSelect(row.id)}
                onHover={() => setHoveredRowId(row.id)}
                onLeave={() => setHoveredRowId(null)}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface OddsBrowserRowEnhancedProps {
  row: OddsBrowserRow
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
  index: number
}

function OddsBrowserRowEnhanced({
  row,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
  index
}: OddsBrowserRowEnhancedProps): React.JSX.Element {
  const timeAgo = formatTimeAgo(row.lastUpdated)
  const eventTime = formatEventTime(row.event.startTime)
  const oddsFormatted = formatOdds(row.odds)
  const eventDisplay = `${row.event.home} vs ${row.event.away}`
  const sportColor = getSportColor(row.sport)

  return (
    <div
      className={cn(
        // Base styles
        'group flex cursor-pointer items-center rounded-lg px-2 py-2.5 transition-all duration-150',
        // Alternating background
        index % 2 === 0 ? 'bg-transparent' : 'bg-ot-surface/30',
        // Selection and hover states
        isSelected && 'bg-ot-accent/10 ring-1 ring-inset ring-ot-accent shadow-sm',
        !isSelected && isHovered && 'bg-ot-accent/5 translate-x-0.5',
        !isSelected && !isHovered && 'hover:bg-ot-surface/50'
      )}
      data-testid="odds-browser-row"
      data-selected={isSelected ? 'true' : 'false'}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      role="option"
      aria-selected={isSelected ? 'true' : 'false'}
      style={{ minHeight: `${ROW_HEIGHT_PX}px` }}
    >
      {/* Sport Badge */}
      <div className="w-[70px] shrink-0 px-1">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium',
            sportColor.bg, sportColor.text, sportColor.border
          )}
          title={row.sport}
        >
          {row.sport.slice(0, 6)}
        </span>
      </div>

      {/* League - truncated with tooltip */}
      <div className="w-[100px] shrink-0 px-1">
        <span
          className="block truncate text-[10px] text-ot-muted"
          title={row.league}
        >
          {row.league}
        </span>
      </div>

      {/* Event with time badge */}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        {/* Live indicator or time */}
        <div className="shrink-0">
          {eventTime.isLive ? (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex flex-col items-center rounded bg-ot-surface px-1.5 py-0.5 text-center">
              <span className="text-[8px] font-medium text-ot-muted">{eventTime.date}</span>
              <span className="text-[10px] font-semibold text-ot-foreground">{eventTime.time}</span>
            </span>
          )}
        </div>

        {/* Team names */}
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[11px] font-medium transition-colors',
              isSelected ? 'text-ot-accent' : 'text-ot-foreground group-hover:text-ot-accent'
            )}
            title={eventDisplay}
          >
            {row.event.home}
            <span className="mx-1 text-ot-muted">vs</span>
            {row.event.away}
          </span>
        </div>
      </div>

      {/* Market type */}
      <div className="w-[100px] shrink-0 px-1">
        <span
          className="block truncate rounded bg-ot-border/30 px-1.5 py-0.5 text-center text-[9px] font-medium text-ot-foreground"
          title={row.marketType}
        >
          {row.marketType}
        </span>
      </div>

      {/* Bookmaker */}
      <div className="w-[80px] shrink-0 px-1">
        <span
          className="block truncate text-[10px] text-ot-muted"
          title={row.bookmaker}
        >
          {row.bookmaker}
        </span>
      </div>

      {/* Odds - prominent display */}
      <div className="w-[60px] shrink-0 px-1 text-right">
        <span
          className={cn(
            'inline-block rounded-md px-2 py-1 text-[12px] font-bold tabular-nums transition-all',
            isSelected
              ? 'bg-ot-accent text-ot-background'
              : 'bg-ot-accent/10 text-ot-accent group-hover:bg-ot-accent group-hover:text-ot-background'
          )}
        >
          {oddsFormatted}
        </span>
      </div>

      {/* Updated time with freshness indicator */}
      <div className="w-[70px] shrink-0 px-1 text-right">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[9px]',
            timeAgo.isStale ? 'text-amber-400' : 'text-ot-muted'
          )}
          title={`Last updated: ${row.lastUpdated}`}
        >
          {timeAgo.isStale && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          )}
          {timeAgo.text}
        </span>
      </div>
    </div>
  )
}

export default OddsBrowserTable
