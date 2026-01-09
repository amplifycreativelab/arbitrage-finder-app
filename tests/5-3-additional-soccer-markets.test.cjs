'use strict';

const test = require('node:test');
const assert = require('node:assert');

/**
 * Story 5.3: Additional Soccer Two-Way Markets
 *
 * Tests for BTTS (Both Teams to Score) and Handicap market support.
 * Validates market type inference, golden fixtures, schema validation,
 * and Signal Preview formatting.
 */

// Import real functions from compiled output (per E4-AI-02)
const {
  calculateTwoLegArbitrageRoi
} = require('../out-tests/src/main/services/calculator.js');

const {
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js');

const {
  inferMarketTypeFromOpportunity,
  ALL_MARKET_FILTERS
} = require('../out-tests/src/renderer/src/features/dashboard/filters.js');

const {
  formatSignalPayload
} = require('../out-tests/src/renderer/src/features/dashboard/signalPayload.js');

const {
  loadGoldenSnapshotsForBtts,
  loadGoldenSnapshotsForHandicap,
  buildBttsOpportunities,
  buildHandicapOpportunities
} = require('./helpers/golden-dataset.js');

// =============================================================================
// TASK 1: Market Type Definitions Tests
// =============================================================================

test('[P0][5.3-MKT-001] MarketFilterValue includes btts and handicap', () => {
  assert.ok(
    ALL_MARKET_FILTERS.includes('btts'),
    'ALL_MARKET_FILTERS should include btts'
  );
  assert.ok(
    ALL_MARKET_FILTERS.includes('handicap'),
    'ALL_MARKET_FILTERS should include handicap'
  );
  assert.strictEqual(
    ALL_MARKET_FILTERS.length,
    5,
    'Should have 5 market types: moneyline, draw-no-bet, totals, btts, handicap'
  );
});

test('[P0][5.3-MKT-002] inferMarketTypeFromOpportunity detects BTTS variants', () => {
  const bttsVariants = [
    'btts',
    'BTTS',
    'both-teams-to-score',
    'both_teams_to_score',
    'btts_yes',
    'btts_no',
    'both_teams_score',
    'both teams to score'
  ];

  for (const variant of bttsVariants) {
    const opportunity = {
      id: 'test-btts',
      sport: 'soccer',
      event: { name: 'Test', date: '2026-01-01', league: 'Test' },
      legs: [
        { bookmaker: 'A', market: variant, odds: 1.9, outcome: 'yes' },
        { bookmaker: 'B', market: variant, odds: 2.1, outcome: 'no' }
      ],
      roi: 0.025,
      foundAt: '2026-01-01T00:00:00Z'
    };

    const result = inferMarketTypeFromOpportunity(opportunity);
    assert.strictEqual(
      result,
      'btts',
      `Market variant "${variant}" should map to 'btts'`
    );
  }
});

test('[P0][5.3-MKT-003] inferMarketTypeFromOpportunity detects Handicap variants', () => {
  const handicapVariants = [
    'handicap',
    'spreads',
    'spread',
    'asian_handicap',
    'asian handicap',
    'ah',
    '0-handicap',
    'handicap_0',
    'handicap 0',
    'spreads_0'
  ];

  for (const variant of handicapVariants) {
    const opportunity = {
      id: 'test-handicap',
      sport: 'soccer',
      event: { name: 'Test', date: '2026-01-01', league: 'Test' },
      legs: [
        { bookmaker: 'A', market: variant, odds: 1.95, outcome: 'home' },
        { bookmaker: 'B', market: variant, odds: 2.1, outcome: 'away' }
      ],
      roi: 0.027,
      foundAt: '2026-01-01T00:00:00Z'
    };

    const result = inferMarketTypeFromOpportunity(opportunity);
    assert.strictEqual(
      result,
      'handicap',
      `Market variant "${variant}" should map to 'handicap'`
    );
  }
});

test('[P1][5.3-MKT-004] inferMarketTypeFromOpportunity still handles existing markets', () => {
  const existingMarkets = [
    { input: 'moneyline', expected: 'moneyline' },
    { input: 'h2h', expected: 'moneyline' },
    { input: 'match-winner', expected: 'moneyline' },
    { input: 'draw-no-bet', expected: 'draw-no-bet' },
    { input: 'dnb', expected: 'draw-no-bet' },
    { input: 'totals', expected: 'totals' },
    { input: 'over/under', expected: 'totals' }
  ];

  for (const { input, expected } of existingMarkets) {
    const opportunity = {
      id: 'test-existing',
      sport: 'soccer',
      event: { name: 'Test', date: '2026-01-01', league: 'Test' },
      legs: [
        { bookmaker: 'A', market: input, odds: 2.0, outcome: 'home' },
        { bookmaker: 'B', market: input, odds: 2.1, outcome: 'away' }
      ],
      roi: 0.025,
      foundAt: '2026-01-01T00:00:00Z'
    };

    const result = inferMarketTypeFromOpportunity(opportunity);
    assert.strictEqual(
      result,
      expected,
      `Existing market "${input}" should still map to '${expected}'`
    );
  }
});

// =============================================================================
// TASK 6: Golden Fixtures Tests
// =============================================================================

test('[P0][5.3-GOLDEN-001] BTTS golden fixtures produce positive ROI', () => {
  const snapshots = loadGoldenSnapshotsForBtts();

  assert.ok(
    snapshots.length >= 2,
    'BTTS fixtures should contain at least 2 opportunities'
  );

  for (const snapshot of snapshots) {
    const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds);
    assert.ok(
      roi > 0,
      `BTTS fixture ${snapshot.id} should produce positive ROI, got ${roi}`
    );
    assert.strictEqual(
      snapshot.market,
      'btts',
      `BTTS fixture ${snapshot.id} should have market 'btts'`
    );
    assert.notStrictEqual(
      snapshot.homeBookmaker,
      snapshot.awayBookmaker,
      `BTTS fixture ${snapshot.id} should have different bookmakers`
    );
  }
});

