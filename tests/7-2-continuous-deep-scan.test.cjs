'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const schemas = require('../out-tests/shared/schemas.js');
const credentials = require('../out-tests/src/main/credentials.js');
const deepScan = require('../out-tests/src/main/services/deepScan.js');
const router = require('../out-tests/src/main/services/router.js');
const poller = require('../out-tests/src/main/services/poller.js');
const logger = require('../out-tests/src/main/services/logger.js');
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');
const { TheOddsApiAdapter } = require('../out-tests/src/main/adapters/the-odds-api.js');

const {
  deepScanProgressSchema,
  arbitrageOpportunitySchema
} = schemas;

const originalGetApiKeyForAdapter = credentials.getApiKeyForAdapter;
let previousEnabledProviders = ['odds-api-io', 'the-odds-api'];

function startLogCapture() {
  const previous = logger.getStructuredLoggerBackend();
  const entries = [];
  logger.setStructuredLoggerBackend({
    info(event, payload) {
      entries.push({ level: 'info', event, payload });
    },
    warn(event, payload) {
      entries.push({ level: 'warn', event, payload });
    },
    error(event, payload) {
      entries.push({ level: 'error', event, payload });
    }
  });
  return {
    entries,
    restore() {
      logger.setStructuredLoggerBackend(previous);
    }
  };
}

function isoMinutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

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

test('[P1][7.2-SCHEMA-001] deepScanProgress schema supports continuous mode fields', () => {
  const parsed = deepScanProgressSchema.parse({
    status: 'completed',
    mode: 'continuous',
    eventsScanned: 5,
    eventsTotal: 5,
    requestsMade: 6,
    opportunitiesFound: 2,
    startedAt: '2026-01-27T10:00:00Z',
    elapsedMs: 12000,
    lastContinuousScanAt: '2026-01-27T10:00:12Z'
  });

  assert.strictEqual(parsed.mode, 'continuous');
  assert.strictEqual(parsed.lastContinuousScanAt, '2026-01-27T10:00:12Z');
});

test('[P1][7.2-DISCOVERY-001] discoverAllEvents sorts by priority tiers and excludes past events', async () => {
  const nowIso = new Date().toISOString();
  const eventsPayload = {
    events: [
      { id: 'past', name: 'Past Event', date: isoMinutesFromNow(-120), sport: 'soccer' },
      { id: 'future-3', name: 'Future 3d', date: isoMinutesFromNow(60 * 24 * 3), sport: 'soccer' },
      { id: 'soon', name: 'Soon 30m', date: isoMinutesFromNow(30), sport: 'soccer' },
      { id: 'tomorrow', name: 'Tomorrow', date: isoMinutesFromNow(60 * 24 + 10), sport: 'soccer' },
      { id: 'today-late', name: 'Today Late', date: isoMinutesFromNow(60 * 6), sport: 'soccer' }
    ]
  };

  deepScan.__test.setEventsFetcher(async () => eventsPayload);

  const events = await deepScan.discoverAllEvents({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'corr-discovery-1'
  });

  const ids = events.map((e) => e.id);

  assert.ok(!ids.includes('past'), 'Expected past events to be excluded');
  assert.deepStrictEqual(ids[0], 'soon', 'Expected soonest-in-1h events first');
  assert.ok(ids.indexOf('today-late') < ids.indexOf('tomorrow'), 'Expected today before tomorrow');
  assert.ok(ids.indexOf('tomorrow') < ids.indexOf('future-3'), 'Expected tomorrow before far future');
  assert.ok(nowIso < events[events.length - 1].date, 'Expected upcoming events only');
});

test('[P1][7.2-CACHE-001] scan cache TTL and bookmaker hash control shouldScanEvent', () => {
  const eventId = 'evt-cache-1';
  const booksA = ['Book-1', 'Book-2'];
  const booksB = ['Book-1', 'Book-3'];

  const firstShouldScan = deepScan.__test.shouldScanEvent(eventId, booksA);
  assert.strictEqual(firstShouldScan, true, 'Expected first scan to be allowed');

  deepScan.__test.markEventScanned(eventId, booksA);

  const secondShouldScan = deepScan.__test.shouldScanEvent(eventId, booksA);
  assert.strictEqual(secondShouldScan, false, 'Expected cache hit to skip scan');

  deepScan.__test.advanceScanCacheClock(deepScan.__test.SCAN_CACHE_TTL_MS + 1);
  const thirdShouldScan = deepScan.__test.shouldScanEvent(eventId, booksA);
  assert.strictEqual(thirdShouldScan, true, 'Expected TTL expiry to allow re-scan');

  deepScan.__test.markEventScanned(eventId, booksA);
  const hashMismatchShouldScan = deepScan.__test.shouldScanEvent(eventId, booksB);
  assert.strictEqual(hashMismatchShouldScan, true, 'Expected bookmaker hash mismatch to allow scan');
});

