'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  arbitrageOpportunitySchema,
  deepScanProgressSchema,
  deepScanConfigSchema
} = require('../out-tests/shared/schemas.js');
const credentials = require('../out-tests/src/main/credentials.js');
const deepScan = require('../out-tests/src/main/services/deepScan.js');
const router = require('../out-tests/src/main/services/router.js');
const poller = require('../out-tests/src/main/services/poller.js');
const logger = require('../out-tests/src/main/services/logger.js');
const { calculateTwoLegArbitrageRoi } = require('../out-tests/src/main/services/calculator.js');
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');
const { TheOddsApiAdapter } = require('../out-tests/src/main/adapters/the-odds-api.js');
const { MARKET_GROUPS } = require('../out-tests/shared/types.js');

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

function readDeepScanFixture(name) {
  const fixturePath = path.join(process.cwd(), 'tests/fixtures/deep-scan', name);
  const text = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(text);
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

test('[P1][7.1-SCHEMA-001] deepScanProgress schema accepts expected shape', () => {
  const sample = {
    status: 'scanning',
    mode: 'manual',
    eventsScanned: 2,
    eventsTotal: 10,
    requestsMade: 5,
    opportunitiesFound: 3,
    startedAt: '2026-01-27T10:00:00Z',
    elapsedMs: 15000,
    currentEventName: 'Team A vs Team B'
  };

  const parsed = deepScanProgressSchema.parse(sample);
  assert.strictEqual(parsed.status, 'scanning');
  assert.strictEqual(parsed.eventsTotal, 10);
});

test('[P1][7.1-SCHEMA-002] deepScanConfig schema accepts eventIds', () => {
  const parsed = deepScanConfigSchema.parse({
    eventIds: ['evt-1', 'evt-2'],
    minRoi: 0.02,
    maxConcurrentRequests: 2
  });

  assert.deepStrictEqual(parsed.eventIds, ['evt-1', 'evt-2']);
  assert.strictEqual(parsed.minRoi, 0.02);
});

test('[P1][7.1-SCHEMA-003] arbitrageOpportunity schema accepts deepScan source tag', () => {
  const valid = {
    id: 'arb-deep-1',
    sport: 'soccer',
    event: {
      name: 'Team A vs Team B',
      date: '2026-01-27T12:00:00Z',
      league: 'EPL'
    },
    legs: [
      { bookmaker: 'Book-1', market: 'totals', odds: 2.1, outcome: 'over' },
      { bookmaker: 'Book-2', market: 'totals', odds: 2.1, outcome: 'under' }
    ],
    roi: 0.05,
    foundAt: '2026-01-27T12:00:10Z',
    source: 'deepScan'
  };

  const parsed = arbitrageOpportunitySchema.parse(valid);
  assert.strictEqual(parsed.source, 'deepScan');
});

test('[P1][7.1-SVC-001] startDeepScan initializes scanning state and supports cancel', async () => {
  let abortObserved = false;

  deepScan.__test.setEventResolver(async () => [{ id: 'evt-1', name: 'Event One' }]);
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

  await deepScan.startDeepScan({ eventIds: ['evt-1'] });

  await new Promise((resolve) => setTimeout(resolve, 0));

  const progressWhileScanning = deepScan.getDeepScanProgress();
  assert.strictEqual(progressWhileScanning.status, 'scanning');
  assert.strictEqual(progressWhileScanning.eventsTotal, 1);
  assert.ok(progressWhileScanning.startedAt, 'Expected startedAt to be set');

  deepScan.cancelDeepScan();

  const progressAfterCancel = deepScan.getDeepScanProgress();
  assert.strictEqual(progressAfterCancel.status, 'cancelled');
  assert.ok(abortObserved, 'Expected abort signal to be observed by odds fetcher');
});

test('[P1][7.1-SVC-002] getDeepScanResults returns deepScan-tagged opportunities after completion', async () => {
  const opportunity = arbitrageOpportunitySchema.parse({
    id: 'deep-opp-1',
    sport: 'soccer',
    event: {
      name: 'Event One',
      date: '2026-01-27T12:00:00Z',
      league: 'Test League'
    },
    legs: [
      { bookmaker: 'Book-1', market: 'totals', odds: 2.1, outcome: 'over' },
      { bookmaker: 'Book-2', market: 'totals', odds: 2.1, outcome: 'under' }
    ],
    roi: 0.05,
    foundAt: '2026-01-27T12:00:10Z'
  });

  deepScan.__test.setEventResolver(async () => [{ id: 'evt-2', name: 'Event Two' }]);
  deepScan.__test.setOddsFetcher(async () => [opportunity]);

  await deepScan.startDeepScan({ eventIds: ['evt-2'] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].source, 'deepScan');
});

test('[P1][7.1-SVC-003] startDeepScan rejects configs without scope', async () => {
  await assert.rejects(
    () => deepScan.startDeepScan({ minRoi: 0.01 }),
    /eventIds|leagueId|sportSlug/i
  );
});

test('[P1][7.1-ORCH-001] deep scan computes arbitrage from two-way raw odds markets', async () => {
  deepScan.__test.setEventResolver(async () => [{ id: 'evt-raw-1', name: 'Raw Event One' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'evt-raw-1',
      name: 'Raw Event One',
      date: '2026-01-28T12:00:00Z',
      league: 'Raw League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 2.1 },
              { name: 'Under 2.5', odds: 1.7 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 1.8 },
              { name: 'Under 2.5', odds: 2.1 }
            ]
          }
        ]
      }
    ]
  }));

  await deepScan.startDeepScan({ eventIds: ['evt-raw-1'] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 1, 'Expected one arbitrage opportunity from raw odds');
  assert.ok(results[0].roi > 0, 'Expected positive ROI');
  assert.notStrictEqual(results[0].legs[0].bookmaker, results[0].legs[1].bookmaker);
});

