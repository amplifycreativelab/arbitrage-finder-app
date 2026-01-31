import * as React from 'react'
import { MultiFilterChipGroup } from '../../../components/ui/FilterDropdown'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'
import type { OddsBrowserFiltersProps } from '../types'

// Collapsible section icons
const ChevronDown = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const Search = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const Filter = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

const RotateCcw = ({ className }: { className?: string }): React.JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

export function OddsBrowserFilters({
  filters,
  availableSports,
  availableLeagues,
  availableMarketTypes,
  availableBookmakers,
  onSportsChange,
  onLeaguesChange,
  onSearchChange,
  onMarketTypesChange,
  onBookmakersChange,
  onClearAll
}: OddsBrowserFiltersProps): React.JSX.Element {
  const { selectedSports, selectedLeagues, searchQuery, selectedMarketTypes, selectedBookmakers } =
    filters

  // Collapsible section states
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() => new Set(['sports']))

  const toggleSection = (section: string): void => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const hasActiveFilters =
    selectedSports.length > 0 ||
    selectedLeagues.length > 0 ||
    searchQuery.trim().length > 0 ||
    selectedMarketTypes.length > 0 ||
    selectedBookmakers.length > 0

  const totalActiveFilters =
    selectedSports.length +
    selectedLeagues.length +
    selectedMarketTypes.length +
    selectedBookmakers.length +
    (searchQuery.trim() ? 1 : 0)

  // Build options from available values
  const sportOptions = availableSports.map((sport) => ({
    value: sport,
    label: sport.charAt(0).toUpperCase() + sport.slice(1)
  }))

  const leagueOptions = availableLeagues.map((league) => ({
    value: league,
    label: league
  }))

  const marketTypeOptions = availableMarketTypes.map((type) => ({
    value: type,
    label: type
  }))

  const bookmakerOptions = availableBookmakers.map((bookmaker) => ({
    value: bookmaker,
    label: bookmaker
  }))

  // Toggle functions for multi-select
  const toggleSport = (sport: string): void => {
    const newSports = selectedSports.includes(sport)
      ? selectedSports.filter((s) => s !== sport)
      : [...selectedSports, sport]
    onSportsChange(newSports)
  }

  const toggleLeague = (league: string): void => {
    const newLeagues = selectedLeagues.includes(league)
      ? selectedLeagues.filter((l) => l !== league)
      : [...selectedLeagues, league]
    onLeaguesChange(newLeagues)
  }

  const toggleMarketType = (type: string): void => {
    const newTypes = selectedMarketTypes.includes(type)
      ? selectedMarketTypes.filter((t) => t !== type)
      : [...selectedMarketTypes, type]
    onMarketTypesChange(newTypes)
  }

  const toggleBookmaker = (bookmaker: string): void => {
    const newBookmakers = selectedBookmakers.includes(bookmaker)
      ? selectedBookmakers.filter((b) => b !== bookmaker)
      : [...selectedBookmakers, bookmaker]
    onBookmakersChange(newBookmakers)
  }

  // Collapsible section component
  const CollapsibleSection = ({
    id,
    title,
    count,
    children
  }: {
    id: string;
    title: string;
    count?: number;
    children: React.ReactNode
  }): React.JSX.Element => {
    const isExpanded = expandedSections.has(id)
    return (
      <div className="border-b border-ot-border/40 last:border-b-0">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className={cn(
            'flex w-full items-center justify-between px-3 py-2 text-left transition-colors',
            'hover:bg-ot-accent/5',
            isExpanded && 'bg-ot-surface/50'
          )}
        >
          <span className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ot-foreground">
              {title}
            </span>
            {count !== undefined && count > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ot-accent px-1 text-[9px] font-bold text-ot-background">
                {count}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-ot-muted transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-3 pb-3">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section
      className="overflow-hidden rounded-lg border border-ot-border bg-gradient-to-b from-ot-surface via-ot-surface/80 to-ot-background shadow-sm"
      aria-label="Odds browser filters"
      data-testid="odds-browser-filters"
    >
      {/* Header with search */}
      <div className="border-b border-ot-border bg-ot-surface p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Title with filter icon */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-ot-accent" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ot-foreground">
              Filters
            </h3>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ot-accent/10 px-2 py-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ot-accent" />
                <span className="text-[9px] font-medium text-ot-accent">
                  {totalActiveFilters} active
                </span>
              </span>
            )}
          </div>

          {/* Clear button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="group flex items-center gap-1.5 rounded-full border border-ot-border px-2.5 py-1 text-[9px] font-medium text-ot-muted transition-all hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400"
              data-testid="odds-browser-filters-clear"
            >
              <RotateCcw className="h-3 w-3 transition-transform group-hover:-rotate-180" />
              Clear
            </button>
          )}
        </div>

        {/* Search Input - always visible */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ot-muted" />
          <Input
            id="odds-browser-search"
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'h-8 w-full pl-8 pr-8 text-[11px]',
              searchQuery.trim() && 'border-ot-accent/50 bg-ot-accent/5 ring-1 ring-ot-accent/20'
            )}
            data-testid="odds-browser-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-ot-muted transition-colors hover:bg-ot-border hover:text-ot-foreground"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Filter Sections */}
      <div className="max-h-[400px] overflow-y-auto">
        {/* Sports */}
        {sportOptions.length > 0 && (
          <CollapsibleSection id="sports" title="Sports" count={selectedSports.length}>
            <MultiFilterChipGroup
              label=""
              options={sportOptions}
              selected={selectedSports}
              onToggle={toggleSport}
              testIdPrefix="odds-browser-sport"
            />
          </CollapsibleSection>
        )}

        {/* Leagues - show if sports selected or few leagues */}
        {leagueOptions.length > 0 && (selectedSports.length > 0 || leagueOptions.length <= 15) && (
          <CollapsibleSection
            id="leagues"
            title={selectedSports.length > 0 ? 'Leagues (filtered)' : 'Leagues'}
            count={selectedLeagues.length}
          >
            <MultiFilterChipGroup
              label=""
              options={leagueOptions}
              selected={selectedLeagues}
              onToggle={toggleLeague}
              testIdPrefix="odds-browser-league"
            />
          </CollapsibleSection>
        )}

        {/* Market Types */}
        {marketTypeOptions.length > 0 && (
          <CollapsibleSection id="markets" title="Markets" count={selectedMarketTypes.length}>
            <MultiFilterChipGroup
              label=""
              options={marketTypeOptions}
              selected={selectedMarketTypes}
              onToggle={toggleMarketType}
              testIdPrefix="odds-browser-market"
            />
          </CollapsibleSection>
        )}

        {/* Bookmakers */}
        {bookmakerOptions.length > 0 && (
          <CollapsibleSection id="bookmakers" title="Bookmakers" count={selectedBookmakers.length}>
            <MultiFilterChipGroup
              label=""
              options={bookmakerOptions}
              selected={selectedBookmakers}
              onToggle={toggleBookmaker}
              testIdPrefix="odds-browser-bookmaker"
            />
          </CollapsibleSection>
        )}
      </div>

      {/* Quick stats footer */}
      <div className="flex items-center justify-between border-t border-ot-border/40 bg-ot-surface/30 px-3 py-2 text-[9px] text-ot-muted">
        <span>{sportOptions.length} sports</span>
        <span>{leagueOptions.length} leagues</span>
        <span>{marketTypeOptions.length} markets</span>
        <span>{bookmakerOptions.length} books</span>
      </div>
    </section>
  )
}

export default OddsBrowserFilters