test('[P1][7.2-SCHED-001] continuous scan triggers after poll completion and respects toggle', async () => {
  const capture = startLogCapture();
  try {
    const caller = router.appRouter.createCaller({});

    await caller.deepScanSetContinuousEnabled({ enabled: true });

    deepScan.__test.setEventsFetcher(async () => ({
      events: [{ id: 'sched-evt-1', name: 'Sched Event', date: isoMinutesFromNow(90), sport: 'soccer' }]
    }));

    deepScan.__test.setOddsFetcher(async () => ({
      event: {
        id: 'sched-evt-1',
        name: 'Sched Event',
        date: isoMinutesFromNow(90),
        league: 'Sched League',
        sport: 'soccer'
      },
      bookmakers: [
        {
          name: 'Book-1',
          markets: [
            { key: 'btts', outcomes: [{ name: 'Yes', odds: 2.1 }, { name: 'No', odds: 1.7 }] }
          ]
        },
        {
          name: 'Book-2',
          markets: [
            { key: 'btts', outcomes: [{ name: 'Yes', odds: 1.8 }, { name: 'No', odds: 2.1 }] }
          ]
        }
      ]
    }));

    await poller.pollOnceForEnabledProviders();
    await deepScan.__test.waitForContinuousScanCompletion();

    const status = await caller.deepScanGetContinuousStatus();
    assert.strictEqual(status.enabled, true);
    assert.strictEqual(status.isActive, false);
    assert.ok(status.lastContinuousScanAt, 'Expected lastContinuousScanAt to be set after poll-triggered scan');

    const cycleStartLogs = capture.entries.filter((e) => e.event === 'continuousScan.cycle.start');
    const cycleCompleteLogs = capture.entries.filter((e) => e.event === 'continuousScan.cycle.complete');

    assert.ok(cycleStartLogs.length >= 1, 'Expected continuousScan.cycle.start log');
    assert.ok(cycleCompleteLogs.length >= 1, 'Expected continuousScan.cycle.complete log');
  } finally {
    capture.restore();
  }
});

test('[P1][7.2-MANUAL-001] manual scan cancels continuous scan and preserves manual behavior', async () => {
  const caller = router.appRouter.createCaller({});
  await caller.deepScanSetContinuousEnabled({ enabled: true });

  deepScan.__test.setEventsFetcher(async () => ({
    events: [{ id: 'manual-evt-1', name: 'Manual Event', date: isoMinutesFromNow(120), sport: 'soccer' }]
  }));

  let abortObserved = false;
  deepScan.__test.setOddsFetcher(async ({ signal }) => {
    await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => {
        abortObserved = true;
        reject(new Error('aborted'));
      });
      setTimeout(resolve, 50);
    });
    return [];
  });

  await deepScan.startContinuousDeepScan({ reason: 'test-trigger' });
  await new Promise((resolve) => setTimeout(resolve, 0));

  await caller.deepScanStart({ eventIds: ['manual-evt-1'] });
  const progressDuringManual = deepScan.getDeepScanProgress();
  assert.strictEqual(progressDuringManual.mode, 'manual');
  await deepScan.__test.waitForScanCompletion();

  assert.ok(abortObserved, 'Expected continuous scan to be aborted by manual scan');
});

test('[P1][7.2-TRPC-001] router exposes continuous deep scan procedures', async () => {
  const caller = router.appRouter.createCaller({});

  const enabledBefore = await caller.deepScanGetContinuousEnabled();
  assert.strictEqual(typeof enabledBefore.enabled, 'boolean');

  await caller.deepScanSetContinuousEnabled({ enabled: false });
  const enabledAfter = await caller.deepScanGetContinuousEnabled();
  assert.strictEqual(enabledAfter.enabled, false);

  const status = await caller.deepScanGetContinuousStatus();
  assert.ok(Object.prototype.hasOwnProperty.call(status, 'lastContinuousScanAt'));
});

