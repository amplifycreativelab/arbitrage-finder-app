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
    onSettingsClick?: () => void
}

export function FilterBar({
    totalCount,
    filteredCount,
    availableBookmakers,
    sourceFilter,
    onSourceFilterChange,
    sortBy,
    onSortChange,
    onSettingsClick
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
            className="ot-card p-4 animate-fade-in"
            aria-label="Feed filters"
            data-testid="filter-bar"
        >
            {/* Header Row */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ot-foreground flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-ot-accent">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        Filters
                    </h3>
                    <span className="rounded-full bg-ot-accent-subtle px-2.5 py-1 text-xs font-bold text-ot-accent border border-ot-accent/20">
                        {filteredCount} / {totalCount}
                    </span>
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="ot-btn ot-btn-ghost ot-btn-sm group text-ot-error hover:text-ot-error hover:bg-ot-error-dim"
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
                            className="h-3.5 w-3.5 transition-transform group-hover:-rotate-180 duration-300"
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
                <div className="flex flex-wrap items-end gap-3 border-t border-ot-border-subtle pt-3">
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
                        <div className="flex items-center gap-2 rounded-full bg-ot-accent-subtle px-3 py-1.5 border border-ot-accent/20 animate-pulse-live">
                            <div className="h-2 w-2 rounded-full bg-ot-accent" />
                            <span className="text-xs font-semibold text-ot-accent">Filters Active</span>
                        </div>
                    )}

                    {/* Settings shortcut */}
                    {onSettingsClick && (
                        <button
                            type="button"
                            onClick={onSettingsClick}
                            className="ot-btn ot-btn-secondary ot-btn-sm ml-auto"
                            data-testid="settings-shortcut"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                            >
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0-2-2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            Settings
                        </button>
                    )}
                </div>
            </div>
        </section>
    )
}

export type { SourceFilter, SortOption }
export { SOURCE_OPTIONS, SORT_OPTIONS }
export default FilterBar