test('[P1][7.1-ORCH-002] deep scan applies global ROI thresholds during calculation', async () => {
  deepScan.__test.setEventResolver(async () => [{ id: 'evt-raw-2', name: 'Raw Event Two' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'evt-raw-2',
      name: 'Raw Event Two',
      date: '2026-01-28T13:00:00Z',
      league: 'Raw League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.02 },
              { name: 'No', odds: 1.98 }
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
              { name: 'Yes', odds: 1.99 },
              { name: 'No', odds: 2.01 }
            ]
          }
        ]
      }
    ]
  }));

  await deepScan.startDeepScan({ eventIds: ['evt-raw-2'], minRoi: 0.02 });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 0, 'Expected ROI threshold to filter out low-ROI opportunities');
});

test('[P1][7.1-ORCH-003] deep scan skips three-way markets', async () => {
  deepScan.__test.setEventResolver(async () => [{ id: 'evt-raw-3', name: 'Raw Event Three' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'evt-raw-3',
      name: 'Raw Event Three',
      date: '2026-01-28T14:00:00Z',
      league: 'Raw League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Home', odds: 2.7 },
              { name: 'Draw', odds: 3.2 },
              { name: 'Away', odds: 2.9 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Home', odds: 2.6 },
              { name: 'Draw', odds: 3.1 },
              { name: 'Away', odds: 3.0 }
            ]
          }
        ]
      }
    ]
  }));

  await deepScan.startDeepScan({ eventIds: ['evt-raw-3'] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 0, 'Expected no opportunities from three-way markets');
});

test('[P1][7.1-ORCH-004] deep scan splits multi-line markets under the same market key', async () => {
  deepScan.__test.setEventResolver(async () => [{ id: 'evt-raw-4', name: 'Raw Event Four' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'evt-raw-4',
      name: 'Raw Event Four',
      date: '2026-01-28T16:00:00Z',
      league: 'Raw League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 2.2 },
              { name: 'Under 2.5', odds: 1.7 },
              { name: 'Over 3.5', odds: 1.9 },
              { name: 'Under 3.5', odds: 1.95 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 1.8 },
              { name: 'Under 2.5', odds: 2.2 },
              { name: 'Over 3.5', odds: 1.85 },
              { name: 'Under 3.5', odds: 1.9 }
            ]
          }
        ]
      }
    ]
  }));

  await deepScan.startDeepScan({ eventIds: ['evt-raw-4'] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.ok(results.length >= 1, 'Expected at least one arbitrage opportunity from multi-line totals');
  assert.ok(
    results.some((opp) => opp.legs.some((leg) => String(leg.market).includes('2.5'))),
    'Expected market key to retain the line (e.g., totals_2.5)'
  );
});