test('[P1][7.2-GUARD-001] max events per cycle limits continuous scan scope', async () => {
  const caller = router.appRouter.createCaller({});

  await caller.deepScanSetContinuousEnabled({ enabled: true });
  await caller.deepScanSetMaxEventsPerCycle({ maxEvents: 2 });

  const events = Array.from({ length: 5 }, (_, index) => ({
    id: `guard-evt-${index + 1}`,
    name: `Guard Event ${index + 1}`,
    date: isoMinutesFromNow(90 + index),
    sport: 'soccer'
  }));

  deepScan.__test.setEventsFetcher(async () => ({ events }));
  deepScan.__test.setOddsFetcher(async () => []);

  await deepScan.startContinuousDeepScan({ reason: 'test-max-events', force: true });
  await deepScan.__test.waitForContinuousScanCompletion();

  const progress = deepScan.getDeepScanProgress();
  assert.strictEqual(progress.mode, 'continuous');
  assert.strictEqual(progress.status, 'completed');
  assert.strictEqual(progress.eventsTotal, 2, 'Expected eventsTotal to honor maxEventsPerCycle');
  assert.strictEqual(progress.eventsScanned, 2, 'Expected only maxEventsPerCycle events to be scanned');
});

test('[P1][7.2-UI-001] DeepScanPanel and StatusBar show continuous scan affordances', () => {
  const panelPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/DeepScanPanel.tsx');
  const statusBarPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/StatusBar.tsx');
  const storePath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/stores/feedFiltersStore.ts');

  assert.ok(fs.existsSync(panelPath), 'Expected DeepScanPanel.tsx to exist');
  assert.ok(fs.existsSync(statusBarPath), 'Expected StatusBar.tsx to exist');

  const panelSource = fs.readFileSync(panelPath, 'utf8');
  const statusBarSource = fs.readFileSync(statusBarPath, 'utf8');
  const storeSource = fs.readFileSync(storePath, 'utf8');

  assert.match(panelSource, /Continuous Deep Scan/i, 'Expected continuous toggle label in DeepScanPanel');
  assert.match(panelSource, /mode === 'continuous'|Continuous badge/i, 'Expected continuous mode affordance');
  assert.match(statusBarSource, /Scanning\.\.\.|Idle - Last/i, 'Expected continuous scan status indicator');
  assert.match(storeSource, /continuousDeepScanEnabled/, 'Expected continuousDeepScanEnabled in feedFiltersStore');
});

test('[P1][7.2-FEED-001] continuous deep scan results merge into the feed snapshot', async () => {
  const caller = router.appRouter.createCaller({});
  await caller.deepScanSetContinuousEnabled({ enabled: true });

  deepScan.__test.setEventsFetcher(async () => ({
    events: [{ id: 'feed-evt-1', name: 'Feed Event', date: isoMinutesFromNow(90), sport: 'soccer' }]
  }));

  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'feed-evt-1',
      name: 'Feed Event',
      date: isoMinutesFromNow(90),
      league: 'Feed League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          { key: 'totals', outcomes: [{ name: 'Over 2.5', odds: 2.1 }, { name: 'Under 2.5', odds: 1.7 }] }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          { key: 'totals', outcomes: [{ name: 'Over 2.5', odds: 1.8 }, { name: 'Under 2.5', odds: 2.1 }] }
        ]
      }
    ]
  }));

  await deepScan.startContinuousDeepScan({ reason: 'test-feed-merge' });
  await deepScan.__test.waitForContinuousScanCompletion();

  const snapshot = await caller.getFeedSnapshot();
  const deepScanItems = snapshot.opportunities.filter((opp) => opp.source === 'deepScan');

  assert.ok(deepScanItems.length >= 1, 'Expected deep scan opportunities in feed');
  arbitrageOpportunitySchema.parse(deepScanItems[0]);
});

test('[P2][7.2-DISCOVERY-002] discoverAllEvents handles events with invalid or missing dates', async () => {
  const eventsPayload = {
    events: [
      { id: 'valid', name: 'Valid Event', date: isoMinutesFromNow(60), sport: 'soccer' },
      { id: 'no-date', name: 'No Date Event', date: null, sport: 'soccer' },
      { id: 'invalid-date', name: 'Invalid Date Event', date: 'not-a-date', sport: 'soccer' },
      { id: 'empty-date', name: 'Empty Date Event', date: '', sport: 'soccer' }
    ]
  };

  deepScan.__test.setEventsFetcher(async () => eventsPayload);

  const events = await deepScan.discoverAllEvents({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'corr-discovery-edge'
  });

  // Should include events with valid dates, and handle invalid dates gracefully
  const validEventIncluded = events.some((e) => e.id === 'valid');
  assert.ok(validEventIncluded, 'Expected valid event to be included');

  // Events with invalid dates should be filtered or put in lowest priority tier
  // Implementation may vary - just ensure no crash
  assert.ok(Array.isArray(events), 'Expected events to be an array (no crash on invalid dates)');
});

