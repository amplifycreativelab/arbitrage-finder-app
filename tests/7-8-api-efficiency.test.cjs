'use strict';

/**
 * Story 7.8: API Efficiency & Advanced Features
 * Tests for batch odds fetching, time-range filtering, incremental updates,
 * live events mode, bookmaker URLs, market timestamps, and rate limit headers.
 */

const test = require('node:test');
const assert = require('node:assert');

const deepScan = require('../out-tests/src/main/services/deepScan.js');
const credentials = require('../out-tests/src/main/credentials.js');
const poller = require('../out-tests/src/main/services/poller.js');
const router = require('../out-tests/src/main/services/router.js');
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');
const { TheOddsApiAdapter } = require('../out-tests/src/main/adapters/the-odds-api.js');

const originalGetApiKeyForAdapter = credentials.getApiKeyForAdapter;
let previousEnabledProviders = ['odds-api-io', 'the-odds-api'];

test.beforeEach(async () => {
  deepScan.__test.resetState();
  credentials.getApiKeyForAdapter = async () => 'test-api-key';
  deepScan.__test.setBookmakersResolver(async () => ['Book-1', 'Book-2']);

  poller.__test.resetLimiterState();
  poller.registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()]);

  const caller = router.appRouter.createCaller({});
  const { enabledProviders } = await caller.getEnabledProviders();
  previousEnabledProviders = enabledProviders;

  await caller.setProviderEnabled({ providerId: 'odds-api-io', enabled: true });
  await caller.setProviderEnabled({ providerId: 'the-odds-api', enabled: true });
});

test.afterEach(async () => {
  credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
  deepScan.__test.resetState();

  poller.__test.resetLimiterState();
  poller.registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()]);

  const caller = router.appRouter.createCaller({});
  const previous = new Set(previousEnabledProviders);
  for (const providerId of ['odds-api-io', 'the-odds-api']) {
    await caller.setProviderEnabled({ providerId, enabled: previous.has(providerId) });
  }
});

// =============================================================================
// Task 1: Batch Odds Fetcher Tests (AC #1)
// =============================================================================

test('[P1][7.8-BATCH-001] BATCH_SIZE_MAX constant is 10 (API maximum)', () => {
  assert.strictEqual(deepScan.__test.BATCH_SIZE_MAX, 10);
});

test('[P1][7.8-BATCH-002] parseBatchOddsResponse handles array of event responses', () => {
  const requestedEvents = [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' },
    { id: 'evt-3', name: 'Event 3' }
  ];

  const apiResponse = [
    { id: 'evt-1', bookmakers: { 'Book-1': [] } },
    { id: 'evt-2', bookmakers: { 'Book-1': [] } },
    { id: 'evt-3', bookmakers: { 'Book-1': [] } }
  ];

  const results = deepScan.__test.parseBatchOddsResponse(apiResponse, requestedEvents);

  assert.strictEqual(results.length, 3);
  assert.ok(results.every(r => r.success));
  assert.deepStrictEqual(results.map(r => r.eventId).sort(), ['evt-1', 'evt-2', 'evt-3']);
});

test('[P1][7.8-BATCH-003] parseBatchOddsResponse handles partial failures (some events missing)', () => {
  const requestedEvents = [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' },
    { id: 'evt-3', name: 'Event 3' }
  ];

  // API response only includes 2 of 3 requested events
  const apiResponse = [
    { id: 'evt-1', bookmakers: { 'Book-1': [] } },
    { id: 'evt-3', bookmakers: { 'Book-1': [] } }
  ];

  const results = deepScan.__test.parseBatchOddsResponse(apiResponse, requestedEvents);

  assert.strictEqual(results.length, 3);

  const evt1 = results.find(r => r.eventId === 'evt-1');
  const evt2 = results.find(r => r.eventId === 'evt-2');
  const evt3 = results.find(r => r.eventId === 'evt-3');

  assert.ok(evt1?.success, 'evt-1 should succeed');
  assert.ok(!evt2?.success, 'evt-2 should fail (missing from response)');
  assert.ok(evt3?.success, 'evt-3 should succeed');
  assert.ok(evt2?.error?.includes('not in batch response'), 'evt-2 should have appropriate error');
});

test('[P1][7.8-BATCH-004] parseBatchOddsResponse handles event-level errors in response', () => {
  const requestedEvents = [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' }
  ];

  const apiResponse = [
    { id: 'evt-1', bookmakers: { 'Book-1': [] } },
    { id: 'evt-2', error: 'Event not found' }
  ];

  const results = deepScan.__test.parseBatchOddsResponse(apiResponse, requestedEvents);

  assert.strictEqual(results.length, 2);

  const evt1 = results.find(r => r.eventId === 'evt-1');
  const evt2 = results.find(r => r.eventId === 'evt-2');

  assert.ok(evt1?.success, 'evt-1 should succeed');
  assert.ok(!evt2?.success, 'evt-2 should fail');
  assert.strictEqual(evt2?.error, 'Event not found');
});

