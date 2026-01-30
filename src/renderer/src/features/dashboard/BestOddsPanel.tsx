import * as React from 'react'
import { useFeedStore } from './stores/feedStore'
import { useDeepScanStore } from './stores/deepScanStore'
import BestOddsView from './BestOddsView'
import { cn } from '../../lib/utils'

/**
 * Story 7.7 Task 5: Container component for Best Odds Comparison View
 * 
 * Provides event selection and integrates BestOddsView into the dashboard.
 * Events are sourced from arbitrage opportunities in the feed.
 * 
 * Note: Since ArbitrageOpportunity.event doesn't have an ID field, we use 
 * event names as identifiers. This is a fallback mechanism - the BestOddsView 
 * component will attempt to find matching data in the cache.
 */
export function BestOddsPanel(): React.JSX.Element {
    // Get events from feed store (arbitrage opportunities contain event info)
    const opportunities = useFeedStore((state) => state.opportunities)
    const selectedOpportunityId = useFeedStore((state) => state.selectedOpportunityId)
    const setSelectedOpportunityId = useFeedStore((state) => state.setSelectedOpportunityId)

    // Get deep scan status to show when scanning is in progress
    const continuousStatus = useDeepScanStore((state) => state.continuousStatus)
    const progress = useDeepScanStore((state) => state.progress)

    // Extract unique events from opportunities (using event name as key since no ID available)
    const events = React.useMemo(() => {
        const eventMap = new Map<string, { key: string; name: string }>()
        for (const opp of opportunities) {
            if (opp.event?.name && !eventMap.has(opp.event.name)) {
                eventMap.set(opp.event.name, {
                    key: opp.event.name, // Use name as the key
                    name: opp.event.name
                })
            }
        }
        return Array.from(eventMap.values())
    }, [opportunities])

    // Selected event key from selected opportunity
    const selectedEventKey = React.useMemo(() => {
        if (!selectedOpportunityId) return null
        const opp = opportunities.find((o) => o.id === selectedOpportunityId)
        return opp?.event?.name ?? null
    }, [selectedOpportunityId, opportunities])

    // State for manual event selection (separate from the opportunity selection)
    const [manualEventKey, setManualEventKey] = React.useState<string | null>(null)

    // Use manual selection if set, otherwise use selected opportunity's event
    const activeEventKey = manualEventKey ?? selectedEventKey

    const handleEventChange = (eventKey: string): void => {
        setManualEventKey(eventKey || null)
        // Optionally sync with opportunity selection
        if (eventKey) {
            const matchingOpp = opportunities.find((o) => o.event?.name === eventKey)
            if (matchingOpp) {
                setSelectedOpportunityId(matchingOpp.id)
            }
        }
    }

    // Status indicator - DeepScanStatus type is 'idle' | 'scanning' | 'completed' | 'cancelled' | 'error'
    const isScanning = progress.status === 'scanning' || continuousStatus.isActive

    // Empty state when no events
    if (events.length === 0) {
        return (
            <div className="flex h-full flex-col">
                <header className="mb-2 flex items-center justify-between gap-2 border-b border-ot-border pb-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ot-muted">
                        Best Odds Comparison
                    </h3>
                    {isScanning && (
                        <span className="flex items-center gap-1.5 text-[9px] text-cyan-400">
                            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                            Scanning
                        </span>
                    )}
                </header>
                <div
                    className="flex flex-1 items-center justify-center text-center text-[11px] text-ot-muted"
                    data-testid="best-odds-empty"
                >
                    <div className="max-w-[200px] space-y-2">
                        <p>No events available.</p>
                        <p className="text-[10px] text-ot-muted/70">
                            Run Deep Scan to discover events, or wait for arbitrage opportunities to appear in the feed.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col" data-testid="best-odds-panel">
            {/* Header with event selector */}
            <header className="mb-2 flex items-center gap-3 border-b border-ot-border pb-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ot-muted">
                    Best Odds
                </h3>
                <select
                    value={activeEventKey ?? ''}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className={cn(
                        'h-7 min-w-0 flex-1 truncate rounded border border-ot-border bg-ot-card',
                        'px-2 text-[11px] text-ot-foreground outline-none',
                        'focus:border-ot-accent'
                    )}
                    data-testid="best-odds-event-selector"
                >
                    <option value="">Select an event...</option>
                    {events.map((event) => (
                        <option key={event.key} value={event.key}>
                            {event.name}
                        </option>
                    ))}
                </select>
                {isScanning && (
                    <span className="flex items-center gap-1.5 text-[9px] text-cyan-400">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                        Live
                    </span>
                )}
            </header>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
                {activeEventKey ? (
                    <BestOddsView eventId={activeEventKey} />
                ) : (
                    <div
                        className="flex h-full items-center justify-center text-[11px] text-ot-muted"
                        data-testid="best-odds-no-selection"
                    >
                        Select an event to see best odds comparison.
                    </div>
                )}
            </div>
        </div>
    )
}

export default BestOddsPanel