test('[P1][7.1-ORCH-005] zero per-group thresholds do not disable the global minimum ROI', async () => {
  const zeroThresholds = Object.fromEntries(MARKET_GROUPS.map((group) => [group, 0]));

  deepScan.__test.setEventResolver(async () => [{ id: 'evt-raw-5', name: 'Raw Event Five' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'evt-raw-5',
      name: 'Raw Event Five',
      date: '2026-01-28T17:00:00Z',
      league: 'Raw League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.02 },
              { name: 'No', odds: 1.98 }
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
              { name: 'Yes', odds: 1.99 },
              { name: 'No', odds: 2.01 }
            ]
          }
        ]
      }
    ]
  }));

  await deepScan.startDeepScan({
    eventIds: ['evt-raw-5'],
    minRoi: 0.05,
    marketGroupThresholds: zeroThresholds
  });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(
    results.length,
    0,
    'Expected global minRoi to still filter out low-ROI opportunities when per-group thresholds are zero'
  );
});

test('[P1][7.1-TRPC-001] router deepScan procedures expose start/status/results', async () => {
  deepScan.__test.setEventResolver(async () => [{ id: 'evt-trpc-1', name: 'TRPC Event One' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'evt-trpc-1',
      name: 'TRPC Event One',
      date: '2026-01-28T15:00:00Z',
      league: 'TRPC League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 2.1 },
              { name: 'Under 2.5', odds: 1.7 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 1.8 },
              { name: 'Under 2.5', odds: 2.1 }
            ]
          }
        ]
      }
    ]
  }));

  const caller = router.appRouter.createCaller({});
  await caller.deepScanStart({ eventIds: ['evt-trpc-1'] });
  await deepScan.__test.waitForScanCompletion();

  const status = await caller.deepScanStatus();
  assert.strictEqual(status.status, 'completed');
  assert.strictEqual(status.eventsTotal, 1);

  const resultsResponse = await caller.deepScanResults();
  assert.strictEqual(resultsResponse.opportunities.length, 1);
  assert.strictEqual(resultsResponse.opportunities[0].source, 'deepScan');
});

test('[P1][7.1-TRPC-002] router deepScanCancel aborts an in-flight scan', async () => {
  let abortObserved = false;

  deepScan.__test.setEventResolver(async () => [{ id: 'evt-trpc-2', name: 'TRPC Event Two' }]);
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

  const caller = router.appRouter.createCaller({});
  await caller.deepScanStart({ eventIds: ['evt-trpc-2'] });
  await new Promise((resolve) => setTimeout(resolve, 0));

  await caller.deepScanCancel();

  const status = await caller.deepScanStatus();
  assert.strictEqual(status.status, 'cancelled');
  assert.ok(abortObserved, 'Expected router cancel to propagate abort signal');
});

test('[P1][7.1-MERGE-001] getFeedSnapshot merges deep scan results with feed opportunities', async () => {
  const feedOpportunity = arbitrageOpportunitySchema.parse({
    id: 'feed-merge-1',
    providerId: 'odds-api-io',
    sport: 'soccer',
    event: {
      name: 'Feed Merge Event',
      date: '2026-01-29T12:00:00Z',
      league: 'Feed League'
    },
    legs: [
      { bookmaker: 'Book-1', market: 'totals', odds: 2.05, outcome: 'over_2.5' },
      { bookmaker: 'Book-2', market: 'totals', odds: 2.05, outcome: 'under_2.5' }
    ],
    roi: 0.024,
    foundAt: '2026-01-27T12:00:00Z'
  });

  class StaticAdapter {
    constructor(id, opportunities) {
      this.id = id;
      this.__usesCentralRateLimiter = true;
      this._opportunities = opportunities;
    }
    async fetchOpportunities() {
      return this._opportunities;
    }
  }

  poller.registerAdapters([
    new StaticAdapter('odds-api-io', [feedOpportunity]),
    new StaticAdapter('the-odds-api', [])
  ]);
  await poller.pollOnceForEnabledProviders();

  deepScan.__test.setEventResolver(async () => [{ id: 'deep-merge-1', name: 'Deep Merge Event' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'deep-merge-1',
      name: 'Deep Merge Event',
      date: '2026-01-30T12:00:00Z',
      league: 'Deep League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
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
  }));

  const caller = router.appRouter.createCaller({});
  await caller.deepScanStart({ eventIds: ['deep-merge-1'] });
  await deepScan.__test.waitForScanCompletion();

  const snapshot = await caller.getFeedSnapshot();
  assert.ok(snapshot.opportunities.length >= 2, 'Expected deep scan results to merge into feed');
  assert.ok(
    snapshot.opportunities.some((opp) => opp.source === 'deepScan'),
    'Expected at least one deep scan opportunity in merged feed'
  );
});

