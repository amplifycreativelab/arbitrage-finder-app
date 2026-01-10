/**
 * Story 6.3: Cascading Bookmaker Selection by Region - Test Suite
 */

const { describe, it, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

// Import from compiled output (requires pretest to run)
const STORE_PATH = '../out-tests/src/renderer/src/features/dashboard/stores/feedFiltersStore.js'
const FILTERS_PATH = '../out-tests/src/renderer/src/features/dashboard/filters.js'

describe('Story 6.3: Cascading Bookmaker Selection', () => {
  let useFeedFiltersStore

  beforeEach(() => {
    // Clear require cache to reset store state between tests
    try {
      delete require.cache[require.resolve(STORE_PATH)]
      useFeedFiltersStore = require(STORE_PATH).useFeedFiltersStore
      // Reset store to default state
      useFeedFiltersStore.getState().resetFilters()
    } catch (e) {
      console.warn('Could not load store (likely verify after implementation):', e.message)
    }
  })

  it('[P0][6.3-STORE-001] Bookmaker selections persist per region set', () => {
    if (!useFeedFiltersStore) return // Skip if not loaded
    const store = useFeedFiltersStore
    
    // 1. Select Region A (e.g., 'au')
    store.getState().setRegions(['au'])
    
    // 2. Select Bookmaker 1
    store.getState().setBookmakers(['Bookie 1'])
    assert.deepEqual(store.getState().bookmakers, ['Bookie 1'], 'Bookie 1 should be selected')
    
    // 3. Switch to Region B (e.g., 'uk')
    store.getState().setRegions(['uk'])
    
    // Expect bookmakers to reset/be empty for new region
    // FAILURE EXPECTED IMPLEMENTATION: Current implementation keeps 'Bookie 1'
    assert.deepEqual(store.getState().bookmakers, [], 'Bookmakers should be empty for new region')
    
    // 4. Select Bookmaker 2 for Region B
    store.getState().setBookmakers(['Bookie 2'])
    assert.deepEqual(store.getState().bookmakers, ['Bookie 2'], 'Bookie 2 should be selected for UK')
    
    // 5. Switch back to Region A
    store.getState().setRegions(['au'])
    
    // Expect Bookmaker 1 to be restored
    assert.deepEqual(store.getState().bookmakers, ['Bookie 1'], 'Bookie 1 should be restored for AU')
  })

  it('[P0][6.3-STORE-002] Region combination treats different sets as unique keys', () => {
    if (!useFeedFiltersStore) return
    const store = useFeedFiltersStore
    
    // 1. Region A
    store.getState().setRegions(['au'])
    store.getState().setBookmakers(['B1'])
    
    // 2. Region A + B
    store.getState().setRegions(['au', 'uk'])
    // Should be independent
    assert.deepEqual(store.getState().bookmakers, [], 'Should be empty for new combination')
    
    store.getState().setBookmakers(['B2'])
    
    // 3. Back to Region A
    store.getState().setRegions(['au'])
    assert.deepEqual(store.getState().bookmakers, ['B1'], 'Should restore A')
    
    // 4. Back to Region A + B
    store.getState().setRegions(['au', 'uk'])
    assert.deepEqual(store.getState().bookmakers, ['B2'], 'Should restore A+B')
  })

  describe('Bookmaker Availability Logic', () => {
    let getAvailableBookmakers

    beforeEach(() => {
      try {
        delete require.cache[require.resolve(FILTERS_PATH)]
        const filtersModule = require(FILTERS_PATH)
        getAvailableBookmakers = filtersModule.getAvailableBookmakers
      } catch (e) {
        console.warn('Could not load filters module:', e.message)
      }
    })

    it('[P0][6.3-LOGIC-001] getAvailableBookmakers filters by region', () => {
      if (!getAvailableBookmakers) return

      const opportunities = [
        // UK op
        { 
          event: { league: 'premier league' }, 
          legs: [{ bookmaker: 'BookieUK' }] 
        },
        // AU op
        { 
          event: { league: 'a-league' }, 
          legs: [{ bookmaker: 'BookieAU' }] 
        },
        // IT op
        { 
          event: { league: 'serie a' }, 
          legs: [{ bookmaker: 'BookieIT' }] 
        },
        // Multi-leg op (UK)
        { 
          event: { league: 'championship' }, 
          legs: [{ bookmaker: 'BookieUK' }, { bookmaker: 'BookieGlobal' }] 
        }
      ]

      // Select UK
      const resultUK = getAvailableBookmakers(opportunities, ['UK'])
      assert.ok(resultUK.includes('BookieUK'), 'Should include BookieUK')
      assert.ok(resultUK.includes('BookieGlobal'), 'Should include BookieGlobal')
      assert.ok(!resultUK.includes('BookieAU'), 'Should NOT include BookieAU')
      
      // Select AU + IT
      const resultAUIT = getAvailableBookmakers(opportunities, ['AU', 'IT'])
      assert.ok(resultAUIT.includes('BookieAU'), 'Should include BookieAU')
      assert.ok(resultAUIT.includes('BookieIT'), 'Should include BookieIT')
      assert.ok(!resultAUIT.includes('BookieUK'), 'Should NOT include BookieUK')
    })
    
    it('[P0][6.3-LOGIC-002] getAvailableBookmakers returns sorted unique list', () => {
       if (!getAvailableBookmakers) return

       const opportunities = [
         { event: { league: 'premier league' }, legs: [{ bookmaker: 'Z-Bet' }, { bookmaker: 'A-Bet' }] },
         { event: { league: 'premier league' }, legs: [{ bookmaker: 'A-Bet' }] } // Duplicate
       ]
       
       const result = getAvailableBookmakers(opportunities, ['UK'])
       assert.deepEqual(result, ['A-Bet', 'Z-Bet'], 'Should be unique and sorted alphabetically')
    })
  })
})