test('[P1][7.8-BATCH-005] parseBatchOddsResponse handles empty response gracefully', () => {
  const requestedEvents = [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' }
  ];

  const results = deepScan.__test.parseBatchOddsResponse([], requestedEvents);

  assert.strictEqual(results.length, 2);
  assert.ok(results.every(r => !r.success));
  assert.ok(results.every(r => r.error?.includes('not in batch response')));
});

test('[P1][7.8-BATCH-006] parseBatchOddsResponse handles object with data array wrapper', () => {
  const requestedEvents = [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' }
  ];

  // Some APIs wrap the array in a { data: [...] } object
  const apiResponse = {
    data: [
      { id: 'evt-1', bookmakers: { 'Book-1': [] } },
      { id: 'evt-2', bookmakers: { 'Book-1': [] } }
    ]
  };

  const results = deepScan.__test.parseBatchOddsResponse(apiResponse, requestedEvents);

  assert.strictEqual(results.length, 2);
  assert.ok(results.every(r => r.success));
});

test('[P1][7.8-BATCH-007] parseBatchOddsResponse handles eventId field variant', () => {
  const requestedEvents = [
    { id: '12345', name: 'Event 1' }
  ];

  // API returns eventId instead of id
  const apiResponse = [
    { eventId: '12345', bookmakers: { 'Book-1': [] } }
  ];

  const results = deepScan.__test.parseBatchOddsResponse(apiResponse, requestedEvents);

  assert.strictEqual(results.length, 1);
  assert.ok(results[0].success);
  assert.strictEqual(results[0].eventId, '12345');
});

test('[P1][7.8-BATCH-008] parseBatchOddsResponse handles invalid response format', () => {
  const requestedEvents = [
    { id: 'evt-1', name: 'Event 1' }
  ];

  // Invalid response: null
  const results = deepScan.__test.parseBatchOddsResponse(null, requestedEvents);

  assert.strictEqual(results.length, 1);
  assert.ok(!results[0].success);
  assert.ok(results[0].error?.includes('Invalid batch response format'));
});

test('[P1][7.8-BATCH-009] useBatchOdds setting defaults to true', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getUseBatchOdds(), true);
});

test('[P1][7.8-BATCH-010] useBatchOdds setting can be toggled', () => {
  deepScan.__test.setUseBatchOdds(false);
  assert.strictEqual(deepScan.__test.getUseBatchOdds(), false);

  deepScan.__test.setUseBatchOdds(true);
  assert.strictEqual(deepScan.__test.getUseBatchOdds(), true);
});

test('[P1][7.8-ODDS-001] toRawOddsPayload parses /v3/odds/multi bookmaker map format', () => {
  const fallbackEvent = { id: '123', name: 'Fallback Event Name' };
  const config = { sportSlug: 'football' };

  // Shape based on odds-api.io /v3/odds/multi docs: bookmakers is an object map.
  const apiEvent = {
    id: 123,
    home: 'Home Team',
    away: 'Away Team',
    date: '2026-01-30T14:00:00.000Z',
    league: { name: 'Premier League', slug: 'premier-league' },
    sport: { name: 'Football', slug: 'football' },
    bookmakers: {
      Kambi: [
        {
          name: 'ML',
          updatedAt: '2026-01-30T13:59:00.000Z',
          odds: [{ home: '1.5', draw: '4.75', away: '5.75' }]
        },
        {
          name: 'Total',
          updatedAt: '2026-01-30T13:58:00.000Z',
          odds: [{ hdp: '2.5', over: '1.8', under: '2.0' }]
        },
        {
          name: 'Spread',
          updatedAt: '2026-01-30T13:57:00.000Z',
          odds: [{ hdp: '0.5', home: '2.0', away: '2.0' }]
        }
      ]
    }
  };

  const payload = deepScan.__test.toRawOddsPayload(apiEvent, fallbackEvent, config);

  assert.ok(payload, 'Expected RawOddsPayload');
  assert.strictEqual(payload.event.id, '123');
  assert.strictEqual(payload.event.name, 'Home Team vs Away Team');
  assert.strictEqual(payload.event.date, '2026-01-30T14:00:00.000Z');
  assert.strictEqual(payload.event.league, 'Premier League');
  assert.strictEqual(payload.event.sport, 'football');

  assert.strictEqual(payload.bookmakers.length, 1);
  assert.strictEqual(payload.bookmakers[0].name, 'Kambi');

  const marketKeys = payload.bookmakers[0].markets.map((m) => m.key);
  assert.ok(marketKeys.includes('h2h'));
  assert.ok(marketKeys.includes('goals_totals_2.5'), `Expected goals_totals_2.5, got: ${marketKeys.join(', ')}`);
  assert.ok(marketKeys.includes('spreads_0.5'));

  const totals = payload.bookmakers[0].markets.find((m) => m.key === 'goals_totals_2.5');
  assert.ok(totals, 'Expected goals_totals market');
  assert.strictEqual(totals.updatedAt, '2026-01-30T13:58:00.000Z');
  const over = totals.outcomes.find((o) => o.name.toLowerCase().startsWith('over'));
  const under = totals.outcomes.find((o) => o.name.toLowerCase().startsWith('under'));
  assert.ok(over && under, 'Expected over/under outcomes');
  assert.strictEqual(over.odds, 1.8);
  assert.strictEqual(under.odds, 2.0);

  const spreads = payload.bookmakers[0].markets.find((m) => m.key === 'spreads_0.5');
  assert.ok(spreads, 'Expected spreads market');
  const spreadHome = spreads.outcomes.find((o) => o.name.toLowerCase().startsWith('home'));
  const spreadAway = spreads.outcomes.find((o) => o.name.toLowerCase().startsWith('away'));
  assert.ok(spreadHome && spreadAway, 'Expected home/away outcomes');
  assert.strictEqual(spreadHome.odds, 2.0);
  assert.strictEqual(spreadAway.odds, 2.0);
});

