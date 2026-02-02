import * as React from 'react'
import { cn } from '../../../lib/utils'
import { useFeedFiltersStore } from '../stores/feedFiltersStore'
import type { FeedSortKey, FeedSortDirection } from '../stores/feedStore'
import type { MarketGroup } from '../../../../../../shared/types'
import { ALL_MARKET_GROUPS, ALL_SPORT_FILTERS, ALL_REGION_CODES } from '../filters'
import type { RegionCode } from '../../../../../../shared/filters'
import type { SportFilterValue } from '../filters'

export interface FilterSidebarProps {
  sortBy: FeedSortKey
  sortDirection: FeedSortDirection
  onSortChange: (key: FeedSortKey, direction: FeedSortDirection) => void
  totalCount: number
  filteredCount: number
  className?: string
  /** List of all available bookmakers extracted from opportunities */
  availableBookmakers?: string[]
}

const SORT_OPTIONS: { key: FeedSortKey; label: string }[] = [
  { key: 'roi', label: 'Profit' },
  { key: 'time', label: 'Time' },
  { key: 'trend', label: 'Trend' }
]

const AGE_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' }
]

const EVENT_TIME_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '1h', label: 'Next hour' },
  { value: 'today', label: 'Today' },
  { value: '24h', label: 'Next 24 hours' },
  { value: '48h', label: 'Next 48 hours' }
]

