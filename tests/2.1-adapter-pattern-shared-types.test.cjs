'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  arbitrageOpportunitySchema,
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js');

const {
  normalizeOddsApiIoOpportunity
} = require('../out-tests/src/main/adapters/odds-api-io.js');

const {
  normalizeTheOddsApiMarket
} = require('../out-tests/src/main/adapters/the-odds-api.js');

const {
  calculateTwoLegArbitrageRoi,
  mergeProviderOpportunities
} = require('../out-tests/src/main/services/calculator.js');

const poller = require('../out-tests/src/main/services/poller.js');

test('[P1][2.1-DATA-001] arbitrageOpportunity schema enforces canonical shape and invariants', () => {
  const valid = {
    id: 'arb-001',
    sport: 'soccer',
    event: {
      name: 'Team A vs Team B',
      date: '2025-11-20T20:00:00Z',
      league: 'EPL'
    },
    legs: [
      {
        bookmaker: 'Book-1',
        market: 'match-winner',
        odds: 2.1,
        outcome: 'home'
      },
      {
        bookmaker: 'Book-2',
        market: 'match-winner',
        odds: 2.1,
        outcome: 'away'
      }
    ],
    roi: 0.05,
    foundAt: '2025-11-20T20:00:10Z'
  };

  const parsed = arbitrageOpportunitySchema.parse(valid);
  assert.strictEqual(parsed.id, valid.id);
  assert.strictEqual(parsed.legs.length, 2);

  const invalidSameBookmaker = {
    ...valid,
    legs: [
      { ...valid.legs[0] },
      { ...valid.legs[0] }
    ]
  };

  assert.throws(
    () => {
      arbitrageOpportunitySchema.parse(invalidSameBookmaker);
    },
    /legs must reference distinct bookmakers/,
    'Schema must reject opportunities where both legs use the same bookmaker'
  );
});

test('[P1][2.1-ADAPTER-ODDS-001] Odds-API.io normalization produces schema-valid ArbitrageOpportunity', () => {
  const raw = {
    id: 'odds-api-io-1',
    sport: 'tennis',
    event: {
      name: 'Player A vs Player B',
      date: '2025-11-20T19:00:00Z',
      league: 'ATP'
    },
    legs: [
      {
        bookmaker: 'Book-1',
        market: 'moneyline',
        odds: 2.1,
        outcome: 'home'
      },
      {
        bookmaker: 'Book-2',
        market: 'moneyline',
        odds: 2.1,
        outcome: 'away'
      }
    ],
    roi: 0.04
  };

  const normalized = normalizeOddsApiIoOpportunity(raw, '2025-11-20T19:00:05Z');
  const parsed = arbitrageOpportunitySchema.parse(normalized);

  assert.strictEqual(parsed.id, raw.id);
  assert.strictEqual(parsed.event.name, raw.event.name);
  assert.strictEqual(parsed.legs[0].bookmaker, raw.legs[0].bookmaker);
  assert.strictEqual(parsed.legs[1].bookmaker, raw.legs[1].bookmaker);
});

test('[P1][2.1-ADAPTER-THEODDS-001] The-Odds-API normalization uses calculator ROI and schema', () => {
  const arbOddsA = 2.1;
  const arbOddsB = 2.1;

  const roi = calculateTwoLegArbitrageRoi(arbOddsA, arbOddsB);
  assert.ok(roi > 0, 'ROI should be positive for an arbitrage pair');

  const raw = {
    id: 'the-odds-api-1',
    sport: 'soccer',
    eventName: 'Club A vs Club B',
    eventDate: '2025-11-21T18:00:00Z',
    league: 'Serie A',
    market: 'match-winner',
    homeBookmaker: 'Book-1',
    homeOdds: arbOddsA,
    awayBookmaker: 'Book-2',
    awayOdds: arbOddsB
  };

  const normalized = normalizeTheOddsApiMarket(raw, '2025-11-21T18:00:05Z');

  assert.ok(normalized, 'Normalization should produce an opportunity for arbitrage inputs');

  const parsed = arbitrageOpportunitySchema.parse(normalized);
  assert.strictEqual(parsed.id, raw.id);
  assert.strictEqual(parsed.event.name, raw.eventName);

  const noArb = {
    ...raw,
    homeOdds: 1.8,
    awayOdds: 1.8
  };

  const normalizedNoArb = normalizeTheOddsApiMarket(noArb, '2025-11-21T18:00:05Z');
  assert.strictEqual(
    normalizedNoArb,
    null,
    'Normalization should drop markets that do not produce positive ROI'
  );
});

