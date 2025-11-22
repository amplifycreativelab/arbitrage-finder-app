'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {
  FeedTable
} = require('../out-tests/src/renderer/src/features/dashboard/FeedTable.js');

const {
  useFeedStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedStore.js');

const {
  PROVIDERS
} = require('../out-tests/shared/types.js');

const DashboardLayout =
  require('../out-tests/src/renderer/src/features/dashboard/DashboardLayout.js').default;

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
      name: `Match ${id}`,
      date: '2025-11-22T18:00:00Z',
      league: 'Serie A'
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

test('[P1][4.2-KB-001] keyboard navigation uses feed store index and clamps within visible bounds', () => {
  const opportunities = [
    createOpportunity('arb-1'),
    createOpportunity('arb-2'),
    createOpportunity('arb-3')
  ];

  const visibleIds = opportunities.map((opportunity) => opportunity.id);

  useFeedStore.setState((state) => ({
    ...state,
    opportunities,
    selectedOpportunityId: null,
    selectedOpportunityIndex: null
  }));

  useFeedStore.getState().syncSelectionWithVisibleIds(visibleIds);

  let state = useFeedStore.getState();

  assert.strictEqual(
    state.selectedOpportunityId,
    visibleIds[0],
    'Expected first visible opportunity to be selected when initializing from visible list'
  );
  assert.strictEqual(
    state.selectedOpportunityIndex,
    0,
    'Expected selectedOpportunityIndex to track index within visible list'
  );

  useFeedStore.getState().moveSelectionByOffset(1, visibleIds);
  state = useFeedStore.getState();
  assert.strictEqual(
    state.selectedOpportunityId,
    visibleIds[1],
    'Expected ArrowDown to move selection to the next visible row'
  );
  assert.strictEqual(state.selectedOpportunityIndex, 1);

  useFeedStore.getState().moveSelectionByOffset(1, visibleIds);
  state = useFeedStore.getState();
  assert.strictEqual(
    state.selectedOpportunityId,
    visibleIds[2],
    'Expected ArrowDown to move selection to the last visible row'
  );
  assert.strictEqual(state.selectedOpportunityIndex, 2);

  useFeedStore.getState().moveSelectionByOffset(1, visibleIds);
  state = useFeedStore.getState();
  assert.strictEqual(
    state.selectedOpportunityIndex,
    2,
    'Expected selection to remain on last row when moving down past bounds'
  );

  useFeedStore.getState().moveSelectionByOffset(-1, visibleIds);
  state = useFeedStore.getState();
  assert.strictEqual(
    state.selectedOpportunityId,
    visibleIds[1],
    'Expected ArrowUp to move selection to the previous visible row'
  );
  assert.strictEqual(state.selectedOpportunityIndex, 1);

  useFeedStore.getState().moveSelectionByOffset(-1, visibleIds);
  useFeedStore.getState().moveSelectionByOffset(-1, visibleIds);
  state = useFeedStore.getState();
  assert.strictEqual(
    state.selectedOpportunityIndex,
    0,
    'Expected selection to remain on first row when moving up past bounds'
  );

  const filteredVisibleIds = [visibleIds[0], visibleIds[2]];

  useFeedStore.getState().syncSelectionWithVisibleIds(filteredVisibleIds);
  state = useFeedStore.getState();

  assert.deepStrictEqual(
    [state.selectedOpportunityId, state.selectedOpportunityIndex],
    [filteredVisibleIds[0], 0],
    'Expected selection to snap to first visible row when previously selected row is filtered out'
  );
});

test('[P1][4.2-KB-002] keyboard-driven selection updates feed store without additional TRPC calls', () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'the-odds-api');

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

  const visibleIds = [first.id, second.id];

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
      selectedOpportunityId: first.id,
      selectedOpportunityIndex: 0
    }));

    useFeedStore.getState().syncSelectionWithVisibleIds(visibleIds);

    useFeedStore.getState().moveSelectionByOffset(1, visibleIds);

    const updatedState = useFeedStore.getState();

    assert.strictEqual(
      updatedState.selectedOpportunityId,
      second.id,
      'Expected keyboard navigation to update selected opportunity id'
    );
    assert.strictEqual(
      updatedState.selectedOpportunityIndex,
      1,
      'Expected keyboard navigation to update selected opportunity index'
    );

    assert.strictEqual(
      trpcCallCount,
      0,
      'Expected no pollAndGetFeedSnapshot TRPC calls when changing selection via keyboard navigation'
    );
  } finally {
    trpc.trpcClient.pollAndGetFeedSnapshot.mutate = originalMutate;
  }
});

