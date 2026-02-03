'use strict';

/**
 * Story 9-5.5: Aggressive scan event discovery with league filtering.
 *
 * These tests execute the compiled runtime modules under `out-tests/` to validate
 * real behavior (not just mock logic).
 */

const test = require('node:test');
const assert = require('node:assert');

const credentials = require('../out-tests/src/main/credentials.js');
const deepScan = require('../out-tests/src/main/services/deepScan.js');
const aggressiveScan = require('../out-tests/src/main/services/aggressiveScan.js');
const router = require('../out-tests/src/main/services/router.js');
const poller = require('../out-tests/src/main/services/poller.js');
const logger = require('../out-tests/src/main/services/logger.js');
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');

const originalGetApiKeyForAdapter = credentials.getApiKeyForAdapter;
const electron = require('electron');
const originalGlobalFetch = globalThis.fetch;
const originalNetFetch = electron?.net?.fetch;
let restoreLogger = null;

function isoMinutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function makeStubResponse(jsonPayload) {
  return {
    ok: true,
    status: 200,
    headers: new Map(),
    async json() {
      return jsonPayload;
    },
    async text() {
      return JSON.stringify(jsonPayload);
    }
  };
}

function stubFetch(input) {
  const url = String(input);
  if (url.includes('/v3/bookmakers/selected')) {
    return Promise.resolve(makeStubResponse({ selectedBookmakers: ['bet365'] }));
  }
  if (url.includes('/v3/bookmakers')) {
    return Promise.resolve(makeStubResponse({ bookmakers: ['bet365'] }));
  }
  if (url.includes('/v3/odds/multi')) {
    return Promise.resolve(makeStubResponse([]));
  }
  return Promise.resolve(makeStubResponse({}));
}

function makeEventsPayload() {
  return {
    events: [
      {
        id: 'evt-epl',
        home: 'Home EPL',
        away: 'Away EPL',
        date: isoMinutesFromNow(45),
        league: { name: 'Premier League', slug: 'england-premier-league' },
        sport: { name: 'Football', slug: 'football' }
      },
      {
        id: 'evt-laliga',
        home: 'Home LL',
        away: 'Away LL',
        date: isoMinutesFromNow(60),
        league: { name: 'La Liga', slug: 'spain-la-liga' },
        sport: { name: 'Football', slug: 'football' }
      },
      // League as a string => no leagueSlug => must be excluded by strict filter.
      {
        id: 'evt-display-only',
        home: 'Home Display',
        away: 'Away Display',
        date: isoMinutesFromNow(90),
        league: 'Saudi Professional League',
        sport: { name: 'Football', slug: 'football' }
      }
    ]
  };
}

test.beforeEach(async () => {
  deepScan.__test.resetState();
  poller.__test.resetLimiterState();
  poller.registerAdapters([new OddsApiIoAdapter()]);

  const previousLogger = logger.getStructuredLoggerBackend();
  logger.setStructuredLoggerBackend({
    info() {},
    warn() {},
    error() {}
  });
  restoreLogger = () => logger.setStructuredLoggerBackend(previousLogger);

  globalThis.fetch = stubFetch;
  if (electron?.net) {
    electron.net.fetch = stubFetch;
  }

  credentials.getApiKeyForAdapter = async () => 'test-api-key';

  // Enable aggressive scan for these tests.
  aggressiveScan.setAggressiveScanConfig({
    enabled: true,
    eventDiscoveryIntervalMinutes: 2
  });

  deepScan.setEnabledSportsFilter(['football']);
  deepScan.setEnabledLeaguesFilter(['england-premier-league']);

  // Story 9.6: Mock fetcher now respects league parameter for API-side filtering
  deepScan.__test.setEventsFetcher(async ({ league }) => {
    const allEvents = makeEventsPayload();
    if (league) {
      // Filter events to only those matching the requested league (API-side filtering)
      return {
        events: allEvents.events.filter(e => {
          const eventLeagueSlug = typeof e.league === 'object' ? e.league.slug : null;
          return eventLeagueSlug === league;
        })
      };
    }
    return allEvents;
  });
});

