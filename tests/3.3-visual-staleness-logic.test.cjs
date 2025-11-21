'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {
  FeedTable
} = require('../out-tests/src/renderer/src/features/dashboard/FeedTable.js');

const {
  getStalenessInfo
} = require('../out-tests/src/renderer/src/features/dashboard/staleness.js');

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

function extractTimeCellLabels(html) {
  const regex = /data-testid="feed-cell-time"[^>]*>([^<]*)</g;
  const results = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    results.push(match[1]);
  }

  return results;
}

function extractFirstTimeCellLabel(html) {
  const labels = extractTimeCellLabels(html);
  return labels[0] ?? '';
}

test('[P1][3.3-STALENESS-001] feed rows show human-readable staleness labels and visually de-emphasize entries older than 5 minutes', () => {
  const nowIso = '2025-11-22T18:05:00Z';
  const nowMs = Date.parse(nowIso);

  const opportunities = [
    createOpportunity('fresh', {
      foundAt: '2025-11-22T18:04:45Z'
    }),
    createOpportunity('mid-age', {
      foundAt: '2025-11-22T18:03:00Z'
    }),
    createOpportunity('stale', {
      foundAt: '2025-11-22T17:59:30Z'
    })
  ];

  const html = renderToHtml(
    React.createElement(FeedTable, {
      opportunities,
      initialSortBy: 'time',
      initialSortDirection: 'asc',
      stalenessNow: nowMs
    })
  );

  const labels = extractTimeCellLabels(html);

  assert.ok(
    labels.some((label) => label.includes('Just now')),
    'Expected "Just now" label for very recent opportunity'
  );

  assert.ok(
    labels.some((label) => /[1-4]m ago/.test(label)),
    'Expected minute-based staleness label for mid-age opportunity (e.g., "2m ago")'
  );

  assert.ok(
    labels.some((label) => label.includes('5m+')),
    'Expected "5m+" label for stale opportunity'
  );

  const staleRowMatch = html.match(/<div[^>]*data-testid="feed-row"[^>]*data-staleness="stale"[^>]*>/);

  assert.ok(staleRowMatch, 'Expected a row with data-staleness="stale"');
  assert.ok(
    staleRowMatch[0].includes('opacity-50'),
    'Expected stale row to use opacity-50 class for visual de-emphasis'
  );
});

test('[P1][3.3-STALENESS-002] staleness labels update as time advances without changing data', () => {
  const opportunity = createOpportunity('arb-1', {
    foundAt: '2025-11-22T18:00:00Z'
  });

  const initialNow = Date.parse('2025-11-22T18:02:00Z');
  const laterNow = Date.parse('2025-11-22T18:07:30Z');

  const htmlInitial = renderToHtml(
    React.createElement(FeedTable, {
      opportunities: [opportunity],
      initialSortBy: 'time',
      initialSortDirection: 'asc',
      stalenessNow: initialNow
    })
  );

  const htmlLater = renderToHtml(
    React.createElement(FeedTable, {
      opportunities: [opportunity],
      initialSortBy: 'time',
      initialSortDirection: 'asc',
      stalenessNow: laterNow
    })
  );

  const initialLabel = extractFirstTimeCellLabel(htmlInitial);
  const laterLabel = extractFirstTimeCellLabel(htmlLater);

  assert.notStrictEqual(
    initialLabel,
    laterLabel,
    'Expected staleness label to change as time advances even when data does not'
  );

  assert.ok(
    laterLabel.includes('5m+'),
    'Expected later label to reflect stale state ("5m+") after enough time has elapsed'
  );
});

test('[P1][3.3-STALENESS-003] staleness threshold treats rows under 5 minutes as fresh and over 5 minutes as stale', () => {
  const nowMs = Date.parse('2025-11-22T18:05:00Z');

  const almostFresh = {
    foundAt: '2025-11-22T18:01:10Z'
  };

  const clearlyStale = {
    foundAt: '2025-11-22T17:59:30Z'
  };

  const freshInfo = getStalenessInfo(almostFresh, nowMs);
  const staleInfo = getStalenessInfo(clearlyStale, nowMs);

  assert.strictEqual(
    freshInfo.isStale,
    false,
    'Expected row just under 5 minutes old to be treated as fresh'
  );

  assert.strictEqual(
    staleInfo.isStale,
    true,
    'Expected row older than 5 minutes to be treated as stale'
  );
});