test('[P1][4.2-KB-003] selected row exposes data-state=\"selected\" and high-contrast styling', () => {
  const opportunities = [
    createOpportunity('arb-1'),
    createOpportunity('arb-2'),
    createOpportunity('arb-3')
  ];

  const visibleIds = opportunities.map((opportunity) => opportunity.id);

  useFeedStore.setState((state) => ({
    ...state,
    opportunities,
    selectedOpportunityId: null,
    selectedOpportunityIndex: null
  }));

  useFeedStore.getState().syncSelectionWithVisibleIds(visibleIds);

  const html = renderToHtml(
    React.createElement(FeedTable, {
      opportunities,
      initialSortBy: 'time',
      initialSortDirection: 'asc',
      stalenessNow: Date.parse('2025-11-22T18:10:00Z')
    })
  );

  const selectedMatches =
    html.match(/data-testid="feed-row"[^>]*data-state="selected"/g) ?? [];
  const idleMatches =
    html.match(/data-testid="feed-row"[^>]*data-state="idle"/g) ?? [];

  assert.strictEqual(
    selectedMatches.length,
    1,
    'Expected exactly one row to expose data-state="selected"'
  );

  const selectedRowMatch = html.match(
    /<div[^>]*data-testid="feed-row"[^>]*data-staleness="stale"[^>]*data-state="selected"[^>]*>/
  );

  assert.ok(
    selectedRowMatch && selectedRowMatch[0].includes('bg-ot-accent/10'),
    'Expected selected stale row to use Orange Terminal highlight styling (bg-ot-accent/10)'
  );

  assert.ok(
    idleMatches.length >= 1,
    'Expected at least one non-selected row with data-state="idle" for contrast'
  );

   const scrollContainerMatch = html.match(
     /<div[^>]*data-testid="feed-scroll-container"[^>]*>/
   );

   assert.ok(
     scrollContainerMatch,
     'Expected feed scroll container to be present with data-testid="feed-scroll-container"'
   );

   const scrollContainer = scrollContainerMatch[0];

   assert.ok(
     /role="listbox"/.test(scrollContainer),
     'Expected feed scroll container to expose role="listbox" for keyboard navigation semantics'
   );

   const tabIndexMatch = scrollContainer.match(/tabindex="([^"]*)"/i);

   assert.ok(
     tabIndexMatch,
     'Expected feed scroll container to expose a tabindex attribute'
   );

   assert.strictEqual(
     tabIndexMatch[1],
     '0',
     'Expected feed scroll container to be focusable with tabindex="0" when rows are present'
   );

   const ariaMatch = scrollContainer.match(/aria-activedescendant="([^"]*)"/);

   assert.ok(
     ariaMatch,
     'Expected feed scroll container to expose aria-activedescendant pointing at the selected row'
   );

   assert.strictEqual(
     ariaMatch[1],
     `feed-row-${visibleIds[0]}`,
     'Expected aria-activedescendant to match the selected row id'
   );
});

test('[P1][4.2-KB-004] keyboard navigation updates SignalPreview selection via DashboardLayout without additional TRPC calls', () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'the-odds-api');

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

  const visibleIds = [first.id, second.id];

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
      selectedOpportunityId: first.id,
      selectedOpportunityIndex: 0
    }));

    useFeedStore.getState().syncSelectionWithVisibleIds(visibleIds);

    const initialHtml = renderToHtml(React.createElement(DashboardLayout));

    assert.strictEqual(
      extractSelectedOpportunityId(initialHtml),
      first.id,
      'Expected SignalPreview to reflect the initially selected opportunity'
    );

    useFeedStore.getState().moveSelectionByOffset(1, visibleIds);

    const updatedHtml = renderToHtml(React.createElement(DashboardLayout));

    assert.strictEqual(
      extractSelectedOpportunityId(updatedHtml),
      second.id,
      'Expected keyboard navigation to update SignalPreview to the next selected opportunity'
    );

    assert.strictEqual(
      trpcCallCount,
      0,
      'Expected no pollAndGetFeedSnapshot TRPC calls when changing selection via keyboard navigation in DashboardLayout'
    );
  } finally {
    trpc.trpcClient.pollAndGetFeedSnapshot.mutate = originalMutate;
  }
});
