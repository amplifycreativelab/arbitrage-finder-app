'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

const {
  copyAndAdvanceCurrentOpportunity
} = require('../out-tests/src/renderer/src/features/dashboard/copyAndAdvance.js');

const {
  formatSignalPayload
} = require('../out-tests/src/renderer/src/features/dashboard/SignalPreview.js');

const {
  useFeedStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedStore.js');

const {
  useFeedFiltersStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedFiltersStore.js');

const {
  FeedTable
} = require('../out-tests/src/renderer/src/features/dashboard/FeedTable.js');

const SignalPreview =
  require('../out-tests/src/renderer/src/features/dashboard/SignalPreview.js').default;

const DashboardLayout =
  require('../out-tests/src/renderer/src/features/dashboard/DashboardLayout.js').default;

const trpc = require('../out-tests/src/renderer/src/lib/trpc.js');
const { PROVIDERS } = require('../out-tests/shared/types.js');

if (typeof global.window === 'undefined') {
  global.window = {};
}

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

test('[P1][4.3-COPY-001] copyAndAdvanceCurrentOpportunity copies SignalPreview payload and advances to next unprocessed row', async () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'the-odds-api');

  assert.ok(provider, 'Expected test provider metadata to exist');

  const first = createOpportunity('arb-1');
  const second = createOpportunity('arb-2', {
    roi: 0.1
  });

  useFeedStore.setState((state) => ({
    ...state,
    providerId: provider.id,
    providerMetadata: provider,
    opportunities: [first, second],
    fetchedAt: '2025-11-22T18:00:00Z',
    status: null,
    isLoading: false,
    error: null,
    selectedOpportunityId: first.id,
    selectedOpportunityIndex: 0,
    processedOpportunityIds: new Set()
  }));

  useFeedFiltersStore.setState((state) => ({
    ...state,
    bookmakers: [],
    minRoi: 0
  }));

  let copyCallCount = 0;
  let lastCopiedText = null;

  const originalMutate = trpc.trpcClient.copySignalToClipboard.mutate;

  trpc.trpcClient.copySignalToClipboard.mutate = async (input) => {
    copyCallCount += 1;
    lastCopiedText = input.text;
    return { ok: true };
  };

  try {
    const result = await copyAndAdvanceCurrentOpportunity();

    assert.ok(result.success, 'Expected copyAndAdvanceCurrentOpportunity to succeed');
    assert.strictEqual(
      result.copiedOpportunityId,
      first.id,
      'Expected first selected opportunity to be copied'
    );

    assert.strictEqual(copyCallCount, 1, 'Expected exactly one clipboard call');

    const expectedPayload = formatSignalPayload(first, provider);

    assert.strictEqual(
      lastCopiedText,
      expectedPayload,
      'Expected clipboard payload to match SignalPreview payload'
    );

    const state = useFeedStore.getState();

    assert.ok(
      state.processedOpportunityIds.has(first.id),
      'Expected first opportunity to be marked processed'
    );
    assert.strictEqual(
      state.selectedOpportunityId,
      second.id,
      'Expected selection to advance to next unprocessed row'
    );
  } finally {
    trpc.trpcClient.copySignalToClipboard.mutate = originalMutate;
  }
});

test('[P1][4.3-COPY-002] copyAndAdvanceCurrentOpportunity clamps selection when all visible rows are processed', async () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'odds-api-io');

  assert.ok(provider, 'Expected production provider metadata to exist');

  const first = createOpportunity('arb-1');
  const second = createOpportunity('arb-2');

  useFeedStore.setState((state) => ({
    ...state,
    providerId: provider.id,
    providerMetadata: provider,
    opportunities: [first, second],
    fetchedAt: '2025-11-22T18:00:00Z',
    status: null,
    isLoading: false,
    error: null,
    selectedOpportunityId: second.id,
    selectedOpportunityIndex: 1,
    processedOpportunityIds: new Set([first.id])
  }));

  let copyCallCount = 0;

  const originalMutate = trpc.trpcClient.copySignalToClipboard.mutate;

  trpc.trpcClient.copySignalToClipboard.mutate = async () => {
    copyCallCount += 1;
    return { ok: true };
  };

  try {
    const firstResult = await copyAndAdvanceCurrentOpportunity();

    assert.ok(firstResult.success, 'Expected copyAndAdvanceCurrentOpportunity to succeed');

    let state = useFeedStore.getState();

    assert.ok(
      state.processedOpportunityIds.has(first.id) &&
        state.processedOpportunityIds.has(second.id),
      'Expected both opportunities to be marked processed after copy'
    );

    assert.strictEqual(
      state.selectedOpportunityId,
      second.id,
      'Expected selection to remain on last processed row when no further unprocessed rows exist'
    );

    const secondResult = await copyAndAdvanceCurrentOpportunity();

    assert.ok(secondResult.success, 'Expected subsequent copy to still succeed');

    state = useFeedStore.getState();

    assert.strictEqual(
      state.selectedOpportunityId,
      second.id,
      'Expected selection to remain clamped on last row on repeated copy'
    );

    assert.strictEqual(
      copyCallCount,
      2,
      'Expected clipboard to be called exactly once per explicit action'
    );
  } finally {
    trpc.trpcClient.copySignalToClipboard.mutate = originalMutate;
  }
});

