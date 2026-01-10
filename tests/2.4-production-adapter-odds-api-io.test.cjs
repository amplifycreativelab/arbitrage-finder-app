'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poller = require('../out-tests/src/main/services/poller.js');
const credentials = require('../out-tests/src/main/credentials.js');

const {
  OddsApiIoAdapter,
  normalizeOddsApiIoOpportunity
} = require('../out-tests/src/main/adapters/odds-api-io.js');

const {
  arbitrageOpportunitySchema,
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js');

const {
  filterOpportunitiesByRegionAndSport
} = require('../out-tests/shared/filters.js');

const {
  buildOddsApiIoArbitrageBets
} = require('./helpers/golden-dataset.js');

test('[P0][2.4-ADAPTER-HTTP-001] production adapter uses credentials, central scheduler, and maps HTTP responses', async () => {
  poller.__test.resetLimiterState();

  const originalGetApiKeyForAdapter =
    typeof credentials.getApiKeyForAdapter === 'function'
      ? credentials.getApiKeyForAdapter
      : null;
  const originalSchedule = poller.scheduleProviderRequest;
  const originalFetch = global.fetch;

  const calls = {
    scheduledProviderIds: [],
    requestedUrls: [],
    requestedOptions: []
  };

  try {
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = async (providerId) => {
        assert.strictEqual(
          providerId,
          'odds-api-io',
          'Adapter must request API key for odds-api-io'
        );
        return 'test-api-key';
      };
    }

    poller.scheduleProviderRequest = async (providerId, fn) => {
      calls.scheduledProviderIds.push(providerId);
      return fn();
    };

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

    global.fetch = async (url, options) => {
      calls.requestedUrls.push(url);
      calls.requestedOptions.push(options);

      return {
        ok: true,
        status: 200,
        async json() {
          return { data: [raw] };
        },
        async text() {
          return JSON.stringify({ data: [raw] });
        }
      };
    };

    const adapter = new OddsApiIoAdapter();
    const opportunities = await adapter.fetchOpportunities();
    const parsed = arbitrageOpportunityListSchema.parse(opportunities);

    assert.deepStrictEqual(
      calls.scheduledProviderIds,
      ['odds-api-io'],
      'Adapter must route through central scheduleProviderRequest'
    );

    assert.strictEqual(calls.requestedUrls.length, 1, 'Expected a single HTTP request');
    const requestedUrl = new URL(calls.requestedUrls[0]);

    assert.strictEqual(
      requestedUrl.origin + requestedUrl.pathname,
      'https://api.odds-api.io/v3/arbitrage-bets',
      'Adapter must call the pre-calculated arbitrage endpoint'
    );
    assert.strictEqual(
      requestedUrl.searchParams.get('apiKey'),
      'test-api-key',
      'API key must be passed via query parameters'
    );

    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].id, raw.id);
    assert.strictEqual(parsed[0].sport, raw.sport);
    assert.strictEqual(parsed[0].event.name, raw.event.name);
    assert.strictEqual(parsed[0].legs[0].bookmaker, raw.legs[0].bookmaker);
    assert.strictEqual(parsed[0].roi, raw.roi);
  } finally {
    poller.scheduleProviderRequest = originalSchedule;
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    }
    global.fetch = originalFetch;
    poller.__test.resetLimiterState();
  }
});

test('[P1][2.4-ADAPTER-MAPPING-001] production adapter drops negative-ROI opportunities and preserves canonical shape', () => {
  const [rawPositive] = buildOddsApiIoArbitrageBets();
  const foundAt = '2025-11-21T18:00:05Z';

  const normalized = normalizeOddsApiIoOpportunity(rawPositive, foundAt);
  const parsed = arbitrageOpportunitySchema.parse(normalized);

  assert.strictEqual(parsed.id, rawPositive.id);
  assert.strictEqual(parsed.event.league, rawPositive.event.league);
  assert.ok(parsed.roi >= 0, 'ROI must be non-negative after normalization');
  assert.strictEqual(parsed.foundAt, foundAt, 'foundAt should be preserved from input');
});

test('[P1][2.4-FILTERS-PIPELINE-001] poller + production adapter + filters honor sport and region selection', async () => {
  poller.__test.resetLimiterState();

  const originalGetApiKeyForAdapter =
    typeof credentials.getApiKeyForAdapter === 'function'
      ? credentials.getApiKeyForAdapter
      : null;
  const originalFetch = global.fetch;

  try {
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = async () => 'test-api-key';
    }

    const rawBets = [
      {
        id: 'arb-it-soccer',
        sport: 'soccer',
        event: {
          name: 'FC Orange vs FC Blue',
          date: '2025-11-22T16:00:00Z',
          league: 'Serie A'
        },
        legs: [
          {
            bookmaker: 'Book-IT-1',
            market: 'moneyline',
            odds: 2.05,
            outcome: 'home'
          },
          {
            bookmaker: 'Book-IT-2',
            market: 'moneyline',
            odds: 2.05,
            outcome: 'away'
          }
        ],
        roi: 0.03
      },
      {
        id: 'arb-uk-tennis',
        sport: 'tennis',
        event: {
          name: 'Player C vs Player D',
          date: '2025-11-22T19:00:00Z',
          league: 'Wimbledon'
        },
        legs: [
          {
            bookmaker: 'Book-UK-1',
            market: 'moneyline',
            odds: 2.1,
            outcome: 'home'
          },
          {
            bookmaker: 'Book-UK-2',
            market: 'moneyline',
            odds: 2.1,
            outcome: 'away'
          }
        ],
        roi: 0.04
      }
    ];

    global.fetch = async () => {
      return {
        ok: true,
        status: 200,
        async json() {
          return rawBets;
        },
        async text() {
          return JSON.stringify(rawBets);
        }
      };
    };

    poller.registerAdapters([new OddsApiIoAdapter()]);
    poller.notifyEnabledProvidersChanged(['odds-api-io']);

    await poller.pollOnceForEnabledProviders();
    const polled = poller.getLatestSnapshotForProvider('odds-api-io').opportunities;
    const normalized = arbitrageOpportunityListSchema.parse(polled);

    const inferredRegion = (opportunity) => {
      const league = opportunity.event.league;

      if (league === 'Serie A') return 'IT';
      if (league === 'Wimbledon') return 'UK';
      return null;
    };

    const filtered = filterOpportunitiesByRegionAndSport(
      normalized,
      {
        sports: ['soccer'],
        regions: ['IT']
      },
      inferredRegion
    );

    assert.strictEqual(filtered.length, 1, 'Only matching sport/region opportunities should remain');
    assert.strictEqual(filtered[0].sport, 'soccer');
    assert.strictEqual(filtered[0].event.league, 'Serie A');
  } finally {
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    }
    global.fetch = originalFetch;
    poller.__test.resetLimiterState();
  }
});
