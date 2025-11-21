'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {
  FeedTable
} = require('../out-tests/src/renderer/src/features/dashboard/FeedTable.js');

function renderToHtml(element) {
  return ReactDOMServer.renderToString(element);
}

function createOpportunity(id, overrides = {}) {
  const base = {
    id,
    sport: 'soccer',
    event: {
      name: `Match ${id}`,
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
  };

  return {
    ...base,
    ...overrides,
    event: {
      ...base.event,
      ...(overrides.event ?? {})
    }
  };
}

function extractFirstEventLabel(html) {
  const match = html.match(/data-testid="feed-cell-event"[^>]*>([^<]*)</);
  return match ? match[1] : '';
}

test('[P1][3.2-FEED-001] feed grid renders Time, Event, ROI columns with Orange Terminal ROI accent', () => {
  const opportunities = [
    createOpportunity('arb-1', {
      event: { name: 'Team A vs Team B', date: '2025-11-22T18:00:00Z' },
      roi: 0.1
    })
  ];

  const html = renderToHtml(
    React.createElement(FeedTable, { opportunities })
  );

  assert.ok(
    html.includes('data-testid="feed-header-time"'),
    'Expected Time column header to be present'
  );
  assert.ok(
    html.includes('data-testid="feed-header-event"'),
    'Expected Event column header to be present'
  );
  assert.ok(
    html.includes('data-testid="feed-header-roi"'),
    'Expected ROI column header to be present'
  );

  assert.ok(
    html.includes('data-testid="feed-cell-roi"'),
    'Expected ROI cell to be rendered'
  );
  assert.ok(
    html.includes('text-ot-accent'),
    'Expected ROI cell to use Orange Terminal accent text color (text-ot-accent)'
  );
});

test('[P1][3.2-FEED-002] feed supports sorting by Time and ROI', () => {
  const opportunities = [
    createOpportunity('arb-early', {
      event: { date: '2025-11-22T18:00:00Z', name: 'Early Match' },
      roi: 0.05
    }),
    createOpportunity('arb-late', {
      event: { date: '2025-11-22T20:00:00Z', name: 'Late Match' },
      roi: 0.15
    })
  ];

  const htmlTimeAsc = renderToHtml(
    React.createElement(FeedTable, {
      opportunities,
      initialSortBy: 'time',
      initialSortDirection: 'asc'
    })
  );

  const firstTimeAsc = extractFirstEventLabel(htmlTimeAsc);

  assert.ok(
    firstTimeAsc.includes('Early Match'),
    'Expected earliest event to appear first when sorting by time ascending'
  );

  const htmlRoiDesc = renderToHtml(
    React.createElement(FeedTable, {
      opportunities,
      initialSortBy: 'roi',
      initialSortDirection: 'desc'
    })
  );

  const firstRoiDesc = extractFirstEventLabel(htmlRoiDesc);

  assert.ok(
    firstRoiDesc.includes('Late Match'),
    'Expected highest ROI event to appear first when sorting by ROI descending'
  );
});

test('[P1][3.2-FEED-003] feed uses virtualization for large result sets', () => {
  const largeList = Array.from({ length: 100 }, (_, index) =>
    createOpportunity(`arb-${index + 1}`, {
      roi: 0.01 + index * 0.001
    })
  );

  const html = renderToHtml(
    React.createElement(FeedTable, {
      opportunities: largeList,
      initialSortBy: 'roi',
      initialSortDirection: 'asc'
    })
  );

  assert.ok(
    /data-testid="feed-table"[^>]*data-virtualized="true"/.test(html),
    'Expected data-virtualized="true" when virtualization is active'
  );

  const rowMatches = html.match(/data-testid="feed-row"/g) ?? [];
  assert.ok(rowMatches.length > 0, 'Expected some rows to be rendered');
  assert.ok(
    rowMatches.length < largeList.length,
    'Expected virtualization to render only a subset of rows for large result sets'
  );
});

