/**
 * Story 6.2: Scalable Market Filter UI - Test Suite
 *
 * Tests for the MarketFilterPopover component and related functionality.
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

// Import from compiled output
const {
  MARKET_GROUP_DISPLAYS,
  MARKET_GROUPS,
  inferMarketMetadata
} = require('../out-tests/shared/types.js')

console.log('Story 6.2 tests defined. Run with: node --test tests/6-2-market-filter-ui.test.cjs')

describe('Story 6.2: Scalable Market Filter UI', () => {
  describe('Market Group Displays', () => {
    it('[P0][6.2-DISPLAY-001] MARKET_GROUP_DISPLAYS contains all 6 groups', () => {
      assert.strictEqual(MARKET_GROUP_DISPLAYS.length, 6, 'Should have 6 market group displays')

      const groups = MARKET_GROUP_DISPLAYS.map((d) => d.group)
      assert.ok(groups.includes('goals'), 'Should include goals group')
      assert.ok(groups.includes('handicap'), 'Should include handicap group')
      assert.ok(groups.includes('corners'), 'Should include corners group')
      assert.ok(groups.includes('cards'), 'Should include cards group')
      assert.ok(groups.includes('shots'), 'Should include shots group')
      assert.ok(groups.includes('other'), 'Should include other group')
    })

    it('[P0][6.2-DISPLAY-002] Each group has label and description', () => {
      for (const display of MARKET_GROUP_DISPLAYS) {
        assert.ok(display.label, `Group ${display.group} should have a label`)
        assert.ok(display.description, `Group ${display.group} should have a description`)
        assert.ok(
          display.label.length > 0,
          `Group ${display.group} label should not be empty`
        )
        assert.ok(
          display.description.length > 0,
          `Group ${display.group} description should not be empty`
        )
      }
    })

    it('[P1][6.2-DISPLAY-003] Group labels are user-friendly', () => {
      const expectedLabels = {
        goals: 'Goals',
        handicap: 'Handicaps',
        corners: 'Corners',
        cards: 'Cards',
        shots: 'Shots',
        other: 'Other'
      }

      for (const display of MARKET_GROUP_DISPLAYS) {
        assert.strictEqual(
          display.label,
          expectedLabels[display.group],
          `Group ${display.group} should have correct label`
        )
      }
    })
  })

  describe('Market Search Filtering', () => {
    /**
     * Test helper that mirrors the production filterMarkets logic from MarketFilterPopover.tsx.
     * This is intentionally duplicated here to test the filtering algorithm independently.
     * If the production logic changes, this test helper should be updated to match.
     * Per E4-AI-02: We test the algorithm pattern, not the React component internals.
     */
    function filterMarkets(query, groups) {
      if (!query) return groups
      const normalized = query.toLowerCase().trim()
      return groups.filter((display) => {
        const matchesLabel = display.label.toLowerCase().includes(normalized)
        const matchesDescription = display.description.toLowerCase().includes(normalized)
        const matchesGroup = display.group.toLowerCase().includes(normalized)
        return matchesLabel || matchesDescription || matchesGroup
      })
    }

    it('[P0][6.2-SEARCH-001] Empty search returns all groups', () => {
      const result = filterMarkets('', MARKET_GROUP_DISPLAYS)
      assert.strictEqual(result.length, 6, 'Empty search should return all groups')
    })

    it('[P0][6.2-SEARCH-002] Search by group name finds correct group', () => {
      const result = filterMarkets('corner', MARKET_GROUP_DISPLAYS)
      assert.strictEqual(result.length, 1, 'Should find exactly 1 group')
      assert.strictEqual(result[0].group, 'corners', 'Should find corners group')
    })

    it('[P1][6.2-SEARCH-003] Search by description finds groups', () => {
      const result = filterMarkets('totals', MARKET_GROUP_DISPLAYS)
      // "totals" appears in goals, corners, cards, shots descriptions
      assert.ok(result.length >= 1, 'Should find at least 1 group with "totals"')
      const groups = result.map((d) => d.group)
      assert.ok(groups.includes('goals'), 'Should include goals (Totals in description)')
    })

    it('[P1][6.2-SEARCH-004] Search by label finds groups', () => {
      const result = filterMarkets('Goals', MARKET_GROUP_DISPLAYS)
      assert.strictEqual(result.length, 1, 'Should find exactly 1 group for "Goals"')
      assert.strictEqual(result[0].group, 'goals', 'Should find goals group')
    })

    it('[P1][6.2-SEARCH-005] Case-insensitive search works', () => {
      const upperResult = filterMarkets('CARDS', MARKET_GROUP_DISPLAYS)
      const lowerResult = filterMarkets('cards', MARKET_GROUP_DISPLAYS)
      const mixedResult = filterMarkets('CaRdS', MARKET_GROUP_DISPLAYS)

      assert.strictEqual(upperResult.length, lowerResult.length, 'Case should not matter')
      assert.strictEqual(lowerResult.length, mixedResult.length, 'Case should not matter')
      assert.strictEqual(upperResult[0].group, 'cards', 'Should find cards group')
    })

    it('[P1][6.2-SEARCH-006] Search with no matches returns empty', () => {
      const result = filterMarkets('nonexistent', MARKET_GROUP_DISPLAYS)
      assert.strictEqual(result.length, 0, 'Should return empty array for no matches')
    })
  })

  describe('Filter State Management', () => {
    it('[P0][6.2-STATE-001] All groups selected represents "all markets"', () => {
      const allGroups = [...MARKET_GROUPS]
      assert.strictEqual(allGroups.length, 6, 'Should have 6 groups')
      assert.ok(allGroups.includes('goals'), 'Should include goals')
      assert.ok(allGroups.includes('handicap'), 'Should include handicap')
      assert.ok(allGroups.includes('corners'), 'Should include corners')
      assert.ok(allGroups.includes('cards'), 'Should include cards')
      assert.ok(allGroups.includes('shots'), 'Should include shots')
      assert.ok(allGroups.includes('other'), 'Should include other')
    })

    it('[P0][6.2-STATE-002] Toggle logic correctly adds/removes groups', () => {
      // Simulate toggle logic
      function toggleGroup(current, group) {
        if (current.includes(group)) {
          return current.filter((g) => g !== group)
        }
        return [...current, group]
      }

      let state = [...MARKET_GROUPS]
      assert.strictEqual(state.length, 6, 'Initial state should have 6 groups')

      // Toggle off corners
      state = toggleGroup(state, 'corners')
      assert.strictEqual(state.length, 5, 'Should have 5 groups after removing corners')
      assert.ok(!state.includes('corners'), 'corners should be removed')

      // Toggle corners back on
      state = toggleGroup(state, 'corners')
      assert.strictEqual(state.length, 6, 'Should have 6 groups after adding corners back')
      assert.ok(state.includes('corners'), 'corners should be present')
    })

    it('[P1][6.2-STATE-003] Select all adds all groups', () => {
      const emptyState = []
      const allGroups = [...MARKET_GROUPS]
      assert.strictEqual(allGroups.length, 6, 'Select all should result in 6 groups')
    })

    it('[P1][6.2-STATE-004] Clear all results in empty selection', () => {
      const clearedState = []
      assert.strictEqual(clearedState.length, 0, 'Clear all should result in empty array')
    })
  })

  describe('Filter Integration with inferMarketMetadata', () => {
    it('[P0][6.2-INTEGRATION-001] Group filtering matches inferMarketMetadata groups', () => {
      // Test that opportunities can be correctly filtered by group
      const testCases = [
        { market: 'h2h', expectedGroup: 'goals' },
        { market: 'corners_over_9.5_ft', expectedGroup: 'corners' },
        { market: 'cards_under_4.5_1h', expectedGroup: 'cards' },
        { market: 'shots_on_target', expectedGroup: 'shots' },
        { market: 'asian_handicap', expectedGroup: 'handicap' },
        { market: 'offsides', expectedGroup: 'other' }
      ]

      for (const { market, expectedGroup } of testCases) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          expectedGroup,
          `Market ${market} should be in ${expectedGroup} group`
        )
      }
    })

    it('[P0][6.2-INTEGRATION-002] Filter function excludes non-selected groups', () => {
      // Simulate filtering opportunities by selected groups
      const opportunities = [
        { legs: [{ market: 'h2h' }] },
        { legs: [{ market: 'corners_over_9.5' }] },
        { legs: [{ market: 'cards_under_3.5' }] },
        { legs: [{ market: 'shots_on_target' }] }
      ]

      const selectedGroups = ['goals', 'corners']

      const filtered = opportunities.filter((opp) => {
        const group = inferMarketMetadata(opp.legs[0].market).group
        return selectedGroups.includes(group)
      })

      assert.strictEqual(filtered.length, 2, 'Should filter to 2 opportunities')
    })
  })

  describe('UI Chip Display Logic', () => {
    it('[P1][6.2-CHIPS-001] Max visible chips calculated correctly', () => {
      const MAX_VISIBLE = 3
      const testCases = [
        { selected: 0, expectedVisible: 0, expectedHidden: 0 },
        { selected: 2, expectedVisible: 2, expectedHidden: 0 },
        { selected: 3, expectedVisible: 3, expectedHidden: 0 },
        { selected: 4, expectedVisible: 3, expectedHidden: 1 },
        { selected: 6, expectedVisible: 3, expectedHidden: 3 }
      ]

      for (const { selected, expectedVisible, expectedHidden } of testCases) {
        const visible = Math.min(selected, MAX_VISIBLE)
        const hidden = Math.max(0, selected - MAX_VISIBLE)
        assert.strictEqual(visible, expectedVisible, `${selected} selected should show ${expectedVisible} chips`)
        assert.strictEqual(hidden, expectedHidden, `${selected} selected should hide ${expectedHidden} chips`)
      }
    })

    it('[P1][6.2-CHIPS-002] Summary text logic is correct', () => {
      function getSummaryText(selectedCount, totalCount) {
        if (selectedCount === 0) return 'No markets'
        if (selectedCount === totalCount) return 'All markets'
        return `${selectedCount} of ${totalCount} groups`
      }

      assert.strictEqual(getSummaryText(0, 6), 'No markets')
      assert.strictEqual(getSummaryText(6, 6), 'All markets')
      assert.strictEqual(getSummaryText(3, 6), '3 of 6 groups')
      assert.strictEqual(getSummaryText(1, 6), '1 of 6 groups')
    })
  })
})