test('[P1][7.1-MERGE-002] deep scan duplicates do not replace existing feed opportunities', async () => {
  const feedOpportunity = arbitrageOpportunitySchema.parse({
    id: 'feed-merge-dup',
    providerId: 'odds-api-io',
    sport: 'soccer',
    event: {
      name: 'Duplicate Event',
      date: '2026-01-31T12:00:00Z',
      league: 'Dup League'
    },
    legs: [
      { bookmaker: 'Book-1', market: 'totals', odds: 2.2, outcome: 'over_2.5' },
      { bookmaker: 'Book-2', market: 'totals', odds: 2.2, outcome: 'under_2.5' }
    ],
    roi: 0.091,
    foundAt: '2026-01-27T12:00:00Z'
  });

  class StaticAdapter {
    constructor(id, opportunities) {
      this.id = id;
      this.__usesCentralRateLimiter = true;
      this._opportunities = opportunities;
    }
    async fetchOpportunities() {
      return this._opportunities;
    }
  }

  poller.registerAdapters([
    new StaticAdapter('odds-api-io', [feedOpportunity]),
    new StaticAdapter('the-odds-api', [])
  ]);
  await poller.pollOnceForEnabledProviders();

  deepScan.__test.setEventResolver(async () => [{ id: 'dup-event', name: 'Duplicate Event' }]);
  deepScan.__test.setOddsFetcher(async () => ({
    event: {
      id: 'dup-event',
      name: 'Duplicate Event',
      date: '2026-01-31T12:00:00Z',
      league: 'Dup League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-1',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 2.05 },
              { name: 'Under 2.5', odds: 1.8 }
            ]
          }
        ]
      },
      {
        name: 'Book-2',
        markets: [
          {
            key: 'totals',
            outcomes: [
              { name: 'Over 2.5', odds: 1.85 },
              { name: 'Under 2.5', odds: 2.05 }
            ]
          }
        ]
      }
    ]
  }));

  const caller = router.appRouter.createCaller({});
  await caller.deepScanStart({ eventIds: ['dup-event'] });
  await deepScan.__test.waitForScanCompletion();

  const snapshot = await caller.getFeedSnapshot();
  const duplicateMatches = snapshot.opportunities.filter(
    (opp) => opp.event.name === 'Duplicate Event' && opp.legs[0].market === 'totals'
  );

  assert.strictEqual(duplicateMatches.length, 1, 'Expected duplicate deep scan opportunities to be excluded');
  assert.strictEqual(duplicateMatches[0].id, 'feed-merge-dup');
  assert.notStrictEqual(duplicateMatches[0].source, 'deepScan');
});

