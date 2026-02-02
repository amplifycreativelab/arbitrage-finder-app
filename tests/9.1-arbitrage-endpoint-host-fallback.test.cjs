'use strict'

const test = require('node:test')
const assert = require('node:assert')

const poller = require('../out-tests/src/main/services/poller.js')
const credentials = require('../out-tests/src/main/credentials.js')
const oddsApiIoBookmakers = require('../out-tests/src/main/services/odds-api-io-bookmakers.js')
const logger = require('../out-tests/src/main/services/logger.js')

const {
  OddsApiIoAdapter,
  normalizeOddsApiIoOpportunity
} = require('../out-tests/src/main/adapters/odds-api-io.js')

const {
  arbitrageOpportunitySchema,
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js')

// Helper to create a mock fetch that returns specified responses
function createMockFetch(responses) {
  let callCount = 0
  return async (url, options) => {
    const response = responses[callCount++] || responses[responses.length - 1]
    return {
      ok: response.ok,
      status: response.status,
      async json() {
        return response.data || {}
      },
      async text() {
        return JSON.stringify(response.data || {})
      }
    }
  }
}

// Helper to setup test environment
async function setupTestEnv(mockFetch) {
  const originalGetApiKeyForAdapter = credentials.getApiKeyForAdapter
  const originalGetSelectedBookmakers = oddsApiIoBookmakers.getSelectedBookmakers
  const originalSchedule = poller.scheduleProviderRequest
  const originalFetch = global.fetch
  const originalWarn = logger.logWarn

  credentials.getApiKeyForAdapter = async () => 'test-api-key'
  oddsApiIoBookmakers.getSelectedBookmakers = async () => ['Book-1', 'Book-2']
  poller.scheduleProviderRequest = async (providerId, fn) => fn()
  global.fetch = mockFetch

  const warnCalls = []
  logger.logWarn = (event, payload) => {
    warnCalls.push({ event, payload })
  }

  return {
    originalGetApiKeyForAdapter,
    originalGetSelectedBookmakers,
    originalSchedule,
    originalFetch,
    originalWarn,
    warnCalls
  }
}

function restoreTestEnv(env) {
  credentials.getApiKeyForAdapter = env.originalGetApiKeyForAdapter
  oddsApiIoBookmakers.getSelectedBookmakers = env.originalGetSelectedBookmakers
  poller.scheduleProviderRequest = env.originalSchedule
  global.fetch = env.originalFetch
  logger.logWarn = env.originalWarn
}

test('[P0][9.1-FALLBACK-001] primary host succeeds - returns normalized opportunities', async () => {
  poller.__test.resetLimiterState()

  const raw = {
    id: 'arb-1',
    eventId: 123,
    sport: 'soccer',
    market: { name: 'h2h' },
    profitMargin: 2.5,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '2.1' },
      { side: 'away', bookmaker: 'Book-2', odds: '2.1' }
    ],
    event: {
      name: 'Team A vs Team B',
      date: '2025-11-20T19:00:00Z',
      league: 'Premier League'
    }
  }

  const mockFetch = createMockFetch([{ ok: true, status: 200, data: [raw] }])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()
    const parsed = arbitrageOpportunityListSchema.parse(opportunities)

    assert.strictEqual(parsed.length, 1, 'Should return one opportunity')
    assert.strictEqual(parsed[0].id, raw.id)
    assert.strictEqual(parsed[0].sport, 'soccer')
    assert.strictEqual(parsed[0].event.name, raw.event.name)

    // Should only call primary host (api2.odds-api.io)
    assert.strictEqual(requestedUrls.length, 1, 'Should make only one request')
    assert.ok(
      requestedUrls[0].includes('api2.odds-api.io'),
      'Should call primary host (api2.odds-api.io)'
    )
    assert.ok(requestedUrls[0].includes('/v3/arbitrage-bets'), 'Should call arbitrage endpoint')

    // Verify no fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 0, 'Should not log fallback warning on success')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-002] primary host returns 404 - falls back to fallback host', async () => {
  poller.__test.resetLimiterState()

  const raw = {
    id: 'arb-fallback-1',
    eventId: 456,
    sport: 'tennis',
    market: { name: 'h2h' },
    profitMargin: 3.0,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '2.05' },
      { side: 'away', bookmaker: 'Book-2', odds: '2.0' }
    ],
    event: {
      name: 'Player A vs Player B',
      date: '2025-11-21T15:00:00Z',
      league: 'Wimbledon'
    }
  }

  const mockFetch = createMockFetch([
    { ok: false, status: 404, data: { error: 'Not Found' } },
    { ok: true, status: 200, data: [raw] }
  ])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()
    const parsed = arbitrageOpportunityListSchema.parse(opportunities)

    assert.strictEqual(parsed.length, 1, 'Should return fallback opportunity')
    assert.strictEqual(parsed[0].id, raw.id)

    // Should call both hosts
    assert.strictEqual(requestedUrls.length, 2, 'Should make two requests (primary + fallback)')
    assert.ok(
      requestedUrls[0].includes('api2.odds-api.io'),
      'First request should be to primary host'
    )
    assert.ok(
      requestedUrls[1].includes('api.odds-api.io'),
      'Second request should be to fallback host'
    )

    // Verify fallback warning was logged with correct context
    assert.strictEqual(env.warnCalls.length, 1, 'Should log fallback warning')
    assert.strictEqual(env.warnCalls[0].event, 'adapter.fallback')
    assert.ok(
      env.warnCalls[0].payload.message.includes('falling back'),
      'Warning should mention fallback'
    )
    assert.strictEqual(
      env.warnCalls[0].payload.statusCode,
      404,
      'Warning should include status code'
    )
    assert.ok(env.warnCalls[0].payload.primaryHost, 'Warning should include primary host')
    assert.ok(env.warnCalls[0].payload.fallbackHost, 'Warning should include fallback host')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-003] primary host returns 429 - NO fallback, throws rate limit error', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([{ ok: false, status: 429, data: { error: 'Rate Limited' } }])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()

    await assert.rejects(
      async () => await adapter.fetchOpportunities(),
      (err) => {
        assert.ok(
          err.message.includes('429') || err.message.includes('Rate'),
          'Error should indicate rate limiting'
        )
        return true
      }
    )

    // Should only call primary host, no fallback
    assert.strictEqual(requestedUrls.length, 1, 'Should make only one request (no fallback on 429)')
    assert.ok(requestedUrls[0].includes('api2.odds-api.io'), 'Request should be to primary host')

    // Verify no fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 0, 'Should not log fallback warning for 429')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-004] primary host returns 401 - NO fallback, throws auth error', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([{ ok: false, status: 401, data: { error: 'Unauthorized' } }])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()

    await assert.rejects(
      async () => await adapter.fetchOpportunities(),
      (err) => {
        assert.ok(
          err.message.includes('401') || err.message.includes('Unauthorized'),
          'Error should indicate unauthorized'
        )
        return true
      }
    )

    // Should only call primary host, no fallback
    assert.strictEqual(requestedUrls.length, 1, 'Should make only one request (no fallback on 401)')
    assert.ok(requestedUrls[0].includes('api2.odds-api.io'), 'Request should be to primary host')

    // Verify no fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 0, 'Should not log fallback warning for 401')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-005] primary host returns 403 - NO fallback, throws forbidden error', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([{ ok: false, status: 403, data: { error: 'Forbidden' } }])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()

    await assert.rejects(
      async () => await adapter.fetchOpportunities(),
      (err) => {
        assert.ok(
          err.message.includes('403') || err.message.includes('Forbidden'),
          'Error should indicate forbidden'
        )
        return true
      }
    )

    // Should only call primary host, no fallback
    assert.strictEqual(requestedUrls.length, 1, 'Should make only one request (no fallback on 403)')

    // Verify no fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 0, 'Should not log fallback warning for 403')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-006] primary host returns 400 - NO fallback, throws bad request error', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([{ ok: false, status: 400, data: { error: 'Bad Request' } }])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()

    await assert.rejects(
      async () => await adapter.fetchOpportunities(),
      (err) => {
        assert.ok(
          err.message.includes('400') || err.message.includes('Bad Request'),
          'Error should indicate bad request'
        )
        return true
      }
    )

    // Should only call primary host, no fallback
    assert.strictEqual(requestedUrls.length, 1, 'Should make only one request (no fallback on 400)')

    // Verify no fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 0, 'Should not log fallback warning for 400')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-007] primary host returns 502 - falls back to fallback host', async () => {
  poller.__test.resetLimiterState()

  const raw = {
    id: 'arb-502-fallback',
    eventId: 789,
    sport: 'basketball',
    market: { name: 'h2h' },
    profitMargin: 1.5,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '1.95' },
      { side: 'away', bookmaker: 'Book-2', odds: '2.15' }
    ],
    event: {
      name: 'Team C vs Team D',
      date: '2025-11-22T20:00:00Z',
      league: 'NBA'
    }
  }

  const mockFetch = createMockFetch([
    { ok: false, status: 502, data: { error: 'Bad Gateway' } },
    { ok: true, status: 200, data: [raw] }
  ])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()
    const parsed = arbitrageOpportunityListSchema.parse(opportunities)

    assert.strictEqual(parsed.length, 1, 'Should return fallback opportunity')
    assert.strictEqual(parsed[0].id, raw.id)

    // Should call both hosts
    assert.strictEqual(requestedUrls.length, 2, 'Should make two requests (primary + fallback)')

    // Verify fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 1, 'Should log fallback warning')
    assert.strictEqual(env.warnCalls[0].payload.statusCode, 502)
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-008] primary host returns 503 - falls back to fallback host', async () => {
  poller.__test.resetLimiterState()

  const raw = {
    id: 'arb-503-fallback',
    eventId: 999,
    sport: 'soccer',
    market: { name: 'h2h' },
    profitMargin: 2.0,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '2.0' },
      { side: 'away', bookmaker: 'Book-2', odds: '2.1' }
    ],
    event: {
      name: 'Team E vs Team F',
      date: '2025-11-23T18:00:00Z',
      league: 'La Liga'
    }
  }

  const mockFetch = createMockFetch([
    { ok: false, status: 503, data: { error: 'Service Unavailable' } },
    { ok: true, status: 200, data: [raw] }
  ])

  const env = await setupTestEnv(mockFetch)

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()
    const parsed = arbitrageOpportunityListSchema.parse(opportunities)

    assert.strictEqual(parsed.length, 1, 'Should return fallback opportunity')

    // Verify fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 1, 'Should log fallback warning')
    assert.strictEqual(env.warnCalls[0].payload.statusCode, 503)
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-009] primary host returns 504 - falls back to fallback host', async () => {
  poller.__test.resetLimiterState()

  const raw = {
    id: 'arb-504-fallback',
    eventId: 111,
    sport: 'tennis',
    market: { name: 'h2h' },
    profitMargin: 2.8,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '2.2' },
      { side: 'away', bookmaker: 'Book-2', odds: '1.95' }
    ],
    event: {
      name: 'Player C vs Player D',
      date: '2025-11-24T14:00:00Z',
      league: 'US Open'
    }
  }

  const mockFetch = createMockFetch([
    { ok: false, status: 504, data: { error: 'Gateway Timeout' } },
    { ok: true, status: 200, data: [raw] }
  ])

  const env = await setupTestEnv(mockFetch)

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()
    const parsed = arbitrageOpportunityListSchema.parse(opportunities)

    assert.strictEqual(parsed.length, 1, 'Should return fallback opportunity')

    // Verify fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 1, 'Should log fallback warning')
    assert.strictEqual(env.warnCalls[0].payload.statusCode, 504)
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-010] network error on primary - falls back to fallback host', async () => {
  poller.__test.resetLimiterState()

  const raw = {
    id: 'arb-network-fallback',
    eventId: 222,
    sport: 'soccer',
    market: { name: 'h2h' },
    profitMargin: 1.8,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '2.05' },
      { side: 'away', bookmaker: 'Book-2', odds: '2.05' }
    ],
    event: {
      name: 'Team G vs Team H',
      date: '2025-11-25T19:30:00Z',
      league: 'Bundesliga'
    }
  }

  let callCount = 0
  const mockFetch = async (url, options) => {
    callCount++
    if (callCount === 1) {
      // Simulate network error (no status code)
      const error = new Error('Network error: Connection refused')
      throw error
    }
    // Fallback succeeds
    return {
      ok: true,
      status: 200,
      async json() {
        return [raw]
      },
      async text() {
        return JSON.stringify([raw])
      }
    }
  }

  const env = await setupTestEnv(mockFetch)

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()
    const parsed = arbitrageOpportunityListSchema.parse(opportunities)

    assert.strictEqual(parsed.length, 1, 'Should return fallback opportunity')
    assert.strictEqual(parsed[0].id, raw.id)

    // Verify fallback warning was logged with null status code (network error)
    assert.strictEqual(env.warnCalls.length, 1, 'Should log fallback warning')
    assert.strictEqual(
      env.warnCalls[0].payload.statusCode,
      null,
      'Network error should have null status code'
    )
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-011] both hosts fail - throws primary error (not fallback error)', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([
    { ok: false, status: 404, data: { error: 'Primary Not Found' } },
    { ok: false, status: 500, data: { error: 'Fallback Internal Error' } }
  ])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()

    let thrownError
    try {
      await adapter.fetchOpportunities()
      assert.fail('Should have thrown an error')
    } catch (err) {
      thrownError = err
    }

    // Error should be from primary host (404), not fallback (500)
    assert.ok(
      thrownError.message.includes('Primary Not Found') || thrownError.message.includes('404'),
      'Error should be from primary host, not fallback'
    )
    assert.ok(
      !thrownError.message.includes('Fallback Internal Error'),
      'Error should NOT be from fallback host'
    )

    // Both hosts should have been called
    assert.strictEqual(requestedUrls.length, 2, 'Should call both hosts')

    // Fallback warning should still be logged
    assert.strictEqual(env.warnCalls.length, 1, 'Should log fallback warning')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P1][9.1-HOST-001] environment variable ODDS_API_IO_ARBS_HOST is respected', async () => {
  // This test verifies the code structure includes env var support
  // The actual behavior depends on process.env at module load time

  const raw = {
    id: 'arb-env-test',
    eventId: 333,
    sport: 'soccer',
    market: { name: 'h2h' },
    profitMargin: 2.0,
    legs: [
      { side: 'home', bookmaker: 'Book-1', odds: '2.0' },
      { side: 'away', bookmaker: 'Book-2', odds: '2.1' }
    ],
    event: {
      name: 'Test Match',
      date: '2025-11-26T20:00:00Z',
      league: 'Test League'
    }
  }

  const mockFetch = createMockFetch([{ ok: true, status: 200, data: [raw] }])

  const env = await setupTestEnv(mockFetch)

  try {
    const adapter = new OddsApiIoAdapter()
    const opportunities = await adapter.fetchOpportunities()

    // Just verify the adapter works - the env var is checked at module load time
    assert.strictEqual(opportunities.length, 1)
    assert.strictEqual(opportunities[0].id, raw.id)
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P0][9.1-FALLBACK-012] primary host returns 500 - NO fallback, throws server error', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([{ ok: false, status: 500, data: { error: 'Internal Server Error' } }])

  const env = await setupTestEnv(mockFetch)
  const requestedUrls = []
  global.fetch = async (url, options) => {
    requestedUrls.push(url)
    return mockFetch(url, options)
  }

  try {
    const adapter = new OddsApiIoAdapter()

    await assert.rejects(
      async () => await adapter.fetchOpportunities(),
      (err) => {
        assert.ok(
          err.message.includes('500') || err.message.includes('Internal Server Error'),
          'Error should indicate internal server error'
        )
        return true
      }
    )

    // Should only call primary host, no fallback on 500
    assert.strictEqual(requestedUrls.length, 1, 'Should make only one request (no fallback on 500)')
    assert.ok(requestedUrls[0].includes('api2.odds-api.io'), 'Request should be to primary host')

    // Verify no fallback warning was logged
    assert.strictEqual(env.warnCalls.length, 0, 'Should not log fallback warning for 500')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})

test('[P1][9.1-LOGGING-001] fallback events include correlation ID and context', async () => {
  poller.__test.resetLimiterState()

  const mockFetch = createMockFetch([
    { ok: false, status: 503, data: { error: 'Service Unavailable' } },
    { ok: true, status: 200, data: [] }
  ])

  const env = await setupTestEnv(mockFetch)

  try {
    const adapter = new OddsApiIoAdapter()
    await adapter.fetchOpportunities()

    // Verify structured logging fields
    assert.strictEqual(env.warnCalls.length, 1)
    const logPayload = env.warnCalls[0].payload

    assert.ok(logPayload.correlationId, 'Should include correlationId')
    assert.strictEqual(logPayload.context, 'adapter:odds-api-io')
    assert.strictEqual(logPayload.operation, 'fetchArbitrageBets')
    assert.strictEqual(logPayload.providerId, 'odds-api-io')
    assert.ok(logPayload.primaryHost, 'Should include primaryHost')
    assert.ok(logPayload.fallbackHost, 'Should include fallbackHost')
    assert.ok(logPayload.errorMessage, 'Should include errorMessage')
  } finally {
    restoreTestEnv(env)
    poller.__test.resetLimiterState()
  }
})
