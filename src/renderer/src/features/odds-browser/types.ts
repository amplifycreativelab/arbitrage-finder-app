import type { MarketGroup, RawOddsPayload } from '../../../../../shared/types'

// Re-export RawOddsPayload from shared types for convenience
export type { RawOddsPayload }

/**
 * Single row in the Odds Browser table.
 * Represents one outcome from a bookmaker for a specific event/market.
 */
export interface OddsBrowserRow {
  /** Composite ID: eventId + marketKey + bookmaker + outcome */
  id: string
  /** Sport name (e.g., 'soccer', 'basketball') */
  sport: string
  /** League name (e.g., 'Premier League') */
  league: string
  /** Event details */
  event: {
    home: string
    away: string
    startTime: string
  }
  /** Market type (e.g., 'Moneyline', 'Over/Under') */
  marketType: string
  /** Canonical market key */
  marketKey: string
  /** Market group for filtering */
  marketGroup: MarketGroup
  /** Bookmaker name */
  bookmaker: string
  /** Decimal odds */
  odds: number
  /** Outcome name (e.g., 'Over 2.5', 'Home') */
  outcome: string
  /** ISO timestamp when data was last updated */
  lastUpdated: string
}

/**
 * Filter state for the Odds Browser.
 */
export interface OddsBrowserFilters {
  /** Selected sports (empty = all) */
  selectedSports: string[]
  /** Selected leagues (empty = all) */
  selectedLeagues: string[]
  /** Search query for event names */
  searchQuery: string
  /** Selected market types (empty = all) */
  selectedMarketTypes: string[]
  /** Selected bookmakers (empty = all) */
  selectedBookmakers: string[]
}

/**
 * Display mode for the comparison panel
 */
export type ComparisonDisplayMode = 'docked' | 'floating'

/**
 * Full state interface for the Odds Browser store.
 */
export interface OddsBrowserState extends OddsBrowserFilters {
  /** Currently sorted column */
  sortColumn: 'sport' | 'league' | 'eventTime' | 'marketType' | 'odds' | null
  /** Sort direction */
  sortDirection: 'asc' | 'desc'
  /** Currently selected outcome ID */
  selectedOutcomeId: string | null
  /** Raw odds data from Deep Scan */
  rawOddsRows: OddsBrowserRow[]
  /** Whether the comparison panel is pinned (stays open on new selection) */
  isComparisonPinned: boolean
  /** Display mode for comparison panel: docked (sidebar) or floating (modal) */
  comparisonDisplayMode: ComparisonDisplayMode
}

/**
 * Store interface with actions and computed selectors.
 */
export interface OddsBrowserStore extends OddsBrowserState {
  // Actions - Filter setters
  setSelectedSports: (sports: string[]) => void
  setSelectedLeagues: (leagues: string[]) => void
  setSearchQuery: (query: string) => void
  setSelectedMarketTypes: (types: string[]) => void
  setSelectedBookmakers: (bookmakers: string[]) => void

  // Actions - Sorting
  setSortColumn: (column: OddsBrowserState['sortColumn']) => void
  toggleSortDirection: () => void

  // Actions - Selection
  selectOutcome: (id: string | null) => void

  // Actions - Comparison Panel
  toggleComparisonPin: () => void
  setComparisonDisplayMode: (mode: ComparisonDisplayMode) => void
  closeComparison: () => void

  // Actions - Filters
  clearAllFilters: () => void

  // Actions - Data
  setRawOddsRows: (rows: OddsBrowserRow[]) => void
  addRawOddsRows: (rows: OddsBrowserRow[]) => void

  // Computed selectors
  availableLeagues: () => string[]
  availableSports: () => string[]
  availableMarketTypes: () => string[]
  availableBookmakers: () => string[]
  filteredRows: () => OddsBrowserRow[]
}

/**
 * Props for the OddsBrowserTable component.
 */
export interface OddsBrowserTableProps {
  rows: OddsBrowserRow[]
  selectedOutcomeId: string | null
  onSelectOutcome: (id: string | null) => void
  sortColumn: OddsBrowserState['sortColumn']
  sortDirection: 'asc' | 'desc'
  onSort: (column: OddsBrowserState['sortColumn']) => void
}

/**
 * Props for the OddsBrowserFilters component.
 */
export interface OddsBrowserFiltersProps {
  filters: OddsBrowserFilters
  availableSports: string[]
  availableLeagues: string[]
  availableMarketTypes: string[]
  availableBookmakers: string[]
  onSportsChange: (sports: string[]) => void
  onLeaguesChange: (leagues: string[]) => void
  onSearchChange: (query: string) => void
  onMarketTypesChange: (types: string[]) => void
  onBookmakersChange: (bookmakers: string[]) => void
  onClearAll: () => void
}