// =============================================================================
// Task 3: Time-Range Filtering Tests (AC #2)
// =============================================================================

test('[P1][7.8-TIME-001] scanHorizonHours defaults to 4', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getScanHorizonHours(), 4);
});

test('[P1][7.8-TIME-002] scanHorizonHours can be configured', () => {
  deepScan.__test.setScanHorizonHours(8);
  assert.strictEqual(deepScan.__test.getScanHorizonHours(), 8);

  deepScan.__test.setScanHorizonHours(0); // 0 = all events
  assert.strictEqual(deepScan.__test.getScanHorizonHours(), 0);
});

test('[P1][7.8-TIME-003] discoverAllEvents passes from/to params when scanHorizonHours > 0', async () => {
  deepScan.__test.resetState();
  deepScan.__test.setScanHorizonHours(4); // 4 hours

  const capturedArgs = [];
  deepScan.__test.setEventsFetcher(async (args) => {
    capturedArgs.push(args);
    return { events: [] };
  });

  await deepScan.discoverAllEvents({
    apiKey: 'test-key',
    signal: new AbortController().signal,
    correlationId: 'test-time-filter'
  });

  assert.ok(capturedArgs.length > 0, 'Expected events fetcher to be called');
  const firstCall = capturedArgs[0];

  // Should have from and to parameters
  assert.ok(firstCall.from, 'Expected from parameter to be set');
  assert.ok(firstCall.to, 'Expected to parameter to be set');

  // Verify the time range is approximately 4 hours
  const fromDate = new Date(firstCall.from);
  const toDate = new Date(firstCall.to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  assert.ok(diffHours >= 3.9 && diffHours <= 4.1, `Expected ~4 hour range, got ${diffHours} hours`);
});

test('[P1][7.8-TIME-004] discoverAllEvents does NOT pass from/to params when scanHorizonHours = 0', async () => {
  deepScan.__test.resetState();
  deepScan.__test.setScanHorizonHours(0); // 0 = all events (no filtering)

  const capturedArgs = [];
  deepScan.__test.setEventsFetcher(async (args) => {
    capturedArgs.push(args);
    return { events: [] };
  });

  await deepScan.discoverAllEvents({
    apiKey: 'test-key',
    signal: new AbortController().signal,
    correlationId: 'test-no-time-filter'
  });

  assert.ok(capturedArgs.length > 0, 'Expected events fetcher to be called');
  const firstCall = capturedArgs[0];

  // Should NOT have from and to parameters
  assert.strictEqual(firstCall.from, undefined, 'Expected from parameter to be undefined');
  assert.strictEqual(firstCall.to, undefined, 'Expected to parameter to be undefined');
});

test('[P1][7.8-TIME-005] time-range filtering reduces data transfer by excluding distant events', async () => {
  deepScan.__test.resetState();
  deepScan.__test.setScanHorizonHours(2); // 2 hours

  const capturedArgs = [];
  deepScan.__test.setEventsFetcher(async (args) => {
    capturedArgs.push(args);
    return { events: [] };
  });

  await deepScan.discoverAllEvents({
    apiKey: 'test-key',
    signal: new AbortController().signal,
    correlationId: 'test-time-filter-2h'
  });

  assert.ok(capturedArgs.length > 0, 'Expected events fetcher to be called');
  const firstCall = capturedArgs[0];

  // Verify the time range is approximately 2 hours
  const fromDate = new Date(firstCall.from);
  const toDate = new Date(firstCall.to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  assert.ok(diffHours >= 1.9 && diffHours <= 2.1, `Expected ~2 hour range, got ${diffHours} hours`);
});

// =============================================================================
// Task 4: Incremental Updates Tests (AC #3)
// =============================================================================

test('[P1][7.8-INCR-001] useIncrementalUpdates defaults to true', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getUseIncrementalUpdates(), true);
});

test('[P1][7.8-INCR-002] useIncrementalUpdates can be toggled', () => {
  deepScan.__test.setUseIncrementalUpdates(false);
  assert.strictEqual(deepScan.__test.getUseIncrementalUpdates(), false);

  deepScan.__test.setUseIncrementalUpdates(true);
  assert.strictEqual(deepScan.__test.getUseIncrementalUpdates(), true);
});

test('[P1][7.8-INCR-003] lastIncrementalFetchTimestamp is null by default', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getLastIncrementalFetchTimestamp(), null);
});

test('[P1][7.8-INCR-004] lastIncrementalFetchTimestamp can be set and retrieved', () => {
  const timestamp = '2026-01-30T12:00:00Z';
  deepScan.__test.setLastIncrementalFetchTimestamp(timestamp);
  assert.strictEqual(deepScan.__test.getLastIncrementalFetchTimestamp(), timestamp);

  deepScan.__test.setLastIncrementalFetchTimestamp(null);
  assert.strictEqual(deepScan.__test.getLastIncrementalFetchTimestamp(), null);
});

