import * as React from 'react'
import type { MarketGroup } from '../../../../../shared/types'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'

// Story 7.7: Component props for best odds comparison view
export interface BestOddsViewProps {
    eventId: string
    marketGroup?: MarketGroup | 'all'
    onCopy?: (text: string) => void
}

// Story 7.7: Odds comparison for a  single outcome
interface OutcomeComparison {
    outcome: string
    bestBookmaker: string
    bestOdds: number
    allBookmakers: Array<{ bookmaker: string; odds: number }>
}

// Story 7.7: Best odds data for a market
interface BestOddsData {
    eventId: string
    marketKey: string
    marketLabel: string
    marketGroup: MarketGroup
    outcomes: OutcomeComparison[]
    hasArbitrage: boolean
    arbitrageRoi?: number
}

// Story 7.7: Available market groups for filtering
const MARKET_GROUPS: Array<{ value: MarketGroup | 'all'; label: string }> = [
    { value: 'all', label: 'All Markets' },
    { value: 'goals', label: 'Goals' },
    { value: 'corners', label: 'Corners' },
    { value: 'cards', label: 'Cards' },
    { value: 'shots', label: 'Shots' },
    { value: 'other', label: 'Other' }
]

export function BestOddsView({
    eventId,
    marketGroup: marketGroupProp,
    onCopy
}: BestOddsViewProps): React.JSX.Element {
    const [bestOddsData, setBestOddsData] = React.useState<BestOddsData[] | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [copyState, setCopyState] = React.useState<Map<string, 'copied' | 'idle'>>(new Map())
    // Story 7.7 Task 2: Internal market group filter state
    const [selectedMarketGroup, setSelectedMarketGroup] = React.useState<MarketGroup | 'all'>('all')
    // Story 7.7 Task 7.3: Debounced filter state for performance
    const [debouncedMarketGroup, setDebouncedMarketGroup] = React.useState<MarketGroup | 'all'>('all')
    // Story 7.7 Task 4.4: Track selected outcome for keyboard shortcut
    const [selectedOutcomeKey, setSelectedOutcomeKey] = React.useState<string | null>(null)

    // Use prop if provided, otherwise use debounced internal state
    const activeMarketGroup = marketGroupProp ?? debouncedMarketGroup

    // Story 7.7 Task 7.3: Debounce filter changes (100ms)
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedMarketGroup(selectedMarketGroup)
        }, 100)
        return () => clearTimeout(timeoutId)
    }, [selectedMarketGroup])

    // Fetch best odds from TRPC endpoint
    React.useEffect(() => {
        if (!eventId) return

        setIsLoading(true)
        window.api
            .deepScanGetBestOdds({ eventId })
            .then((result) => {
                // Cast marketGroup strings to MarketGroup type
                const data = result.bestOdds?.map((market) => ({
                    ...market,
                    marketGroup: market.marketGroup as MarketGroup
                })) ?? null
                setBestOddsData(data)
            })
            .catch((error) => {
                console.error('Failed to fetch best odds:', error)
                setBestOddsData(null)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [eventId])

    // Story 7.7 Task 7.1: Memoize filtered market data
    const filteredData = React.useMemo(() => {
        if (!bestOddsData) return []
        if (activeMarketGroup === 'all') return bestOddsData
        return bestOddsData.filter((market) => market.marketGroup === activeMarketGroup)
    }, [bestOddsData, activeMarketGroup])

    // Story 7.7 Task 7.1: Memoize sorted bookmaker lists for each outcome
    const sortedOutcomesMap = React.useMemo(() => {
        const map = new Map<string, Array<{ bookmaker: string; odds: number }>>()
        for (const market of filteredData) {
            for (const outcome of market.outcomes) {
                const key = `${market.marketKey}:${outcome.outcome}`
                // Sort by odds descending (best first) and exclude best bookmaker from secondary list
                const sorted = [...outcome.allBookmakers]
                    .filter(bm => bm.bookmaker !== outcome.bestBookmaker)
                    .sort((a, b) => b.odds - a.odds)
                    .slice(0, 5) // Limit to 5 for performance
                map.set(key, sorted)
            }
        }
        return map
    }, [filteredData])

    // Story 7.7 Task 4.4: Keyboard shortcut (Ctrl+C) to copy selected outcome
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.ctrlKey && e.key === 'c' && selectedOutcomeKey && filteredData.length > 0) {
                e.preventDefault()
                // Find the selected outcome in filtered data
                for (const market of filteredData) {
                    for (const outcome of market.outcomes) {
                        const key = `${market.marketKey}:${outcome.outcome}`
                        if (key === selectedOutcomeKey) {
                            handleCopy(outcome, market.marketLabel)
                            return
                        }
                    }
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedOutcomeKey, filteredData])

    const handleCopy = (outcome: OutcomeComparison, marketLabel: string): void => {
        const text = `${outcome.outcome}: ${outcome.bestOdds} @ ${outcome.bestBookmaker} (${marketLabel})`

        if (window.api?.copySignalToClipboard) {
            void window.api.copySignalToClipboard({ text })
        }

        if (onCopy) {
            onCopy(text)
        }

        const key = `${marketLabel}-${outcome.outcome}`
        setCopyState(new Map(copyState.set(key, 'copied')))
        setTimeout(() => {
            setCopyState((prev) => {
                const next = new Map(prev)
                next.delete(key)
                return next
            })
        }, 1200)
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-[11px] text-ot-muted">
                Loading best odds...
            </div>
        )
    }

    if (!bestOddsData || filteredData.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-[11px] text-ot-muted">
                {!bestOddsData
                    ? 'No odds data available. Run Deep Scan to populate.'
                    : 'No markets match selected filter.'}
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col overflow-auto">
            {/* Story 7.7 Task 2: Market group filter dropdown (only show if no external prop) */}
            {!marketGroupProp && (
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-ot-border bg-ot-background p-2">
                    <span className="text-[10px] text-ot-muted">Filter:</span>
                    <select
                        value={activeMarketGroup}
                        onChange={(e) => setSelectedMarketGroup(e.target.value as MarketGroup | 'all')}
                        className="h-7 rounded border border-ot-border bg-ot-card px-2 text-[11px] text-ot-foreground outline-none focus:border-ot-accent"
                    >
                        {MARKET_GROUPS.map((group) => (
                            <option key={group.value} value={group.value}>
                                {group.label}
                            </option>
                        ))}
                    </select>
                    <span className="ml-auto text-[9px] text-ot-muted">
                        {filteredData.length} market{filteredData.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
            <div className="space-y-4 p-2">
                {filteredData.map((market) => (
                    <div
                        key={market.marketKey}
                        className="rounded-md border border-ot-border bg-ot-card p-3"
                    >
                        {/* Market header */}
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-ot-foreground">
                                {market.marketLabel}
                            </span>
                            {market.hasArbitrage && market.arbitrageRoi !== undefined && (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                                    ARB {(market.arbitrageRoi * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>

                        {/* Outcomes with best odds */}
                        <div className="space-y-3">
                            {market.outcomes.map((outcome) => {
                                const copyKey = `${market.marketLabel}-${outcome.outcome}`
                                const isCopied = copyState.get(copyKey) === 'copied'
                                // Story 7.7 Task 7.1: Use memoized sorted bookmakers
                                const sortedKey = `${market.marketKey}:${outcome.outcome}`
                                const sortedBookmakers = sortedOutcomesMap.get(sortedKey) ?? []
                                const isSelected = selectedOutcomeKey === sortedKey

                                return (
                                    <div 
                                        key={outcome.outcome} 
                                        className={cn(
                                            "space-y-1 cursor-pointer rounded p-1 transition-colors",
                                            isSelected && "bg-ot-accent/5 ring-1 ring-ot-accent/30"
                                        )}
                                        onClick={() => setSelectedOutcomeKey(sortedKey)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                setSelectedOutcomeKey(sortedKey)
                                            }
                                        }}
                                    >
                                        {/* Best  odds highlight */}
                                        <div className="flex items-center justify-between rounded bg-ot-accent/10 p-2">
                                            <div className="flex-1">
                                                <div className="text-[10px] font-medium text-ot-muted">
                                                    {outcome.outcome}
                                                </div>
                                                <div className="text-[13px] font-bold text-ot-accent">
                                                    {outcome.bestOdds.toFixed(2)} @ {outcome.bestBookmaker}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                className={cn(
                                                    'h-6 px-2 text-[9px]',
                                                    isCopied && 'bg-emerald-500 text-black hover:bg-emerald-400'
                                                )}
                                                onClick={() => handleCopy(outcome, market.marketLabel)}
                                            >
                                                {isCopied ? '✓ COPIED' : 'COPY'}
                                            </Button>
                                        </div>

                                        {/* All bookmakers sorted (memoized) */}
                                        <div className="space-y-0.5 pl-2">
                                            {sortedBookmakers.map((bm) => (
                                                <div
                                                    key={bm.bookmaker}
                                                    className="flex items-center text-[10px] text-ot-muted"
                                                >
                                                    <span className="w-24 truncate">{bm.bookmaker}</span>
                                                    <span className="ml-auto font-mono">{bm.odds.toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {outcome.allBookmakers.length > 6 && (
                                                <div className="text-[9px] text-ot-muted">
                                                    +{outcome.allBookmakers.length - 6} more bookmakers
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default BestOddsView