test('[P1][4.3-COPY-003] copyAndAdvanceCurrentOpportunity is inert when no visible opportunities remain', async () => {
  const first = createOpportunity('arb-1');

  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [first],
    selectedOpportunityId: null,
    selectedOpportunityIndex: null,
    processedOpportunityIds: new Set()
  }));

  useFeedFiltersStore.setState((state) => ({
    ...state,
    bookmakers: ['Nonexistent-Book']
  }));

  let copyCallCount = 0;

  const originalMutate = trpc.trpcClient.copySignalToClipboard.mutate;

  trpc.trpcClient.copySignalToClipboard.mutate = async () => {
    copyCallCount += 1;
    return { ok: true };
  };

  try {
    const result = await copyAndAdvanceCurrentOpportunity();

    assert.strictEqual(result.success, false, 'Expected copy to be a no-op');
    assert.strictEqual(copyCallCount, 0, 'Expected no clipboard calls when nothing is selected');

    const state = useFeedStore.getState();

    assert.strictEqual(
      state.processedOpportunityIds.size,
      0,
      'Expected no processed rows when operation is inert'
    );
  } finally {
    trpc.trpcClient.copySignalToClipboard.mutate = originalMutate;
  }
});

test('[P1][4.3-COPY-004] DashboardLayout exposes COPY SIGNAL button in SignalPreview pane', () => {
  const first = createOpportunity('arb-1');

  useFeedStore.setState((state) => ({
    ...state,
    opportunities: [first],
    selectedOpportunityId: first.id,
    selectedOpportunityIndex: 0,
    processedOpportunityIds: new Set()
  }));

  const html = renderToHtml(React.createElement(DashboardLayout));

  assert.ok(
    html.includes('data-testid="copy-signal-button"'),
    'Expected COPY SIGNAL button to be rendered in SignalPreview pane'
  );
});

test('[P1][4.3-COPY-005] FeedTable and SignalPreview share selection and processed state for Copy & Advance', async () => {
  const provider = PROVIDERS.find((entry) => entry.id === 'the-odds-api');

  assert.ok(provider, 'Expected test provider metadata to exist');

  const first = createOpportunity('arb-1');
  const second = createOpportunity('arb-2');

  useFeedStore.setState((state) => ({
    ...state,
    providerId: provider.id,
    providerMetadata: provider,
    opportunities: [first, second],
    fetchedAt: '2025-11-22T18:00:00Z',
    status: null,
    isLoading: false,
    error: null,
    selectedOpportunityId: first.id,
    selectedOpportunityIndex: 0,
    processedOpportunityIds: new Set()
  }));

  let copyCallCount = 0;

  const originalMutate = trpc.trpcClient.copySignalToClipboard.mutate;

  trpc.trpcClient.copySignalToClipboard.mutate = async () => {
    copyCallCount += 1;
    return { ok: true };
  };

  try {
    const feedHtml = renderToHtml(
      React.createElement(FeedTable, {
        opportunities: [first, second],
        initialSortBy: 'time',
        initialSortDirection: 'asc'
      })
    );

    const previewHtml = renderToHtml(
      React.createElement(SignalPreview, {
        opportunity: first,
        providerMetadata: provider
      })
    );

    assert.ok(
      feedHtml.includes('data-testid="feed-row"'),
      'Expected FeedTable rows to be rendered for selection'
    );

    assert.ok(
      previewHtml.includes('data-testid="signal-preview"'),
      'Expected SignalPreview to render for current selection'
    );

    const result = await copyAndAdvanceCurrentOpportunity();

    assert.ok(result.success, 'Expected shared Copy & Advance action to succeed');

    const state = useFeedStore.getState();

    assert.ok(
      state.processedOpportunityIds.has(first.id),
      'Expected processed state to be stored centrally in feed store'
    );
    assert.strictEqual(
      state.selectedOpportunityId,
      second.id,
      'Expected selection to advance to next row visible in FeedTable'
    );

    assert.strictEqual(
      copyCallCount,
      1,
      'Expected a single clipboard call for Copy & Advance workflow'
    );
  } finally {
    trpc.trpcClient.copySignalToClipboard.mutate = originalMutate;
  }
});