test('[P1][7.1-UI-001] Deep Scan dashboard components exist with stable test ids', () => {
  const panelPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/DeepScanPanel.tsx');
  const buttonPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/DeepScanButton.tsx');
  const dialogPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/DeepScanConfigDialog.tsx');

  assert.ok(fs.existsSync(panelPath), 'Expected DeepScanPanel.tsx to exist');
  assert.ok(fs.existsSync(buttonPath), 'Expected DeepScanButton.tsx to exist');
  assert.ok(fs.existsSync(dialogPath), 'Expected DeepScanConfigDialog.tsx to exist');

  const panelSource = fs.readFileSync(panelPath, 'utf8');
  assert.match(panelSource, /data-testid=\"deep-scan-panel\"/, 'Expected deep scan panel test id');
});

test('[P1][7.1-UI-002] DashboardLayout integrates Deep Scan panel', () => {
  const layoutPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/DashboardLayout.tsx');
  const layoutSource = fs.readFileSync(layoutPath, 'utf8');

  assert.match(layoutSource, /DeepScanPanel/, 'Expected DashboardLayout to reference DeepScanPanel');
});

test('[P1][7.1-UI-003] FeedTable renders a Deep Scan badge for deep scan opportunities', () => {
  const feedTablePath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/FeedTable.tsx');
  const feedTableSource = fs.readFileSync(feedTablePath, 'utf8');

  assert.match(feedTableSource, /feed-row-deep-scan-badge/, 'Expected deep scan badge test id in FeedTable');
  assert.match(feedTableSource, /Deep Scan/, 'Expected deep scan badge label in FeedTable');
});

test('[P1][7.1-UI-004] SignalPreview exposes a Deep Scan header state', () => {
  const previewPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/SignalPreview.tsx');
  const previewSource = fs.readFileSync(previewPath, 'utf8');

  assert.match(previewSource, /Deep Scan Result/, 'Expected deep scan header label in SignalPreview');
});

test('[P1][7.1-UI-005] signalPayload includes Source: Deep Scan for deep scan opportunities', () => {
  const payloadPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/signalPayload.ts');
  const payloadSource = fs.readFileSync(payloadPath, 'utf8');

  assert.match(payloadSource, /Source:\s*Deep Scan/, 'Expected deep scan source line in signal payload');
});

test('[P1][7.1-UI-006] feedFiltersStore persists deep scan ROI thresholds', () => {
  const storePath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/stores/feedFiltersStore.ts');
  const storeSource = fs.readFileSync(storePath, 'utf8');

  assert.match(storeSource, /deepScanRoiThresholds/, 'Expected deep scan ROI thresholds in feedFiltersStore');
  assert.match(storeSource, /globalMinRoi/, 'Expected globalMinRoi field in feedFiltersStore');
});

test('[P1][7.1-UI-007] DeepScanConfigDialog exposes per-market ROI controls', () => {
  const dialogPath = path.join(process.cwd(), 'src/renderer/src/features/dashboard/DeepScanConfigDialog.tsx');
  const dialogSource = fs.readFileSync(dialogPath, 'utf8');

  assert.match(dialogSource, /marketGroupMinRoi|marketGroupThresholds/, 'Expected market group ROI controls');
});

test('[P1][7.1-LOG-001] deep scan logs correlated start/event/complete entries with quota usage', async () => {
  const capture = startLogCapture();
  try {
    deepScan.__test.setEventResolver(async () => [
      { id: 'evt-log-1', name: 'Log Event One' },
      { id: 'evt-log-2', name: 'Log Event Two' }
    ]);
    deepScan.__test.setOddsFetcher(async ({ event }) => {
      const base = {
        event: {
          id: event.id,
          name: event.name,
          date: '2026-02-01T12:00:00Z',
          league: 'Log League',
          sport: 'soccer'
        }
      };
      if (event.id === 'evt-log-1') {
        return {
          ...base,
          bookmakers: [
            {
              name: 'Book-1',
              markets: [
                {
                  key: 'totals',
                  outcomes: [
                    { name: 'Over 2.5', odds: 2.1 },
                    { name: 'Under 2.5', odds: 1.75 }
                  ]
                }
              ]
            },
            {
              name: 'Book-2',
              markets: [
                {
                  key: 'totals',
                  outcomes: [
                    { name: 'Over 2.5', odds: 1.8 },
                    { name: 'Under 2.5', odds: 2.1 }
                  ]
                }
              ]
            }
          ]
        };
      }
      return {
        ...base,
        bookmakers: [
          {
            name: 'Book-1',
            markets: [
              {
                key: 'btts',
                outcomes: [
                  { name: 'Yes', odds: 1.9 },
                  { name: 'No', odds: 1.9 }
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
                  { name: 'Yes', odds: 1.9 },
                  { name: 'No', odds: 1.9 }
                ]
              }
            ]
          }
        ]
      };
    });

    await deepScan.startDeepScan({ eventIds: ['evt-log-1'] });
    await deepScan.__test.waitForScanCompletion();

    const startEntries = capture.entries.filter((entry) => entry.event === 'deepScan.start');
    assert.ok(startEntries.length >= 1, 'Expected deepScan.start logs');
    assert.ok(
      startEntries.some((entry) => Object.prototype.hasOwnProperty.call(entry.payload, 'eventCount')),
      'Expected eventCount in deepScan.start logs'
    );

    const correlationId = startEntries[0].payload.correlationId;
    assert.ok(correlationId, 'Expected correlationId in deepScan.start');

    const eventEntries = capture.entries.filter((entry) => entry.event === 'deepScan.event');
    assert.ok(eventEntries.length >= 2, 'Expected deepScan.event logs for each event');
    for (const entry of eventEntries) {
      assert.strictEqual(entry.payload.correlationId, correlationId, 'Expected shared correlationId');
      assert.ok(Object.prototype.hasOwnProperty.call(entry.payload, 'arbsFound'), 'Expected arbsFound');
      assert.ok(Object.prototype.hasOwnProperty.call(entry.payload, 'success'), 'Expected success flag');
    }

    const completeEntry = capture.entries.find((entry) => entry.event === 'deepScan.complete');
    assert.ok(completeEntry, 'Expected deepScan.complete log');
    assert.strictEqual(completeEntry.payload.correlationId, correlationId, 'Expected shared correlationId');
    assert.ok(
      typeof completeEntry.payload.requestsMade === 'number' && completeEntry.payload.requestsMade > 0,
      'Expected requestsMade quota usage in completion log'
    );
  } finally {
    capture.restore();
  }
});

test('[P1][7.1-LOG-002] deep scan logs per-event failures with correlationId and error metadata', async () => {
  const capture = startLogCapture();
  try {
    deepScan.__test.setEventResolver(async () => [{ id: 'evt-log-err', name: 'Log Event Error' }]);
    deepScan.__test.setOddsFetcher(async () => {
      throw new Error('synthetic failure');
    });

    await deepScan.startDeepScan({ eventIds: ['evt-log-err'] });
    await deepScan.__test.waitForScanCompletion();

    const startEntry = capture.entries.find((entry) => entry.event === 'deepScan.start');
    assert.ok(startEntry, 'Expected deepScan.start log for error scenario');
    const correlationId = startEntry.payload.correlationId;

    const failureEntry = capture.entries.find(
      (entry) => entry.event === 'deepScan.event' && entry.level === 'warn'
    );
    assert.ok(failureEntry, 'Expected warn-level deepScan.event log on failure');
    assert.strictEqual(failureEntry.payload.correlationId, correlationId, 'Expected shared correlationId');
    assert.strictEqual(failureEntry.payload.errorCategory, 'ProviderError');
    assert.strictEqual(failureEntry.payload.success, false);
    assert.match(String(failureEntry.payload.message || ''), /synthetic failure/);
  } finally {
    capture.restore();
  }
});

test('[P1][7.1-SVC-004] default event resolution supports leagueId via events endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const eventsPayload = {
    data: [
      { id: 'evt-league-1', name: 'League Event One' },
      { id: 'evt-league-2', name: 'League Event Two' }
    ]
  };

  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('/v3/events') && href.includes('league=league-1')) {
      return new Response(JSON.stringify(eventsPayload), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  deepScan.__test.setOddsFetcher(async () => []);

  try {
    await deepScan.startDeepScan({ leagueId: 'league-1' });
    await deepScan.__test.waitForScanCompletion();
  } finally {
    globalThis.fetch = originalFetch;
  }

  const progress = deepScan.getDeepScanProgress();
  assert.strictEqual(progress.status, 'completed');
  assert.strictEqual(progress.eventsTotal, 2);
  assert.strictEqual(progress.eventsScanned, 2);
});

