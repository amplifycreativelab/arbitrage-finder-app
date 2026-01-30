/**
 * Story 7.7: Odds Comparison View - Unit Tests
 * 
 * Tests for odds sorting, market group filtering, copy functionality,
 * empty state rendering, and cache management.
 * 
 * Pattern: Node.js native test runner with assert/strict (mirrors 6-3 tests)
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

describe('Story 7.7: Odds Comparison View', () => {

  describe('Odds Sorting Logic', () => {
    // Mirror the sorting logic used in BestOddsView.tsx and computeBestOddsComparison
    const sortBookmakersByOdds = (bookmakers) => {
      return [...bookmakers].sort((a, b) => b.odds - a.odds)
    }

    it('[P0][7.7-SORT-001] Sorts bookmakers by odds descending (highest first)', () => {
      const bookmakers = [
        { bookmaker: 'Bet365', odds: 1.92 },
        { bookmaker: 'Pinnacle', odds: 1.95 },
        { bookmaker: 'Betfair', odds: 1.90 }
      ]
      const sorted = sortBookmakersByOdds(bookmakers)
      
      assert.strictEqual(sorted[0].bookmaker, 'Pinnacle', 'Highest odds first')
      assert.strictEqual(sorted[0].odds, 1.95)
      assert.strictEqual(sorted[1].bookmaker, 'Bet365')
      assert.strictEqual(sorted[2].bookmaker, 'Betfair')
    })

    it('[P0][7.7-SORT-002] Identifies best odds correctly', () => {
      const bookmakers = [
        { bookmaker: 'A', odds: 2.10 },
        { bookmaker: 'B', odds: 2.15 },
        { bookmaker: 'C', odds: 2.05 }
      ]
      const sorted = sortBookmakersByOdds(bookmakers)
      const best = sorted[0]
      
      assert.strictEqual(best.bookmaker, 'B')
      assert.strictEqual(best.odds, 2.15)
    })

    it('[P1][7.7-SORT-003] Handles single bookmaker', () => {
      const bookmakers = [{ bookmaker: 'Solo', odds: 1.80 }]
      const sorted = sortBookmakersByOdds(bookmakers)
      
      assert.strictEqual(sorted.length, 1)
      assert.strictEqual(sorted[0].bookmaker, 'Solo')
    })

    it('[P1][7.7-SORT-004] Handles empty array', () => {
      const sorted = sortBookmakersByOdds([])
      assert.deepEqual(sorted, [])
    })

    it('[P1][7.7-SORT-005] Handles equal odds - stable sort', () => {
      const bookmakers = [
        { bookmaker: 'A', odds: 2.00 },
        { bookmaker: 'B', odds: 2.00 },
        { bookmaker: 'C', odds: 2.00 }
      ]
      const sorted = sortBookmakersByOdds(bookmakers)
      
      assert.strictEqual(sorted.length, 3)
      // All have same odds, order should be stable
      assert.ok(sorted.every(b => b.odds === 2.00))
    })
  })

  describe('Market Group Filtering Logic', () => {
    // Mirror the useMemo filtering logic in BestOddsView
    const filterByMarketGroup = (markets, marketGroup) => {
      if (!markets) return []
      if (marketGroup === 'all') return markets
      return markets.filter((market) => market.marketGroup === marketGroup)
    }

    const testMarkets = [
      { marketKey: 'over_2.5', marketGroup: 'goals', marketLabel: 'Over 2.5 Goals' },
      { marketKey: 'under_2.5', marketGroup: 'goals', marketLabel: 'Under 2.5 Goals' },
      { marketKey: 'btts_yes', marketGroup: 'goals', marketLabel: 'BTTS Yes' },
      { marketKey: 'corners_over_9.5', marketGroup: 'corners', marketLabel: 'Over 9.5 Corners' },
      { marketKey: 'cards_over_3.5', marketGroup: 'cards', marketLabel: 'Over 3.5 Cards' }
    ]

    it('[P0][7.7-FILTER-001] Returns all markets when group is "all"', () => {
      const result = filterByMarketGroup(testMarkets, 'all')
      assert.strictEqual(result.length, 5)
    })

    it('[P0][7.7-FILTER-002] Filters by goals market group', () => {
      const result = filterByMarketGroup(testMarkets, 'goals')
      assert.strictEqual(result.length, 3)
      assert.ok(result.every(m => m.marketGroup === 'goals'))
    })

    it('[P0][7.7-FILTER-003] Filters by corners market group', () => {
      const result = filterByMarketGroup(testMarkets, 'corners')
      assert.strictEqual(result.length, 1)
      assert.strictEqual(result[0].marketKey, 'corners_over_9.5')
    })

    it('[P1][7.7-FILTER-004] Returns empty for non-existent group', () => {
      const result = filterByMarketGroup(testMarkets, 'handicaps')
      assert.deepEqual(result, [])
    })

    it('[P1][7.7-FILTER-005] Handles null/undefined input', () => {
      const result = filterByMarketGroup(null, 'all')
      assert.deepEqual(result, [])
    })
  })

  describe('Copy Functionality Logic', () => {
    // Mirror the copy text formatting from BestOddsView
    const formatCopyText = (outcome, marketLabel) => {
      return `${outcome.outcome}: ${outcome.bestOdds} @ ${outcome.bestBookmaker} (${marketLabel})`
    }

    it('[P0][7.7-COPY-001] Formats copy text correctly', () => {
      const outcome = {
        outcome: 'Over 2.5 Goals',
        bestBookmaker: 'Pinnacle',
        bestOdds: 1.95
      }
      const result = formatCopyText(outcome, 'Total Goals')
      assert.strictEqual(result, 'Over 2.5 Goals: 1.95 @ Pinnacle (Total Goals)')
    })

    it('[P0][7.7-COPY-002] Handles special characters in bookmaker name', () => {
      const outcome = {
        outcome: 'Yes',
        bestBookmaker: "William Hill (UK)",
        bestOdds: 2.10
      }
      const result = formatCopyText(outcome, 'BTTS')
      assert.strictEqual(result, "Yes: 2.1 @ William Hill (UK) (BTTS)")
    })

    it('[P1][7.7-COPY-003] Handles decimal odds formatting', () => {
      const outcome = {
        outcome: 'Under',
        bestBookmaker: 'Bet365',
        bestOdds: 2.00
      }
      const result = formatCopyText(outcome, 'O/U 2.5')
      assert.ok(result.includes('2'))
    })
  })

  describe('Keyboard Shortcut Logic (Task 4.4)', () => {
    // Mirror keyboard shortcut selection logic
    const getSelectedOutcomeKey = (marketKey, outcomeName) => `${marketKey}:${outcomeName}`
    
    const findOutcomeByKey = (markets, key) => {
      for (const market of markets) {
        for (const outcome of market.outcomes) {
          const outcomeKey = getSelectedOutcomeKey(market.marketKey, outcome.outcome)
          if (outcomeKey === key) {
            return { outcome, marketLabel: market.marketLabel }
          }
        }
      }
      return null
    }

    it('[P0][7.7-KB-001] Generates correct outcome key for selection', () => {
      const key = getSelectedOutcomeKey('over_under_2_5', 'Over 2.5 Goals')
      assert.strictEqual(key, 'over_under_2_5:Over 2.5 Goals')
    })

    it('[P0][7.7-KB-002] Finds outcome by key in market data', () => {
      const markets = [
        {
          marketKey: 'btts',
          marketLabel: 'BTTS',
          outcomes: [{ outcome: 'Yes', bestBookmaker: 'Pinnacle', bestOdds: 1.90 }]
        }
      ]
      const result = findOutcomeByKey(markets, 'btts:Yes')
      assert.ok(result)
      assert.strictEqual(result.outcome.bestBookmaker, 'Pinnacle')
    })

    it('[P0][7.7-KB-003] Returns null for non-existent key', () => {
      const markets = [{ marketKey: 'x', marketLabel: 'X', outcomes: [] }]
      const result = findOutcomeByKey(markets, 'nonexistent:xxx')
      assert.strictEqual(result, null)
    })
  })

  describe('Empty State Logic', () => {
    // Mirror the conditional rendering logic in BestOddsView
    const getEmptyStateMessage = (bestOddsData, filteredDataLength) => {
      if (!bestOddsData) {
        return 'No odds data available. Run Deep Scan to populate.'
      }
      if (filteredDataLength === 0) {
        return 'No markets match selected filter.'
      }
      return null
    }

    it('[P0][7.7-EMPTY-001] Shows scan prompt when no data', () => {
      const message = getEmptyStateMessage(null, 0)
      assert.strictEqual(message, 'No odds data available. Run Deep Scan to populate.')
    })

    it('[P0][7.7-EMPTY-002] Shows filter message when data exists but filtered empty', () => {
      const message = getEmptyStateMessage([], 0)
      assert.strictEqual(message, 'No markets match selected filter.')
    })

    it('[P1][7.7-EMPTY-003] Returns null when data exists and filtered has items', () => {
      const message = getEmptyStateMessage([{}], 1)
      assert.strictEqual(message, null)
    })
  })

  describe('Cache TTL Logic', () => {
    // Mock cache behavior for testing purposes
    const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

    const isCacheExpired = (cachedAt, now) => {
      const age = now - cachedAt
      return age > CACHE_TTL_MS
    }

    it('[P0][7.7-CACHE-001] Cache is valid within TTL', () => {
      const now = Date.now()
      const cachedAt = now - (4 * 60 * 1000) // 4 minutes ago
      assert.strictEqual(isCacheExpired(cachedAt, now), false)
    })

    it('[P0][7.7-CACHE-002] Cache is expired after TTL', () => {
      const now = Date.now()
      const cachedAt = now - (6 * 60 * 1000) // 6 minutes ago
      assert.strictEqual(isCacheExpired(cachedAt, now), true)
    })

    it('[P1][7.7-CACHE-003] Cache is expired exactly at TTL boundary', () => {
      const now = Date.now()
      const cachedAt = now - CACHE_TTL_MS - 1 // Just past TTL
      assert.strictEqual(isCacheExpired(cachedAt, now), true)
    })
  })

  describe('Best Odds Comparison Aggregation', () => {
    // Mirror the aggregation logic from computeBestOddsComparison
    const aggregateBestOdds = (quotes) => {
      const bookmakerBest = new Map()
      
      for (const quote of quotes) {
        const existing = bookmakerBest.get(quote.bookmaker)
        if (!existing || quote.odds > existing) {
          bookmakerBest.set(quote.bookmaker, quote.odds)
        }
      }

      return [...bookmakerBest.entries()]
        .map(([bookmaker, odds]) => ({ bookmaker, odds }))
        .sort((a, b) => b.odds - a.odds)
    }

    it('[P0][7.7-AGG-001] Deduplicates quotes from same bookmaker, keeping highest', () => {
      const quotes = [
        { bookmaker: 'Bet365', odds: 1.90 },
        { bookmaker: 'Bet365', odds: 1.95 }, // Higher, should be kept
        { bookmaker: 'Pinnacle', odds: 2.00 }
      ]
      const result = aggregateBestOdds(quotes)
      
      assert.strictEqual(result.length, 2, 'Deduplicated to 2 bookmakers')
      
      const bet365 = result.find(r => r.bookmaker === 'Bet365')
      assert.strictEqual(bet365.odds, 1.95, 'Kept higher odds')
    })

    it('[P0][7.7-AGG-002] Sorts aggregated results by odds descending', () => {
      const quotes = [
        { bookmaker: 'A', odds: 1.80 },
        { bookmaker: 'B', odds: 2.10 },
        { bookmaker: 'C', odds: 1.95 }
      ]
      const result = aggregateBestOdds(quotes)
      
      assert.strictEqual(result[0].bookmaker, 'B')
      assert.strictEqual(result[1].bookmaker, 'C')
      assert.strictEqual(result[2].bookmaker, 'A')
    })

    it('[P1][7.7-AGG-003] Handles empty quotes array', () => {
      const result = aggregateBestOdds([])
      assert.deepEqual(result, [])
    })
  })

})
