'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {
  useFeedStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedStore.js');

const FeedPane =
  require('../out-tests/src/renderer/src/features/dashboard/FeedPane.js').default;

function renderToHtml(element) {
  return ReactDOMServer.renderToString(element);
}

test('[P1][3.5-STATUS-001] system status chip and provider badges reflect SystemStatus and ProviderStatus values', () => {
  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [],
    fetchedAt: '2025-11-22T18:00:00Z',
    isLoading: false,
    error: null,
    status: {
      systemStatus: 'Degraded',
      lastUpdatedAt: '2025-11-22T18:00:00Z',
      providers: [
        {
          providerId: 'odds-api-io',
          status: 'QuotaLimited',
          lastSuccessfulFetchAt: '2025-11-22T17:59:00Z'
        },
        {
          providerId: 'the-odds-api',
          status: 'OK',
          lastSuccessfulFetchAt: '2025-11-22T17:59:30Z'
        }
      ]
    }
  }));

  const html = renderToHtml(React.createElement(FeedPane));

  assert.ok(
    /data-testid="system-status-chip"[^>]*>.*Degraded/.test(html),
    'Expected system status chip to render Degraded state'
  );

  assert.ok(
    /data-testid="provider-status-odds-api-io"[^>]*>[^<]*Quota limited/i.test(html),
    'Expected provider badge for odds-api-io to show QuotaLimited status'
  );

  assert.ok(
    /data-testid="provider-status-the-odds-api"[^>]*>[^<]*OK/.test(html),
    'Expected provider badge for the-odds-api to show OK status'
  );
});

test('[P1][3.5-STATUS-002] provider failure banner appears for Down, QuotaLimited, and ConfigMissing without blocking the feed', () => {
  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [],
    fetchedAt: '2025-11-22T18:00:00Z',
    isLoading: false,
    error: null,
    status: {
      systemStatus: 'Degraded',
      lastUpdatedAt: '2025-11-22T18:00:00Z',
      providers: [
        {
          providerId: 'odds-api-io',
          status: 'Down',
          lastSuccessfulFetchAt: '2025-11-22T17:55:00Z'
        },
        {
          providerId: 'the-odds-api',
          status: 'ConfigMissing',
          lastSuccessfulFetchAt: null
        }
      ]
    }
  }));

  const html = renderToHtml(React.createElement(FeedPane));

  assert.ok(
    html.includes('data-testid="provider-failure-banner"'),
    'Expected provider failure banner when any provider is Down or ConfigMissing'
  );

  assert.ok(
    /Recommended action: .*Config missing/i.test(html),
    'Expected banner to include recommended action text for ConfigMissing provider'
  );
});

test('[P1][3.5-STATUS-003] empty state distinguishes healthy no-data from degraded or stale system', () => {
  // Healthy system, no opportunities.
  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [],
    fetchedAt: '2025-11-22T18:00:00Z',
    isLoading: false,
    error: null,
    status: {
      systemStatus: 'OK',
      lastUpdatedAt: '2025-11-22T18:00:00Z',
      providers: [
        {
          providerId: 'odds-api-io',
          status: 'OK',
          lastSuccessfulFetchAt: '2025-11-22T17:59:00Z'
        },
        {
          providerId: 'the-odds-api',
          status: 'OK',
          lastSuccessfulFetchAt: '2025-11-22T17:59:30Z'
        }
      ]
    }
  }));

  let html = renderToHtml(React.createElement(FeedPane));

  assert.ok(
    html.includes('data-testid="feed-empty-healthy"'),
    'Expected healthy empty-state when system and providers are OK and there is no data'
  );

  // Degraded system, still no data.
  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [],
    fetchedAt: '2025-11-22T17:50:00Z',
    isLoading: false,
    error: null,
    status: {
      systemStatus: 'Stale',
      lastUpdatedAt: '2025-11-22T17:50:00Z',
      providers: [
        {
          providerId: 'odds-api-io',
          status: 'Degraded',
          lastSuccessfulFetchAt: '2025-11-22T17:40:00Z'
        },
        {
          providerId: 'the-odds-api',
          status: 'OK',
          lastSuccessfulFetchAt: '2025-11-22T17:40:00Z'
        }
      ]
    }
  }));

  html = renderToHtml(React.createElement(FeedPane));

  assert.ok(
    html.includes('data-testid="feed-empty-unhealthy"'),
    'Expected degraded/stale empty-state when system status is non-OK and there is no data'
  );
});

test('[P1][3.5-STATUS-004] provider failure banner remains non-blocking when opportunities are present', () => {
  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [
      {
        id: 'arb-1',
        sport: 'soccer',
        event: {
          name: 'Team A vs Team B',
          date: '2025-11-22T18:00:00Z',
          league: 'Test League'
        },
        legs: [
          {
            bookmaker: 'Book-1',
            market: 'moneyline',
            odds: 2.0,
            outcome: 'home'
          },
          {
            bookmaker: 'Book-2',
            market: 'moneyline',
            odds: 2.0,
            outcome: 'away'
          }
        ],
        roi: 0.05,
        foundAt: '2025-11-22T17:59:00Z'
      }
    ],
    fetchedAt: '2025-11-22T18:00:00Z',
    isLoading: false,
    error: null,
    status: {
      systemStatus: 'Degraded',
      lastUpdatedAt: '2025-11-22T18:00:00Z',
      providers: [
        {
          providerId: 'odds-api-io',
          status: 'Down',
          lastSuccessfulFetchAt: '2025-11-22T17:55:00Z'
        },
        {
          providerId: 'the-odds-api',
          status: 'OK',
          lastSuccessfulFetchAt: '2025-11-22T17:59:30Z'
        }
      ]
    }
  }));

  const html = renderToHtml(React.createElement(FeedPane));

  assert.ok(
    html.includes('data-testid="provider-failure-banner"'),
    'Expected provider failure banner when a provider is Down'
  );

  assert.ok(
    html.includes('data-testid="feed-table"'),
    'Expected feed table to remain rendered while banner is visible'
  );
}) ;
