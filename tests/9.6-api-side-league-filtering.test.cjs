'use strict';

/**
 * Story 9.6: API-Side League Filtering for Event Discovery
 *
 * These tests verify that event discovery uses per-league API calls
 * instead of fetching all events and filtering client-side.
 *
 * AC1: Instead of fetching all events for a sport, call `/v3/events?sport=...&league=...` per enabled leagueSlug
 * AC2: Use best supported filter pattern from API docs
 * AC3: Keep pagination handling (numeric nextPage) but reduce total pages fetched
 * AC4: Discovery traffic drops proportionally with league filters
 * AC5: Returned events are already within enabled leagues
 */

const test = require('node:test');
const assert = require('node:assert');

const credentials = require('../out-tests/src/main/credentials.js');
const deepScan = require('../out-tests/src/main/services/deepScan.js');
const aggressiveScan = require('../out-tests/src/main/services/aggressiveScan.js');
const poller = require('../out-tests/src/main/services/poller.js');
const logger = require('../out-tests/src/main/services/logger.js');
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');

const originalGetApiKeyForAdapter = credentials.getApiKeyForAdapter;
const electron = require('electron');
const originalGlobalFetch = globalThis.fetch;
const originalNetFetch = electron?.net?.fetch;
let restoreLogger = null;

// Track API calls for verification
let apiCalls = [];

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

/**
 * Generate events payload for a specific league.
 */
function makeLeagueEventsPayload(leagueSlug, sportSlug = 'football') {
  const leagueNames = {
    'england-premier-league': 'Premier League',
    'spain-la-liga': 'La Liga',
    'germany-bundesliga': 'Bundesliga',
    'italy-serie-a': 'Serie A',
    'france-ligue-1': 'Ligue 1'
  };

  return {
    events: [
      {
        id: `evt-${leagueSlug}-1`,
        home: `Home ${leagueSlug}`,
        away: `Away ${leagueSlug}`,
        date: isoMinutesFromNow(45),
        league: { name: leagueNames[leagueSlug] || leagueSlug, slug: leagueSlug },
        sport: { name: 'Football', slug: sportSlug }
      },
      {
        id: `evt-${leagueSlug}-2`,
        home: `Home2 ${leagueSlug}`,
        away: `Away2 ${leagueSlug}`,
        date: isoMinutesFromNow(90),
        league: { name: leagueNames[leagueSlug] || leagueSlug, slug: leagueSlug },
        sport: { name: 'Football', slug: sportSlug }
      }
    ]
  };
}

/**
 * Stub fetch that tracks API calls and returns league-specific events.
 */
function stubFetch(input) {
  const url = String(input);
  apiCalls.push(url);

  if (url.includes('/v3/bookmakers/selected')) {
    return Promise.resolve(makeStubResponse({ selectedBookmakers: ['bet365'] }));
  }
  if (url.includes('/v3/bookmakers')) {
    return Promise.resolve(makeStubResponse({ bookmakers: ['bet365'] }));
  }
  if (url.includes('/v3/odds/multi')) {
    return Promise.resolve(makeStubResponse([]));
  }
  if (url.includes('/v3/leagues')) {
    // Match fetchAvailableLeagues() response shape: an array of league objects.
    // The sport is supplied by the request query param and added by the service layer.
    return Promise.resolve(makeStubResponse([
      { name: 'Premier League', slug: 'england-premier-league', eventsCount: 10 },
      { name: 'La Liga', slug: 'spain-la-liga', eventsCount: 10 },
      { name: 'Bundesliga', slug: 'germany-bundesliga', eventsCount: 10 }
    ]));
  }
  if (url.includes('/v3/events')) {
    // Extract league param from URL for per-league response
    const urlObj = new URL(url);
    const leagueParam = urlObj.searchParams.get('league');

    if (leagueParam) {
      // Return events only for the requested league (AC: 5)
      return Promise.resolve(makeStubResponse(makeLeagueEventsPayload(leagueParam)));
    }

    // Fallback: return all leagues (old behavior)
    return Promise.resolve(makeStubResponse({
      events: [
        ...makeLeagueEventsPayload('england-premier-league').events,
        ...makeLeagueEventsPayload('spain-la-liga').events,
        ...makeLeagueEventsPayload('germany-bundesliga').events
      ]
    }));
  }
  return Promise.resolve(makeStubResponse({}));
}

test.beforeEach(async () => {
  apiCalls = [];
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

  // Enable aggressive scan with league filtering
  aggressiveScan.setAggressiveScanConfig({
    enabled: true,
    eventDiscoveryIntervalMinutes: 2
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
    apiCalls = [];
  }
});

test('[P0][9-6-AC1] discoverEventsForEnabledLeagues includes league param in API URL', async () => {
  deepScan.setEnabledSportsFilter(['football']);
  deepScan.setEnabledLeaguesFilter(['england-premier-league']);

  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues: ['england-premier-league']
  });

  // Verify API was called with league parameter
  const eventsApiCalls = apiCalls.filter(url => url.includes('/v3/events'));
  assert.ok(eventsApiCalls.length > 0, 'Should make at least one events API call');

  for (const call of eventsApiCalls) {
    const urlObj = new URL(call);
    assert.ok(
      urlObj.searchParams.get('league'),
      `API call should include league parameter: ${call}`
    );
    assert.strictEqual(
      urlObj.searchParams.get('league'),
      'england-premier-league',
      'League param should match enabled league'
    );
  }
});