test('[P0][5.3-GOLDEN-002] Handicap golden fixtures produce positive ROI', () => {
  const snapshots = loadGoldenSnapshotsForHandicap();

  assert.ok(
    snapshots.length >= 2,
    'Handicap fixtures should contain at least 2 opportunities'
  );

  for (const snapshot of snapshots) {
    const roi = calculateTwoLegArbitrageRoi(snapshot.homeOdds, snapshot.awayOdds);
    assert.ok(
      roi > 0,
      `Handicap fixture ${snapshot.id} should produce positive ROI, got ${roi}`
    );
    assert.strictEqual(
      snapshot.market,
      'spreads',
      `Handicap fixture ${snapshot.id} should have market 'spreads'`
    );
    assert.notStrictEqual(
      snapshot.homeBookmaker,
      snapshot.awayBookmaker,
      `Handicap fixture ${snapshot.id} should have different bookmakers`
    );
  }
});

test('[P0][5.3-SCHEMA-001] BTTS opportunities pass schema validation', () => {
  const opportunities = buildBttsOpportunities();

  // Enrich with foundAt for schema validation
  const enriched = opportunities.map((opp) => ({
    ...opp,
    foundAt: '2026-01-01T00:00:00Z'
  }));

  const parseResult = arbitrageOpportunityListSchema.safeParse(enriched);

  assert.ok(
    parseResult.success,
    `BTTS opportunities should pass schema validation: ${JSON.stringify(parseResult.error?.issues)}`
  );
  assert.strictEqual(
    parseResult.data.length,
    opportunities.length,
    'All BTTS opportunities should be valid'
  );
});

test('[P0][5.3-SCHEMA-002] Handicap opportunities pass schema validation', () => {
  const opportunities = buildHandicapOpportunities();

  // Enrich with foundAt for schema validation
  const enriched = opportunities.map((opp) => ({
    ...opp,
    foundAt: '2026-01-01T00:00:00Z'
  }));

  const parseResult = arbitrageOpportunityListSchema.safeParse(enriched);

  assert.ok(
    parseResult.success,
    `Handicap opportunities should pass schema validation: ${JSON.stringify(parseResult.error?.issues)}`
  );
  assert.strictEqual(
    parseResult.data.length,
    opportunities.length,
    'All Handicap opportunities should be valid'
  );
});

