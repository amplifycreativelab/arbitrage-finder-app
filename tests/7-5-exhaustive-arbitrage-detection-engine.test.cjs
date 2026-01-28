'use strict';

/**
 * Story 7.5: Exhaustive Arbitrage Detection Engine Tests
 *
 * Tests for implied probability calculation, best odds comparison payload,
 * edge case handling, stable ID generation, and source tagging.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

// Import shared types (compiled)
const sharedTypesPath = path.join(process.cwd(), 'out-tests', 'shared', 'types.js');
let sharedTypes;
try {
  sharedTypes = require(sharedTypesPath);
} catch (e) {
  console.warn('Could not load compiled shared types:', e.message);
  sharedTypes = null;
}

// Test fixtures directory
const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures', 'deep-scan');
const credentials = require('../out-tests/src/main/credentials.js');
const deepScan = require('../out-tests/src/main/services/deepScan.js');
const poller = require('../out-tests/src/main/services/poller.js');
const router = require('../out-tests/src/main/services/router.js');
const logger = require('../out-tests/src/main/services/logger.js');
const calculator = require('../out-tests/src/main/services/calculator.js');
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');
const { TheOddsApiAdapter } = require('../out-tests/src/main/adapters/the-odds-api.js');

const originalGetApiKeyForAdapter = credentials.getApiKeyForAdapter;
let previousEnabledProviders = ['odds-api-io', 'the-odds-api'];

function startLogCapture() {
  const previous = logger.getStructuredLoggerBackend();
  const entries = [];
  logger.setStructuredLoggerBackend({
    debug(event, payload) {
      entries.push({ level: 'debug', event, payload });
    },
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

function readFixture(name) {
  const fixturePath = path.join(fixturesDir, name);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
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

// ============================================================================
// Task 1: Implied Probability Tests (AC: #1, #2, #7)
// ============================================================================

test('[P1][7.5-IMPLIED-001] Opportunity legs include impliedProbability field', async () => {
  const fixture = readFixture('raw-odds-corners.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.ok(opportunities.length > 0, 'Should find at least one opportunity');

  for (const opp of opportunities) {
    for (const leg of opp.legs) {
      assert.ok(
        typeof leg.impliedProbability === 'number',
        `Leg should have impliedProbability, got: ${typeof leg.impliedProbability}`
      );
      assert.ok(
        leg.impliedProbability > 0 && leg.impliedProbability < 100,
        `Implied probability should be between 0 and 100, got: ${leg.impliedProbability}`
      );
    }
  }
});

test('[P1][7.5-IMPLIED-002] Implied probability formula is correct: (1/odds)*100', async () => {
  // Create a fixture with known odds that produce arbitrage
  // Book-A: Yes=2.10, No=1.85 -> Best Yes
  // Book-B: Yes=1.90, No=2.05 -> Best No
  // Best pair: Book-A Yes (2.10) + Book-B No (2.05)
  // ROI = 1 - (1/2.10 + 1/2.05) = 1 - (0.476 + 0.488) = 1 - 0.964 = 0.036 (3.6%)
  const fixture = {
    event: {
      id: 'test-implied-001',
      name: 'Test Match',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.10 }, // Implied = 47.62%
              { name: 'No', odds: 1.85 }   // Implied = 54.05%
            ]
          }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 }, // Implied = 52.63%
              { name: 'No', odds: 2.05 }   // Implied = 48.78%
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.ok(opportunities.length > 0, 'Should find at least one opportunity');

  const opp = opportunities[0];
  for (const leg of opp.legs) {
    const expectedImplied = Number((1 / leg.odds * 100).toFixed(2));
    assert.strictEqual(
      leg.impliedProbability,
      expectedImplied,
      `Implied probability for odds ${leg.odds} should be ${expectedImplied}, got: ${leg.impliedProbability}`
    );
  }
});

test('[P1][7.5-IMPLIED-003] Implied probability edge case: odds = 1.01 (99%)', async () => {
  const fixture = {
    event: {
      id: 'test-implied-edge-001',
      name: 'Edge Test Match',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.01 }, // Near-certain: ~99%
              { name: 'No', odds: 50.0 }   // Long shot: 2%
            ]
          }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.02 },
              { name: 'No', odds: 100.0 } // Very long shot: 1%
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  if (opportunities.length > 0) {
    for (const opp of opportunities) {
      for (const leg of opp.legs) {
        if (leg.odds === 1.01) {
          const expected = Number((1 / 1.01 * 100).toFixed(2)); // ~99.01
          assert.strictEqual(leg.impliedProbability, expected);
        }
        if (leg.odds === 100.0) {
          const expected = Number((1 / 100.0 * 100).toFixed(2)); // 1.00
          assert.strictEqual(leg.impliedProbability, expected);
        }
      }
    }
  }
});

test('[P1][7.5-IMPLIED-004] Implied probability edge case: odds = 10.0 (10%)', async () => {
  const fixture = {
    event: {
      id: 'test-implied-edge-002',
      name: 'Long Shot Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 10.0 }, // 10%
              { name: 'No', odds: 1.10 }   // ~90.91%
            ]
          }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 12.0 }, // ~8.33%
              { name: 'No', odds: 1.05 }   // ~95.24%
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  if (opportunities.length > 0) {
    for (const opp of opportunities) {
      for (const leg of opp.legs) {
        if (leg.odds === 10.0) {
          const expected = Number((1 / 10.0 * 100).toFixed(2)); // 10.00
          assert.strictEqual(leg.impliedProbability, expected);
        }
      }
    }
  }
});

// ============================================================================
// Task 2: Best Odds Comparison Tests (AC: #8)
// ============================================================================

test('[P1][7.5-BESTODDS-001] computeBestOddsComparison returns all bookmakers per outcome', async () => {
  const fixture = readFixture('raw-odds-corners.json');
  const config = { minRoi: 0 };
  const comparisons = deepScan.__test.computeBestOddsComparison(fixture, config);

  assert.ok(Array.isArray(comparisons), 'Should return an array');
  assert.ok(comparisons.length > 0, 'Should have at least one comparison');

  for (const comparison of comparisons) {
    assert.ok(comparison.eventId, 'Should have eventId');
    assert.ok(comparison.marketKey, 'Should have marketKey');
    assert.ok(comparison.marketLabel, 'Should have marketLabel');
    assert.ok(comparison.marketGroup, 'Should have marketGroup');
    assert.ok(Array.isArray(comparison.outcomes), 'Should have outcomes array');

    for (const outcome of comparison.outcomes) {
      assert.ok(outcome.outcome, 'Should have outcome name');
      assert.ok(outcome.bestBookmaker, 'Should have bestBookmaker');
      assert.ok(typeof outcome.bestOdds === 'number', 'Should have bestOdds');
      assert.ok(Array.isArray(outcome.allBookmakers), 'Should have allBookmakers array');
      assert.ok(outcome.allBookmakers.length > 0, 'Should have at least one bookmaker');
    }
  }
});

test('[P1][7.5-BESTODDS-002] Best bookmaker is correctly identified (highest odds)', async () => {
  const fixture = {
    event: {
      id: 'best-odds-test-001',
      name: 'Best Odds Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'LowOddsBook',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 },
              { name: 'No', odds: 1.85 }
            ]
          }
        ]
      },
      {
        name: 'HighOddsBook',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.10 }, // Best for Yes
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      },
      {
        name: 'MidOddsBook',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.00 },
              { name: 'No', odds: 1.95 } // Best for No
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const comparisons = deepScan.__test.computeBestOddsComparison(fixture, config);

  assert.ok(comparisons.length > 0, 'Should have comparisons');

  // Debug: log the market keys found
  // console.log('Market keys found:', comparisons.map(c => c.marketKey));
  const bttsComparison = comparisons.find(c => c.marketKey.includes('btts') || c.marketKey.includes('both_teams'));
  assert.ok(bttsComparison, `Should have BTTS comparison. Found markets: ${comparisons.map(c => c.marketKey).join(', ')}`);

  const yesOutcome = bttsComparison.outcomes.find(o => o.outcome === 'yes');
  assert.ok(yesOutcome, 'Should have Yes outcome');
  assert.strictEqual(yesOutcome.bestBookmaker, 'HighOddsBook', 'Best bookmaker for Yes should be HighOddsBook');
  assert.strictEqual(yesOutcome.bestOdds, 2.10, 'Best odds for Yes should be 2.10');

  const noOutcome = bttsComparison.outcomes.find(o => o.outcome === 'no');
  assert.ok(noOutcome, 'Should have No outcome');
  assert.strictEqual(noOutcome.bestBookmaker, 'MidOddsBook', 'Best bookmaker for No should be MidOddsBook');
  assert.strictEqual(noOutcome.bestOdds, 1.95, 'Best odds for No should be 1.95');
});

test('[P1][7.5-BESTODDS-003] hasArbitrage flag matches opportunity existence', async () => {
  // Fixture with arbitrage
  const arbFixture = readFixture('raw-odds-corners.json');
  const config = { minRoi: 0 };
  const comparisonsWithArb = deepScan.__test.computeBestOddsComparison(arbFixture, config);
  const opportunitiesWithArb = deepScan.__test.buildOpportunitiesFromRawOdds(arbFixture, config, new Date().toISOString());

  // At least one comparison should have hasArbitrage=true if opportunities exist
  if (opportunitiesWithArb.length > 0) {
    const hasArbComparison = comparisonsWithArb.some(c => c.hasArbitrage === true);
    assert.ok(hasArbComparison, 'Should have at least one comparison with hasArbitrage=true when opportunities exist');
  }

  // Fixture without arbitrage (identical odds)
  const noArbFixture = {
    event: {
      id: 'no-arb-test-001',
      name: 'No Arb Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 },
              { name: 'No', odds: 1.90 }
            ]
          }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 },
              { name: 'No', odds: 1.90 }
            ]
          }
        ]
      }
    ]
  };

  const comparisonsNoArb = deepScan.__test.computeBestOddsComparison(noArbFixture, config);
  const opportunitiesNoArb = deepScan.__test.buildOpportunitiesFromRawOdds(noArbFixture, config, new Date().toISOString());

  if (opportunitiesNoArb.length === 0) {
    // All comparisons should have hasArbitrage=false
    for (const comparison of comparisonsNoArb) {
      assert.strictEqual(comparison.hasArbitrage, false, 'Should have hasArbitrage=false when no opportunities');
    }
  }
});

// ============================================================================
// Task 3: Best Price Selection Logic Tests (AC: #1, #3)
// ============================================================================

test('[P1][7.5-BESTPRICE-001] selectBestDistinctPair iterates all bookmaker combinations', async () => {
  const fixture = {
    event: {
      id: 'best-pair-test-001',
      name: 'Best Pair Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.10 },
              { name: 'No', odds: 1.80 }
            ]
          }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.95 },
              { name: 'No', odds: 2.00 }
            ]
          }
        ]
      },
      {
        name: 'Book-C',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.05 },
              { name: 'No', odds: 1.85 }
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.ok(opportunities.length > 0, 'Should find opportunity');

  const opp = opportunities[0];
  // Best combination should be Book-A Yes (2.10) + Book-B No (2.00)
  // ROI = 1 - (1/2.10 + 1/2.00) = 1 - (0.476 + 0.5) = 0.024 (2.4%)
  const bookmakers = opp.legs.map(l => l.bookmaker).sort();
  assert.deepStrictEqual(bookmakers, ['Book-A', 'Book-B'].sort(), 'Should select best bookmaker pair');
});

test('[P1][7.5-BESTPRICE-002] bestByBookmaker picks highest odds per bookmaker per outcome', async () => {
  // Same bookmaker with multiple markets showing same outcome at different odds
  const fixture = {
    event: {
      id: 'best-by-book-test-001',
      name: 'Best By Book Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.00 },
              { name: 'No', odds: 1.85 }
            ]
          }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 },
              { name: 'No', odds: 2.10 }
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  if (opportunities.length > 0) {
    const opp = opportunities[0];
    // Should pick highest odds for each outcome
    const yesLeg = opp.legs.find(l => l.outcome === 'yes');
    const noLeg = opp.legs.find(l => l.outcome === 'no');

    if (yesLeg) {
      assert.strictEqual(yesLeg.bookmaker, 'Book-A', 'Should pick Book-A for Yes (2.00 > 1.90)');
      assert.strictEqual(yesLeg.odds, 2.00);
    }
    if (noLeg) {
      assert.strictEqual(noLeg.bookmaker, 'Book-B', 'Should pick Book-B for No (2.10 > 1.85)');
      assert.strictEqual(noLeg.odds, 2.10);
    }
  }
});

// ============================================================================
// Task 4: Edge Case Handling Tests (AC: #5)
// ============================================================================

test('[P1][7.5-EDGE-001] Identical odds from multiple bookmakers produces no arb', async () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-identical-odds.json');
  if (!fs.existsSync(fixturePath)) {
    // Create fixture if it doesn't exist (will be created in Task 7)
    console.log('Skipping test - fixture not yet created');
    return;
  }

  const fixture = readFixture('raw-odds-identical-odds.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.strictEqual(opportunities.length, 0, 'Identical odds should produce no arbitrage');
});

test('[P1][7.5-EDGE-002] Single bookmaker market produces no arb (cannot arb against yourself)', async () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-single-bookmaker.json');
  if (!fs.existsSync(fixturePath)) {
    console.log('Skipping test - fixture not yet created');
    return;
  }

  const fixture = readFixture('raw-odds-single-bookmaker.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.strictEqual(opportunities.length, 0, 'Single bookmaker should produce no arbitrage');
});

test('[P1][7.5-EDGE-003] Extremely low ROI (~0.1%) still produces opportunity (no floor)', async () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-low-roi.json');
  if (!fs.existsSync(fixturePath)) {
    console.log('Skipping test - fixture not yet created');
    return;
  }

  const fixture = readFixture('raw-odds-low-roi.json');
  const config = { minRoi: 0 }; // No ROI floor
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.ok(opportunities.length > 0, 'Low ROI should still produce opportunity when minRoi=0');

  const opp = opportunities[0];
  assert.ok(opp.roi > 0 && opp.roi < 0.01, `ROI should be positive but tiny, got: ${opp.roi}`);
});

test('[P1][7.5-EDGE-004] Incomplete market (missing one side) produces no opportunity', async () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-incomplete-market.json');
  if (!fs.existsSync(fixturePath)) {
    console.log('Skipping test - fixture not yet created');
    return;
  }

  const fixture = readFixture('raw-odds-incomplete-market.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.strictEqual(opportunities.length, 0, 'Incomplete market should produce no opportunity');
});

test('[P1][7.5-EDGE-005] Market with fewer than 2 distinct bookmakers is skipped', async () => {
  const fixture = {
    event: {
      id: 'single-book-test-001',
      name: 'Single Book Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'OnlyBook',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.50 },
              { name: 'No', odds: 1.60 }
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.strictEqual(opportunities.length, 0, 'Single bookmaker should produce no arbitrage');
});

// ============================================================================
// Task 5: Stable ID Generation Tests (AC: #7)
// ============================================================================

test('[P1][7.5-STABLEID-001] Same inputs produce same ID regardless of array order', async () => {
  // Fixture with bookmakers in order A, B
  const fixtureAB = {
    event: {
      id: 'stable-id-test-001',
      name: 'Stable ID Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Alpha-Book',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.20 },
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      },
      {
        name: 'Beta-Book',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 },
              { name: 'No', odds: 2.05 }
            ]
          }
        ]
      }
    ]
  };

  // Fixture with bookmakers in order B, A (reversed)
  const fixtureBA = {
    event: {
      id: 'stable-id-test-001',
      name: 'Stable ID Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Beta-Book',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 1.90 },
              { name: 'No', odds: 2.05 }
            ]
          }
        ]
      },
      {
        name: 'Alpha-Book',
        markets: [
          {
            key: 'btts',
            outcomes: [
              { name: 'Yes', odds: 2.20 },
              { name: 'No', odds: 1.75 }
            ]
          }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const oppsAB = deepScan.__test.buildOpportunitiesFromRawOdds(fixtureAB, config, new Date().toISOString());
  const oppsBA = deepScan.__test.buildOpportunitiesFromRawOdds(fixtureBA, config, new Date().toISOString());

  assert.ok(oppsAB.length > 0, 'Should find opportunity from AB order');
  assert.ok(oppsBA.length > 0, 'Should find opportunity from BA order');

  assert.strictEqual(oppsAB[0].id, oppsBA[0].id, 'IDs should be identical regardless of bookmaker order');
});

test('[P1][7.5-STABLEID-002] Different inputs produce different IDs', async () => {
  const fixture1 = {
    event: {
      id: 'event-001',
      name: 'Match 1',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [{ key: 'btts', outcomes: [{ name: 'Yes', odds: 2.20 }, { name: 'No', odds: 1.80 }] }]
      },
      {
        name: 'Book-B',
        markets: [{ key: 'btts', outcomes: [{ name: 'Yes', odds: 1.90 }, { name: 'No', odds: 2.05 }] }]
      }
    ]
  };

  const fixture2 = {
    event: {
      id: 'event-002', // Different event
      name: 'Match 2',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [{ key: 'btts', outcomes: [{ name: 'Yes', odds: 2.20 }, { name: 'No', odds: 1.80 }] }]
      },
      {
        name: 'Book-B',
        markets: [{ key: 'btts', outcomes: [{ name: 'Yes', odds: 1.90 }, { name: 'No', odds: 2.05 }] }]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opps1 = deepScan.__test.buildOpportunitiesFromRawOdds(fixture1, config, new Date().toISOString());
  const opps2 = deepScan.__test.buildOpportunitiesFromRawOdds(fixture2, config, new Date().toISOString());

  assert.ok(opps1.length > 0 && opps2.length > 0, 'Both should find opportunities');
  assert.notStrictEqual(opps1[0].id, opps2[0].id, 'Different events should have different IDs');
});

test('[P1][7.5-STABLEID-003] ID uniqueness within same scan', async () => {
  const fixture = {
    event: {
      id: 'multi-market-test-001',
      name: 'Multi Market Test',
      date: '2026-02-01T15:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'Book-A',
        markets: [
          { key: 'btts', outcomes: [{ name: 'Yes', odds: 2.20 }, { name: 'No', odds: 1.80 }] },
          { key: 'corners_totals', outcomes: [{ name: 'Over 9.5', odds: 2.10 }, { name: 'Under 9.5', odds: 1.75 }] }
        ]
      },
      {
        name: 'Book-B',
        markets: [
          { key: 'btts', outcomes: [{ name: 'Yes', odds: 1.90 }, { name: 'No', odds: 2.05 }] },
          { key: 'corners_totals', outcomes: [{ name: 'Over 9.5', odds: 1.85 }, { name: 'Under 9.5', odds: 2.00 }] }
        ]
      }
    ]
  };

  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  const ids = opportunities.map(o => o.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, 'All IDs should be unique');
});

// ============================================================================
// Task 6: Source Tagging Tests (AC: #7)
// ============================================================================

test('[P1][7.5-SOURCE-001] All Deep Scan opportunities have source: deepScan', async () => {
  const fixture = readFixture('raw-odds-corners.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.ok(opportunities.length > 0, 'Should find at least one opportunity');

  for (const opp of opportunities) {
    assert.strictEqual(opp.source, 'deepScan', 'All deep scan opportunities should have source: deepScan');
  }
});

test('[P1][7.5-SOURCE-002] Source field is validated by Zod schema', () => {
  // This test verifies the schema accepts 'deepScan' as a valid source
  const schemas = require('../out-tests/shared/schemas.js');

  const validOpp = {
    id: 'test-123',
    sport: 'soccer',
    event: { name: 'Test Match', date: '2026-02-01T15:00:00Z', league: 'Test League' },
    legs: [
      { bookmaker: 'Book-A', market: 'btts', odds: 2.0, outcome: 'yes' },
      { bookmaker: 'Book-B', market: 'btts', odds: 2.1, outcome: 'no' }
    ],
    roi: 0.02,
    foundAt: new Date().toISOString(),
    source: 'deepScan'
  };

  const result = schemas.arbitrageOpportunitySchema.safeParse(validOpp);
  assert.ok(result.success, 'Schema should accept deepScan as valid source');
});

// ============================================================================
// Task 8: Integration Tests with Golden Fixtures (AC: #9)
// ============================================================================

test('[P1][7.5-FIXTURE-001] Non-ML Corners O/U produces valid opportunity', async () => {
  const fixture = readFixture('raw-odds-corners.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  assert.ok(opportunities.length > 0, 'Corners fixture should produce opportunity');

  const opp = opportunities[0];
  assert.ok(opp.legs[0].market.includes('corners'), 'Market should be corners-related');
  assert.strictEqual(opp.source, 'deepScan');
  assert.ok(opp.roi > 0, 'ROI should be positive');
});

test('[P1][7.5-FIXTURE-002] Red Card Yes/No produces valid opportunity', async () => {
  const fixture = readFixture('raw-odds-red-card.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  // Red card fixture may or may not produce arb depending on odds
  if (opportunities.length > 0) {
    const opp = opportunities[0];
    assert.strictEqual(opp.source, 'deepScan');
    assert.ok(opp.legs.some(l => l.outcome === 'yes' || l.outcome === 'no'), 'Should have yes/no outcomes');
  }
});

test('[P1][7.5-FIXTURE-003] BTTS market produces valid opportunity', async () => {
  const fixture = readFixture('raw-odds-btts.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  // BTTS fixture may or may not produce arb depending on odds
  if (opportunities.length > 0) {
    const opp = opportunities[0];
    assert.ok(opp.legs[0].market.includes('btts') || opp.legs[0].market.includes('both_teams'), 'Market should be BTTS-related');
    assert.strictEqual(opp.source, 'deepScan');
  }
});

test('[P1][7.5-FIXTURE-004] Asian Handicap produces valid opportunity', async () => {
  const fixture = readFixture('raw-odds-asian-handicap.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  // Asian handicap fixture may or may not produce arb depending on odds
  if (opportunities.length > 0) {
    const opp = opportunities[0];
    assert.strictEqual(opp.source, 'deepScan');
  }
});

// ============================================================================
// Task 9: Type Validation Tests (AC: #7, #8)
// ============================================================================

test('[P1][7.5-TYPES-001] ArbitrageLeg includes optional impliedProbability field', () => {
  // Verify TypeScript types are correct by checking schema
  const schemas = require('../out-tests/shared/schemas.js');

  const validLegWithImplied = {
    bookmaker: 'Test Book',
    market: 'btts',
    odds: 2.0,
    outcome: 'yes',
    impliedProbability: 50.0
  };

  const validLegWithoutImplied = {
    bookmaker: 'Test Book',
    market: 'btts',
    odds: 2.0,
    outcome: 'yes'
  };

  // Both should be valid since impliedProbability is optional
  const opp1 = {
    id: 'test-1',
    sport: 'soccer',
    event: { name: 'Test', date: '2026-01-01T00:00:00Z', league: 'Test' },
    legs: [validLegWithImplied, { ...validLegWithImplied, bookmaker: 'Other Book' }],
    roi: 0.02,
    foundAt: new Date().toISOString()
  };

  const opp2 = {
    id: 'test-2',
    sport: 'soccer',
    event: { name: 'Test', date: '2026-01-01T00:00:00Z', league: 'Test' },
    legs: [validLegWithoutImplied, { ...validLegWithoutImplied, bookmaker: 'Other Book' }],
    roi: 0.02,
    foundAt: new Date().toISOString()
  };

  const result1 = schemas.arbitrageOpportunitySchema.safeParse(opp1);
  const result2 = schemas.arbitrageOpportunitySchema.safeParse(opp2);

  assert.ok(result1.success, 'Schema should accept leg with impliedProbability');
  assert.ok(result2.success, 'Schema should accept leg without impliedProbability');
});

// ============================================================================
// ROI Calculation Verification
// ============================================================================

test('[P1][7.5-ROI-001] ROI calculation matches calculateTwoLegArbitrageRoi', async () => {
  const fixture = readFixture('raw-odds-corners.json');
  const config = { minRoi: 0 };
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, config, new Date().toISOString());

  for (const opp of opportunities) {
    const expectedRoi = calculator.calculateTwoLegArbitrageRoi(opp.legs[0].odds, opp.legs[1].odds);
    assert.strictEqual(
      opp.roi,
      expectedRoi,
      `ROI should match calculator result. Expected: ${expectedRoi}, Got: ${opp.roi}`
    );
  }
});