export function FilterSidebar({
  sortBy,
  sortDirection,
  onSortChange,
  totalCount,
  filteredCount,
  className,
  availableBookmakers = []
}: FilterSidebarProps): React.JSX.Element {
  const filterState = useFeedFiltersStore()
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['bookmakers', 'sports'])

  const toggleSection = (section: string): void => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const handleReset = (): void => {
    filterState.resetFilters()
    onSortChange('roi', 'desc')
  }

  const hasActiveFilters =
    filterState.minRoi > 0 ||
    filterState.bookmakers.length > 0 ||
    filterState.sports.length !== ALL_SPORT_FILTERS.length ||
    filterState.regions.length !== ALL_REGION_CODES.length ||
    (filterState.marketGroups?.length ?? 0) !== ALL_MARKET_GROUPS.length

  return (
    <div
      className={cn('flex flex-col h-full bg-ot-surface border-l border-ot-border', className)}
      data-testid="filter-sidebar"
    >
      <div className="px-4 py-3 border-b border-ot-border bg-ot-background">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ot-foreground flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-ot-accent"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter Surebets
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ot-accent-subtle text-ot-accent">
            {filteredCount}/{totalCount}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-4 space-y-4">
        <FilterSection title="Sort">
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as FeedSortKey, sortDirection)}
              className="flex-1 h-8 px-2 text-xs bg-ot-background border border-ot-border rounded-md text-ot-foreground focus:outline-none focus:ring-1 focus:ring-ot-accent"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc')}
              className="h-8 w-8 flex items-center justify-center rounded-md border border-ot-border bg-ot-background text-ot-muted hover:text-ot-foreground hover:bg-ot-surface-hover"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </FilterSection>

        <FilterSection title="Number of outcomes">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-ot-foreground cursor-pointer">
              <input
                type="checkbox"
                checked
                readOnly
                className="rounded border-ot-border text-ot-accent"
              />
              2-way
            </label>
            <label className="flex items-center gap-2 text-xs text-ot-muted cursor-not-allowed">
              <input type="checkbox" disabled className="rounded border-ot-border" />
              3-way
            </label>
          </div>
        </FilterSection>

        <FilterSection title="Profit range (min/max)">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={filterState.minRoi > 0 ? (filterState.minRoi * 100).toFixed(1) : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  filterState.setMinRoi(Number.isFinite(val) ? val / 100 : 0)
                }}
                placeholder="Min %"
                className="w-full h-8 px-2 text-xs bg-ot-background border border-ot-border rounded-md text-ot-foreground placeholder:text-ot-muted focus:outline-none focus:ring-1 focus:ring-ot-accent"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ot-muted">
                %
              </span>
            </div>
            <span className="text-ot-muted">-</span>
            <div className="relative flex-1">
              <input
                type="number"
                placeholder="Max %"
                disabled
                className="w-full h-8 px-2 text-xs bg-ot-background/50 border border-ot-border rounded-md text-ot-muted cursor-not-allowed"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ot-muted">
                %
              </span>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Age">
          <select className="w-full h-8 px-2 text-xs bg-ot-background border border-ot-border rounded-md text-ot-foreground focus:outline-none focus:ring-1 focus:ring-ot-accent">
            {AGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FilterSection>

        <FilterSection title="Event during">
          <select className="w-full h-8 px-2 text-xs bg-ot-background border border-ot-border rounded-md text-ot-foreground focus:outline-none focus:ring-1 focus:ring-ot-accent">
            {EVENT_TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FilterSection>

        <AccordionSection
          title={`Bookmakers (${filterState.bookmakers.length > 0 ? filterState.bookmakers.length : 'All'})`}
          isExpanded={expandedSections.includes('bookmakers')}
          onToggle={() => toggleSection('bookmakers')}
        >
          {availableBookmakers.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {/* Select All / Clear All */}
              <div className="flex items-center justify-between py-1 border-b border-ot-border/50 mb-1">
                <button
                  type="button"
                  onClick={() => filterState.setBookmakers([])}
                  className={cn(
                    'text-[10px] font-medium',
                    filterState.bookmakers.length === 0
                      ? 'text-ot-accent'
                      : 'text-ot-muted hover:text-ot-foreground'
                  )}
                >
                  All
                </button>
                {filterState.bookmakers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => filterState.setBookmakers([])}
                    className="text-[10px] text-ot-muted hover:text-ot-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              {availableBookmakers.map((bookmaker) => (
                <label
                  key={bookmaker}
                  className="flex items-center gap-2 text-xs text-ot-foreground cursor-pointer py-1"
                >
                  <input
                    type="checkbox"
                    checked={filterState.bookmakers.length === 0 || filterState.bookmakers.includes(bookmaker)}
                    onChange={() => {
                      if (filterState.bookmakers.length === 0) {
                        // Switching from "All" to selecting specific ones
                        // Include all except this one (inverted selection logic)
                        filterState.setBookmakers(availableBookmakers.filter(b => b !== bookmaker))
                      } else {
                        filterState.toggleBookmaker(bookmaker)
                      }
                    }}
                    className="rounded border-ot-border text-ot-accent focus:ring-ot-accent"
                  />
                  <span className="truncate" title={bookmaker}>
                    {bookmaker}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-ot-muted py-2">
              No bookmakers found in current feed
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          title={`Sports (${filterState.sports.length})`}
          isExpanded={expandedSections.includes('sports')}
          onToggle={() => toggleSection('sports')}
        >
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {ALL_SPORT_FILTERS.map((sport) => (
              <label
                key={sport}
                className="flex items-center gap-2 text-xs text-ot-foreground cursor-pointer py-1"
              >
                <input
                  type="checkbox"
                  checked={filterState.sports.includes(sport)}
                  onChange={() => filterState.toggleSport(sport as SportFilterValue)}
                  className="rounded border-ot-border text-ot-accent focus:ring-ot-accent"
                />
                <span className="capitalize">{sport}</span>
              </label>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          title={`Market Groups (${filterState.marketGroups?.length ?? 0})`}
          isExpanded={expandedSections.includes('markets')}
          onToggle={() => toggleSection('markets')}
        >
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {ALL_MARKET_GROUPS.map((group) => (
              <label
                key={group}
                className="flex items-center gap-2 text-xs text-ot-foreground cursor-pointer py-1"
              >
                <input
                  type="checkbox"
                  checked={(filterState.marketGroups ?? []).includes(group)}
                  onChange={() =>
                    (filterState.toggleMarketGroup ?? (() => {}))(group as MarketGroup)
                  }
                  className="rounded border-ot-border text-ot-accent focus:ring-ot-accent"
                />
                <span className="capitalize">{group}</span>
              </label>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          title={`Regions (${filterState.regions.length})`}
          isExpanded={expandedSections.includes('regions')}
          onToggle={() => toggleSection('regions')}
        >
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {ALL_REGION_CODES.map((region) => (
              <label
                key={region}
                className="flex items-center gap-2 text-xs text-ot-foreground cursor-pointer py-1"
              >
                <input
                  type="checkbox"
                  checked={filterState.regions.includes(region)}
                  onChange={() => filterState.toggleRegion(region as RegionCode)}
                  className="rounded border-ot-border text-ot-accent focus:ring-ot-accent"
                />
                <span>{region}</span>
              </label>
            ))}
          </div>
        </AccordionSection>
      </div>

      <div className="p-4 border-t border-ot-border bg-ot-background space-y-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasActiveFilters}
          className={cn(
            'w-full py-2 px-4 text-xs font-medium rounded-md border transition-colors',
            hasActiveFilters
              ? 'border-ot-border bg-ot-surface text-ot-foreground hover:bg-ot-surface-hover'
              : 'border-ot-border/50 bg-ot-surface/50 text-ot-muted cursor-not-allowed'
          )}
        >
          Reset Filters
        </button>
      </div>
    </div>
  )
}

function FilterSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-ot-muted">
        {title}
      </label>
      {children}
    </div>
  )
}

function AccordionSection({
  title,
  isExpanded,
  onToggle,
  children
}: {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="border border-ot-border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-ot-background hover:bg-ot-surface-hover transition-colors"
      >
        <span className="text-xs font-medium text-ot-foreground">{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'h-3.5 w-3.5 text-ot-muted transition-transform',
            isExpanded && 'rotate-180'
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isExpanded && <div className="px-3 py-2 bg-ot-surface/30">{children}</div>}
    </div>
  )
}