test('[P1][7.1-FIXTURE-001] deep scan multi-market fixture yields expected arbitrage ROI', async () => {
  const fixture = readDeepScanFixture('deep-scan-multi-market.json');
  const expectedRoi = calculateTwoLegArbitrageRoi(2.1, 2.1);

  deepScan.__test.setEventResolver(async () => [
    { id: fixture.event.id, name: fixture.event.name }
  ]);
  deepScan.__test.setOddsFetcher(async () => fixture);

  await deepScan.startDeepScan({ eventIds: [fixture.event.id] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 1, 'Expected exactly one arbitrage opportunity');
  assert.ok(
    String(results[0].legs[0].market).startsWith('totals'),
    'Expected totals market key (optionally line-aware, e.g., totals_2.5)'
  );
  assert.ok(Math.abs(results[0].roi - expectedRoi) < 1e-6, 'Expected ROI to match calculator');
});

test('[P1][7.1-FIXTURE-002] deep scan no-arb fixture yields zero opportunities', async () => {
  const fixture = readDeepScanFixture('deep-scan-no-arb.json');

  deepScan.__test.setEventResolver(async () => [
    { id: fixture.event.id, name: fixture.event.name }
  ]);
  deepScan.__test.setOddsFetcher(async () => fixture);

  await deepScan.startDeepScan({ eventIds: [fixture.event.id] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 0, 'Expected no opportunities when implied probability >= 1');
});
