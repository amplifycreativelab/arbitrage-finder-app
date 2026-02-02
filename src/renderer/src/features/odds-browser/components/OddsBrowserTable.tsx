import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { cn } from '../../../lib/utils'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleChevron
} from '../../../components/ui/collapsible'
import type { OddsBrowserRow, OddsBrowserEventGroup, OddsBrowserTableProps } from '../types'

// Story 8.x: Improved visual design with proper icons
const TrendUpIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
)

const MarketIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
)

const BookmakerIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

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

function formatEventTime(startTime: string): {
  date: string
  time: string
  isLive: boolean
  fullDate: string
} {
  try {
    const date = parseISO(startTime)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const isLive = diffMs < 0 && diffMs > -3 * 60 * 60 * 1000

    return {
      date: format(date, 'MMM d'),
      time: format(date, 'HH:mm'),
      isLive,
      fullDate: format(date, 'MMM d, yyyy HH:mm')
    }
  } catch {
    return { date: '-', time: '-', isLive: false, fullDate: '-' }
  }
}

// Group rows by event
function groupRowsByEvent(rows: OddsBrowserRow[]): OddsBrowserEventGroup[] {
  const groups = new Map<string, OddsBrowserEventGroup>()

  for (const row of rows) {
    const eventKey = `${row.sport}:${row.league}:${row.event.home}:${row.event.away}:${row.event.startTime}`

    if (!groups.has(eventKey)) {
      groups.set(eventKey, {
        eventId: eventKey,
        sport: row.sport,
        league: row.league,
        event: row.event,
        odds: [],
        marketCount: 0,
        bookmakerCount: 0,
        bestOdds: 0
      })
    }

    groups.get(eventKey)!.odds.push(row)
  }

  // Calculate derived metrics
  for (const group of groups.values()) {
    const uniqueMarkets = new Set(group.odds.map((o) => o.marketType))
    const uniqueBookmakers = new Set(group.odds.map((o) => o.bookmaker))
    group.marketCount = uniqueMarkets.size
    group.bookmakerCount = uniqueBookmakers.size
    group.bestOdds = Math.max(...group.odds.map((o) => o.odds))
  }

  return Array.from(groups.values()).sort((a, b) => {
    return new Date(a.event.startTime).getTime() - new Date(b.event.startTime).getTime()
  })
}

