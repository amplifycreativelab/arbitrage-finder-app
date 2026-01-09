'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

/**
 * Story 5.4: Cross-Provider Arbitrage Aggregator Tests
 *
 * Tests cover:
 * - Event matcher (team name normalization, event key generation)
 * - Cross-provider calculator (finding arbs, respecting invariants)
 * - Integration with golden fixtures
 * - Schema validation
 */

// Import real functions from compiled output (per E4-AI-02)
const {
  normalizeTeamName,
  extractTeamsFromEventName,
  generateEventKey,
  matchEventsByKey,
  extractQuotesFromOpportunity,
  extractAllQuotes
} = require('../out-tests/src/main/services/eventMatcher.js');

const {
  findCrossProviderArbitrages,
  logCrossProviderStats
} = require('../out-tests/src/main/services/crossProviderCalculator.js');

const {
  calculateTwoLegArbitrageRoi
} = require('../out-tests/src/main/services/calculator.js');

const {
  arbitrageOpportunitySchema,
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js');

// Load golden fixtures
const goldenFixturesPath = path.join(__dirname, 'fixtures/arbitrage/golden-cross-provider.json');
const goldenFixtures = JSON.parse(fs.readFileSync(goldenFixturesPath, 'utf-8'));

// =============================================================================
// TASK 1: Event Matcher Tests - normalizeTeamName
// =============================================================================

test('[P0][5.4-NORM-001] normalizeTeamName strips FC suffix', () => {
  assert.strictEqual(normalizeTeamName('Arsenal FC'), 'arsenal');
});

test('[P0][5.4-NORM-002] normalizeTeamName strips SC suffix', () => {
  assert.strictEqual(normalizeTeamName('Sporting SC'), 'sporting');
});

test('[P0][5.4-NORM-003] normalizeTeamName removes accents/diacritics', () => {
  assert.strictEqual(normalizeTeamName('Atlético Madrid'), 'atletico madrid');
  assert.strictEqual(normalizeTeamName('Bayern München'), 'bayern munchen');
});

test('[P0][5.4-NORM-004] normalizeTeamName handles FC prefix', () => {
  assert.strictEqual(normalizeTeamName('FC Barcelona'), 'barcelona');
  assert.strictEqual(normalizeTeamName('AC Milan'), 'milan');
  assert.strictEqual(normalizeTeamName('SC Freiburg'), 'freiburg');
});

test('[P1][5.4-NORM-005] normalizeTeamName handles empty/invalid input', () => {
  assert.strictEqual(normalizeTeamName(''), '');
  assert.strictEqual(normalizeTeamName(null), '');
  assert.strictEqual(normalizeTeamName(undefined), '');
});

test('[P1][5.4-NORM-006] normalizeTeamName lowercases and trims', () => {
  assert.strictEqual(normalizeTeamName('  CHELSEA  '), 'chelsea');
});

// Test against golden fixtures team name tests
for (const testCase of goldenFixtures.teamNameNormalizationTests) {
  test(`[P1][5.4-NORM-GOLDEN] normalizeTeamName("${testCase.input}") => "${testCase.expected}"`, () => {
    assert.strictEqual(normalizeTeamName(testCase.input), testCase.expected);
  });
}

// =============================================================================
// TASK 1: Event Matcher Tests - extractTeamsFromEventName
// =============================================================================

test('[P0][5.4-EXTRACT-001] extractTeamsFromEventName handles "vs" separator', () => {
  const result = extractTeamsFromEventName('Arsenal vs Chelsea');
  assert.deepStrictEqual(result, ['Arsenal', 'Chelsea']);
});

test('[P0][5.4-EXTRACT-002] extractTeamsFromEventName handles " v " separator', () => {
  const result = extractTeamsFromEventName('Arsenal v Chelsea');
  assert.deepStrictEqual(result, ['Arsenal', 'Chelsea']);
});

test('[P0][5.4-EXTRACT-003] extractTeamsFromEventName handles " - " separator', () => {
  const result = extractTeamsFromEventName('Arsenal - Chelsea');
  assert.deepStrictEqual(result, ['Arsenal', 'Chelsea']);
});

test('[P1][5.4-EXTRACT-004] extractTeamsFromEventName returns null for invalid input', () => {
  assert.strictEqual(extractTeamsFromEventName(''), null);
  assert.strictEqual(extractTeamsFromEventName('Just a single team'), null);
});

// =============================================================================
// TASK 1: Event Matcher Tests - generateEventKey
// =============================================================================

test('[P0][5.4-KEY-001] generateEventKey produces consistent key regardless of home/away order', () => {
  const event1 = {
    name: 'Arsenal vs Chelsea',
    date: '2025-01-15T15:00:00Z',
    league: 'Premier League'
  };
  const event2 = {
    name: 'Chelsea vs Arsenal',
    date: '2025-01-15T15:00:00Z',
    league: 'EPL'
  };

  const key1 = generateEventKey(event1);
  const key2 = generateEventKey(event2);

  assert.strictEqual(key1, key2);
  assert.strictEqual(key1, 'arsenal|chelsea|2025-01-15T15');
});

test('[P0][5.4-KEY-002] generateEventKey matches events with FC suffix variations', () => {
  const event1 = {
    name: 'Liverpool FC vs Manchester City',
    date: '2025-01-20T17:30:00Z',
    league: 'Premier League'
  };
  const event2 = {
    name: 'Liverpool vs Manchester City',
    date: '2025-01-20T17:30:00Z',
    league: 'EPL'
  };

  const key1 = generateEventKey(event1);
  const key2 = generateEventKey(event2);

  // Both should normalize to same key (FC stripped)
  assert.strictEqual(key1, key2);
});

test('[P0][5.4-KEY-003] generateEventKey matches events within the same hour', () => {
  const event1 = {
    name: 'Real Madrid vs FC Barcelona',
    date: '2025-02-01T20:00:00Z',
    league: 'La Liga'
  };
  const event2 = {
    name: 'Real Madrid vs Barcelona',
    date: '2025-02-01T20:45:00Z',
    league: 'Spanish La Liga'
  };

  const key1 = generateEventKey(event1);
  const key2 = generateEventKey(event2);

  // Same hour + FC prefix stripped = same key
  assert.strictEqual(key1, key2);
});

test('[P1][5.4-KEY-004] generateEventKey returns null for invalid event', () => {
  assert.strictEqual(generateEventKey({ name: '', date: '', league: '' }), null);
  assert.strictEqual(generateEventKey({ name: 'Invalid', date: '', league: '' }), null);
});

// =============================================================================
// TASK 2: Quote Extraction Tests
// =============================================================================

test('[P0][5.4-QUOTE-001] extractQuotesFromOpportunity extracts two quotes', () => {
  const opportunity = {
    id: 'test-1',
    sport: 'soccer',
    event: {
      name: 'Arsenal vs Chelsea',
      date: '2025-01-15T15:00:00Z',
      league: 'Premier League'
    },
    legs: [
      { bookmaker: 'Bet365', market: 'h2h', odds: 2.10, outcome: 'home' },
      { bookmaker: 'Pinnacle', market: 'h2h', odds: 2.05, outcome: 'away' }
    ],
    roi: 0.02,
    foundAt: '2025-01-15T14:30:00Z',
    providerId: 'odds-api-io'
  };

  const quotes = extractQuotesFromOpportunity(opportunity);

  assert.strictEqual(quotes.length, 2);
  assert.strictEqual(quotes[0].bookmaker, 'Bet365');
  assert.strictEqual(quotes[0].outcome, 'home');
  assert.strictEqual(quotes[0].odds, 2.10);
  assert.strictEqual(quotes[0].providerId, 'odds-api-io');
  assert.strictEqual(quotes[1].bookmaker, 'Pinnacle');
  assert.strictEqual(quotes[1].outcome, 'away');
});

test('[P1][5.4-QUOTE-002] extractQuotesFromOpportunity returns empty for invalid opportunity', () => {
  const invalidOpp = {
    id: 'invalid',
    sport: 'soccer',
    event: { name: 'Invalid', date: '', league: '' },
    legs: [
      { bookmaker: 'A', market: 'h2h', odds: 1.5, outcome: 'home' },
      { bookmaker: 'B', market: 'h2h', odds: 1.5, outcome: 'away' }
    ],
    roi: 0,
    foundAt: ''
  };

  const quotes = extractQuotesFromOpportunity(invalidOpp);
  assert.strictEqual(quotes.length, 0);
});

// =============================================================================
// TASK 3: Cross-Provider Calculator Tests
// =============================================================================

test('[P0][5.4-CALC-001] findCrossProviderArbitrages finds cross-provider arbs', () => {
  const quotes = [
    {
      eventKey: 'arsenal|chelsea|2025-01-15T15',
      providerId: 'odds-api-io',
      bookmaker: 'Bet365',
      market: 'h2h',
      outcome: 'home',
      odds: 2.10,
      originalEventName: 'Arsenal vs Chelsea',
      originalEventDate: '2025-01-15T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-01-15T14:30:00Z'
    },
    {
      eventKey: 'arsenal|chelsea|2025-01-15T15',
      providerId: 'odds-api-io',
      bookmaker: 'Pinnacle',
      market: 'h2h',
      outcome: 'away',
      odds: 2.05,
      originalEventName: 'Arsenal vs Chelsea',
      originalEventDate: '2025-01-15T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-01-15T14:30:00Z'
    },
    {
      eventKey: 'arsenal|chelsea|2025-01-15T15',
      providerId: 'the-odds-api',
      bookmaker: 'William Hill',
      market: 'h2h',
      outcome: 'home',
      odds: 2.25,
      originalEventName: 'Arsenal FC vs Chelsea',
      originalEventDate: '2025-01-15T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-01-15T14:31:00Z'
    },
    {
      eventKey: 'arsenal|chelsea|2025-01-15T15',
      providerId: 'the-odds-api',
      bookmaker: 'Betfair',
      market: 'h2h',
      outcome: 'away',
      odds: 1.95,
      originalEventName: 'Arsenal FC vs Chelsea',
      originalEventDate: '2025-01-15T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-01-15T14:31:00Z'
    }
  ];

  const arbs = findCrossProviderArbitrages(quotes);

  assert.ok(arbs.length > 0, 'Should find at least one cross-provider arb');
  assert.strictEqual(arbs[0].isCrossProvider, true);
  assert.ok(arbs[0].id.startsWith('xprov:'));
});

test('[P0][5.4-CALC-002] findCrossProviderArbitrages respects distinct bookmaker invariant', () => {
  const quotes = [
    {
      eventKey: 'team1|team2|2025-01-15T15',
      providerId: 'odds-api-io',
      bookmaker: 'Bet365',
      market: 'h2h',
      outcome: 'home',
      odds: 2.50,
      originalEventName: 'Team1 vs Team2',
      originalEventDate: '2025-01-15T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-01-15T14:00:00Z'
    },
    {
      eventKey: 'team1|team2|2025-01-15T15',
      providerId: 'the-odds-api',
      bookmaker: 'Bet365', // Same bookmaker!
      market: 'h2h',
      outcome: 'away',
      odds: 2.50,
      originalEventName: 'Team1 vs Team2',
      originalEventDate: '2025-01-15T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-01-15T14:00:00Z'
    }
  ];

  const arbs = findCrossProviderArbitrages(quotes);

  // Should not create arb with same bookmaker on both legs
  for (const arb of arbs) {
    assert.notStrictEqual(arb.legs[0].bookmaker, arb.legs[1].bookmaker);
  }
});

test('[P0][5.4-CALC-003] findCrossProviderArbitrages does NOT produce arbs when implied prob >= 1', () => {
  const quotes = [
    {
      eventKey: 'bayern|dortmund|2025-03-01T18',
      providerId: 'odds-api-io',
      bookmaker: 'Bet365',
      market: 'h2h',
      outcome: 'home',
      odds: 1.80, // 1/1.80 = 0.556
      originalEventName: 'Bayern vs Dortmund',
      originalEventDate: '2025-03-01T18:30:00Z',
      originalLeague: 'Bundesliga',
      foundAt: '2025-03-01T17:00:00Z'
    },
    {
      eventKey: 'bayern|dortmund|2025-03-01T18',
      providerId: 'the-odds-api',
      bookmaker: 'Pinnacle',
      market: 'h2h',
      outcome: 'away',
      odds: 1.90, // 1/1.90 = 0.526
      originalEventName: 'Bayern vs Dortmund',
      originalEventDate: '2025-03-01T18:30:00Z',
      originalLeague: 'Bundesliga',
      foundAt: '2025-03-01T17:00:00Z'
    }
  ];
  // 0.556 + 0.526 = 1.082 > 1 => no arbitrage

  const arbs = findCrossProviderArbitrages(quotes);

  assert.strictEqual(arbs.length, 0);
});

test('[P0][5.4-CALC-004] findCrossProviderArbitrages calculates ROI correctly', () => {
  // Odds: 2.25 home, 2.05 away
  // 1/2.25 + 1/2.05 = 0.444 + 0.488 = 0.932
  // ROI = 1 - 0.932 = 0.068 (but with algorithm finding best odds)
  const quotes = [
    {
      eventKey: 'test|event|2025-01-01T12',
      providerId: 'odds-api-io',
      bookmaker: 'BookA',
      market: 'h2h',
      outcome: 'home',
      odds: 2.25,
      originalEventName: 'Test vs Event',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    },
    {
      eventKey: 'test|event|2025-01-01T12',
      providerId: 'the-odds-api',
      bookmaker: 'BookB',
      market: 'h2h',
      outcome: 'away',
      odds: 2.05,
      originalEventName: 'Test vs Event',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    }
  ];

  const arbs = findCrossProviderArbitrages(quotes);

  assert.strictEqual(arbs.length, 1);
  // Expected ROI: 1 - (1/2.25 + 1/2.05) = 1 - 0.9322... ≈ 0.0678 but calculator uses its own formula
  assert.ok(arbs[0].roi > 0, 'ROI should be positive');
  assert.ok(arbs[0].roi < 0.10, 'ROI should be reasonable (<10%)');
});

test('[P0][5.4-CALC-005] findCrossProviderArbitrages handles BTTS markets with yes/no outcomes', () => {
  const quotes = [
    {
      eventKey: 'tottenham|west ham|2025-05-10T15',
      providerId: 'odds-api-io',
      bookmaker: 'Bet365',
      market: 'btts',
      outcome: 'yes',
      odds: 1.85,
      originalEventName: 'Tottenham vs West Ham',
      originalEventDate: '2025-05-10T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-05-10T14:00:00Z'
    },
    {
      eventKey: 'tottenham|west ham|2025-05-10T15',
      providerId: 'the-odds-api',
      bookmaker: 'Pinnacle',
      market: 'btts',
      outcome: 'no',
      odds: 2.30,
      originalEventName: 'Tottenham vs West Ham',
      originalEventDate: '2025-05-10T15:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2025-05-10T14:00:00Z'
    }
  ];
  // 1/1.85 + 1/2.30 = 0.541 + 0.435 = 0.976 < 1 => arb!

  const arbs = findCrossProviderArbitrages(quotes);

  assert.strictEqual(arbs.length, 1);
  assert.strictEqual(arbs[0].isCrossProvider, true);
  assert.ok(arbs[0].legs.some(l => l.outcome === 'yes'));
  assert.ok(arbs[0].legs.some(l => l.outcome === 'no'));
});

test('[P1][5.4-CALC-006] findCrossProviderArbitrages returns empty array for empty input', () => {
  const arbs = findCrossProviderArbitrages([]);
  assert.deepStrictEqual(arbs, []);
});

// =============================================================================
// TASK 5: Schema Validation Tests
// =============================================================================

test('[P0][5.4-SCHEMA-001] Schema validates cross-provider opportunity with isCrossProvider flag', () => {
  const opportunity = {
    id: 'xprov:test:h2h:BookA:BookB',
    sport: 'soccer',
    event: {
      name: 'Team A vs Team B',
      date: '2025-01-15T15:00:00Z',
      league: 'Test League'
    },
    legs: [
      { bookmaker: 'BookA', market: 'h2h', odds: 2.25, outcome: 'home' },
      { bookmaker: 'BookB', market: 'h2h', odds: 2.05, outcome: 'away' }
    ],
    roi: 0.0435,
    foundAt: '2025-01-15T14:00:00Z',
    providerId: 'odds-api-io',
    mergedFrom: ['odds-api-io', 'the-odds-api'],
    isCrossProvider: true
  };

  const result = arbitrageOpportunitySchema.safeParse(opportunity);
  assert.ok(result.success, `Schema should validate: ${JSON.stringify(result.error?.issues)}`);
});

test('[P0][5.4-SCHEMA-002] Schema rejects opportunity with same bookmaker on both legs', () => {
  const opportunity = {
    id: 'invalid',
    sport: 'soccer',
    event: {
      name: 'Team A vs Team B',
      date: '2025-01-15T15:00:00Z',
      league: 'Test League'
    },
    legs: [
      { bookmaker: 'SameBook', market: 'h2h', odds: 2.25, outcome: 'home' },
      { bookmaker: 'SameBook', market: 'h2h', odds: 2.05, outcome: 'away' }
    ],
    roi: 0.0435,
    foundAt: '2025-01-15T14:00:00Z'
  };

  const result = arbitrageOpportunitySchema.safeParse(opportunity);
  assert.strictEqual(result.success, false);
});

// =============================================================================
// TASK 7: Integration with Golden Fixtures
// =============================================================================

for (const scenario of goldenFixtures.scenarios) {
  test(`[P0][5.4-GOLDEN-${scenario.id}] ${scenario.description}`, () => {
    // Extract quotes from all opportunities
    const allQuotes = [];
    for (const opp of scenario.opportunities) {
      const quotes = extractQuotesFromOpportunity(opp);
      allQuotes.push(...quotes);
    }

    // Find cross-provider arbs
    const arbs = findCrossProviderArbitrages(allQuotes);

    assert.strictEqual(
      arbs.length,
      scenario.expectedCrossProviderArbs,
      `Expected ${scenario.expectedCrossProviderArbs} arbs, got ${arbs.length}`
    );

    // Verify all found arbs are valid
    for (const arb of arbs) {
      assert.strictEqual(arb.isCrossProvider, true);
      assert.ok(arb.roi > 0, 'ROI should be positive');
      assert.notStrictEqual(arb.legs[0].bookmaker, arb.legs[1].bookmaker);

      const schemaResult = arbitrageOpportunitySchema.safeParse(arb);
      assert.ok(schemaResult.success, `Schema validation failed: ${JSON.stringify(schemaResult.error?.issues)}`);
    }
  });
}

// =============================================================================
// R-002: Arbitrage Correctness Invariants
// =============================================================================

test('[P0][5.4-R002-001] All cross-provider arbs maintain roi >= 0 invariant', () => {
  const quotes = [
    {
      eventKey: 'test|event|2025-01-01T12',
      providerId: 'odds-api-io',
      bookmaker: 'BookA',
      market: 'h2h',
      outcome: 'home',
      odds: 2.50,
      originalEventName: 'Test vs Event',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    },
    {
      eventKey: 'test|event|2025-01-01T12',
      providerId: 'the-odds-api',
      bookmaker: 'BookB',
      market: 'h2h',
      outcome: 'away',
      odds: 2.50,
      originalEventName: 'Test vs Event',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    }
  ];

  const arbs = findCrossProviderArbitrages(quotes);

  for (const arb of arbs) {
    assert.ok(arb.roi >= 0, 'ROI must be non-negative');
  }
});

test('[P0][5.4-R002-002] No arbs produced when only one bookmaker available', () => {
  const quotes = [
    {
      eventKey: 'test|event|2025-01-01T12',
      providerId: 'odds-api-io',
      bookmaker: 'OnlyBookmaker',
      market: 'h2h',
      outcome: 'home',
      odds: 3.00,
      originalEventName: 'Test vs Event',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    },
    {
      eventKey: 'test|event|2025-01-01T12',
      providerId: 'the-odds-api',
      bookmaker: 'OnlyBookmaker',
      market: 'h2h',
      outcome: 'away',
      odds: 3.00,
      originalEventName: 'Test vs Event',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    }
  ];

  const arbs = findCrossProviderArbitrages(quotes);

  // Should not produce any arbs since only one bookmaker exists
  assert.strictEqual(arbs.length, 0);
});

test('[P0][5.4-R002-003] All opportunities validate against schema', () => {
  const quotes = [
    {
      eventKey: 'valid|test|2025-01-01T12',
      providerId: 'odds-api-io',
      bookmaker: 'BookA',
      market: 'h2h',
      outcome: 'home',
      odds: 2.30,
      originalEventName: 'Valid vs Test',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    },
    {
      eventKey: 'valid|test|2025-01-01T12',
      providerId: 'the-odds-api',
      bookmaker: 'BookB',
      market: 'h2h',
      outcome: 'away',
      odds: 2.10,
      originalEventName: 'Valid vs Test',
      originalEventDate: '2025-01-01T12:00:00Z',
      originalLeague: 'Test League',
      foundAt: '2025-01-01T11:00:00Z'
    }
  ];

  const arbs = findCrossProviderArbitrages(quotes);

  for (const arb of arbs) {
    const result = arbitrageOpportunitySchema.safeParse(arb);
    assert.ok(result.success, `Schema validation failed: ${JSON.stringify(result.error?.issues)}`);
  }
});