test('[P0][9-6-AC2] league param uses canonical leagueSlug format', async () => {
  deepScan.setEnabledLeaguesFilter(['spain-la-liga']);

  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues: ['spain-la-liga']
  });

  const eventsApiCalls = apiCalls.filter(url => url.includes('/v3/events'));
  assert.ok(eventsApiCalls.length > 0, 'Should make events API call');

  const urlObj = new URL(eventsApiCalls[0]);
  assert.strictEqual(
    urlObj.searchParams.get('league'),
    'spain-la-liga',
    'Should use canonical slug format (not display name)'
  );
});

test('[P0][9-6-AC4] multiple leagues result in separate API calls (traffic reduction)', async () => {
  const enabledLeagues = ['england-premier-league', 'spain-la-liga'];
  deepScan.setEnabledLeaguesFilter(enabledLeagues);

  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues
  });

  // Each league should get its own API call
  const eventsApiCalls = apiCalls.filter(url => url.includes('/v3/events'));

  // Verify we have calls for each enabled league
  const leaguesInCalls = new Set();
  for (const call of eventsApiCalls) {
    const urlObj = new URL(call);
    const league = urlObj.searchParams.get('league');
    if (league) leaguesInCalls.add(league);
  }

  assert.ok(
    leaguesInCalls.has('england-premier-league'),
    'Should call API for EPL'
  );
  assert.ok(
    leaguesInCalls.has('spain-la-liga'),
    'Should call API for La Liga'
  );
});

test('[P0][9-6-AC5] returned events are within enabled leagues only', async () => {
  const enabledLeagues = ['england-premier-league'];
  deepScan.setEnabledLeaguesFilter(enabledLeagues);

  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues
  });

  // All returned events should be from enabled leagues
  for (const event of events) {
    assert.strictEqual(
      event.leagueSlug,
      'england-premier-league',
      `Event ${event.id} should be from enabled league, got ${event.leagueSlug}`
    );
  }
});

test('[P1][9-6-MULTI] fetches events from all enabled leagues and deduplicates', async () => {
  const enabledLeagues = ['england-premier-league', 'spain-la-liga'];
  deepScan.setEnabledLeaguesFilter(enabledLeagues);

  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues
  });

  // Should have events from both leagues
  const eplEvents = events.filter(e => e.leagueSlug === 'england-premier-league');
  const laligaEvents = events.filter(e => e.leagueSlug === 'spain-la-liga');

  assert.ok(eplEvents.length > 0, 'Should have EPL events');
  assert.ok(laligaEvents.length > 0, 'Should have La Liga events');

  // Verify no duplicates by ID
  const ids = events.map(e => e.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, 'Events should be deduplicated by ID');
});

test('[P1][9-6-EMPTY] returns empty array when no leagues enabled', async () => {
  deepScan.setEnabledLeaguesFilter([]);

  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues: []
  });

  assert.deepStrictEqual(events, [], 'Should return empty array with no enabled leagues');

  // Should not make any events API calls
  const eventsApiCalls = apiCalls.filter(url => url.includes('/v3/events'));
  assert.strictEqual(eventsApiCalls.length, 0, 'Should not call API with no enabled leagues');
});

test('[P0][9-6-AGGRESSIVE] aggressive scan uses API-side league filtering', async () => {
  deepScan.setEnabledSportsFilter(['football']);
  deepScan.setEnabledLeaguesFilter(['england-premier-league']);

  await aggressiveScan.startAggressiveScan();

  // Verify aggressive scan uses per-league API calls
  const eventsApiCalls = apiCalls.filter(url => url.includes('/v3/events'));

  // At least one call should have league parameter
  const callsWithLeague = eventsApiCalls.filter(url => {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('league') !== null;
  });

  assert.ok(
    callsWithLeague.length > 0,
    'Aggressive scan should use per-league API calls'
  );
});

test('[P1][9-6-SPORT-FILTER] filters leagues by sport when specified', async () => {
  const events = await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues: ['england-premier-league', 'spain-la-liga'],
    sports: ['football']
  });

  // All events should be football
  for (const event of events) {
    assert.ok(
      event.sportSlug === 'football' || !event.sportSlug,
      `Event ${event.id} should be football sport`
    );
  }
});

test('[P2][9-6-INFER-SPORT] infers sport from league slug patterns', async () => {
  // Test that leagues can be discovered even without cached league mapping:
  // buildLeagueSportMap should fetch /v3/leagues?sport=... using the enabled sports filter.
  deepScan.__test.resetState(); // Clear cached leagues
  deepScan.setEnabledSportsFilter(['football']);

  await deepScan.discoverEventsForEnabledLeagues({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'test',
    enabledLeagues: ['england-premier-league']
  });

  const leaguesApiCalls = apiCalls.filter(url => url.includes('/v3/leagues'));
  assert.ok(leaguesApiCalls.length > 0, 'Should fetch leagues to resolve sport mapping when cache is empty');
  const leaguesUrl = new URL(leaguesApiCalls[0]);
  assert.strictEqual(leaguesUrl.searchParams.get('sport'), 'football');

  const eventsApiCalls = apiCalls.filter(url => url.includes('/v3/events'));
  assert.ok(eventsApiCalls.length > 0, 'Should make events API calls after resolving sport mapping');
});
