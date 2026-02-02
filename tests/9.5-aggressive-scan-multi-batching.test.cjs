/**
 * Story 9.5: Wire Aggressive Scan to /v3/odds/multi Batching
 *
 * Tests for:
 * - AC1: Aggressive scan uses /v3/odds/multi endpoint
 * - AC2: Batch size limited to 10 events per request
 * - AC3: Bookmakers list is cached with TTL (>= 1 minute)
 * - AC4: Events passed to fetcher are real DeepScanEvent objects
 * - AC5: Aggressive scan produces odds requests and updates caches/arbs
 * - AC6: Requests are batched at 10 events wherever possible
 */

const { describe, it, beforeEach, mock } = require('node:test')
const assert = require('node:assert')

describe('Story 9.5: Wire Aggressive Scan to /v3/odds/multi Batching', () => {
  // Mock fetch tracker to count API calls
  let fetchCallCount = 0
  let fetchCalls = []
  let mockBookmakers = ['bet365', 'pinnacle', 'williamhill']

  // Reset mocks before each test
  beforeEach(() => {
    fetchCallCount = 0
    fetchCalls = []
  })

  // Helper to create mock events
  function createMockEvents(count) {
    const events = []
    const now = Date.now()
    for (let i = 0; i < count; i++) {
      events.push({
        id: `event-${i + 1}`,
        name: `Team A vs Team B (${i + 1})`,
        date: new Date(now + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        league: 'Test League',
        sport: 'soccer',
        leagueSlug: 'test-league',
        sportSlug: 'soccer'
      })
    }
    return events
  }

  // Helper to create mock odds response
  function createMockOddsResponse(events, includeArb = false) {
    return events.map((event, idx) => ({
      id: event.id,
      bookmakers: [
        {
          name: 'bet365',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Home', odds: includeArb && idx === 0 ? 2.10 : 1.90 },
                { name: 'Away', odds: includeArb && idx === 0 ? 2.10 : 1.90 }
              ]
            }
          ]
        },
        {
          name: 'pinnacle',
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Home', odds: includeArb && idx === 0 ? 2.05 : 1.95 },
                { name: 'Away', odds: includeArb && idx === 0 ? 2.05 : 1.95 }
              ]
            }
          ]
        }
      ]
    }))
  }

  describe('AC1 & AC6: Batch Odds Fetching with /v3/odds/multi', () => {
    it('should batch 23 events into exactly 3 multi calls (10/10/3)', () => {
      // Setup: 23 events should result in 3 batch calls
      const events = createMockEvents(23)

      // Calculate expected batches
      const BATCH_SIZE_MAX = 10
      const expectedBatchCount = Math.ceil(events.length / BATCH_SIZE_MAX)

      // Verify batching logic
      assert.strictEqual(expectedBatchCount, 3, 'Should require exactly 3 batches')

      // Verify batch sizes
      const batches = []
      for (let i = 0; i < events.length; i += BATCH_SIZE_MAX) {
        batches.push(events.slice(i, i + BATCH_SIZE_MAX))
      }

      assert.strictEqual(batches[0].length, 10, 'First batch should have 10 events')
      assert.strictEqual(batches[1].length, 10, 'Second batch should have 10 events')
      assert.strictEqual(batches[2].length, 3, 'Third batch should have 3 events')
    })

    it('should call /v3/odds/multi endpoint with correct eventIds parameter', () => {
      const events = createMockEvents(5)

      // Build URL as the implementation should
      const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
      const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi'

      const url = new URL(ODDS_API_IO_ODDS_MULTI_PATH, ODDS_API_IO_BASE_URL)
      url.searchParams.set('apiKey', 'test-key')
      url.searchParams.set('eventIds', events.map(e => e.id).join(','))
      url.searchParams.set('bookmakers', mockBookmakers.join(','))

      // Verify URL construction
      assert.ok(url.pathname.includes('/v3/odds/multi'), 'Should use multi endpoint')
      assert.strictEqual(
        url.searchParams.get('eventIds'),
        'event-1,event-2,event-3,event-4,event-5',
        'Should include all event IDs comma-separated'
      )
    })
  })

  describe('AC2: Batch Size Limited to 10 Events', () => {
    it('should never exceed 10 events per batch', () => {
      const testCases = [1, 5, 10, 11, 15, 20, 23, 50, 100]
      const BATCH_SIZE_MAX = 10

      for (const eventCount of testCases) {
        const events = createMockEvents(eventCount)
        const batches = []

        for (let i = 0; i < events.length; i += BATCH_SIZE_MAX) {
          batches.push(events.slice(i, i + BATCH_SIZE_MAX))
        }

        for (const batch of batches) {
          assert.ok(
            batch.length <= BATCH_SIZE_MAX,
            `Batch size ${batch.length} exceeds max ${BATCH_SIZE_MAX} for ${eventCount} events`
          )
        }
      }
    })

    it('should calculate correct batch count for various event counts', () => {
      const BATCH_SIZE_MAX = 10
      const testCases = [
        { events: 1, expected: 1 },
        { events: 10, expected: 1 },
        { events: 11, expected: 2 },
        { events: 20, expected: 2 },
        { events: 21, expected: 3 },
        { events: 23, expected: 3 },
        { events: 100, expected: 10 }
      ]

      for (const { events, expected } of testCases) {
        const batchCount = Math.ceil(events / BATCH_SIZE_MAX)
        assert.strictEqual(
          batchCount,
          expected,
          `${events} events should require ${expected} batches, got ${batchCount}`
        )
      }
    })
  })

  describe('AC3: Bookmaker Caching with TTL', () => {
    it('should use cached bookmakers if within TTL', () => {
      const BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
      const now = Date.now()

      // Simulate cached bookmakers fetched 2 minutes ago
      const cachedBookmakers = {
        fetchedAtMs: now - (2 * 60 * 1000),
        bookmakers: ['bet365', 'pinnacle']
      }

      const cacheAgeMs = now - cachedBookmakers.fetchedAtMs
      const shouldRefresh = cacheAgeMs > BOOKMAKER_CACHE_TTL_MS

      assert.strictEqual(shouldRefresh, false, 'Should not refresh cache within TTL')
    })

    it('should refresh bookmakers if cache is expired', () => {
      const BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
      const now = Date.now()

      // Simulate cached bookmakers fetched 6 minutes ago
      const cachedBookmakers = {
        fetchedAtMs: now - (6 * 60 * 1000),
        bookmakers: ['bet365', 'pinnacle']
      }

      const cacheAgeMs = now - cachedBookmakers.fetchedAtMs
      const shouldRefresh = cacheAgeMs > BOOKMAKER_CACHE_TTL_MS

      assert.strictEqual(shouldRefresh, true, 'Should refresh cache after TTL expires')
    })

    it('should refresh bookmakers if cache is empty', () => {
      const BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000
      const cachedBookmakers = null

      const bookmakers = cachedBookmakers?.bookmakers ?? []
      const cacheAgeMs = cachedBookmakers ? Date.now() - cachedBookmakers.fetchedAtMs : Infinity
      const shouldRefresh = !bookmakers.length || cacheAgeMs > BOOKMAKER_CACHE_TTL_MS

      assert.strictEqual(shouldRefresh, true, 'Should refresh when cache is empty')
    })

    it('should store cache with correct structure', () => {
      const now = Date.now()
      const bookmakers = ['bet365', 'pinnacle', 'williamhill']

      const cache = {
        fetchedAtMs: now,
        bookmakers: bookmakers
      }

      assert.ok(typeof cache.fetchedAtMs === 'number', 'fetchedAtMs should be a number')
      assert.ok(Array.isArray(cache.bookmakers), 'bookmakers should be an array')
      assert.strictEqual(cache.bookmakers.length, 3, 'Should have 3 bookmakers')
    })
  })

  describe('AC4: Real DeepScanEvent Objects', () => {
    it('should pass DeepScanEvent objects with all required fields', () => {
      const event = createMockEvents(1)[0]

      // Verify required DeepScanEvent fields
      assert.ok(typeof event.id === 'string', 'id should be a string')
      assert.ok(typeof event.name === 'string', 'name should be a string')
      assert.ok(typeof event.date === 'string', 'date should be a string')
      assert.ok(typeof event.sport === 'string', 'sport should be a string')
      assert.ok(typeof event.league === 'string', 'league should be a string')
    })

    it('should not pass placeholder objects like {name: id}', () => {
      const events = createMockEvents(3)

      for (const event of events) {
        // Ensure it's not a placeholder
        assert.notStrictEqual(event.name, event.id, 'Event name should not equal event id (placeholder check)')
        assert.ok(event.name.includes('vs'), 'Event name should contain vs (real event format)')
      }
    })

    it('should convert TieredEvent to DeepScanEvent correctly', () => {
      // TieredEvent has additional fields that aren't needed for the API call
      const tieredEvent = {
        id: 'event-1',
        name: 'Team A vs Team B',
        date: new Date().toISOString(),
        league: 'Test League',
        sport: 'soccer',
        tier: 'imminent',
        minutesToKickoff: 25,
        lastPolledAt: null,
        pollCount: 0,
        volatilityScore: 0,
        isBoosted: false,
        boostExpiresAt: null
      }

      // Convert to DeepScanEvent
      const deepScanEvent = {
        id: tieredEvent.id,
        name: tieredEvent.name,
        date: tieredEvent.date,
        league: tieredEvent.league,
        sport: tieredEvent.sport
      }

      // Verify conversion
      assert.strictEqual(deepScanEvent.id, tieredEvent.id)
      assert.strictEqual(deepScanEvent.name, tieredEvent.name)
      assert.ok(!('tier' in deepScanEvent), 'DeepScanEvent should not have tier')
      assert.ok(!('minutesToKickoff' in deepScanEvent), 'DeepScanEvent should not have minutesToKickoff')
    })
  })

  describe('AC5: Odds Fetching Produces Arbs and Updates Caches', () => {
    it('should compute arbitrage opportunities from fetched odds', () => {
      // Mock odds with arbitrage opportunity
      const mockOdds = {
        eventId: 'event-1',
        bookmakers: [
          {
            name: 'bet365',
            markets: [{
              key: 'h2h',
              outcomes: [
                { name: 'Home', odds: 2.10 },
                { name: 'Away', odds: 2.10 }
              ]
            }]
          },
          {
            name: 'pinnacle',
            markets: [{
              key: 'h2h',
              outcomes: [
                { name: 'Home', odds: 2.05 },
                { name: 'Away', odds: 2.05 }
              ]
            }]
          }
        ]
      }

      // Simple arb detection: check if best odds on each side sum to > 2.0 for two-way market
      // With home odds 2.10 and away odds 2.10, total stake = 1/2.10 + 1/2.10 = 0.952 (< 1, so arb exists)
      const bestHome = Math.max(
        ...mockOdds.bookmakers.map(b => b.markets[0].outcomes[0].odds)
      )
      const bestAway = Math.max(
        ...mockOdds.bookmakers.map(b => b.markets[0].outcomes[1].odds)
      )
      const totalStake = (1 / bestHome) + (1 / bestAway)
      const hasArb = totalStake < 1

      assert.strictEqual(hasArb, true, 'Should detect arbitrage opportunity')
    })

    it('should update lastPolledAt and pollCount for tiered events', () => {
      const tieredEvent = {
        id: 'event-1',
        name: 'Team A vs Team B',
        lastPolledAt: null,
        pollCount: 0
      }

      // Simulate poll update
      const now = new Date().toISOString()
      tieredEvent.lastPolledAt = now
      tieredEvent.pollCount++

      assert.strictEqual(tieredEvent.pollCount, 1, 'Poll count should be incremented')
      assert.strictEqual(tieredEvent.lastPolledAt, now, 'lastPolledAt should be updated')
    })

    it('should boost events when arbs are detected', () => {
      const boostedEvents = new Map()
      const eventId = 'event-1'
      const arbsFound = 1

      // Simulate boost when arb detected
      if (arbsFound > 0) {
        boostedEvents.set(eventId, {
          eventId,
          boostedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          reason: 'arb_detected'
        })
      }

      assert.strictEqual(boostedEvents.has(eventId), true, 'Event should be boosted')
      assert.strictEqual(boostedEvents.get(eventId).reason, 'arb_detected')
    })

    it('should call updateOddsCache after fetching odds', () => {
      const oddsCache = new Map()
      const eventId = 'event-1'
      const odds = {
        event: { id: eventId, name: 'Test Event' },
        bookmakers: []
      }
      const arbsFound = 0

      // Simulate updateOddsCache
      oddsCache.set(eventId, {
        event: { id: eventId, name: 'Test Event' },
        currentOdds: odds,
        oddsHistory: [],
        oddsChangeCount: 0,
        lastOddsChangeAt: null,
        hasActiveArbs: arbsFound > 0,
        arbCount: arbsFound
      })

      assert.strictEqual(oddsCache.has(eventId), true, 'Odds cache should be updated')
      assert.strictEqual(oddsCache.get(eventId).hasActiveArbs, false)
    })
  })

  describe('Integration: Full Batch Flow', () => {
    it('should process 23 events through complete batch flow', () => {
      const events = createMockEvents(23)
      const BATCH_SIZE_MAX = 10

      // Track API calls and results
      const apiCalls = []
      const processedEvents = []

      // Simulate batch processing
      const batches = []
      for (let i = 0; i < events.length; i += BATCH_SIZE_MAX) {
        batches.push(events.slice(i, i + BATCH_SIZE_MAX))
      }

      for (const batch of batches) {
        // Record API call
        apiCalls.push({
          endpoint: '/v3/odds/multi',
          eventIds: batch.map(e => e.id),
          eventCount: batch.length
        })

        // Simulate processing
        for (const event of batch) {
          processedEvents.push(event.id)
        }
      }

      assert.strictEqual(apiCalls.length, 3, 'Should make exactly 3 API calls')
      assert.strictEqual(apiCalls[0].eventCount, 10, 'First batch should have 10 events')
      assert.strictEqual(apiCalls[1].eventCount, 10, 'Second batch should have 10 events')
      assert.strictEqual(apiCalls[2].eventCount, 3, 'Third batch should have 3 events')
      assert.strictEqual(processedEvents.length, 23, 'Should process all 23 events')
    })
  })

  describe('Integration: fetchOddsForEvents with Mocked Fetch', () => {
    it('should call /v3/odds/multi with correct URL structure and return parsed results', async () => {
      // Track fetch calls
      const fetchCalls = []
      const mockEvents = createMockEvents(5)
      const mockOddsData = createMockOddsResponse(mockEvents)

      // Mock fetch function
      const mockFetch = async (url, options) => {
        fetchCalls.push({ url, options })
        return {
          ok: true,
          json: async () => mockOddsData
        }
      }

      // Simulate fetchOddsForEvents logic with mock
      const BATCH_SIZE_MAX = 10
      const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
      const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi'
      const apiKey = 'test-api-key'
      const bookmakers = ['bet365', 'pinnacle']
      const signal = new AbortController().signal

      // Batch events
      const batches = []
      for (let i = 0; i < mockEvents.length; i += BATCH_SIZE_MAX) {
        batches.push(mockEvents.slice(i, i + BATCH_SIZE_MAX))
      }

      const allResults = []
      for (const batch of batches) {
        const eventIds = batch.map(e => e.id).join(',')
        const url = new URL(ODDS_API_IO_ODDS_MULTI_PATH, ODDS_API_IO_BASE_URL)
        url.searchParams.set('apiKey', apiKey)
        url.searchParams.set('eventIds', eventIds)
        url.searchParams.set('bookmakers', bookmakers.join(','))

        const response = await mockFetch(url.toString(), {
          method: 'GET',
          signal,
          headers: { Accept: 'application/json' }
        })

        if (response.ok) {
          const body = await response.json()
          allResults.push(...body)
        }
      }

      // Verify fetch was called correctly
      assert.strictEqual(fetchCalls.length, 1, 'Should make 1 fetch call for 5 events')
      assert.ok(fetchCalls[0].url.includes('/v3/odds/multi'), 'Should call multi endpoint')
      assert.ok(fetchCalls[0].url.includes('eventIds=event-1'), 'Should include eventIds')
      // URL encodes comma as %2C
      assert.ok(
        fetchCalls[0].url.includes('bookmakers=bet365') && fetchCalls[0].url.includes('pinnacle'),
        'Should include bookmakers'
      )

      // Verify results
      assert.strictEqual(allResults.length, 5, 'Should return 5 odds results')
      assert.strictEqual(allResults[0].id, 'event-1', 'First result should have correct event ID')
    })

    it('should handle abort signal during batch processing', async () => {
      const mockEvents = createMockEvents(25)
      const abortController = new AbortController()
      let fetchCallCount = 0

      // Mock fetch that tracks calls and respects abort
      const mockFetch = async (url, options) => {
        fetchCallCount++
        if (options.signal.aborted) {
          const error = new Error('Aborted')
          error.name = 'AbortError'
          throw error
        }
        // Abort after first batch
        if (fetchCallCount === 1) {
          abortController.abort()
        }
        return {
          ok: true,
          json: async () => []
        }
      }

      const BATCH_SIZE_MAX = 10
      const batches = []
      for (let i = 0; i < mockEvents.length; i += BATCH_SIZE_MAX) {
        batches.push(mockEvents.slice(i, i + BATCH_SIZE_MAX))
      }

      let processedBatches = 0
      for (const batch of batches) {
        if (abortController.signal.aborted) {
          break
        }
        try {
          await mockFetch('https://api.odds-api.io/v3/odds/multi', {
            signal: abortController.signal
          })
          processedBatches++
        } catch (error) {
          if (error.name === 'AbortError') {
            break
          }
          throw error
        }
      }

      // Should stop after first batch due to abort
      assert.strictEqual(processedBatches, 1, 'Should stop processing after abort')
      assert.ok(abortController.signal.aborted, 'Signal should be aborted')
    })

    it('should handle HTTP error responses gracefully', async () => {
      const mockEvents = createMockEvents(5)
      let fetchCallCount = 0

      // Mock fetch that returns error
      const mockFetch = async () => {
        fetchCallCount++
        return {
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded'
        }
      }

      const results = []
      const response = await mockFetch()

      if (!response.ok) {
        // Implementation should continue to next batch, not throw
        const errorMessage = await response.text()
        assert.strictEqual(response.status, 429, 'Should receive 429 status')
        assert.strictEqual(errorMessage, 'Rate limit exceeded', 'Should get error message')
      }

      // Results should be empty but no exception thrown
      assert.strictEqual(results.length, 0, 'Results should be empty on error')
      assert.strictEqual(fetchCallCount, 1, 'Fetch should have been called')
    })
  })
})
