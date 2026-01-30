import * as React from 'react'

import { useFeedFiltersStore } from './stores/feedFiltersStore'
import { MarketFilterPopover } from './MarketFilterPopover'
import { BookmakerFilterPopover } from './BookmakerFilterPopover'
import { FilterDropdown, MultiFilterChipGroup } from '../../components/ui/FilterDropdown'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'
import type { RegionCode } from '../../../../../shared/filters'
import type { SportFilterValue } from './filters'
import {
    ALL_MARKET_GROUPS,
    ALL_REGION_CODES,
    ALL_SPORT_FILTERS
} from './filters'

// Source/Provider filter options
const SOURCE_OPTIONS = [
    { value: 'all' as const, label: 'All Sources' },
    { value: 'live' as const, label: 'Live Feed Only' },
    { value: 'deepScan' as const, label: 'Deep Scan Only' },
    { value: 'crossProvider' as const, label: 'Cross-Provider Only' }
]

type SourceFilter = (typeof SOURCE_OPTIONS)[number]['value']

// Region display options
const REGION_OPTIONS = [
    { value: 'AU' as RegionCode, label: 'AU', description: 'Australia' },
    { value: 'UK' as RegionCode, label: 'UK', description: 'United Kingdom' },
    { value: 'IT' as RegionCode, label: 'IT', description: 'Italy' },
    { value: 'RO' as RegionCode, label: 'RO', description: 'Romania' }
]

// Sport display options
const SPORT_OPTIONS = [
    { value: 'soccer' as SportFilterValue, label: 'Soccer', icon: '⚽' },
    { value: 'tennis' as SportFilterValue, label: 'Tennis', icon: '🎾' }
]

// Sort options for the feed
const SORT_OPTIONS = [
    { value: 'time-asc' as const, label: 'Time (earliest first)' },
    { value: 'time-desc' as const, label: 'Time (latest first)' },
    { value: 'roi-desc' as const, label: 'ROI (highest first)' },
    { value: 'roi-asc' as const, label: 'ROI (lowest first)' }
]

type SortOption = (typeof SORT_OPTIONS)[number]['value']

export interface FilterBarProps {
    totalCount: number
    filteredCount: number
    availableBookmakers: string[]
    sourceFilter: SourceFilter
    onSourceFilterChange: (value: SourceFilter) => void
    sortBy: SortOption
    onSortChange: (value: SortOption) => void
}