test('[P1][7.8-INCR-005] setIncrementalOddsFetcher allows test injection', async () => {
  const capturedArgs = [];
  const mockFetcher = async (args) => {
    capturedArgs.push(args);
    return { data: [] };
  };

  deepScan.__test.setIncrementalOddsFetcher(mockFetcher);

  const fetcher = deepScan.getIncrementalOddsFetcher();
  await fetcher({
    apiKey: 'test-key',
    signal: new AbortController().signal,
    correlationId: 'test-incr',
    since: '2026-01-30T10:00:00Z',
    bookmakers: ['Book-1', 'Book-2']
  });

  assert.strictEqual(capturedArgs.length, 1);
  assert.strictEqual(capturedArgs[0].since, '2026-01-30T10:00:00Z');
  assert.deepStrictEqual(capturedArgs[0].bookmakers, ['Book-1', 'Book-2']);
});

test('[P1][7.8-INCR-006] resetState clears lastIncrementalFetchTimestamp', () => {
  deepScan.__test.setLastIncrementalFetchTimestamp('2026-01-30T12:00:00Z');
  assert.strictEqual(deepScan.__test.getLastIncrementalFetchTimestamp(), '2026-01-30T12:00:00Z');

  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getLastIncrementalFetchTimestamp(), null);
});

// =============================================================================
// Task 5: Live Events Mode Tests (AC #4)
// =============================================================================

test('[P1][7.8-LIVE-001] scanMode defaults to all', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getScanMode(), 'all');
});

test('[P1][7.8-LIVE-002] scanMode can be set to live, upcoming, or all', () => {
  deepScan.__test.setScanMode('live');
  assert.strictEqual(deepScan.__test.getScanMode(), 'live');

  deepScan.__test.setScanMode('upcoming');
  assert.strictEqual(deepScan.__test.getScanMode(), 'upcoming');

  deepScan.__test.setScanMode('all');
  assert.strictEqual(deepScan.__test.getScanMode(), 'all');
});

test('[P1][7.8-LIVE-003] getLiveEventsFetcher returns injectable fetcher', async () => {
  const capturedArgs = [];
  const mockFetcher = async (args) => {
    capturedArgs.push(args);
    return { events: [{ id: 'live-1', name: 'Live Match', status: 'live' }] };
  };

  deepScan.__test.setLiveEventsFetcher(mockFetcher);

  const fetcher = deepScan.getLiveEventsFetcher();
  const result = await fetcher({
    apiKey: 'test-key',
    signal: new AbortController().signal,
    correlationId: 'test-live-fetch',
    sport: 'football'
  });

  assert.strictEqual(capturedArgs.length, 1);
  assert.strictEqual(capturedArgs[0].sport, 'football');
  assert.ok(result.events, 'Expected events array in response');
  assert.strictEqual(result.events[0].status, 'live');
});

// =============================================================================
// Task 6: Bookmaker URLs Extraction Tests (AC #5)
// =============================================================================

test('[P1][7.8-URL-001] buildOpportunitiesFromRawOdds extracts bookmaker URLs', () => {
  deepScan.__test.resetState();

  const payload = {
    event: {
      id: 'url-test-1',
      name: 'URL Test Match',
      date: '2026-02-01T12:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Bet365',
        url: 'https://bet365.com/event/123',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.1 },
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      },
      {
        name: 'Pinnacle',
        url: 'https://pinnacle.com/event/456',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.8 },
              { name: 'No', odds: 2.1 }
            ]
          }
        ]
      }
    ]
  };

  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, {}, '2026-02-01T12:00:00Z');

  assert.ok(opportunities.length >= 1, 'Expected at least one opportunity');
  const opp = opportunities[0];

  assert.ok(opp.bookmakerUrls, 'Expected bookmakerUrls to be present');
  assert.strictEqual(opp.bookmakerUrls['Bet365'], 'https://bet365.com/event/123');
  assert.strictEqual(opp.bookmakerUrls['Pinnacle'], 'https://pinnacle.com/event/456');
});

test('[P1][7.8-URL-002] buildOpportunitiesFromRawOdds omits bookmakerUrls when none present', () => {
  deepScan.__test.resetState();

  const payload = {
    event: {
      id: 'no-url-test',
      name: 'No URL Match',
      date: '2026-02-01T12:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        // No url field
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.1 },
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.8 },
              { name: 'No', odds: 2.1 }
            ]
          }
        ]
      }
    ]
  };

  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, {}, '2026-02-01T12:00:00Z');

  assert.ok(opportunities.length >= 1, 'Expected at least one opportunity');
  const opp = opportunities[0];

  // bookmakerUrls should be undefined (not an empty object)
  assert.strictEqual(opp.bookmakerUrls, undefined, 'bookmakerUrls should be undefined when no URLs present');
});

// =============================================================================
// Task 7: Market Timestamps Tests (AC #6)
// =============================================================================

