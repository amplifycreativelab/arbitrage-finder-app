import * as React from 'react'
import { MultiFilterChipGroup } from '../../../components/ui/FilterDropdown'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../lib/utils'
import type { OddsBrowserFiltersProps } from '../types'

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

  const hasActiveFilters =
    selectedSports.length > 0 ||
    selectedLeagues.length > 0 ||
    searchQuery.trim().length > 0 ||
    selectedMarketTypes.length > 0 ||
    selectedBookmakers.length > 0

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

  return (
    <section
      className="rounded-lg border border-ot-border bg-gradient-to-b from-ot-surface to-ot-background p-3"
      aria-label="Odds browser filters"
      data-testid="odds-browser-filters"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ot-foreground">
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="group flex items-center gap-1 rounded-full border border-ot-border px-2 py-0.5 text-[9px] font-medium text-ot-muted transition-all hover:border-red-300/50 hover:bg-red-50 hover:text-red-500"
            data-testid="odds-browser-filters-clear"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 transition-transform group-hover:rotate-180"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Clear All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-3">
        <label
          htmlFor="odds-browser-search"
          className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted"
        >
          Search Events
        </label>
        <div className="relative">
          <Input
            id="odds-browser-search"
            type="text"
            placeholder="Team name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              'h-8 w-full px-3 text-[11px]',
              searchQuery.trim() && 'border-ot-accent/50 bg-ot-accent/5'
            )}
            data-testid="odds-browser-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ot-muted hover:text-ot-foreground"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter Groups */}
      <div className="space-y-3">
        {/* Sports */}
        {sportOptions.length > 0 && (
          <MultiFilterChipGroup
            label="Sports"
            options={sportOptions}
            selected={selectedSports}
            onToggle={toggleSport}
            testIdPrefix="odds-browser-sport"
          />
        )}

        {/* Leagues - only show if sports are selected or there are few leagues */}
        {leagueOptions.length > 0 && (selectedSports.length > 0 || leagueOptions.length <= 10) && (
          <MultiFilterChipGroup
            label={selectedSports.length > 0 ? 'Leagues (filtered by sport)' : 'Leagues'}
            options={leagueOptions}
            selected={selectedLeagues}
            onToggle={toggleLeague}
            testIdPrefix="odds-browser-league"
          />
        )}

        {/* Market Types */}
        {marketTypeOptions.length > 0 && (
          <MultiFilterChipGroup
            label="Market Types"
            options={marketTypeOptions}
            selected={selectedMarketTypes}
            onToggle={toggleMarketType}
            testIdPrefix="odds-browser-market"
          />
        )}

        {/* Bookmakers */}
        {bookmakerOptions.length > 0 && (
          <div className="border-t border-ot-border/60 pt-3">
            <MultiFilterChipGroup
              label="Bookmakers"
              options={bookmakerOptions}
              selected={selectedBookmakers}
              onToggle={toggleBookmaker}
              testIdPrefix="odds-browser-bookmaker"
            />
          </div>
        )}
      </div>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-ot-accent/5 px-2 py-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-ot-accent" />
          <span className="text-[9px] font-medium text-ot-accent">
            {selectedSports.length +
              selectedLeagues.length +
              selectedMarketTypes.length +
              selectedBookmakers.length +
              (searchQuery.trim() ? 1 : 0)}{' '}
            filter(s) active
          </span>
        </div>
      )}
    </section>
  )
}

export default OddsBrowserFilters