export function FilterBar({
    totalCount,
    filteredCount,
    availableBookmakers,
    sourceFilter,
    onSourceFilterChange,
    sortBy,
    onSortChange
}: FilterBarProps): React.JSX.Element {
    const [filterState, setFilterState] = React.useState(() => useFeedFiltersStore.getState())

    React.useEffect(() => {
        const unsubscribe = useFeedFiltersStore.subscribe((nextState) => {
            setFilterState(nextState)
        })
        return () => {
            unsubscribe()
        }
    }, [])

    const {
        regions,
        sports,
        marketGroups,
        bookmakers,
        minRoi,
        toggleRegion,
        toggleSport,
        setMinRoi,
        resetFilters
    } = filterState

    const hasActiveRoi = minRoi > 0
    const hasActiveSource = sourceFilter !== 'all'

    const hasNonDefaultRegions =
        regions.length !== ALL_REGION_CODES.length ||
        !ALL_REGION_CODES.every((code) => regions.includes(code))
    const hasNonDefaultSports =
        sports.length !== ALL_SPORT_FILTERS.length ||
        !ALL_SPORT_FILTERS.every((sport) => sports.includes(sport))
    const hasNonDefaultMarkets =
        (marketGroups?.length ?? ALL_MARKET_GROUPS.length) !== ALL_MARKET_GROUPS.length ||
        !(marketGroups ?? ALL_MARKET_GROUPS).every((group) => ALL_MARKET_GROUPS.includes(group))
    const hasBookmakerFilters = Array.isArray(bookmakers) && bookmakers.length > 0

    const hasActiveFilters =
        hasNonDefaultRegions ||
        hasNonDefaultSports ||
        hasNonDefaultMarkets ||
        hasBookmakerFilters ||
        hasActiveRoi ||
        hasActiveSource

    const handleMinRoiChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const value = event.target.value.trim()
        if (!value) {
            setMinRoi(0)
            return
        }
        const numeric = Number.parseFloat(value)
        if (!Number.isFinite(numeric) || numeric <= 0) {
            setMinRoi(0)
            return
        }
        setMinRoi(numeric / 100)
    }

    const minRoiPercent = hasActiveRoi ? (minRoi * 100).toFixed(1) : ''

    const handleReset = (): void => {
        resetFilters()
        onSourceFilterChange('all')
    }

    return (
        <section
            className="rounded-lg border border-ot-border bg-gradient-to-b from-ot-surface to-ot-background p-3"
            aria-label="Feed filters"
            data-testid="filter-bar"
        >
            {/* Header Row */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ot-foreground">
                        Filters
                    </h3>
                    <span className="rounded-full bg-ot-accent/10 px-2 py-0.5 text-[10px] font-semibold text-ot-accent">
                        {filteredCount} / {totalCount}
                    </span>
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="group flex items-center gap-1 rounded-full border border-ot-border px-2 py-0.5 text-[9px] font-medium text-ot-muted transition-all hover:border-red-300/50 hover:bg-red-50 hover:text-red-500"
                        data-testid="filter-bar-reset"
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
                        Reset All
                    </button>
                )}
            </div>

            {/* Two-row filter layout */}
            <div className="space-y-3">
                {/* Row 1: Quick filters (chips) + Sort */}
                <div className="flex flex-wrap items-end gap-4">
                    <MultiFilterChipGroup
                        label="Region"
                        options={REGION_OPTIONS}
                        selected={regions}
                        onToggle={(value) => toggleRegion(value)}
                        testIdPrefix="filter-region"
                    />

                    <MultiFilterChipGroup
                        label="Sport"
                        options={SPORT_OPTIONS}
                        selected={sports}
                        onToggle={(value) => toggleSport(value)}
                        testIdPrefix="filter-sport"
                    />

                    <div className="ml-auto">
                        <FilterDropdown
                            label="Sort By"
                            options={SORT_OPTIONS}
                            value={sortBy}
                            onChange={onSortChange}
                            testId="filter-sort-by"
                        />
                    </div>
                </div>

                {/* Row 2: Advanced filters (dropdowns) */}
                <div className="flex flex-wrap items-end gap-3 border-t border-ot-border/60 pt-3">
                    <FilterDropdown
                        label="Source"
                        options={SOURCE_OPTIONS}
                        value={sourceFilter}
                        onChange={onSourceFilterChange}
                        testId="filter-source"
                    />

                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted">
                            Market
                        </label>
                        <MarketFilterPopover />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted">
                            Bookmaker
                        </label>
                        <BookmakerFilterPopover availableBookmakers={availableBookmakers} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label
                            htmlFor="min-roi-input"
                            className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ot-muted"
                        >
                            Min ROI
                        </label>
                        <div className="flex items-center gap-1">
                            <Input
                                id="min-roi-input"
                                type="number"
                                className={cn(
                                    'h-8 w-20 px-2.5 text-[11px]',
                                    hasActiveRoi && 'border-ot-accent/50 bg-ot-accent/5'
                                )}
                                value={minRoiPercent}
                                onChange={handleMinRoiChange}
                                placeholder="0.0"
                                min="0"
                                step="0.5"
                                data-testid="filter-min-roi"
                            />
                            <span className="text-[10px] font-medium text-ot-muted">%</span>
                        </div>
                    </div>

                    {/* Active filters indicator */}
                    {hasActiveFilters && (
                        <div className="ml-auto flex items-center gap-2 rounded-md bg-ot-accent/5 px-2 py-1">
                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-ot-accent" />
                            <span className="text-[9px] font-medium text-ot-accent">Filters Active</span>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export type { SourceFilter, SortOption }
export { SOURCE_OPTIONS, SORT_OPTIONS }
export default FilterBar
