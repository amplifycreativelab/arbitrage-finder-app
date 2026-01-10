import * as React from 'react'

import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import {
    Command,
    CommandInput
} from '../../components/ui/command'
import { Checkbox } from '../../components/ui/checkbox'
import { cn } from '../../lib/utils'
import { useFeedFiltersStore } from './stores/feedFiltersStore'
import { ALL_MARKET_GROUPS, type MarketGroup } from './filters'
import { MARKET_GROUP_DISPLAYS, type MarketGroupDisplay } from '../../../../../shared/types'

/**
 * Market filter popover component for Story 6.2.
 * Provides a searchable, grouped interface for filtering markets.
 */
export function MarketFilterPopover(): React.JSX.Element {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState('')

    // Store access
    const marketGroups = useFeedFiltersStore((state) => state.marketGroups ?? ALL_MARKET_GROUPS)
    const toggleMarketGroup = useFeedFiltersStore((state) => state.toggleMarketGroup)
    const setMarketGroups = useFeedFiltersStore((state) => state.setMarketGroups)

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = React.useState('')

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.toLowerCase().trim())
        }, 150)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Filter groups based on search
    const filteredGroups = React.useMemo(() => {
        if (!debouncedSearch) {
            return MARKET_GROUP_DISPLAYS
        }

        return MARKET_GROUP_DISPLAYS.filter((display) => {
            const matchesLabel = display.label.toLowerCase().includes(debouncedSearch)
            const matchesDescription = display.description.toLowerCase().includes(debouncedSearch)
            const matchesGroup = display.group.toLowerCase().includes(debouncedSearch)
            return matchesLabel || matchesDescription || matchesGroup
        })
    }, [debouncedSearch])

    // Count selected groups
    const selectedCount = marketGroups.length
    const totalCount = ALL_MARKET_GROUPS.length
    const allSelected = selectedCount === totalCount

    // Handlers
    const handleSelectAll = (): void => {
        setMarketGroups([...ALL_MARKET_GROUPS])
    }

    const handleClearAll = (): void => {
        setMarketGroups([])
    }

    const handleToggleGroup = (group: MarketGroup): void => {
        toggleMarketGroup(group)
    }

    const isGroupSelected = (group: MarketGroup): boolean => {
        return marketGroups.includes(group)
    }



    // Summary text for trigger
    const getSummaryText = (): string => {
        if (selectedCount === 0) {
            return 'No markets'
        }
        if (allSelected) {
            return 'All markets'
        }
        return `${selectedCount} of ${totalCount} groups`
    }

    return (
        <div className="flex flex-col gap-1">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        role="combobox"
                        aria-expanded={open}
                        aria-haspopup="listbox"
                        aria-label="Select market groups"
                        className={cn(
                            'flex h-7 w-full items-center justify-between rounded-md border px-2 py-1 text-[10px]',
                            'border-ot-border bg-transparent text-ot-foreground/80',
                            'hover:border-ot-accent/60 hover:text-ot-accent',
                            'focus:outline-none focus:ring-1 focus:ring-ot-accent',
                            open && 'border-ot-accent text-ot-accent'
                        )}
                        data-testid="market-filter-trigger"
                    >
                        <span className="flex items-center gap-1.5">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3 opacity-60"
                            >
                                <path d="M3 3v18h18" />
                                <path d="m19 9-5 5-4-4-3 3" />
                            </svg>
                            <span>Markets</span>
                            <span className="text-ot-foreground/50">({getSummaryText()})</span>
                        </span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn('h-3 w-3 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-[320px] p-0"
                    align="start"
                    sideOffset={4}
                    data-testid="market-filter-popover"
                >
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search markets..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            data-testid="market-filter-search"
                        />

                        {/* Bulk Actions */}
                        <div className="flex items-center justify-between border-b border-ot-border px-3 py-2">
                            <span className="text-[10px] font-medium text-ot-foreground/60">
                                {selectedCount} of {totalCount} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="text-[10px] text-ot-accent hover:underline disabled:opacity-50 disabled:no-underline"
                                    onClick={handleSelectAll}
                                    disabled={allSelected}
                                    data-testid="market-filter-select-all"
                                >
                                    Select All
                                </button>
                                <span className="text-white/20">|</span>
                                <button
                                    type="button"
                                    className="text-[10px] text-ot-accent hover:underline disabled:opacity-50 disabled:no-underline"
                                    onClick={handleClearAll}
                                    disabled={selectedCount === 0}
                                    data-testid="market-filter-clear-all"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        {/* Simple scrollable list - bypasses cmdk click issues */}
                        <div
                            className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1"
                            role="listbox"
                            aria-label="Market groups"
                        >
                            {filteredGroups.length === 0 && (
                                <div className="py-6 text-center text-sm text-ot-foreground/60">
                                    No markets found.
                                </div>
                            )}

                            {filteredGroups.map((display: MarketGroupDisplay, index: number) => (
                                <React.Fragment key={display.group}>
                                    {index > 0 && <div className="-mx-1 h-px bg-ot-border" />}
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isGroupSelected(display.group)}
                                        onClick={() => handleToggleGroup(display.group)}
                                        className={cn(
                                            'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none',
                                            'hover:bg-ot-accent/20 hover:text-ot-accent',
                                            'focus:bg-ot-accent/20 focus:text-ot-accent',
                                            isGroupSelected(display.group) && 'bg-ot-accent/10'
                                        )}
                                        data-testid={`market-filter-group-${display.group}`}
                                    >
                                        <Checkbox
                                            checked={isGroupSelected(display.group)}
                                            tabIndex={-1}
                                            aria-hidden="true"
                                            className="pointer-events-none"
                                        />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium">{display.label}</span>
                                            <span className="text-[10px] text-ot-foreground/50">{display.description}</span>
                                        </div>
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </Command>
                </PopoverContent>
            </Popover>

        </div>
    )
}

export default MarketFilterPopover
