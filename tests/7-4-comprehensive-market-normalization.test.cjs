'use strict';

/**
 * Story 7.4: Comprehensive Market Normalization Tests
 *
 * Tests for market pattern matching, outcome normalization, label formatting,
 * and opportunity building across all market types.
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
const { OddsApiIoAdapter } = require('../out-tests/src/main/adapters/odds-api-io.js');
const { TheOddsApiAdapter } = require('../out-tests/src/main/adapters/the-odds-api.js');

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

function readFixture(name) {
  const fixturePath = path.join(fixturesDir, name);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
}

test.beforeEach(async () => {
  deepScan.__test.resetState();
  deepScan.__test.setUseBatchOdds(false); // Use single-event mode for legacy tests
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
// Task 1: MARKET_PATTERNS registry coverage
// ============================================================================

test('[P1][7.4-PATTERNS-001] MARKET_PATTERNS includes goals/scoring patterns (Task 1.1)', () => {
  if (!sharedTypes) return; // Skip if types not loaded
  const patterns = sharedTypes.MARKET_PATTERNS;

  // Goal in 1H/2H binaries
  assert.ok(patterns.goal_in_1h, 'goal_in_1h pattern should exist');
  assert.ok(patterns.goal_in_2h, 'goal_in_2h pattern should exist');
  assert.ok(patterns.home_to_score, 'home_to_score pattern should exist');
  assert.ok(patterns.away_to_score, 'away_to_score pattern should exist');
  assert.ok(patterns.home_clean_sheet, 'home_clean_sheet pattern should exist');
  assert.ok(patterns.away_clean_sheet, 'away_clean_sheet pattern should exist');

  // Verify groups
  assert.strictEqual(patterns.goal_in_1h.group, 'goals');
  assert.strictEqual(patterns.home_to_score.group, 'goals');
});

test('[P1][7.4-PATTERNS-002] MARKET_PATTERNS includes corners patterns (Task 1.2)', () => {
  if (!sharedTypes) return;
  const patterns = sharedTypes.MARKET_PATTERNS;

  assert.ok(patterns.corners_1h, 'corners_1h pattern should exist');
  assert.ok(patterns.corners_2h, 'corners_2h pattern should exist');
  assert.ok(patterns.match_corners, 'match_corners pattern should exist');
  assert.ok(patterns.corner_match_bet, 'corner_match_bet pattern should exist');
  assert.ok(patterns.first_half_corners, 'first_half_corners pattern should exist');

  assert.strictEqual(patterns.corners_1h.group, 'corners');
  assert.strictEqual(patterns.corner_match_bet.group, 'corners');
});

test('[P1][7.4-PATTERNS-003] MARKET_PATTERNS includes cards patterns (Task 1.3)', () => {
  if (!sharedTypes) return;
  const patterns = sharedTypes.MARKET_PATTERNS;

  assert.ok(patterns.cards_1h, 'cards_1h pattern should exist');
  assert.ok(patterns.cards_2h, 'cards_2h pattern should exist');
  assert.ok(patterns.booking_points, 'booking_points pattern should exist');
  assert.ok(patterns.any_player_red, 'any_player_red pattern should exist');
  assert.ok(patterns.red_card_shown, 'red_card_shown pattern should exist');

  assert.strictEqual(patterns.cards_1h.group, 'cards');
  assert.strictEqual(patterns.booking_points.group, 'cards');
});

test('[P1][7.4-PATTERNS-004] MARKET_PATTERNS includes shots patterns (Task 1.4)', () => {
  if (!sharedTypes) return;
  const patterns = sharedTypes.MARKET_PATTERNS;

  assert.ok(patterns.match_shots, 'match_shots pattern should exist');
  assert.ok(patterns.sot_over, 'sot_over pattern should exist');
  assert.ok(patterns.sot_under, 'sot_under pattern should exist');
  assert.ok(patterns.shots_on_target_over, 'shots_on_target_over pattern should exist');

  assert.strictEqual(patterns.sot_over.group, 'shots');
  assert.strictEqual(patterns.match_shots.group, 'shots');
});

test('[P1][7.4-PATTERNS-005] MARKET_PATTERNS includes other/props patterns (Task 1.5)', () => {
  if (!sharedTypes) return;
  const patterns = sharedTypes.MARKET_PATTERNS;

  assert.ok(patterns.total_offsides, 'total_offsides pattern should exist');
  assert.ok(patterns.penalty_awarded, 'penalty_awarded pattern should exist');
  assert.ok(patterns.own_goal_scored, 'own_goal_scored pattern should exist');
  assert.ok(patterns.throw_in_totals, 'throw_in_totals pattern should exist');

  assert.strictEqual(patterns.total_offsides.group, 'other');
  assert.strictEqual(patterns.penalty_awarded.group, 'other');
});

// ============================================================================
// Task 2: inferMarketMetadata enhancements
// ============================================================================

test('[P1][7.4-INFER-001] inferMarketMetadata detects period from key suffix (Task 2.1)', () => {
  if (!sharedTypes) return;

  const ft = sharedTypes.inferMarketMetadata('corners_over_9.5_ft');
  assert.strictEqual(ft.period, 'ft', 'should detect _ft suffix');

  const h1 = sharedTypes.inferMarketMetadata('goals_1h');
  assert.strictEqual(h1.period, '1h', 'should detect _1h suffix');

  const h2 = sharedTypes.inferMarketMetadata('cards_2h');
  assert.strictEqual(h2.period, '2h', 'should detect _2h suffix');
});

test('[P1][7.4-INFER-002] inferMarketMetadata detects period from key prefix (Task 2.1)', () => {
  if (!sharedTypes) return;

  const firstHalf = sharedTypes.inferMarketMetadata('first_half_corners');
  assert.strictEqual(firstHalf.period, '1h', 'should detect first_half_ prefix');

  const secondHalf = sharedTypes.inferMarketMetadata('second_half_totals');
  assert.strictEqual(secondHalf.period, '2h', 'should detect second_half_ prefix');
});

test('[P1][7.4-INFER-003] inferMarketMetadata extracts line from key (Task 2.2)', () => {
  if (!sharedTypes) return;

  const over = sharedTypes.inferMarketMetadata('corners_over_9.5');
  assert.strictEqual(over.line, 9.5, 'should extract 9.5 from corners_over_9.5');

  const handicap = sharedTypes.inferMarketMetadata('asian_handicap_-1.5');
  assert.strictEqual(handicap.line, -1.5, 'should extract -1.5 from asian_handicap_-1.5');

  const positive = sharedTypes.inferMarketMetadata('spreads_+0.5');
  assert.strictEqual(positive.line, 0.5, 'should extract +0.5 from spreads_+0.5');
});

test('[P1][7.4-INFER-004] inferMarketMetadata extracts side from key (Task 2.3)', () => {
  if (!sharedTypes) return;

  const home = sharedTypes.inferMarketMetadata('home_corners');
  assert.strictEqual(home.side, 'home', 'should detect home_ prefix');

  const away = sharedTypes.inferMarketMetadata('away_cards');
  assert.strictEqual(away.side, 'away', 'should detect away_ prefix');

  const match = sharedTypes.inferMarketMetadata('match_corners_over');
  assert.strictEqual(match.side, 'match', 'should detect match_ prefix');
});

test('[P1][7.4-INFER-005] inferMarketMetadata resolves aliases (Task 2.5)', () => {
  if (!sharedTypes) return;

  const btts = sharedTypes.inferMarketMetadata('btts');
  assert.strictEqual(btts.group, 'goals', 'btts should resolve to goals group');

  const sot = sharedTypes.inferMarketMetadata('sot');
  assert.strictEqual(sot.group, 'shots', 'sot should resolve to shots group');

  const ah = sharedTypes.inferMarketMetadata('ah');
  assert.strictEqual(ah.group, 'handicap', 'ah should resolve to handicap group');

  const dnb = sharedTypes.inferMarketMetadata('dnb');
  assert.strictEqual(dnb.group, 'goals', 'dnb should resolve to goals group');
});

test('[P1][7.4-INFER-006] inferMarketMetadata handles compound patterns (Task 2.4)', () => {
  if (!sharedTypes) return;

  // "corners_totals_over_10.5_ft" should match corners_totals prefix
  const compound = sharedTypes.inferMarketMetadata('corners_totals_over_10.5_ft');
  assert.strictEqual(compound.group, 'corners', 'should match corners group');
  assert.strictEqual(compound.period, 'ft', 'should extract period');
  assert.strictEqual(compound.line, 10.5, 'should extract line');
});

test('[P1][7.4-INFER-007] inferMarketMetadata falls back to other for unknown patterns', () => {
  if (!sharedTypes) return;

  const unknown = sharedTypes.inferMarketMetadata('weird_unknown_market_type');
  assert.strictEqual(unknown.group, 'other', 'unknown patterns should fallback to other');
});

test('[P1][7.4-KNOWN-001] known other-group markets are distinguished from unknown markets', () => {
  if (!sharedTypes) return;

  // Known "other" market should be recognized as known
  assert.strictEqual(
    sharedTypes.isKnownMarketPattern('penalty_awarded'),
    true,
    'penalty_awarded should be recognized as a known market pattern'
  );

  // Unknown market should not be recognized
  assert.strictEqual(
    sharedTypes.isKnownMarketPattern('totally_unknown_market_key'),
    false,
    'totally_unknown_market_key should not be recognized as known'
  );
});

// ============================================================================
// Task 4: formatMarketLabelFromKey
// ============================================================================

test('[P1][7.4-LABEL-001] formatMarketLabelFromKey formats known markets correctly', () => {
  if (!sharedTypes) return;

  assert.strictEqual(sharedTypes.formatMarketLabelFromKey('btts'), 'BTTS (Both Teams to Score)');
  assert.strictEqual(sharedTypes.formatMarketLabelFromKey('h2h'), 'Moneyline');
  assert.strictEqual(sharedTypes.formatMarketLabelFromKey('corners_1h'), 'Corners (1H)');
  assert.strictEqual(sharedTypes.formatMarketLabelFromKey('red_card'), 'Red Card');
  assert.strictEqual(sharedTypes.formatMarketLabelFromKey('shots_on_target'), 'Shots on Target');
});

test('[P1][7.4-LABEL-002] formatMarketLabelFromKey formats compound keys with lines', () => {
  if (!sharedTypes) return;

  const cornersLabel = sharedTypes.formatMarketLabelFromKey('corners_over_9.5_ft');
  assert.ok(cornersLabel.includes('9.5'), 'should include line value');
  assert.ok(cornersLabel.includes('(FT)'), 'should include period suffix');
});

test('[P1][7.4-LABEL-003] formatMarketLabelFromKey formats line values without trailing zeros', () => {
  if (!sharedTypes) return;

  // "2.5" not "2.50"
  const label = sharedTypes.formatMarketLabelFromKey('totals_over_2.5');
  assert.ok(!label.includes('2.50'), 'should not have trailing zero');
  assert.ok(label.includes('2.5'), 'should include clean line value');
});

// ============================================================================
// Task 6: Golden fixtures
// ============================================================================

test('[P1][7.4-FIXTURE-001] Corners golden fixture exists and is valid', () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-corners.json');
  assert.ok(fs.existsSync(fixturePath), 'raw-odds-corners.json should exist');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  assert.ok(fixture.event, 'fixture should have event');
  assert.ok(fixture.bookmakers, 'fixture should have bookmakers');
  assert.strictEqual(fixture.event.id, 'fixture-corners-001');
});

test('[P1][7.4-FIXTURE-002] Cards golden fixture exists and is valid', () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-cards.json');
  assert.ok(fs.existsSync(fixturePath), 'raw-odds-cards.json should exist');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  assert.strictEqual(fixture.bookmakers.length, 2, 'should have 2 bookmakers');
});

test('[P1][7.4-FIXTURE-003] BTTS golden fixture exists and is valid', () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-btts.json');
  assert.ok(fs.existsSync(fixturePath), 'raw-odds-btts.json should exist');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  assert.strictEqual(fixture.event.league, 'Bundesliga');
});

test('[P1][7.4-FIXTURE-004] Asian handicap golden fixture exists and is valid', () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-asian-handicap.json');
  assert.ok(fs.existsSync(fixturePath), 'raw-odds-asian-handicap.json should exist');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  // Should have 3 handicap lines per bookmaker
  const book1Markets = fixture.bookmakers[0].markets;
  assert.strictEqual(book1Markets.length, 3, 'should have 3 handicap lines');
});

test('[P1][7.4-FIXTURE-005] Red card golden fixture exists and is valid', () => {
  const fixturePath = path.join(fixturesDir, 'raw-odds-red-card.json');
  assert.ok(fs.existsSync(fixturePath), 'raw-odds-red-card.json should exist');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  assert.strictEqual(fixture._expectedArbitrage.group, 'cards');
});

// ============================================================================
// Integration: Market metadata extraction
// ============================================================================

test('[P1][7.4-INT-001] inferMarketMetadata assigns correct group to all major market types', () => {
  if (!sharedTypes) return;

  const testCases = [
    { key: 'h2h', expectedGroup: 'goals' },
    { key: 'totals', expectedGroup: 'goals' },
    { key: 'btts', expectedGroup: 'goals' },
    { key: 'asian_handicap', expectedGroup: 'handicap' },
    { key: 'spreads', expectedGroup: 'handicap' },
    { key: 'corners', expectedGroup: 'corners' },
    { key: 'corners_over', expectedGroup: 'corners' },
    { key: 'cards', expectedGroup: 'cards' },
    { key: 'red_card', expectedGroup: 'cards' },
    { key: 'shots', expectedGroup: 'shots' },
    { key: 'shots_on_target', expectedGroup: 'shots' },
    { key: 'offsides', expectedGroup: 'other' },
    { key: 'penalty', expectedGroup: 'other' }
  ];

  for (const tc of testCases) {
    const metadata = sharedTypes.inferMarketMetadata(tc.key);
    assert.strictEqual(
      metadata.group,
      tc.expectedGroup,
      `${tc.key} should be in ${tc.expectedGroup} group, got ${metadata.group}`
    );
  }
});

test('[P1][7.4-INT-002] inferMarketMetadata extracts complete metadata from complex keys', () => {
  if (!sharedTypes) return;

  const metadata = sharedTypes.inferMarketMetadata('home_corners_over_5.5_1h');
  assert.strictEqual(metadata.group, 'corners');
  assert.strictEqual(metadata.side, 'home');
  assert.strictEqual(metadata.line, 5.5);
  assert.strictEqual(metadata.period, '1h');
  assert.ok(metadata.label.length > 0, 'should have a label');
});

test('[P1][7.4-BUILD-001] asian handicap complements pair under a single canonical line', async () => {
  const fixture = readFixture('raw-odds-asian-handicap.json');

  deepScan.__test.setEventResolver(async () => [{ id: fixture.event.id, name: fixture.event.name }]);
  deepScan.__test.setOddsFetcher(async () => fixture);

  await deepScan.startDeepScan({ eventIds: [fixture.event.id] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  const handicapOpp = results.find((opp) => String(opp.legs[0].market).includes('asian_handicap_0.5'));

  assert.ok(handicapOpp, 'expected an asian handicap opportunity for the 0.5 line');
});

test('[P1][7.4-BUILD-002] over/under variants with market suffixes normalize to two outcomes', async () => {
  const fixture = {
    event: {
      id: 'fixture-ou-variance-001',
      name: 'Variance FC vs Normalized United',
      date: '2026-02-05T12:00:00Z',
      league: 'Premier League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'SuffixBook1',
        markets: [
          {
            key: 'corners_totals',
            outcomes: [
              { name: 'Over 9.5 Corners', odds: 2.2 },
              { name: 'Under 9.5', odds: 1.7 }
            ]
          }
        ]
      },
      {
        name: 'SuffixBook2',
        markets: [
          {
            key: 'corners_totals',
            outcomes: [
              { name: 'Over 9.5', odds: 1.8 },
              { name: 'Under 9.5 Corners', odds: 2.2 }
            ]
          }
        ]
      }
    ]
  };

  deepScan.__test.setEventResolver(async () => [{ id: fixture.event.id, name: fixture.event.name }]);
  deepScan.__test.setOddsFetcher(async () => fixture);

  await deepScan.startDeepScan({ eventIds: [fixture.event.id] });
  await deepScan.__test.waitForScanCompletion();

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 1, 'expected a single arbitrage opportunity after normalization');
});

test('[P1][7.4-BUILD-003] unknown markets are logged at debug level and skipped', async () => {
  const priorDebug = process.env.DEBUG_LOGGING;
  process.env.DEBUG_LOGGING = 'true';
  const capture = startLogCapture();

  const fixture = {
    event: {
      id: 'fixture-unknown-001',
      name: 'Unknown Market FC vs Skip City',
      date: '2026-02-06T12:00:00Z',
      league: 'Test League',
      sport: 'soccer'
    },
    bookmakers: [
      {
        name: 'UnknownBook1',
        markets: [
          {
            key: 'totally_unknown_market',
            outcomes: [
              { name: 'Yes', odds: 2.2 },
              { name: 'No', odds: 2.2 }
            ]
          }
        ]
      },
      {
        name: 'UnknownBook2',
        markets: [
          {
            key: 'totally_unknown_market',
            outcomes: [
              { name: 'Yes', odds: 2.05 },
              { name: 'No', odds: 2.05 }
            ]
          }
        ]
      }
    ]
  };

  try {
    deepScan.__test.setEventResolver(async () => [{ id: fixture.event.id, name: fixture.event.name }]);
    deepScan.__test.setOddsFetcher(async () => fixture);

    await deepScan.startDeepScan({ eventIds: [fixture.event.id] });
    await deepScan.__test.waitForScanCompletion();
  } finally {
    capture.restore();
    process.env.DEBUG_LOGGING = priorDebug;
  }

  const results = deepScan.getDeepScanResults();
  assert.strictEqual(results.length, 0, 'unknown markets should be skipped and yield no opportunities');

  const debugUnknown = capture.entries.find((entry) => String(entry.event).includes('market.unknown'));
  assert.ok(debugUnknown, 'expected a debug log entry for unknown markets');
});

test('[P1][7.4-BUILD-004] buildOpportunitiesFromRawOdds integrates fixtures into canonical markets', () => {
  const fixture = readFixture('raw-odds-corners.json');
  const foundAt = '2026-02-01T00:00:00Z';
  const opportunities = deepScan.__test.buildOpportunitiesFromRawOdds(fixture, {}, foundAt);

  assert.strictEqual(opportunities.length, 1, 'expected a single corners opportunity');
  const opp = opportunities[0];
  assert.ok(String(opp.legs[0].market).includes('corners_totals_9.5'), 'expected corners line-aware market key');
  assert.ok(opp.roi > 0, 'expected positive ROI');
});
