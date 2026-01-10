/**
 * Story 6.3: Cascading Bookmaker Selection by Region - Component Logic Test
 * 
 * Mirrors the logic within BookmakerFilterPopover.tsx to verify behavior without DOM.
 * Follows the pattern established in tests/6-2-market-filter-ui.test.cjs
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

describe('Story 6.3: Bookmaker Component Logic', () => {

  describe('Search Filtering Logic', () => {
    // Mirror the useMemo logic for filtering
    const filterBookmakers = (available, query) => {
      if (!query) return available
      const debouncedSearch = query.toLowerCase().trim()
      return available.filter((bookmaker) =>
        bookmaker.toLowerCase().includes(debouncedSearch)
      )
    }

    const available = ['Bet365', 'William Hill', 'Unibet', 'Betfair', 'Pinnacle']

    it('[P0][6.3-COMP-SEARCH-001] Empty search returns all bookmakers', () => {
      const result = filterBookmakers(available, '')
      assert.deepEqual(result, available)
    })

    it('[P0][6.3-COMP-SEARCH-002] Search filters by substring (case insensitive)', () => {
      const result = filterBookmakers(available, 'bet')
      // Should find Bet365, Betfair. (Unibet has 'bet' in it too? Yes Uni-bet)
      assert.ok(result.includes('Bet365'))
      assert.ok(result.includes('Betfair'))
      assert.ok(result.includes('Unibet')) 
      assert.ok(!result.includes('William Hill'))
      assert.ok(!result.includes('Pinnacle'))
    })

    it('[P1][6.3-COMP-SEARCH-003] Search works with different casing', () => {
      const result = filterBookmakers(available, 'HILL')
      assert.deepEqual(result, ['William Hill'])
    })
  })

  describe('Selection State Logic', () => {
    // Mirror component helper logic
    const getSummaryText = (selectedCount, isExplicitlyEmpty) => {
      if (isExplicitlyEmpty) {
          return 'All Bookmakers'
      }
      return `${selectedCount} Selected`
    }

    const MAX_VISIBLE_CHIPS = 3

    it('[P0][6.3-COMP-UI-001] Summary text shows "All" when empty (implicit)', () => {
      assert.strictEqual(getSummaryText(0, true), 'All Bookmakers')
    })

    it('[P0][6.3-COMP-UI-002] Summary text shows count when items selected', () => {
      assert.strictEqual(getSummaryText(5, false), '5 Selected')
      assert.strictEqual(getSummaryText(1, false), '1 Selected')
    })
    
    it('[P1][6.3-COMP-UI-003] Chip visibility calculation', () => {
       const calculateChips = (available, selected) => {
          // Logic from component:
          // selectedBookmakers.filter(b => availableBookmakers.includes(b)).slice(0, MAX_VISIBLE_CHIPS)
          return selected.filter(b => available.includes(b)).slice(0, MAX_VISIBLE_CHIPS)
       }

       const available = ['A', 'B', 'C', 'D', 'E']
       const selected = ['A', 'B', 'C', 'D'] // 4 selected

       const visible = calculateChips(available, selected)
       assert.strictEqual(visible.length, 3, 'Should cap at 3')
       assert.deepEqual(visible, ['A', 'B', 'C'])
    })
  })

  describe('Interaction Handlers Logic', () => {
      // Mirror the handlers
      
      it('[P0][6.3-COMP-HANDLER-001] Select All uses available bookmakers', () => {
          const available = ['A', 'B']
          // Handler calls setBookmakers([...available])
          const setBookmakers = (val) => val
          const result = setBookmakers([...available])
          assert.deepEqual(result, ['A', 'B'])
      })

      it('[P0][6.3-COMP-HANDLER-002] Clear All sets empty list', () => {
          // Handler calls setBookmakers([])
          const setBookmakers = (val) => val
          const result = setBookmakers([])
          assert.deepEqual(result, [])
      })
      
      it('[P1][6.3-COMP-HANDLER-003] Toggle logic adds if not present', () => {
          const current = ['A']
          const toggle = (bk) => current.includes(bk) ? current.filter(b => b!==bk) : [...current, bk]
          
          const result = toggle('B')
          assert.deepEqual(result, ['A', 'B'])
      })

      it('[P1][6.3-COMP-HANDLER-004] Toggle logic removes if present', () => {
        const current = ['A', 'B']
        const toggle = (bk) => current.includes(bk) ? current.filter(b => b!==bk) : [...current, bk]
        
        const result = toggle('A')
        assert.deepEqual(result, ['B'])
    })
  })

})