export function OddsBrowserTable({
  rows,
  selectedOutcomeId,
  onSelectOutcome
}: OddsBrowserTableProps): React.JSX.Element {
  const [expandedEvents, setExpandedEvents] = React.useState<Set<string>>(new Set())
  const [hoveredRowId, setHoveredRowId] = React.useState<string | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null)

  // Group rows by event
  const eventGroups = React.useMemo(() => groupRowsByEvent(rows), [rows])

  // Auto-expand event when a row is selected
  React.useEffect(() => {
    if (selectedOutcomeId) {
      const selectedRow = rows.find((r) => r.id === selectedOutcomeId)
      if (selectedRow) {
        const eventKey = `${selectedRow.sport}:${selectedRow.league}:${selectedRow.event.home}:${selectedRow.event.away}:${selectedRow.event.startTime}`
        setExpandedEvents((prev) => new Set([...prev, eventKey]))
      }
    }
  }, [selectedOutcomeId, rows])

  const toggleEvent = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedEvents(new Set(eventGroups.map((g) => g.eventId)))
  }

  const collapseAll = () => {
    setExpandedEvents(new Set())
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
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (selectedOutcomeId) {
        onSelectOutcome(selectedOutcomeId)
      }
    }
  }

  const totalCount = rows.length
  const eventCount = eventGroups.length

  return (
    <div className="flex h-full flex-col" data-testid="odds-browser-table">
      {/* Enhanced Header with expand/collapse controls */}
      <div className="mb-2 flex items-center justify-between rounded-lg bg-gradient-to-r from-ot-surface via-ot-surface to-transparent px-2 py-2">
        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.16em]">
          <span className="text-ot-muted">{eventCount} Events</span>
          <span className="text-ot-muted">·</span>
          <span className="text-ot-muted">{totalCount} Odds</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded px-2 py-1 text-[10px] text-ot-muted transition-colors hover:bg-ot-accent/10 hover:text-ot-accent"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded px-2 py-1 text-[10px] text-ot-muted transition-colors hover:bg-ot-accent/10 hover:text-ot-accent"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Events List */}
      <div
        ref={scrollContainerRef}
        className={cn(
          'relative flex-1 overflow-y-auto outline-none',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-ot-border/50',
          'hover:scrollbar-thumb-ot-border'
        )}
        data-testid="odds-browser-scroll-container"
        tabIndex={totalCount > 0 ? 0 : -1}
        role="listbox"
        aria-label="Odds browser"
        onKeyDown={handleKeyDown}
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

        {totalCount > 0 && (
          <div className="space-y-2 pb-4">
            {eventGroups.map((group) => (
              <EventGroupCard
                key={group.eventId}
                group={group}
                isExpanded={expandedEvents.has(group.eventId)}
                onToggle={() => toggleEvent(group.eventId)}
                selectedOutcomeId={selectedOutcomeId}
                onSelectOutcome={onSelectOutcome}
                hoveredRowId={hoveredRowId}
                setHoveredRowId={setHoveredRowId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface EventGroupCardProps {
  group: OddsBrowserEventGroup
  isExpanded: boolean
  onToggle: () => void
  selectedOutcomeId: string | null
  onSelectOutcome: (id: string | null) => void
  hoveredRowId: string | null
  setHoveredRowId: (id: string | null) => void
}

function EventGroupCard({
  group,
  isExpanded,
  onToggle,
  selectedOutcomeId,
  onSelectOutcome,
  hoveredRowId,
  setHoveredRowId
}: EventGroupCardProps): React.JSX.Element {
  const eventTime = formatEventTime(group.event.startTime)
  const sportColor = getSportColor(group.sport)
  const hasSelection = group.odds.some((o) => o.id === selectedOutcomeId)

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          'rounded-lg border transition-all duration-200',
          hasSelection
            ? 'border-ot-accent/50 bg-ot-accent/5'
            : 'border-ot-border bg-ot-surface/30 hover:border-ot-border/80'
        )}
      >
        {/* Event Header */}
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              'group flex cursor-pointer items-center gap-3 px-3 py-3',
              'hover:bg-ot-surface/50'
            )}
            data-testid="event-group-header"
          >
            {/* Expand/Collapse Icon */}
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ot-border/50 text-ot-muted transition-colors group-hover:bg-ot-border group-hover:text-ot-foreground">
              <CollapsibleChevron className="h-3.5 w-3.5" />
            </div>

            {/* Sport Badge */}
            <span
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide',
                sportColor.bg,
                sportColor.text,
                sportColor.border
              )}
            >
              {group.sport}
            </span>

            {/* League */}
            <span
              className="hidden w-[100px] shrink-0 truncate text-[10px] text-ot-muted sm:block"
              title={group.league}
            >
              {group.league}
            </span>

            {/* Event Time */}
            <div className="shrink-0">
              {eventTime.isLive ? (
                <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  LIVE
                </span>
              ) : (
                <span className="inline-flex flex-col items-center rounded bg-ot-surface px-2 py-1 text-center">
                  <span className="text-[8px] font-medium text-ot-muted">{eventTime.date}</span>
                  <span className="text-[10px] font-semibold text-ot-foreground">{eventTime.time}</span>
                </span>
              )}
            </div>

            {/* Teams */}
            <div className="min-w-0 flex-1 px-2">
              <span className="block truncate text-[12px] font-semibold text-ot-foreground">
                {group.event.home}
                <span className="mx-2 text-ot-muted">vs</span>
                {group.event.away}
              </span>
            </div>

            {/* Stats */}
            <div className="hidden shrink-0 items-center gap-3 md:flex">
              <div
                className="flex items-center gap-1.5 text-[10px] text-ot-muted"
                title={`${group.marketCount} market types`}
              >
                <MarketIcon className="h-3.5 w-3.5" />
                <span>{group.marketCount}</span>
              </div>
              <div
                className="flex items-center gap-1.5 text-[10px] text-ot-muted"
                title={`${group.bookmakerCount} bookmakers`}
              >
                <BookmakerIcon className="h-3.5 w-3.5" />
                <span>{group.bookmakerCount}</span>
              </div>
              <div
                className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400"
                title={`Best odds: ${group.bestOdds.toFixed(2)}`}
              >
                <TrendUpIcon className="h-3.5 w-3.5" />
                <span>{group.bestOdds.toFixed(2)}</span>
              </div>
            </div>

            {/* Odds Count */}
            <div className="shrink-0 rounded-full bg-ot-border/50 px-2 py-0.5 text-[10px] text-ot-muted">
              {group.odds.length}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Odds List (Collapsible) */}
        <CollapsibleContent>
          <div className="border-t border-ot-border/50">
            {/* Sub-header */}
            <div className="flex items-center bg-ot-surface/20 px-3 py-1.5 text-[9px] font-medium uppercase tracking-wide text-ot-muted">
              <div className="w-[100px]">Market</div>
              <div className="w-[100px]">Outcome</div>
              <div className="w-[100px]">Bookmaker</div>
              <div className="w-[80px] text-right">Odds</div>
              <div className="flex-1 text-right">Updated</div>
            </div>

            {/* Odds Rows */}
            <div className="px-1 pb-1">
              {group.odds.map((row) => (
                <OddsRow
                  key={row.id}
                  row={row}
                  isSelected={row.id === selectedOutcomeId}
                  isHovered={row.id === hoveredRowId}
                  onSelect={() => onSelectOutcome(row.id)}
                  onHover={() => setHoveredRowId(row.id)}
                  onLeave={() => setHoveredRowId(null)}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

interface OddsRowProps {
  row: OddsBrowserRow
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
}

function OddsRow({
  row,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave
}: OddsRowProps): React.JSX.Element {
  const timeAgo = formatTimeAgo(row.lastUpdated)

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center rounded px-2 py-2 text-[11px] transition-all duration-150',
        isSelected && 'bg-ot-accent/15 ring-1 ring-inset ring-ot-accent/50',
        !isSelected && isHovered && 'bg-ot-accent/5',
        !isSelected && !isHovered && 'hover:bg-ot-surface/50'
      )}
      data-testid="odds-browser-row"
      data-selected={isSelected ? 'true' : 'false'}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      role="option"
      aria-selected={isSelected ? 'true' : 'false'}
    >
      {/* Market Type */}
      <div className="w-[100px] px-1">
        <span
          className="block truncate rounded bg-ot-border/30 px-1.5 py-0.5 text-center text-[9px] font-medium text-ot-foreground"
          title={row.marketType}
        >
          {row.marketType}
        </span>
      </div>

      {/* Outcome */}
      <div className="w-[100px] px-1">
        <span className="block truncate font-medium text-ot-foreground" title={row.outcome}>
          {row.outcome}
        </span>
      </div>

      {/* Bookmaker */}
      <div className="w-[100px] px-1">
        <span className="block truncate text-ot-muted" title={row.bookmaker}>
          {row.bookmaker}
        </span>
      </div>

      {/* Odds */}
      <div className="w-[80px] px-1 text-right">
        <span
          className={cn(
            'inline-block rounded-md px-2 py-1 text-[12px] font-bold tabular-nums transition-all',
            isSelected
              ? 'bg-ot-accent text-ot-background'
              : 'bg-ot-accent/10 text-ot-accent group-hover:bg-ot-accent group-hover:text-ot-background'
          )}
        >
          {formatOdds(row.odds)}
        </span>
      </div>

      {/* Updated Time */}
      <div className="flex-1 px-1 text-right">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[9px]',
            timeAgo.isStale ? 'text-amber-400' : 'text-ot-muted'
          )}
          title={`Last updated: ${row.lastUpdated}`}
        >
          {timeAgo.isStale && <span className="h-1 w-1 rounded-full bg-amber-400" />}
          {timeAgo.text}
        </span>
      </div>
    </div>
  )
}

export default OddsBrowserTable