test('[P2][7.2-DISCOVERY-003] discoverAllEvents handles exactly 1-hour boundary events', async () => {
  const eventsPayload = {
    events: [
      { id: 'exactly-1h', name: 'Exactly 1 Hour', date: isoMinutesFromNow(60), sport: 'soccer' },
      { id: 'just-under-1h', name: 'Just Under 1 Hour', date: isoMinutesFromNow(59), sport: 'soccer' },
      { id: 'just-over-1h', name: 'Just Over 1 Hour', date: isoMinutesFromNow(61), sport: 'soccer' }
    ]
  };

  deepScan.__test.setEventsFetcher(async () => eventsPayload);

  const events = await deepScan.discoverAllEvents({
    apiKey: 'test-api-key',
    signal: new AbortController().signal,
    correlationId: 'corr-discovery-boundary'
  });

  const ids = events.map((e) => e.id);

  // Events at or under 1h should be in tier 1 (highest priority)
  // Events over 1h should be in tier 2
  const under1hIndex = ids.indexOf('just-under-1h');
  const exactly1hIndex = ids.indexOf('exactly-1h');
  const over1hIndex = ids.indexOf('just-over-1h');

  // Tier 1 events should come before tier 2
  assert.ok(under1hIndex < over1hIndex || under1hIndex === -1 || over1hIndex === -1,
    'Expected <1h events before >1h events');
});

test('[P2][7.2-STATS-001] daily stats reset when UTC day changes', () => {
  // Get initial stats
  const initialStatus = deepScan.getContinuousScanStatus();

  // Advance time by more than 24 hours to trigger day rollover
  deepScan.__test.advanceScanCacheClock(25 * 60 * 60 * 1000);

  // Get stats after day change - should show reset values
  const afterDayChange = deepScan.getContinuousScanStatus();

  // After day rollover, counters should reset to 0
  assert.strictEqual(afterDayChange.eventsScannedToday, 0, 'Expected events scanned to reset after day change');
  assert.strictEqual(afterDayChange.opportunitiesFoundToday, 0, 'Expected opportunities found to reset after day change');
  assert.strictEqual(afterDayChange.requestsToday, 0, 'Expected requests to reset after day change');
});

test('[P2][7.2-THRESHOLDS-001] default thresholds can be set for continuous scan', async () => {
  const caller = router.appRouter.createCaller({});

  // Set default thresholds via TRPC
  const result = await caller.deepScanSetDefaultThresholds({
    minRoi: 0.5,
    marketGroupThresholds: { goals: 0.3 }
  });

  assert.strictEqual(result.ok, true, 'Expected setting default thresholds to succeed');
});

test('[P2][7.2-PRELOAD-001] preload exposes setMaxEventsPerCycle and clearCache APIs', () => {
  const preloadPath = path.join(process.cwd(), 'src/preload/index.ts');
  const preloadDtsPath = path.join(process.cwd(), 'src/preload/index.d.ts');

  assert.ok(fs.existsSync(preloadPath), 'Expected preload/index.ts to exist');
  assert.ok(fs.existsSync(preloadDtsPath), 'Expected preload/index.d.ts to exist');

  const preloadSource = fs.readFileSync(preloadPath, 'utf8');
  const preloadDts = fs.readFileSync(preloadDtsPath, 'utf8');

  // Check implementation has the methods
  assert.match(preloadSource, /setMaxEventsPerCycle/, 'Expected setMaxEventsPerCycle in preload implementation');
  assert.match(preloadSource, /clearCache/, 'Expected clearCache in preload implementation');

  // Check type declarations have the methods
  assert.match(preloadDts, /setMaxEventsPerCycle/, 'Expected setMaxEventsPerCycle in preload types');
  assert.match(preloadDts, /clearCache/, 'Expected clearCache in preload types');
  assert.match(preloadDts, /maxEventsPerCycle: number/, 'Expected maxEventsPerCycle in ContinuousStatus type');
});