test.afterEach(async () => {
  try {
    aggressiveScan.stopAggressiveScan();
  } finally {
    if (typeof restoreLogger === 'function') {
      restoreLogger();
    }
    restoreLogger = null;

    globalThis.fetch = originalGlobalFetch;
    if (electron?.net) {
      electron.net.fetch = originalNetFetch;
    }

    credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    deepScan.__test.resetState();
    poller.__test.resetLimiterState();
    poller.registerAdapters([new OddsApiIoAdapter()]);
  }
});

test('[P0][9-5.5-AC1] startAggressiveScan discovers and populates tier cache', async () => {
  await aggressiveScan.startAggressiveScan();

  assert.ok(aggressiveScan.isAggressiveScanRunning(), 'Aggressive scan should be running');
  assert.ok(aggressiveScan.getTotalEventCount() > 0, 'Tier cache should contain discovered events');

  // Strict league filtering: only EPL should be present for this test setup.
  const tierCache = aggressiveScan.__test.getTierCache();
  const ids = [];
  for (const tierMap of tierCache.values()) {
    for (const id of tierMap.keys()) ids.push(id);
  }
  assert.deepStrictEqual(ids.sort(), ['evt-epl'], 'Only selected league events should be cached');
});

test('[P0][9-5.5-AC2] strict league filtering excludes events without leagueSlug', async () => {
  await aggressiveScan.startAggressiveScan();

  const tierCache = aggressiveScan.__test.getTierCache();
  const allIds = new Set();
  for (const tierMap of tierCache.values()) {
    for (const id of tierMap.keys()) allIds.add(id);
  }

  assert.ok(allIds.has('evt-epl'), 'Selected-league event should be included');
  assert.ok(!allIds.has('evt-display-only'), 'Display-only league (no slug) must be excluded');
});

test('[P0][9-5.5-AC4] discovery interval uses config and updates while running', async () => {
  await aggressiveScan.startAggressiveScan();

  assert.strictEqual(
    aggressiveScan.__test.getEventDiscoveryIntervalMsActive(),
    2 * 60 * 1000,
    'Active discovery interval should match config (2 minutes)'
  );

  aggressiveScan.setAggressiveScanConfig({ eventDiscoveryIntervalMinutes: 1 });

  assert.strictEqual(
    aggressiveScan.__test.getEventDiscoveryIntervalMsActive(),
    60 * 1000,
    'Active discovery interval should restart and match new config (1 minute)'
  );
});

test('[P0][9-5.5-AC5] league filter change refreshes tier cache via router', async () => {
  await aggressiveScan.startAggressiveScan();

  const caller = router.appRouter.createCaller({});

  // Switch to La Liga only.
  await caller.deepScanSetEnabledLeaguesFilter({ leagues: ['spain-la-liga'] });

  const tierCache = aggressiveScan.__test.getTierCache();
  const ids = [];
  for (const tierMap of tierCache.values()) {
    for (const id of tierMap.keys()) ids.push(id);
  }
  assert.deepStrictEqual(ids.sort(), ['evt-laliga'], 'Tier cache should reflect new league selection');
});

test('[P0][9-5.5-QUOTA-001] discovery recalculation does not reset currentHourUsed', async () => {
  await aggressiveScan.startAggressiveScan();

  const budget = aggressiveScan.__test.getQuotaBudget();
  assert.ok(budget, 'Expected quota budget to be initialized');
  budget.currentHourUsed = 123;

  await aggressiveScan.refreshAggressiveScanEvents();

  const after = aggressiveScan.__test.getQuotaBudget();
  assert.ok(after, 'Expected quota budget after refresh');
  assert.ok(after.currentHourUsed >= 123, 'Usage counter must not be reset by discovery/refresh');
});

test('[P1][9-5.5-RACE-001] refresh operations are serialized (no overlapping discovery)', async () => {
  let inFlight = 0;
  let maxInFlight = 0;

  deepScan.__test.setEventsFetcher(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 25));
    inFlight -= 1;
    return makeEventsPayload();
  });

  await aggressiveScan.startAggressiveScan();

  await Promise.all([aggressiveScan.refreshAggressiveScanEvents(), aggressiveScan.refreshAggressiveScanEvents()]);

  assert.strictEqual(maxInFlight, 1, 'Event discovery should not overlap across refresh calls');
});
