/**
 * Story 8.1: Odds Browser Tab & Grid View - Unit Tests
 *
 * Tests for store filter logic, sorting logic, fuzzy search, and data transformation.
 *
 * Pattern: Node.js native test runner with assert/strict
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

describe('Story 8.1: Odds Browser Tab & Grid View', () => {

  describe('Store Filter Logic', () => {
    // Mirror the filter logic from oddsBrowserStore.ts
    const createMockRows = () => [
      { id: '1', sport: 'soccer', league: 'Premier League', event: { home: 'Man Utd', away: 'Chelsea' }, marketType: 'Moneyline', bookmaker: 'Bet365', odds: 1.95 },
      { id: '2', sport: 'soccer', league: 'Premier League', event: { home: 'Man Utd', away: 'Chelsea' }, marketType: 'Over/Under', bookmaker: 'Pinnacle', odds: 2.05 },
      { id: '3', sport: 'basketball', league: 'NBA', event: { home: 'Lakers', away: 'Warriors' }, marketType: 'Moneyline', bookmaker: 'Bet365', odds: 1.80 },
      { id: '4', sport: 'tennis', league: 'Wimbledon', event: { home: 'Federer', away: 'Nadal' }, marketType: 'Moneyline', bookmaker: 'Betfair', odds: 2.10 },
      { id: '5', sport: 'soccer', league: 'La Liga', event: { home: 'Real Madrid', away: 'Barcelona' }, marketType: 'Handicap', bookmaker: 'Bet365', odds: 1.90 }
    ]

    const filterRows = (rows, filters) => {
      return rows.filter(row => {
        if (filters.selectedSports?.length > 0 && !filters.selectedSports.includes(row.sport)) {
          return false
        }
        if (filters.selectedLeagues?.length > 0 && !filters.selectedLeagues.includes(row.league)) {
          return false
        }
        if (filters.selectedMarketTypes?.length > 0 && !filters.selectedMarketTypes.includes(row.marketType)) {
          return false
        }
        if (filters.selectedBookmakers?.length > 0 && !filters.selectedBookmakers.includes(row.bookmaker)) {
          return false
        }
        if (filters.searchQuery?.trim()) {
          const searchStr = `${row.event.home} ${row.event.away}`.toLowerCase()
          const terms = filters.searchQuery.toLowerCase().split(' ').filter(Boolean)
          if (!terms.every(term => searchStr.includes(term))) {
            return false
          }
        }
        return true
      })
    }

    it('[P0][8.1-FILTER-001] Filters by single sport', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { selectedSports: ['soccer'] })
      
      assert.strictEqual(filtered.length, 3)
      assert.ok(filtered.every(r => r.sport === 'soccer'))
    })

    it('[P0][8.1-FILTER-002] Filters by multiple sports', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { selectedSports: ['soccer', 'basketball'] })
      
      assert.strictEqual(filtered.length, 4)
      assert.ok(filtered.every(r => ['soccer', 'basketball'].includes(r.sport)))
    })

    it('[P0][8.1-FILTER-003] Filters by league', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { selectedLeagues: ['Premier League'] })
      
      assert.strictEqual(filtered.length, 2)
      assert.ok(filtered.every(r => r.league === 'Premier League'))
    })

    it('[P0][8.1-FILTER-004] Filters by market type', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { selectedMarketTypes: ['Moneyline'] })
      
      assert.strictEqual(filtered.length, 3)
      assert.ok(filtered.every(r => r.marketType === 'Moneyline'))
    })

    it('[P0][8.1-FILTER-005] Filters by bookmaker', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { selectedBookmakers: ['Bet365'] })
      
      assert.strictEqual(filtered.length, 3)
      assert.ok(filtered.every(r => r.bookmaker === 'Bet365'))
    })

    it('[P0][8.1-FILTER-006] Combines multiple filters', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { 
        selectedSports: ['soccer'],
        selectedMarketTypes: ['Moneyline']
      })
      
      assert.strictEqual(filtered.length, 1)
      assert.strictEqual(filtered[0].id, '1')
    })

    it('[P1][8.1-FILTER-007] Returns all rows when no filters active', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, {})
      
      assert.strictEqual(filtered.length, 5)
    })

    it('[P1][8.1-FILTER-008] Returns empty array when no matches', () => {
      const rows = createMockRows()
      const filtered = filterRows(rows, { selectedSports: ['cricket'] })
      
      assert.deepEqual(filtered, [])
    })
  })

  describe('Fuzzy Search Logic', () => {
    // Mirror the fuzzy search logic from oddsBrowserStore.ts
    const fuzzyMatch = (event, query) => {
      if (!query.trim()) return true
      const searchStr = `${event.home} ${event.away}`.toLowerCase()
      const terms = query.toLowerCase().split(' ').filter(Boolean)
      return terms.every(term => searchStr.includes(term))
    }

    const testEvent = { home: 'Manchester United', away: 'Chelsea FC' }

    it('[P0][8.1-SEARCH-001] Matches single term in home team', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'manchester'), true)
    })

    it('[P0][8.1-SEARCH-002] Matches single term in away team', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'chelsea'), true)
    })

    it('[P0][8.1-SEARCH-003] Matches multiple terms across teams', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'manchester chelsea'), true)
    })

    it('[P0][8.1-SEARCH-004] Is case insensitive', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'MANCHESTER UNITED'), true)
      assert.strictEqual(fuzzyMatch(testEvent, 'Chelsea Fc'), true)
    })

    it('[P1][8.1-SEARCH-005] Returns true for empty query', () => {
      assert.strictEqual(fuzzyMatch(testEvent, ''), true)
      assert.strictEqual(fuzzyMatch(testEvent, '   '), true)
    })

    it('[P1][8.1-SEARCH-006] Returns false for non-matching term', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'arsenal'), false)
    })

    it('[P1][8.1-SEARCH-007] Returns false when not all terms match', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'manchester arsenal'), false)
    })

    it('[P1][8.1-SEARCH-008] Handles partial matches', () => {
      assert.strictEqual(fuzzyMatch(testEvent, 'man'), true)
      assert.strictEqual(fuzzyMatch(testEvent, 'chel'), true)
    })
  })

  describe('Sorting Logic', () => {
    // Mirror the sorting logic from oddsBrowserStore.ts
    const sortRows = (rows, column, direction) => {
      const sorted = [...rows]
      sorted.sort((a, b) => {
        let comparison = 0
        switch (column) {
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
        return direction === 'asc' ? comparison : -comparison
      })
      return sorted
    }

    const createSortableRows = () => [
      { id: '1', sport: 'tennis', league: 'Wimbledon', event: { startTime: '2024-01-15T10:00:00Z' }, marketType: 'Over/Under', odds: 2.10 },
      { id: '2', sport: 'soccer', league: 'Premier League', event: { startTime: '2024-01-15T12:00:00Z' }, marketType: 'Moneyline', odds: 1.95 },
      { id: '3', sport: 'basketball', league: 'NBA', event: { startTime: '2024-01-15T08:00:00Z' }, marketType: 'Handicap', odds: 1.80 }
    ]

    it('[P0][8.1-SORT-001] Sorts by sport ascending', () => {
      const rows = createSortableRows()
      const sorted = sortRows(rows, 'sport', 'asc')
      
      assert.strictEqual(sorted[0].sport, 'basketball')
      assert.strictEqual(sorted[1].sport, 'soccer')
      assert.strictEqual(sorted[2].sport, 'tennis')
    })

    it('[P0][8.1-SORT-002] Sorts by sport descending', () => {
      const rows = createSortableRows()
      const sorted = sortRows(rows, 'sport', 'desc')
      
      assert.strictEqual(sorted[0].sport, 'tennis')
      assert.strictEqual(sorted[1].sport, 'soccer')
      assert.strictEqual(sorted[2].sport, 'basketball')
    })

    it('[P0][8.1-SORT-003] Sorts by odds ascending', () => {
      const rows = createSortableRows()
      const sorted = sortRows(rows, 'odds', 'asc')
      
      assert.strictEqual(sorted[0].odds, 1.80)
      assert.strictEqual(sorted[1].odds, 1.95)
      assert.strictEqual(sorted[2].odds, 2.10)
    })

    it('[P0][8.1-SORT-004] Sorts by odds descending', () => {
      const rows = createSortableRows()
      const sorted = sortRows(rows, 'odds', 'desc')
      
      assert.strictEqual(sorted[0].odds, 2.10)
      assert.strictEqual(sorted[1].odds, 1.95)
      assert.strictEqual(sorted[2].odds, 1.80)
    })

    it('[P0][8.1-SORT-005] Sorts by event time ascending', () => {
      const rows = createSortableRows()
      const sorted = sortRows(rows, 'eventTime', 'asc')
      
      assert.strictEqual(sorted[0].id, '3') // 08:00
      assert.strictEqual(sorted[1].id, '1') // 10:00
      assert.strictEqual(sorted[2].id, '2') // 12:00
    })

    it('[P1][8.1-SORT-006] Handles empty array', () => {
      const sorted = sortRows([], 'sport', 'asc')
      assert.deepEqual(sorted, [])
    })
  })

  describe('Data Transformation Logic', () => {
    // Mirror the transformation logic from useDeepScanOdds.ts
    // MarketGroup type: 'goals' | 'handicap' | 'corners' | 'cards' | 'shots' | 'other'
    const inferMarketGroup = (key) => {
      const normalized = key.toLowerCase().trim()
      // Goals group: moneyline, totals, BTTS
      if (normalized.includes('h2h') || normalized.includes('moneyline') || normalized.includes('1x2')) return 'goals'
      if (normalized.includes('total') || normalized.includes('over_under') || normalized.includes('ou') || normalized.includes('btts')) return 'goals'
      // Handicap group: spreads, asian handicaps
      if (normalized.includes('spread') || normalized.includes('handicap') || normalized.includes('asian')) return 'handicap'
      // Corners group
      if (normalized.includes('corner')) return 'corners'
      // Cards group
      if (normalized.includes('card') || normalized.includes('booking')) return 'cards'
      // Shots group
      if (normalized.includes('shot')) return 'shots'
      return 'other'
    }

    const formatMarketType = (key) => {
      const normalized = key.toLowerCase().trim()
      if (normalized === 'h2h') return 'Moneyline'
      if (normalized === 'totals' || normalized === 'total') return 'Over/Under'
      if (normalized === 'spreads' || normalized === 'spread') return 'Handicap'
      if (normalized.includes('btts')) return 'BTTS'
      if (normalized.includes('draw_no_bet')) return 'Draw No Bet'
      if (normalized.includes('double_chance')) return 'Double Chance'
      return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }

    const extractHomeTeam = (eventName) => {
      const vsMatch = eventName.match(/^(.+?)(?:\s+(?:vs|v)\s+.+)$/i)
      return vsMatch?.[1]?.trim() || eventName
    }

    const extractAwayTeam = (eventName) => {
      const vsMatch = eventName.match(/(?:vs|v)\s+(.+)$/i)
      return vsMatch?.[1]?.trim() || 'Unknown'
    }

    it('[P0][8.1-TRANSFORM-001] Infers h2h market group correctly', () => {
      assert.strictEqual(inferMarketGroup('h2h'), 'goals')
      assert.strictEqual(inferMarketGroup('moneyline'), 'goals')
      assert.strictEqual(inferMarketGroup('match_1x2'), 'goals')
    })

    it('[P0][8.1-TRANSFORM-002] Infers totals market group correctly', () => {
      assert.strictEqual(inferMarketGroup('totals'), 'goals')
      assert.strictEqual(inferMarketGroup('over_under_2_5'), 'goals')
      assert.strictEqual(inferMarketGroup('totals_ou'), 'goals')
    })

    it('[P0][8.1-TRANSFORM-003] Infers spreads market group correctly', () => {
      assert.strictEqual(inferMarketGroup('spreads'), 'handicap')
      assert.strictEqual(inferMarketGroup('asian_handicap'), 'handicap')
      assert.strictEqual(inferMarketGroup('spread_1_5'), 'handicap')
    })

    it('[P0][8.1-TRANSFORM-004] Returns other for unknown market groups', () => {
      assert.strictEqual(inferMarketGroup('custom_market'), 'other')
      assert.strictEqual(inferMarketGroup('unknown'), 'other')
    })

    it('[P0][8.1-TRANSFORM-005] Formats market type names correctly', () => {
      assert.strictEqual(formatMarketType('h2h'), 'Moneyline')
      assert.strictEqual(formatMarketType('totals'), 'Over/Under')
      assert.strictEqual(formatMarketType('spreads'), 'Handicap')
      assert.strictEqual(formatMarketType('btts_yes'), 'BTTS')
    })

    it('[P0][8.1-TRANSFORM-006] Extracts home team from event name', () => {
      assert.strictEqual(extractHomeTeam('Man Utd vs Chelsea'), 'Man Utd')
      assert.strictEqual(extractHomeTeam('Lakers v Warriors'), 'Lakers')
      assert.strictEqual(extractHomeTeam('Single Team'), 'Single Team')
    })

    it('[P0][8.1-TRANSFORM-007] Extracts away team from event name', () => {
      assert.strictEqual(extractAwayTeam('Man Utd vs Chelsea'), 'Chelsea')
      assert.strictEqual(extractAwayTeam('Lakers v Warriors'), 'Warriors')
      assert.strictEqual(extractAwayTeam('Single Team'), 'Unknown')
    })
  })

  describe('Available Values Extraction', () => {
    // Mirror the available* selectors from oddsBrowserStore.ts
    const getAvailableSports = (rows) => {
      return Array.from(new Set(rows.map(r => r.sport))).sort()
    }

    const getAvailableLeagues = (rows, selectedSports = []) => {
      const filtered = selectedSports.length 
        ? rows.filter(r => selectedSports.includes(r.sport))
        : rows
      return Array.from(new Set(filtered.map(r => r.league))).sort()
    }

    const getAvailableMarketTypes = (rows) => {
      return Array.from(new Set(rows.map(r => r.marketType))).sort()
    }

    const getAvailableBookmakers = (rows) => {
      return Array.from(new Set(rows.map(r => r.bookmaker))).sort()
    }

    const mockRows = [
      { sport: 'soccer', league: 'Premier League', marketType: 'Moneyline', bookmaker: 'Bet365' },
      { sport: 'soccer', league: 'La Liga', marketType: 'Over/Under', bookmaker: 'Pinnacle' },
      { sport: 'basketball', league: 'NBA', marketType: 'Moneyline', bookmaker: 'Bet365' },
      { sport: 'tennis', league: 'Wimbledon', marketType: 'Handicap', bookmaker: 'Betfair' }
    ]

    it('[P0][8.1-AVAIL-001] Extracts unique sports sorted', () => {
      const sports = getAvailableSports(mockRows)
      assert.deepEqual(sports, ['basketball', 'soccer', 'tennis'])
    })

    it('[P0][8.1-AVAIL-002] Extracts all leagues when no sport filter', () => {
      const leagues = getAvailableLeagues(mockRows)
      assert.deepEqual(leagues, ['La Liga', 'NBA', 'Premier League', 'Wimbledon'])
    })

    it('[P0][8.1-AVAIL-003] Extracts leagues filtered by selected sport', () => {
      const leagues = getAvailableLeagues(mockRows, ['soccer'])
      assert.deepEqual(leagues, ['La Liga', 'Premier League'])
    })

    it('[P0][8.1-AVAIL-004] Extracts unique market types sorted', () => {
      const types = getAvailableMarketTypes(mockRows)
      assert.deepEqual(types, ['Handicap', 'Moneyline', 'Over/Under'])
    })

    it('[P0][8.1-AVAIL-005] Extracts unique bookmakers sorted', () => {
      const bookmakers = getAvailableBookmakers(mockRows)
      assert.deepEqual(bookmakers, ['Bet365', 'Betfair', 'Pinnacle'])
    })

    it('[P1][8.1-AVAIL-006] Handles empty rows', () => {
      assert.deepEqual(getAvailableSports([]), [])
      assert.deepEqual(getAvailableLeagues([]), [])
      assert.deepEqual(getAvailableMarketTypes([]), [])
      assert.deepEqual(getAvailableBookmakers([]), [])
    })
  })

  describe('Tab State Management', () => {
    // Mirror the tab state logic from DashboardLayout.tsx
    const validateTabState = (activeTab) => {
      const validTabs = ['arbitrage', 'odds-browser']
      return validTabs.includes(activeTab)
    }

    const getTabContent = (activeTab) => {
      if (activeTab === 'arbitrage') return 'FeedPane'
      if (activeTab === 'odds-browser') return 'OddsBrowser'
      return null
    }

    it('[P0][8.1-TAB-001] Validates arbitrage tab', () => {
      assert.strictEqual(validateTabState('arbitrage'), true)
    })

    it('[P0][8.1-TAB-002] Validates odds-browser tab', () => {
      assert.strictEqual(validateTabState('odds-browser'), true)
    })

    it('[P0][8.1-TAB-003] Rejects invalid tab', () => {
      assert.strictEqual(validateTabState('invalid'), false)
    })

    it('[P0][8.1-TAB-004] Returns correct content for arbitrage tab', () => {
      assert.strictEqual(getTabContent('arbitrage'), 'FeedPane')
    })

    it('[P0][8.1-TAB-005] Returns correct content for odds-browser tab', () => {
      assert.strictEqual(getTabContent('odds-browser'), 'OddsBrowser')
    })
  })

  describe('Virtualization Threshold Logic', () => {
    // Mirror the virtualization logic from OddsBrowserTable.tsx
    const VIRTUALIZATION_THRESHOLD = 50

    const shouldVirtualize = (rowCount) => {
      return rowCount > VIRTUALIZATION_THRESHOLD
    }

    const calculateVisibleRange = (scrollOffset, rowHeight, totalCount, visibleWindow) => {
      const startIndex = Math.max(0, Math.min(totalCount - visibleWindow, Math.floor(scrollOffset / rowHeight)))
      const endIndex = Math.min(totalCount, startIndex + visibleWindow + 8) // 8 = overscan
      return { startIndex, endIndex }
    }

    it('[P0][8.1-VIRT-001] Enables virtualization above threshold', () => {
      assert.strictEqual(shouldVirtualize(51), true)
      assert.strictEqual(shouldVirtualize(100), true)
    })

    it('[P0][8.1-VIRT-002] Disables virtualization at or below threshold', () => {
      assert.strictEqual(shouldVirtualize(50), false)
      assert.strictEqual(shouldVirtualize(10), false)
    })

    it('[P0][8.1-VIRT-003] Calculates visible range correctly', () => {
      const { startIndex, endIndex } = calculateVisibleRange(400, 40, 100, 40)
      // scrollOffset 400 / rowHeight 40 = row 10
      assert.strictEqual(startIndex, 10)
      assert.strictEqual(endIndex, 58) // 10 + 40 + 8 overscan
    })

    it('[P1][8.1-VIRT-004] Clamps start index to valid range', () => {
      const { startIndex } = calculateVisibleRange(10000, 40, 100, 40)
      assert.strictEqual(startIndex, 60) // totalCount - visibleWindow = 100 - 40
    })
  })

})