// =============================================================================
// TASK 5: Signal Preview Formatting Tests
// =============================================================================

test('[P0][5.3-SIGNAL-001] formatSignalPayload displays BTTS market correctly', () => {
  const bttsOpportunity = {
    id: 'btts-signal-test',
    sport: 'soccer',
    event: {
      name: 'Liverpool vs Arsenal',
      date: '2026-01-15T20:00:00Z',
      league: 'Premier League'
    },
    legs: [
      { bookmaker: 'Bet365', market: 'btts', odds: 1.90, outcome: 'yes' },
      { bookmaker: 'Betway', market: 'btts', odds: 2.15, outcome: 'no' }
    ],
    roi: 0.025,
    foundAt: '2026-01-15T18:00:00Z'
  };

  const payload = formatSignalPayload(bttsOpportunity, null);

  assert.ok(
    payload.includes('BTTS (Both Teams to Score)'),
    'Signal payload should include human-readable BTTS label'
  );
  assert.ok(
    payload.includes('Yes') || payload.includes('No'),
    'Signal payload should include outcome labels'
  );
  assert.ok(
    payload.includes('Bet365'),
    'Signal payload should include bookmaker names'
  );
  assert.ok(
    payload.includes('2.5%'),
    'Signal payload should include ROI percentage'
  );
});

test('[P0][5.3-SIGNAL-002] formatSignalPayload displays Handicap market correctly', () => {
  const handicapOpportunity = {
    id: 'handicap-signal-test',
    sport: 'soccer',
    event: {
      name: 'Barcelona vs Real Madrid',
      date: '2026-01-25T21:00:00Z',
      league: 'La Liga'
    },
    legs: [
      { bookmaker: '1xBet', market: 'spreads', odds: 1.95, outcome: 'home' },
      { bookmaker: 'Betfair', market: 'spreads', odds: 2.10, outcome: 'away' }
    ],
    roi: 0.027,
    foundAt: '2026-01-25T19:00:00Z'
  };

  const payload = formatSignalPayload(handicapOpportunity, null);

  assert.ok(
    payload.includes('Handicap'),
    'Signal payload should include Handicap label'
  );
  assert.ok(
    payload.includes('Home') || payload.includes('Away'),
    'Signal payload should include outcome labels'
  );
  assert.ok(
    payload.includes('1xBet'),
    'Signal payload should include bookmaker names'
  );
});

// =============================================================================
// R-002 Invariant Tests for New Markets
// =============================================================================

test('[P1][5.3-R002-001] BTTS opportunities maintain R-002 invariants', () => {
  const opportunities = buildBttsOpportunities();
  const tolerance = 1e-9;

  for (const opportunity of opportunities) {
    assert.ok(
      opportunity.roi >= 0,
      `R-002 invariant: ROI must be non-negative (${opportunity.id})`
    );

    assert.notStrictEqual(
      opportunity.legs[0].bookmaker,
      opportunity.legs[1].bookmaker,
      `R-002 invariant: legs must reference distinct bookmakers (${opportunity.id})`
    );

    const implied = 1 / opportunity.legs[0].odds + 1 / opportunity.legs[1].odds;
    assert.ok(
      implied <= 1 + tolerance,
      `R-002 invariant: implied probability must satisfy formula (${opportunity.id})`
    );
  }
});

test('[P1][5.3-R002-002] Handicap opportunities maintain R-002 invariants', () => {
  const opportunities = buildHandicapOpportunities();
  const tolerance = 1e-9;

  for (const opportunity of opportunities) {
    assert.ok(
      opportunity.roi >= 0,
      `R-002 invariant: ROI must be non-negative (${opportunity.id})`
    );

    assert.notStrictEqual(
      opportunity.legs[0].bookmaker,
      opportunity.legs[1].bookmaker,
      `R-002 invariant: legs must reference distinct bookmakers (${opportunity.id})`
    );

    const implied = 1 / opportunity.legs[0].odds + 1 / opportunity.legs[1].odds;
    assert.ok(
      implied <= 1 + tolerance,
      `R-002 invariant: implied probability must satisfy formula (${opportunity.id})`
    );
  }
});
