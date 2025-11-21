'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poller = require('../out-tests/src/main/services/poller.js');
const credentials = require('../out-tests/src/main/credentials.js');

const {
  TheOddsApiAdapter
} = require('../out-tests/src/main/adapters/the-odds-api.js');

const {
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js');

const {
  filterOpportunitiesByRegionAndSport
} = require('../out-tests/shared/filters.js');

const {
  buildTheOddsApiRawEvents
} = require('./helpers/golden-dataset.js');

test('[P0][2.5-ADAPTER-HTTP-001] test adapter uses credentials, central scheduler, and maps HTTP responses', async () => {
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
          'the-odds-api',
          'Adapter must request API key for the-odds-api'
        );
        return 'test-api-key';
      };
    }

    poller.scheduleProviderRequest = async (providerId, fn) => {
      calls.scheduledProviderIds.push(providerId);
      return fn();
    };

    const rawEvents = buildTheOddsApiRawEvents();

    global.fetch = async (url, options) => {
      calls.requestedUrls.push(url);
      calls.requestedOptions.push(options);

      return {
        ok: true,
        status: 200,
        async json() {
          return rawEvents;
        },
        async text() {
          return JSON.stringify(rawEvents);
        }
      };
    };

    const adapter = new TheOddsApiAdapter();
    const opportunities = await adapter.fetchOpportunities();
    const parsed = arbitrageOpportunityListSchema.parse(opportunities);

    assert.deepStrictEqual(
      calls.scheduledProviderIds,
      ['the-odds-api'],
      'Adapter must route through central scheduleProviderRequest'
    );

    assert.strictEqual(calls.requestedUrls.length, 1, 'Expected a single HTTP request');
    const requestedUrl = new URL(calls.requestedUrls[0]);

    assert.strictEqual(
      requestedUrl.origin + requestedUrl.pathname,
      'https://api.the-odds-api.com/v4/sports/soccer/odds',
      'Adapter must call the raw odds endpoint for soccer'
    );
    assert.strictEqual(
      requestedUrl.searchParams.get('apiKey'),
      'test-api-key',
      'API key must be passed via query parameters'
    );
    assert.strictEqual(
      requestedUrl.searchParams.get('regions'),
      'eu',
      'Regions must be configured on the request'
    );
    assert.strictEqual(
      requestedUrl.searchParams.get('markets'),
      'h2h',
      'Markets must be configured on the request'
    );

    assert.ok(parsed.length >= 1, 'Expected at least one arbitrage opportunity');
    parsed.forEach((opportunity) => {
      assert.ok(opportunity.roi >= 0, 'ROI must be non-negative');
      assert.strictEqual(
        opportunity.legs[0].bookmaker === opportunity.legs[1].bookmaker,
        false,
        'Legs must use distinct bookmakers'
      );
    });
  } finally {
    poller.scheduleProviderRequest = originalSchedule;
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    }
    global.fetch = originalFetch;
    poller.__test.resetLimiterState();
  }
});

test('[P1][2.5-FILTERS-PIPELINE-001] poller + test adapter + filters honor sport and region selection', async () => {
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

    const rawEvents = [
      {
        id: 'arb-it-soccer',
        sport_key: 'soccer',
        sport_title: 'Serie A',
        commence_time: '2025-11-22T16:00:00Z',
        home_team: 'FC Orange',
        away_team: 'FC Blue',
        bookmakers: [
          {
            key: 'Book-IT-1',
            title: 'Book-IT-1',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'FC Orange', price: 2.05 },
                  { name: 'FC Blue', price: 2.05 }
                ]
              }
            ]
          },
          {
            key: 'Book-IT-2',
            title: 'Book-IT-2',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'FC Orange', price: 2.1 },
                  { name: 'FC Blue', price: 2.1 }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'arb-uk-tennis',
        sport_key: 'tennis',
        sport_title: 'Wimbledon',
        commence_time: '2025-11-22T19:00:00Z',
        home_team: 'Player C',
        away_team: 'Player D',
        bookmakers: [
          {
            key: 'Book-UK-1',
            title: 'Book-UK-1',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Player C', price: 2.1 },
                  { name: 'Player D', price: 2.1 }
                ]
              }
            ]
          }
        ]
      }
    ];

    global.fetch = async () => {
      return {
        ok: true,
        status: 200,
        async json() {
          return rawEvents;
        },
        async text() {
          return JSON.stringify(rawEvents);
        }
      };
    };

    poller.registerAdapters([new TheOddsApiAdapter()]);
    poller.notifyActiveProviderChanged('the-odds-api');

    const polled = await poller.pollOnceForActiveProvider();
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

    assert.ok(
      filtered.length >= 1,
      'Only matching sport/region opportunities should remain'
    );
    filtered.forEach((opportunity) => {
      assert.strictEqual(opportunity.sport, 'soccer');
      assert.strictEqual(opportunity.event.league, 'Serie A');
    });
  } finally {
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    }
    global.fetch = originalFetch;
    poller.__test.resetLimiterState();
  }
});
