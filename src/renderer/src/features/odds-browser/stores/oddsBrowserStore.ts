import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { OddsBrowserStore, OddsBrowserRow, OddsBrowserFilters, ComparisonDisplayMode } from '../types'

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const memoryStorage = (() => {
  const map = new Map<string, string>()

  const storage: StorageLike = {
    getItem: (key: string): string | null => {
      return map.has(key) ? map.get(key)! : null
    },
    setItem: (key: string, value: string): void => {
      map.set(key, value)
    },
    removeItem: (key: string): void => {
      map.delete(key)
    }
  }

  return storage
})()

function getStorage(): StorageLike {
  if (typeof window !== 'undefined' && window && window.localStorage) {
    return window.localStorage
  }

  return memoryStorage
}

const storage = createJSONStorage(() => getStorage())

const defaultFilters: OddsBrowserFilters = {
  selectedSports: [],
  selectedLeagues: [],
  searchQuery: '',
  selectedMarketTypes: [],
  selectedBookmakers: []
}

const defaultState = {
  ...defaultFilters,
  sortColumn: null as 'sport' | 'league' | 'eventTime' | 'marketType' | 'odds' | null,
  sortDirection: 'desc' as 'asc' | 'desc',
  selectedOutcomeId: null as string | null,
  rawOddsRows: [] as OddsBrowserRow[],
  isComparisonPinned: false,
  comparisonDisplayMode: 'docked' as ComparisonDisplayMode
}

/**
 * Fuzzy match function for event search.
 * Matches against both home and away team names.
 */
function fuzzyMatch(event: { home: string; away: string }, query: string): boolean {
  if (!query.trim()) return true
  const searchStr = `${event.home} ${event.away}`.toLowerCase()
  const terms = query.toLowerCase().split(' ').filter(Boolean)
  return terms.every((term) => searchStr.includes(term))
}

export const useOddsBrowserStore = create<OddsBrowserStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Filter setters
      setSelectedSports: (sports: string[]) => {
        set({
          selectedSports: [...sports]
        })
      },

      setSelectedLeagues: (leagues: string[]) => {
        set({
          selectedLeagues: [...leagues]
        })
      },

      setSearchQuery: (query: string) => {
        set({
          searchQuery: query
        })
      },

      setSelectedMarketTypes: (types: string[]) => {
        set({
          selectedMarketTypes: [...types]
        })
      },

      setSelectedBookmakers: (bookmakers: string[]) => {
        set({
          selectedBookmakers: [...bookmakers]
        })
      },

      // Sorting
      setSortColumn: (column) => {
        const currentColumn = get().sortColumn
        if (currentColumn === column) {
          // Toggle direction if same column
          set((state) => ({
            sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc'
          }))
        } else {
          // New column, default to descending for odds, ascending for others
          set({
            sortColumn: column,
            sortDirection: column === 'odds' ? 'desc' : 'asc'
          })
        }
      },

      toggleSortDirection: () => {
        set((state) => ({
          sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc'
        }))
      },

      // Selection
      selectOutcome: (id: string | null) => {
        set({
          selectedOutcomeId: id
        })
      },

      // Comparison Panel Actions
      toggleComparisonPin: () => {
        set((state) => ({
          isComparisonPinned: !state.isComparisonPinned
        }))
      },

      setComparisonDisplayMode: (mode: ComparisonDisplayMode) => {
        set({
          comparisonDisplayMode: mode
        })
      },

      closeComparison: () => {
        set({
          selectedOutcomeId: null
        })
      },

      // Clear filters
      clearAllFilters: () => {
        set({
          ...defaultFilters
        })
      },

      // Data setters
      /**
       * Replace all raw odds rows with new data.
       * Use this for full refresh/reset operations.
       */
      setRawOddsRows: (rows: OddsBrowserRow[]) => {
        set({
          rawOddsRows: [...rows]
        })
      },

      /**
       * Add or update raw odds rows (upsert operation).
       * Rows with existing IDs are overwritten, enabling odds updates for
       * existing events during continuous scans or rescans.
       * 
       * Row ID format: `${eventId}:${marketKey}:${bookmaker}:${outcome}`
       * Since odds value is not part of the ID, changing odds for the same
       * outcome will update the existing row rather than create a duplicate.
       */
      addRawOddsRows: (rows: OddsBrowserRow[]) => {
        set((state) => {
          // Upsert: merge new rows with existing, overwriting if same ID
          // This ensures updated odds are reflected (odds changes = same ID, new value)
          const rowMap = new Map(state.rawOddsRows.map((r) => [r.id, r]))
          for (const row of rows) {
            rowMap.set(row.id, row)
          }
          return {
            rawOddsRows: Array.from(rowMap.values())
          }
        })
      },

      // Computed selectors
      availableLeagues: () => {
        const { rawOddsRows, selectedSports } = get()
        const rows = selectedSports.length
          ? rawOddsRows.filter((r) => selectedSports.includes(r.sport))
          : rawOddsRows
        return Array.from(new Set(rows.map((r) => r.league))).sort()
      },

      availableSports: () => {
        const { rawOddsRows } = get()
        return Array.from(new Set(rawOddsRows.map((r) => r.sport))).sort()
      },

      availableMarketTypes: () => {
        const { rawOddsRows } = get()
        return Array.from(new Set(rawOddsRows.map((r) => r.marketType))).sort()
      },

      availableBookmakers: () => {
        const { rawOddsRows } = get()
        return Array.from(new Set(rawOddsRows.map((r) => r.bookmaker))).sort()
      },

      filteredRows: () => {
        const state = get()
        let rows = [...state.rawOddsRows]

        // Apply sport filter
        if (state.selectedSports.length > 0) {
          rows = rows.filter((r) => state.selectedSports.includes(r.sport))
        }

        // Apply league filter
        if (state.selectedLeagues.length > 0) {
          rows = rows.filter((r) => state.selectedLeagues.includes(r.league))
        }

        // Apply search filter
        if (state.searchQuery.trim()) {
          rows = rows.filter((r) => fuzzyMatch(r.event, state.searchQuery))
        }

        // Apply market type filter
        if (state.selectedMarketTypes.length > 0) {
          rows = rows.filter((r) => state.selectedMarketTypes.includes(r.marketType))
        }

        // Apply bookmaker filter
        if (state.selectedBookmakers.length > 0) {
          rows = rows.filter((r) => state.selectedBookmakers.includes(r.bookmaker))
        }

        // Apply sorting
        if (state.sortColumn) {
          rows.sort((a, b) => {
            let comparison = 0

            switch (state.sortColumn) {
              case 'sport':
                comparison = a.sport.localeCompare(b.sport)
                break
              case 'league':
                comparison = a.league.localeCompare(b.league)
                break
              case 'eventTime':
                comparison = new Date(a.event.startTime).getTime() - new Date(b.event.startTime).getTime()
                break
              case 'marketType':
                comparison = a.marketType.localeCompare(b.marketType)
                break
              case 'odds':
                comparison = a.odds - b.odds
                break
            }

            return state.sortDirection === 'asc' ? comparison : -comparison
          })
        }

        return rows
      }
    }),
    {
      name: 'odds-browser-filters',
      storage,
      partialize: (state) => ({
        selectedSports: state.selectedSports,
        selectedLeagues: state.selectedLeagues,
        searchQuery: state.searchQuery,
        selectedMarketTypes: state.selectedMarketTypes,
        selectedBookmakers: state.selectedBookmakers,
        sortColumn: state.sortColumn,
        sortDirection: state.sortDirection,
        comparisonDisplayMode: state.comparisonDisplayMode
      })
    }
  )
)