test('[P1][2.1-PIPELINE-001] poller and calculator operate on ArbitrageOpportunity[] via shared contract', async () => {
  const opportunity = arbitrageOpportunitySchema.parse({
    id: 'pipeline-1',
    sport: 'soccer',
    event: {
      name: 'Team X vs Team Y',
      date: '2025-11-22T16:00:00Z',
      league: 'Premier League'
    },
    legs: [
      {
        bookmaker: 'Book-1',
        market: 'moneyline',
        odds: 2.05,
        outcome: 'home'
      },
      {
        bookmaker: 'Book-2',
        market: 'moneyline',
        odds: 2.05,
        outcome: 'away'
      }
    ],
    roi: calculateTwoLegArbitrageRoi(2.05, 2.05),
    foundAt: '2025-11-22T16:00:10Z'
  });

  class FakeAdapter {
    constructor(id, opportunities) {
      this.id = id;
      this._opportunities = opportunities;
    }

    async fetchOpportunities() {
      return this._opportunities;
    }
  }

  const adapter = new FakeAdapter('the-odds-api', [opportunity]);

  poller.registerAdapters([adapter]);
  // Updated to use multi-provider API (Story 5.1)
  poller.notifyEnabledProvidersChanged(['the-odds-api']);

  const polled = await poller.pollOnceForEnabledProviders();
  const listParsed = arbitrageOpportunityListSchema.parse(polled);

  assert.strictEqual(listParsed.length, 1);
  assert.strictEqual(listParsed[0].id, opportunity.id);

  const merged = mergeProviderOpportunities([polled]);
  assert.strictEqual(merged.length, 1);
  assert.strictEqual(merged[0].id, opportunity.id);
});

test('[P1][2.1-ADAPTER-CONTRACT-001] poller handles invalid opportunities from single provider gracefully', async () => {
  // NOTE: With multi-provider architecture (Story 5.1), the poller is resilient:
  // - Validation errors per provider are caught and logged
  // - The poller returns [] for failed providers instead of rejecting entirely
  // - This allows other enabled providers to still return their opportunities
  
  class BadAdapter {
    constructor(id, opportunities) {
      this.id = id;
      this._opportunities = opportunities;
    }

    async fetchOpportunities() {
      return this._opportunities;
    }
  }

  const badOpportunity = {
    id: 'bad-1',
    sport: 'soccer',
    event: {
      name: 'Invalid Event',
      date: '2025-11-22T16:00:00Z',
      league: 'Test'
    },
    legs: [
      {
        bookmaker: 'Book-1',
        market: 'moneyline',
        odds: 2.0,
        outcome: 'home'
      },
      {
        bookmaker: 'Book-1', // Same bookmaker - violates schema
        market: 'moneyline',
        odds: 2.0,
        outcome: 'away'
      }
    ],
    roi: -0.01, // Negative ROI - also violates schema
    foundAt: '2025-11-22T16:00:10Z'
  };

  const adapter = new BadAdapter('odds-api-io', [badOpportunity]);

  poller.registerAdapters([adapter]);
  poller.notifyEnabledProvidersChanged(['odds-api-io']);

  // With multi-provider resilience, this should NOT throw
  // Instead it returns empty array and logs the error
  const result = await poller.pollOnceForEnabledProviders();
  
  assert.ok(Array.isArray(result), 'Should return an array');
  assert.strictEqual(result.length, 0, 'Should return empty array when validation fails');
});
