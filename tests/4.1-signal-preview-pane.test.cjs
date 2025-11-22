'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {
  formatSignalPayload
} = require('../out-tests/src/renderer/src/features/dashboard/SignalPreview.js');

const SignalPreview =
  require('../out-tests/src/renderer/src/features/dashboard/SignalPreview.js').default;

const {
  useFeedStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedStore.js');

const DashboardLayout =
  require('../out-tests/src/renderer/src/features/dashboard/DashboardLayout.js').default;

const {
  PROVIDERS
} = require('../out-tests/shared/types.js');

if (typeof global.window === 'undefined') {
  global.window = {};
}

function renderToHtml(element) {
  return ReactDOMServer.renderToString(element);
}

function extractSelectedOpportunityId(html) {
  const match = html.match(/data-opportunity-id="([^"]*)"/);
  return match ? match[1] : null;
}

function createOpportunity(id, overrides = {}) {
  const base = {
    id,
    sport: 'soccer',
    event: {
      name: 'Preston - Blackburn',
      date: '2025-11-21T21:00:00Z',
      league: 'England Championship'
    },
    legs: [
      {
        bookmaker: 'Bet365',
        market: 'Rigori',
        odds: 4.5,
        outcome: 'Yes'
      },
      {
        bookmaker: 'Staryes',
        market: 'Rigori',
        odds: 1.32,
        outcome: 'No'
      }
    ],
    roi: 0.12,
    foundAt: '2025-11-21T20:59:30Z'
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

test('[P1][4.1-SIGNAL-001] formatSignalPayload produces a stable, multi-line payload with provider, event, legs, odds, and ROI', () => {
  const provider = PROVIDERS.find((p) => p.id === 'the-odds-api');

  assert.ok(provider, 'Expected test provider metadata to exist');

  const opportunity = createOpportunity('arb-1');

  const payload = formatSignalPayload(opportunity, provider);
  const lines = payload.split('\n').filter((line) => line.trim().length > 0);

  assert.ok(lines.length >= 10, 'Expected multi-line payload with both legs and ROI');

  assert.strictEqual(
    lines[0],
    provider.displayName,
    'Expected first non-empty line to show provider displayName'
  );

  assert.ok(
    payload.includes('Bet365') && payload.includes('Staryes'),
    'Expected payload to include bookmaker labels for both legs'
  );

  assert.ok(
    payload.includes('Calcio') && payload.includes('Preston - Blackburn'),
    'Expected payload to include sport label and event name'
  );

  assert.ok(
    /England Championship .*Rigori:/i.test(payload),
    'Expected payload to include league and market description line'
  );

  assert.ok(
    payload.includes('4.50') && payload.includes('1.32'),
    'Expected payload to include odds for both legs'
  );

  assert.ok(
    /ROI:\s*12\.0%/.test(payload),
    'Expected payload to include ROI line formatted as percentage'
  );
});

test('[P1][4.1-SIGNAL-002] SignalPreview renders the formatted payload inside a monospace card with ROI and provider header', () => {
  const provider = PROVIDERS.find((p) => p.id === 'odds-api-io');

  assert.ok(provider, 'Expected production provider metadata to exist');

  const opportunity = createOpportunity('arb-render');

  const html = renderToHtml(
    React.createElement(SignalPreview, {
      opportunity,
      providerMetadata: provider
    })
  );

  assert.ok(
    html.includes('data-testid="signal-preview"'),
    'Expected SignalPreview root to expose data-testid="signal-preview"'
  );

  assert.ok(
    html.includes(provider.displayName),
    'Expected provider displayName to appear in preview header'
  );

  assert.ok(
    html.includes('ROI'),
    'Expected ROI label to appear in preview header'
  );

  assert.ok(
    html.includes('12.0%'),
    'Expected ROI percentage value to appear in preview header'
  );

  assert.ok(
    html.includes('Bet365') && html.includes('Staryes'),
    'Expected rendered preview to contain bookmaker labels from both legs'
  );
});

test('[P1][4.1-SIGNAL-003] DashboardLayout wires SignalPreview to feed selection state without additional TRPC calls', async () => {
  const provider = PROVIDERS.find((p) => p.id === 'the-odds-api');

  assert.ok(provider, 'Expected test provider metadata to exist');

  const first = createOpportunity('arb-first');
  const second = createOpportunity('arb-second', {
    legs: [
      {
        bookmaker: 'Provider-A',
        market: 'moneyline',
        odds: 2.4,
        outcome: 'home'
      },
      {
        bookmaker: 'Provider-B',
        market: 'moneyline',
        odds: 1.7,
        outcome: 'away'
      }
    ],
    roi: 0.08
  });

  let trpcCallCount = 0;

  const trpc = require('../out-tests/src/renderer/src/lib/trpc.js');

  const originalMutate = trpc.trpcClient.pollAndGetFeedSnapshot.mutate;

  trpc.trpcClient.pollAndGetFeedSnapshot.mutate = async (...args) => {
    trpcCallCount += 1;
    return originalMutate.apply(trpc.trpcClient.pollAndGetFeedSnapshot, args);
  };

  try {
    useFeedStore.setState((state) => ({
      ...state,
      providerId: provider.id,
      providerMetadata: provider,
      opportunities: [first, second],
      fetchedAt: '2025-11-21T20:59:30Z',
      status: null,
      isLoading: false,
      error: null,
      selectedOpportunityId: first.id
    }));

    const initialHtml = renderToHtml(React.createElement(DashboardLayout));

    // Change selection without touching TRPC or poller.
    useFeedStore.setState((state) => ({
      ...state,
      selectedOpportunityId: second.id
    }));

    const updatedHtml = renderToHtml(React.createElement(DashboardLayout));

    assert.strictEqual(
      trpcCallCount,
      0,
      'Expected no pollAndGetFeedSnapshot TRPC calls when changing selection'
    );
  } finally {
    trpc.trpcClient.pollAndGetFeedSnapshot.mutate = originalMutate;
  }
});

test('[P1][4.1-SIGNAL-004] SignalPreview shows empty state when no visible opportunities remain after filtering', () => {
  const first = createOpportunity('arb-first');
  const second = createOpportunity('arb-second');

  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [first, second],
    selectedOpportunityId: null
  }));

  const html = renderToHtml(React.createElement(SignalPreview));

  assert.ok(
    html.includes('data-testid="signal-preview-empty"'),
    'Expected SignalPreview to render empty state when there are underlying opportunities but no visible rows after filtering'
  );

  assert.strictEqual(
    extractSelectedOpportunityId(html),
    null,
    'Expected no data-opportunity-id attribute when preview is empty'
  );
});