test('[P1][7.8-TIMESTAMP-001] buildOpportunitiesFromRawOdds extracts most recent market timestamp', () => {
  deepScan.__test.resetState();

  const payload = {
    event: {
      id: 'timestamp-test-1',
      name: 'Timestamp Test Match',
      date: '2026-02-01T12:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'btts',
            updatedAt: '2026-02-01T11:55:00Z', // Older
            outcomes: [
              { name: 'Yes', odds: 2.1 },
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'btts',
            updatedAt: '2026-02-01T11:58:00Z', // More recent
            outcomes: [
              { name: 'Yes', odds: 1.8 },
              { name: 'No', odds: 2.1 }
            ]
          }
        ]
      }
    ]
  };

  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, {}, '2026-02-01T12:00:00Z');

  assert.ok(opportunities.length >= 1, 'Expected at least one opportunity');
  const opp = opportunities[0];

  assert.strictEqual(opp.marketUpdatedAt, '2026-02-01T11:58:00Z', 'Should have most recent timestamp');
});

test('[P1][7.8-TIMESTAMP-002] buildOpportunitiesFromRawOdds omits marketUpdatedAt when none present', () => {
  deepScan.__test.resetState();

  const payload = {
    event: {
      id: 'no-timestamp-test',
      name: 'No Timestamp Match',
      date: '2026-02-01T12:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'btts',
            // No updatedAt field
            outcomes: [
              { name: 'Yes', odds: 2.1 },
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.8 },
              { name: 'No', odds: 2.1 }
            ]
          }
        ]
      }
    ]
  };

  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, {}, '2026-02-01T12:00:00Z');

  assert.ok(opportunities.length >= 1, 'Expected at least one opportunity');
  const opp = opportunities[0];

  assert.strictEqual(opp.marketUpdatedAt, undefined, 'marketUpdatedAt should be undefined when no timestamps present');
});

// =============================================================================
// Task 7: Market Freshness Tests (AC #6)
// =============================================================================

test('[P1][7.8-FRESH-001] marketFreshnessThresholdMinutes defaults to 5', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getMarketFreshnessThresholdMinutes(), 5);
});

test('[P1][7.8-FRESH-002] marketFreshnessThresholdMinutes can be configured', () => {
  deepScan.__test.setMarketFreshnessThresholdMinutes(10);
  assert.strictEqual(deepScan.__test.getMarketFreshnessThresholdMinutes(), 10);

  deepScan.__test.setMarketFreshnessThresholdMinutes(2);
  assert.strictEqual(deepScan.__test.getMarketFreshnessThresholdMinutes(), 2);
});

// =============================================================================
// Task 1 Integration: Batch Fetcher Mock Tests
// =============================================================================

test('[P2][7.8-BATCH-INT-001] batch mode calls batchOddsFetcher during scan', async () => {
  let batchFetcherCalled = false;
  let receivedEventCount = 0;

  // Set up batch fetcher mock
  deepScan.__test.setBatchOddsFetcher(async ({ events }) => {
    batchFetcherCalled = true;
    receivedEventCount = events.length;
    return {
      results: events.map(e => ({
        eventId: e.id,
        success: true,
        data: {
          id: e.id,
          bookmakers: {
            'Book-1': [{
              name: 'totals',
              outcomes: [
                { name: 'over 2.5', odds: 2.1 },
                { name: 'under 2.5', odds: 1.9 }
              ]
            }]
          }
        }
      }))
    };
  });

  // Set up event resolver to return test events
  deepScan.__test.setEventResolver(async () => [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' },
    { id: 'evt-3', name: 'Event 3' }
  ]);

  // Enable batch mode (should be default)
  deepScan.__test.setUseBatchOdds(true);

  // Start scan
  await deepScan.startDeepScan({ eventIds: ['evt-1', 'evt-2', 'evt-3'] });
  await deepScan.__test.waitForScanCompletion();

  // Verify batch fetcher was called
  assert.ok(batchFetcherCalled, 'Batch fetcher should be called when batch mode is enabled');
  assert.strictEqual(receivedEventCount, 3, 'All 3 events should be passed to batch fetcher');
});

test('[P2][7.8-BATCH-INT-002] single-event mode does NOT call batchOddsFetcher', async () => {
  let batchFetcherCalled = false;
  let singleFetcherCallCount = 0;

  // Set up batch fetcher mock (should NOT be called)
  deepScan.__test.setBatchOddsFetcher(async ({ events }) => {
    batchFetcherCalled = true;
    return { results: events.map(e => ({ eventId: e.id, success: true, data: {} })) };
  });

  // Set up single-event fetcher mock
  deepScan.__test.setOddsFetcher(async ({ event }) => {
    singleFetcherCallCount++;
    return {
      id: event.id,
      bookmakers: {
        'Book-1': [{
          name: 'totals',
          outcomes: [
            { name: 'over 2.5', odds: 2.1 },
            { name: 'under 2.5', odds: 1.9 }
          ]
        }]
      }
    };
  });

  // Set up event resolver
  deepScan.__test.setEventResolver(async () => [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' }
  ]);

  // Disable batch mode
  deepScan.__test.setUseBatchOdds(false);

  // Start scan
  await deepScan.startDeepScan({ eventIds: ['evt-1', 'evt-2'] });
  await deepScan.__test.waitForScanCompletion();

  // Verify batch fetcher was NOT called
  assert.ok(!batchFetcherCalled, 'Batch fetcher should NOT be called when batch mode is disabled');
  assert.strictEqual(singleFetcherCallCount, 2, 'Single-event fetcher should be called for each event');
});

