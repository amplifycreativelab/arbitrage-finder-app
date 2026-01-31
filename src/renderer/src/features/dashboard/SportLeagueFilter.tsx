import * as React from 'react'

// Story 7.9: Sport/League Filter Component
// Allows users to select specific sports and leagues for scanning
// Includes preset configurations for quick setup

interface DiscoveredSport {
    name: string
    slug: string
}

interface DiscoveredLeague {
    name: string
    slug: string
    eventsCount: number
    sport: string
}

interface LeaguePreset {
    id: string
    name: string
    description: string
    sport: string
    leagues: string[]
}

interface SportLeagueFilterProps {
    scanScope: 'all-sports' | 'selected-sports' | 'selected-leagues'
    enabledSports: string[]
    enabledLeagues: string[]
    onSportsChange: (sports: string[]) => void
    onLeaguesChange: (leagues: string[]) => void
    onApplyPreset: (presetId: string) => void
}

export function SportLeagueFilter({
    scanScope,
    enabledSports,
    enabledLeagues,
    onSportsChange,
    onLeaguesChange,
    onApplyPreset
}: SportLeagueFilterProps): React.JSX.Element | null {
    const [sports, setSports] = React.useState<DiscoveredSport[]>([])
    const [leagues, setLeagues] = React.useState<DiscoveredLeague[]>([])
    const [presets, setPresets] = React.useState<LeaguePreset[]>([])
    const [isLoadingSports, setIsLoadingSports] = React.useState(false)
    const [isLoadingLeagues, setIsLoadingLeagues] = React.useState(false)
    const [selectedSport, setSelectedSport] = React.useState<string>('football')
    const [expandedSection, setExpandedSection] = React.useState<'sports' | 'leagues' | 'presets' | null>('presets')

    // Load presets on mount
    React.useEffect(() => {
        void (async () => {
            try {
                const result = await window.api.deepScan.getLeaguePresets()
                setPresets(result)
            } catch {
                // Silent fail
            }
        })()
    }, [])

    // Load cached sports on mount
    React.useEffect(() => {
        void (async () => {
            try {
                const result = await window.api.deepScan.getSportsDetails()
                if (result.length > 0) {
                    setSports(result)
                }
            } catch {
                // Silent fail
            }
        })()
    }, [])

    // Load cached leagues on mount
    React.useEffect(() => {
        void (async () => {
            try {
                const result = await window.api.deepScan.getLeagues()
                if (result.length > 0) {
                    setLeagues(result)
                }
            } catch {
                // Silent fail
            }
        })()
    }, [])

    // Fetch sports from API
    const handleFetchSports = async (): Promise<void> => {
        setIsLoadingSports(true)
        try {
            const result = await window.api.deepScan.fetchSports()
            setSports(result)
        } catch (error) {
            console.error('Failed to fetch sports:', error)
        } finally {
            setIsLoadingSports(false)
        }
    }

    // Fetch leagues for selected sport
    const handleFetchLeagues = async (sport: string): Promise<void> => {
        setIsLoadingLeagues(true)
        try {
            const result = await window.api.deepScan.fetchLeagues(sport)
            setLeagues((prev) => {
                const others = prev.filter((l) => l.sport !== sport)
                return [...others, ...result]
            })
        } catch (error) {
            console.error('Failed to fetch leagues:', error)
        } finally {
            setIsLoadingLeagues(false)
        }
    }

    // Toggle sport selection
    const toggleSport = (slug: string): void => {
        const newSports = enabledSports.includes(slug)
            ? enabledSports.filter((s) => s !== slug)
            : [...enabledSports, slug]
        onSportsChange(newSports)
    }

    // Toggle league selection
    const toggleLeague = (slug: string): void => {
        const newLeagues = enabledLeagues.includes(slug)
            ? enabledLeagues.filter((l) => l !== slug)
            : [...enabledLeagues, slug]
        onLeaguesChange(newLeagues)
    }

    // Don't render if scan scope is 'all-sports'
    if (scanScope === 'all-sports') {
        return null
    }

    const filteredLeagues = leagues.filter(
        (l) => l.sport === selectedSport || (selectedSport === 'all' && true)
    )

    return (
        <div className="mt-2 rounded border border-ot-border/60 bg-ot-border/10 p-2">
            {/* Presets Section */}
            <div className="mb-2">
                <button
                    type="button"
                    onClick={() => setExpandedSection(expandedSection === 'presets' ? null : 'presets')}
                    className="flex w-full items-center justify-between text-[10px] font-semibold text-ot-foreground"
                >
                    <span>Quick Presets</span>
                    <span className="text-ot-muted">{expandedSection === 'presets' ? '▲' : '▼'}</span>
                </button>
                {expandedSection === 'presets' && (
                    <div className="mt-2 space-y-1">
                        {presets.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onApplyPreset(preset.id)}
                                className="flex w-full items-start gap-2 rounded border border-ot-border bg-ot-surface p-2 text-left transition-colors hover:border-ot-accent hover:bg-ot-accent/10"
                            >
                                <div className="flex-1">
                                    <div className="text-[10px] font-semibold text-ot-foreground">{preset.name}</div>
                                    <div className="text-[9px] text-ot-muted">{preset.description}</div>
                                    <div className="mt-1 text-[8px] text-ot-muted/70">{preset.leagues.length} leagues</div>
                                </div>
                                <span className="text-[10px] text-ot-accent">Apply</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sports Section - Only show if scope is 'selected-sports' */}
            {scanScope === 'selected-sports' && (
                <div className="mb-2 border-t border-ot-border/40 pt-2">
                    <button
                        type="button"
                        onClick={() => setExpandedSection(expandedSection === 'sports' ? null : 'sports')}
                        className="flex w-full items-center justify-between text-[10px] font-semibold text-ot-foreground"
                    >
                        <span>
                            Sports ({enabledSports.length > 0 ? `${enabledSports.length} selected` : 'All'})
                        </span>
                        <span className="text-ot-muted">{expandedSection === 'sports' ? '▲' : '▼'}</span>
                    </button>
                    {expandedSection === 'sports' && (
                        <div className="mt-2">
                            <div className="mb-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void handleFetchSports()}
                                    disabled={isLoadingSports}
                                    className="rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent disabled:opacity-50"
                                >
                                    {isLoadingSports ? 'Loading...' : 'Refresh Sports'}
                                </button>
                                {enabledSports.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => onSportsChange([])}
                                        className="text-[9px] text-ot-muted hover:text-ot-accent"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {sports.length === 0 ? (
                                    <span className="text-[9px] text-ot-muted">
                                        Click "Refresh Sports" to load available sports
                                    </span>
                                ) : (
                                    sports.map((sport) => (
                                        <button
                                            key={sport.slug}
                                            type="button"
                                            onClick={() => toggleSport(sport.slug)}
                                            className={`rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors ${enabledSports.includes(sport.slug)
                                                    ? 'border-ot-accent bg-ot-accent/20 text-ot-accent'
                                                    : 'border-ot-border bg-ot-surface text-ot-muted hover:border-ot-accent/50'
                                                }`}
                                        >
                                            {sport.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Leagues Section - Only show if scope is 'selected-leagues' */}
            {scanScope === 'selected-leagues' && (
                <div className="border-t border-ot-border/40 pt-2">
                    <button
                        type="button"
                        onClick={() => setExpandedSection(expandedSection === 'leagues' ? null : 'leagues')}
                        className="flex w-full items-center justify-between text-[10px] font-semibold text-ot-foreground"
                    >
                        <span>
                            Leagues ({enabledLeagues.length > 0 ? `${enabledLeagues.length} selected` : 'None'})
                        </span>
                        <span className="text-ot-muted">{expandedSection === 'leagues' ? '▲' : '▼'}</span>
                    </button>
                    {expandedSection === 'leagues' && (
                        <div className="mt-2">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <select
                                    value={selectedSport}
                                    onChange={(e) => setSelectedSport(e.target.value)}
                                    className="h-6 rounded border border-ot-border bg-ot-surface px-1 text-[9px] text-ot-foreground"
                                >
                                    <option value="football">Football</option>
                                    <option value="basketball">Basketball</option>
                                    <option value="tennis">Tennis</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => void handleFetchLeagues(selectedSport)}
                                    disabled={isLoadingLeagues}
                                    className="rounded border border-ot-border bg-ot-surface px-2 py-1 text-[9px] text-ot-muted hover:border-ot-accent hover:text-ot-accent disabled:opacity-50"
                                >
                                    {isLoadingLeagues ? 'Loading...' : 'Refresh Leagues'}
                                </button>
                                {enabledLeagues.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => onLeaguesChange([])}
                                        className="text-[9px] text-ot-muted hover:text-ot-accent"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {/* Selected leagues chips */}
                            {enabledLeagues.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1 border-b border-ot-border/40 pb-2">
                                    {enabledLeagues.map((slug) => {
                                        const league = leagues.find((l) => l.slug === slug)
                                        return (
                                            <span
                                                key={slug}
                                                className="inline-flex items-center gap-1 rounded-full border border-ot-accent/30 bg-ot-accent/10 px-2 py-0.5 text-[9px] font-medium text-ot-accent"
                                            >
                                                {league?.name ?? slug}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLeague(slug)}
                                                    className="hover:text-red-400"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        )
                                    })}
                                </div>
                            )}
                            {/* Available leagues */}
                            <div className="max-h-40 overflow-y-auto">
                                {filteredLeagues.length === 0 ? (
                                    <span className="text-[9px] text-ot-muted">
                                        Click "Refresh Leagues" to load available leagues
                                    </span>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredLeagues
                                            .sort((a, b) => b.eventsCount - a.eventsCount)
                                            .map((league) => (
                                                <button
                                                    key={league.slug}
                                                    type="button"
                                                    onClick={() => toggleLeague(league.slug)}
                                                    className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-[9px] transition-colors ${enabledLeagues.includes(league.slug)
                                                            ? 'border-ot-accent/40 bg-ot-accent/10 text-ot-accent'
                                                            : 'border-ot-border bg-ot-surface text-ot-foreground hover:border-ot-accent/50'
                                                        }`}
                                                >
                                                    <span className="truncate">{league.name}</span>
                                                    <span className="ml-2 text-ot-muted">{league.eventsCount} events</span>
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SportLeagueFilter