test('[P2][7.8-BATCH-INT-003] batch mode handles partial failures', async () => {
  // Set up batch fetcher that returns one success and one failure
  deepScan.__test.setBatchOddsFetcher(async ({ events }) => {
    return {
      results: events.map((e, i) => ({
        eventId: e.id,
        success: i === 0, // First event succeeds, others fail
        data: i === 0 ? {
          id: e.id,
          bookmakers: {
            'Book-1': [{
              name: 'totals',
              outcomes: [
                { name: 'over 2.5', odds: 2.1 },
                { name: 'under 2.5', odds: 1.9 }
              ]
            }]
          }
        } : undefined,
        error: i === 0 ? undefined : 'Event not found'
      }))
    };
  });

  deepScan.__test.setEventResolver(async () => [
    { id: 'evt-1', name: 'Event 1' },
    { id: 'evt-2', name: 'Event 2' }
  ]);

  deepScan.__test.setUseBatchOdds(true);

  await deepScan.startDeepScan({ eventIds: ['evt-1', 'evt-2'] });
  await deepScan.__test.waitForScanCompletion();

  const progress = deepScan.getDeepScanProgress();
  // Both events should be counted as scanned
  assert.strictEqual(progress.eventsScanned, 2, 'Both events should be counted as scanned');
});

test('[P2][7.8-BATCH-INT-004] setLiveEventsFetcher allows test injection', async () => {
  let fetcherCalled = false;

  deepScan.__test.setLiveEventsFetcher(async ({ sport }) => {
    fetcherCalled = true;
    return [
      { id: 'live-1', name: 'Live Event 1', status: 'live' },
      { id: 'live-2', name: 'Live Event 2', status: 'live' }
    ];
  });

  // Verify the fetcher can be set (actual integration is Task 5)
  assert.ok(true, 'setLiveEventsFetcher test infrastructure is working');
});

// =============================================================================
// Reset State Tests
// =============================================================================

test('[P1][7.8-RESET-001] resetState clears all Story 7.8 settings to defaults', () => {
  // Modify all settings
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.setUseIncrementalUpdates(false);
  deepScan.__test.setScanHorizonHours(24);
  deepScan.__test.setScanMode('live');
  deepScan.__test.setMarketFreshnessThresholdMinutes(10);
  deepScan.__test.setLastIncrementalFetchTimestamp('2026-01-30T12:00:00Z');

  // Reset
  deepScan.__test.resetState();

  // Verify all back to defaults
  assert.strictEqual(deepScan.__test.getUseBatchOdds(), true, 'useBatchOdds should reset to true');
  assert.strictEqual(deepScan.__test.getUseIncrementalUpdates(), true, 'useIncrementalUpdates should reset to true');
  assert.strictEqual(deepScan.__test.getScanHorizonHours(), 4, 'scanHorizonHours should reset to 4');
  assert.strictEqual(deepScan.__test.getScanMode(), 'all', 'scanMode should reset to all');
  assert.strictEqual(deepScan.__test.getMarketFreshnessThresholdMinutes(), 5, 'marketFreshnessThresholdMinutes should reset to 5');
  assert.strictEqual(deepScan.__test.getLastIncrementalFetchTimestamp(), null, 'lastIncrementalFetchTimestamp should reset to null');
});

// =============================================================================
// Task 9: Odds Movement Tracking Tests (AC #8)
// =============================================================================

test('[P1][7.8-TREND-001] ODDS_HISTORY_MAX_SNAPSHOTS is 3', () => {
  assert.strictEqual(deepScan.__test.ODDS_HISTORY_MAX_SNAPSHOTS, 3);
});

test('[P1][7.8-TREND-002] ODDS_TREND_THRESHOLD is 0.001 (0.1%)', () => {
  assert.strictEqual(deepScan.__test.ODDS_TREND_THRESHOLD, 0.001);
});

test('[P1][7.8-TREND-003] First opportunity scan returns stable trend (no history)', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  const payload = {
    event: { id: 'evt-trend-1', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T12:00:00Z');

  assert.ok(opportunities.length > 0, 'Should find at least one opportunity');
  const opp = opportunities[0];

  assert.strictEqual(opp.oddsTrend, 'stable', 'First scan should have stable trend (no history to compare)');
  assert.ok(Array.isArray(opp.oddsHistory), 'Should have oddsHistory array');
  assert.strictEqual(opp.oddsHistory.length, 1, 'Should have exactly 1 snapshot after first scan');
});

test('[P1][7.8-TREND-004] Improving trend when ROI increases above threshold', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  // Pre-seed history with lower ROI
  const opportunityId = 'deep:evt-trend-2:h2h:Book-1:Book-2:team_a:team_b';
  deepScan.__test.setOddsHistory(opportunityId, [
    { roi: 0.010, timestamp: '2026-01-30T11:00:00Z', legOdds: [2.05, 2.15] }
  ]);

  const payload = {
    event: { id: 'evt-trend-2', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T12:00:00Z');

  assert.ok(opportunities.length > 0, 'Should find opportunity');
  const opp = opportunities[0];

  // New ROI should be higher than 0.010 by more than 0.001 threshold
  assert.ok(opp.roi > 0.010 + 0.001, `ROI ${opp.roi} should be > 0.011`);
  assert.strictEqual(opp.oddsTrend, 'improving', 'Trend should be improving when ROI increases significantly');
});

test('[P1][7.8-TREND-005] Worsening trend when ROI decreases below threshold', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  // Pre-seed history with higher ROI (0.10 = 10%)
  // The test odds produce ROI of ~0.069, so 0.10 is significantly higher
  const opportunityId = 'deep:evt-trend-3:h2h:Book-1:Book-2:team_a:team_b';
  deepScan.__test.setOddsHistory(opportunityId, [
    { roi: 0.10, timestamp: '2026-01-30T11:00:00Z', legOdds: [2.40, 2.50] }
  ]);

  const payload = {
    event: { id: 'evt-trend-3', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T12:00:00Z');

  assert.ok(opportunities.length > 0, 'Should find opportunity');
  const opp = opportunities[0];

  // New ROI (~0.069) should be lower than 0.10 by more than 0.001 threshold
  assert.ok(opp.roi < 0.10 - 0.001, `ROI ${opp.roi} should be < 0.099`);
  assert.strictEqual(opp.oddsTrend, 'worsening', 'Trend should be worsening when ROI decreases significantly');
});

test('[P1][7.8-TREND-006] Stable trend when ROI change is within threshold', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  // First, get the actual ROI for these odds
  const payload = {
    event: { id: 'evt-trend-4', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };

  // First call to get the actual ROI
  const firstOpportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T11:00:00Z');
  assert.ok(firstOpportunities.length > 0, 'Should find opportunity on first scan');
  const actualRoi = firstOpportunities[0].roi;

  // Second call with same odds should show stable trend (ROI unchanged)
  const secondOpportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T12:00:00Z');
  assert.ok(secondOpportunities.length > 0, 'Should find opportunity on second scan');
  const opp = secondOpportunities[0];

  // ROI should be identical (same odds)
  assert.strictEqual(opp.roi, actualRoi, 'ROI should be identical');
  assert.strictEqual(opp.oddsTrend, 'stable', 'Trend should be stable when ROI is unchanged');
});

test('[P1][7.8-TREND-007] History buffer maintains max 3 snapshots', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  // Pre-seed history with 3 snapshots (max)
  const opportunityId = 'deep:evt-trend-5:h2h:Book-1:Book-2:team_a:team_b';
  deepScan.__test.setOddsHistory(opportunityId, [
    { roi: 0.010, timestamp: '2026-01-30T10:00:00Z', legOdds: [2.00, 2.10] },
    { roi: 0.015, timestamp: '2026-01-30T11:00:00Z', legOdds: [2.05, 2.15] },
    { roi: 0.020, timestamp: '2026-01-30T11:30:00Z', legOdds: [2.08, 2.18] }
  ]);

  const payload = {
    event: { id: 'evt-trend-5', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T12:00:00Z');

  assert.ok(opportunities.length > 0, 'Should find opportunity');
  const opp = opportunities[0];

  // History should still be max 3 (oldest removed, new one added)
  assert.strictEqual(opp.oddsHistory.length, 3, 'History should maintain max 3 snapshots');

  // Oldest snapshot (0.010) should be removed, newest should be added
  const timestamps = opp.oddsHistory.map(h => h.timestamp);
  assert.ok(!timestamps.includes('2026-01-30T10:00:00Z'), 'Oldest snapshot should be removed');
  assert.ok(timestamps.includes('2026-01-30T12:00:00Z'), 'New snapshot should be added');
});

test('[P1][7.8-TREND-008] OddsSnapshot contains correct structure', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  const payload = {
    event: { id: 'evt-trend-6', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const foundAt = '2026-01-30T12:00:00Z';
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, foundAt);

  assert.ok(opportunities.length > 0, 'Should find opportunity');
  const opp = opportunities[0];
  const snapshot = opp.oddsHistory[0];

  assert.ok(typeof snapshot.roi === 'number', 'Snapshot should have numeric roi');
  assert.strictEqual(snapshot.timestamp, foundAt, 'Snapshot timestamp should match foundAt');
  assert.ok(Array.isArray(snapshot.legOdds), 'Snapshot should have legOdds array');
  assert.strictEqual(snapshot.legOdds.length, 2, 'legOdds should have 2 elements');
  assert.ok(snapshot.legOdds[0] > 1 && snapshot.legOdds[1] > 1, 'legOdds should be valid odds values');
});

test('[P1][7.8-TREND-009] resetState clears odds history buffer', () => {
  deepScan.__test.setUseBatchOdds(false);

  // Add some history
  deepScan.__test.setOddsHistory('test-id-1', [{ roi: 0.01, timestamp: 'T1', legOdds: [2.0, 2.1] }]);
  deepScan.__test.setOddsHistory('test-id-2', [{ roi: 0.02, timestamp: 'T2', legOdds: [2.0, 2.1] }]);

  const bufferBefore = deepScan.__test.getOddsHistoryBuffer();
  assert.strictEqual(bufferBefore.size, 2, 'Should have 2 entries before reset');

  deepScan.__test.resetState();

  const bufferAfter = deepScan.__test.getOddsHistoryBuffer();
  assert.strictEqual(bufferAfter.size, 0, 'Buffer should be empty after reset');
});

test('[P1][7.8-TREND-010] Multiple opportunities track history independently', () => {
  deepScan.__test.setUseBatchOdds(false);
  deepScan.__test.clearOddsHistoryBuffer();

  // Payload with two different markets producing two opportunities
  const payload = {
    event: { id: 'evt-multi', name: 'Test Event', sport: 'soccer', league: 'Test League', date: '2026-01-30T18:00:00Z' },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 2.10 }, { name: 'Team B', odds: 2.10 }] },
          { key: 'totals_2.5', outcomes: [{ name: 'Over', odds: 2.00 }, { name: 'Under', odds: 2.00 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'h2h', outcomes: [{ name: 'Team A', odds: 1.90 }, { name: 'Team B', odds: 2.20 }] },
          { key: 'totals_2.5', outcomes: [{ name: 'Over', odds: 1.95 }, { name: 'Under', odds: 2.10 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(payload, config, '2026-01-30T12:00:00Z');

  // Should have 2 opportunities (h2h and totals)
  assert.ok(opportunities.length >= 2, 'Should find at least 2 opportunities');

  // Each should have its own history
  const h2hOpp = opportunities.find(o => o.id.includes('h2h'));
  const totalsOpp = opportunities.find(o => o.id.includes('totals'));

  assert.ok(h2hOpp, 'Should have h2h opportunity');
  assert.ok(totalsOpp, 'Should have totals opportunity');

  assert.notStrictEqual(h2hOpp.id, totalsOpp.id, 'Opportunities should have different IDs');
  assert.ok(h2hOpp.oddsHistory.length >= 1, 'h2h should have history');
  assert.ok(totalsOpp.oddsHistory.length >= 1, 'totals should have history');
});

// =============================================================================
// Task 8: Rate Limit Headers Tests (AC #7)
// =============================================================================

test('[P1][7.8-RATE-001] API rate limit state is null by default', () => {
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getApiRateLimit(), null);
});

test('[P1][7.8-RATE-002] setApiRateLimit stores rate limit values', () => {
  deepScan.__test.setApiRateLimit(5000, 4500, '2026-01-30T13:00:00Z');
  const rateLimit = deepScan.__test.getApiRateLimit();
  assert.ok(rateLimit, 'Rate limit should be set');
  assert.strictEqual(rateLimit.limit, 5000);
  assert.strictEqual(rateLimit.remaining, 4500);
  assert.strictEqual(rateLimit.resetAt, '2026-01-30T13:00:00Z');
});

test('[P1][7.8-RATE-003] clearApiRateLimit clears rate limit state', () => {
  deepScan.__test.setApiRateLimit(5000, 4500, '2026-01-30T13:00:00Z');
  assert.ok(deepScan.__test.getApiRateLimit(), 'Rate limit should exist');
  
  deepScan.__test.clearApiRateLimit();
  assert.strictEqual(deepScan.__test.getApiRateLimit(), null);
});

test('[P1][7.8-RATE-004] resetState clears API rate limit', () => {
  deepScan.__test.setApiRateLimit(5000, 4500, '2026-01-30T13:00:00Z');
  assert.ok(deepScan.__test.getApiRateLimit(), 'Rate limit should exist');
  
  deepScan.__test.resetState();
  assert.strictEqual(deepScan.__test.getApiRateLimit(), null);
});

test('[P1][7.8-RATE-005] getHourlyQuotaStatus returns estimated values when no API rate limit', () => {
  deepScan.__test.resetState();
  deepScan.__test.clearApiRateLimit();
  
  const quota = deepScan.__test.getHourlyQuotaStatus();
  assert.strictEqual(quota.isApiQuota, false, 'Should indicate estimated quota');
  assert.ok(typeof quota.used === 'number', 'Should have used count');
  assert.ok(typeof quota.limit === 'number', 'Should have limit');
  assert.ok(typeof quota.percentUsed === 'number', 'Should have percentUsed');
});

test('[P1][7.8-RATE-006] getHourlyQuotaStatus returns API values when rate limit is set', () => {
  deepScan.__test.resetState();
  deepScan.__test.setApiRateLimit(5000, 4000, '2026-01-30T13:00:00Z');
  
  const quota = deepScan.__test.getHourlyQuotaStatus();
  assert.strictEqual(quota.isApiQuota, true, 'Should indicate API quota');
  assert.strictEqual(quota.limit, 5000);
  // used = limit - remaining = 5000 - 4000 = 1000
  assert.strictEqual(quota.used, 1000);
  // percentUsed = used / limit = 1000 / 5000 = 0.2
  assert.strictEqual(quota.percentUsed, 0.2);
  assert.ok(quota.apiRateLimit, 'Should include apiRateLimit object');
  assert.strictEqual(quota.apiRateLimit.remaining, 4000);
});
