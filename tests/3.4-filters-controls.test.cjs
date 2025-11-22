'use strict';

const test = require('node:test');
const assert = require('node:assert');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

if (typeof global.window === 'undefined') {
  global.window = {};
}

function renderToHtml(element) {
  return ReactDOMServer.renderToString(element);
}

const {
  useFeedFiltersStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedFiltersStore.js');

const {
  applyDashboardFilters,
  ALL_REGION_CODES,
  ALL_SPORT_FILTERS,
  ALL_MARKET_FILTERS
} = require('../out-tests/src/renderer/src/features/dashboard/filters.js');

const {
  FeedTable
} = require('../out-tests/src/renderer/src/features/dashboard/FeedTable.js');

const {
  useFeedStore
} = require('../out-tests/src/renderer/src/features/dashboard/stores/feedStore.js');

const FeedPane =
  require('../out-tests/src/renderer/src/features/dashboard/FeedPane.js').default;

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

test('[P1][3.4-FILTERS-001] dashboard filters can independently constrain sport, region, market, and ROI', () => {
  const opportunities = [
    createOpportunity('it-soccer-moneyline', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      legs: [
        { bookmaker: 'Book-IT-1', market: 'moneyline', odds: 2.1, outcome: 'home' },
        { bookmaker: 'Book-IT-2', market: 'moneyline', odds: 2.1, outcome: 'away' }
      ],
      roi: 0.04
    }),
    createOpportunity('uk-tennis-moneyline', {
      sport: 'tennis',
      event: { league: 'Wimbledon' },
      legs: [
        { bookmaker: 'Book-UK-1', market: 'match-winner', odds: 2.1, outcome: 'home' },
        { bookmaker: 'Book-UK-2', market: 'match-winner', odds: 2.1, outcome: 'away' }
      ],
      roi: 0.06
    }),
    createOpportunity('it-soccer-totals-low-roi', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      legs: [
        { bookmaker: 'Book-IT-1', market: 'totals', odds: 1.9, outcome: 'home' },
        { bookmaker: 'Book-IT-2', market: 'totals', odds: 1.9, outcome: 'away' }
      ],
      roi: 0.01
    })
  ];

  const baseFilters = {
    regions: ALL_REGION_CODES,
    sports: ALL_SPORT_FILTERS,
    markets: ALL_MARKET_FILTERS,
    minRoi: 0
  };

  const defaultFiltered = applyDashboardFilters(opportunities, baseFilters);
  assert.strictEqual(
    defaultFiltered.length,
    opportunities.length,
    'When all filters are at defaults, no opportunities should be filtered out'
  );

  const sportFiltered = applyDashboardFilters(opportunities, {
    ...baseFilters,
    sports: ['soccer']
  });
  assert.strictEqual(
    sportFiltered.length,
    2,
    'Sport filter should constrain opportunities to the selected sports only'
  );
  assert.ok(sportFiltered.every((opportunity) => opportunity.sport === 'soccer'));

  const regionFiltered = applyDashboardFilters(opportunities, {
    ...baseFilters,
    regions: ['IT']
  });
  assert.ok(
    regionFiltered.every((opportunity) => opportunity.event.league === 'Serie A'),
    'Region filter should use inferred region from league names'
  );

  const marketFiltered = applyDashboardFilters(opportunities, {
    ...baseFilters,
    markets: ['totals']
  });
  assert.strictEqual(
    marketFiltered.length,
    1,
    'Market filter should constrain opportunities to the selected market types only'
  );
  assert.strictEqual(
    marketFiltered[0].legs[0].market,
    'totals',
    'Expected only totals opportunities to remain when filtering by Totals'
  );

  const roiFiltered = applyDashboardFilters(opportunities, {
    ...baseFilters,
    minRoi: 0.05
  });
  assert.ok(
    roiFiltered.every((opportunity) => opportunity.roi >= 0.05),
    'ROI filter should exclude opportunities below the minimum ROI threshold'
  );
});

test('[P1][3.4-FILTERS-002] dashboard filters compose across region, sport, market, and ROI dimensions', () => {
  const opportunities = [
    createOpportunity('it-soccer-strong', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      legs: [
        { bookmaker: 'Book-IT-1', market: 'moneyline', odds: 2.1, outcome: 'home' },
        { bookmaker: 'Book-IT-2', market: 'moneyline', odds: 2.1, outcome: 'away' }
      ],
      roi: 0.06
    }),
    createOpportunity('it-soccer-weak', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      legs: [
        { bookmaker: 'Book-IT-1', market: 'moneyline', odds: 1.9, outcome: 'home' },
        { bookmaker: 'Book-IT-2', market: 'moneyline', odds: 1.9, outcome: 'away' }
      ],
      roi: 0.02
    }),
    createOpportunity('uk-tennis-strong', {
      sport: 'tennis',
      event: { league: 'Wimbledon' },
      legs: [
        { bookmaker: 'Book-UK-1', market: 'match-winner', odds: 2.1, outcome: 'home' },
        { bookmaker: 'Book-UK-2', market: 'match-winner', odds: 2.1, outcome: 'away' }
      ],
      roi: 0.06
    })
  ];

  const combined = applyDashboardFilters(opportunities, {
    regions: ['IT'],
    sports: ['soccer'],
    markets: ['moneyline'],
    minRoi: 0.05
  });

  assert.strictEqual(
    combined.length,
    1,
    'Combined filters should leave only opportunities that satisfy all filter predicates'
  );
  assert.strictEqual(combined[0].id, 'it-soccer-strong');
});

test('[P1][3.4-FILTERS-003] filters can hide all visible rows while underlying feed still has data', () => {
  const opportunities = [
    createOpportunity('it-soccer', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      roi: 0.03
    })
  ];

  const filtered = applyDashboardFilters(opportunities, {
    regions: ['AU'],
    sports: ['tennis'],
    markets: ALL_MARKET_FILTERS,
    minRoi: 0.1
  });

  assert.strictEqual(
    opportunities.length,
    1,
    'Underlying feed should still have data before filters are applied'
  );
  assert.strictEqual(
    filtered.length,
    0,
    'All opportunities should be filtered out when filters exclude sport, region, and ROI'
  );
});

test('[P1][3.4-FILTERS-004] feed filters store configuration participates in filtering decisions', () => {
  useFeedFiltersStore.setState({
    regions: ['IT'],
    sports: ['soccer'],
    markets: ALL_MARKET_FILTERS,
    minRoi: 0
  });

  const filterState = useFeedFiltersStore.getState();

  const opportunities = [
    createOpportunity('it-soccer-1', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      roi: 0.06
    }),
    createOpportunity('uk-tennis-1', {
      sport: 'tennis',
      event: { league: 'Wimbledon' },
      roi: 0.06
    })
  ];

  const filtered = applyDashboardFilters(opportunities, {
    regions: filterState.regions,
    sports: filterState.sports,
    markets: filterState.markets,
    minRoi: filterState.minRoi
  });

  assert.strictEqual(
    filtered.length,
    1,
    'Expected only opportunities matching the stored filter configuration to remain'
  );
  assert.strictEqual(filtered[0].id, 'it-soccer-1');
});

test('[P1][3.4-FILTERS-005] applying dashboard filters does not perform network calls', async () => {
  const originalFetch = global.fetch;
  let fetchCalled = false;

  global.fetch = async (...args) => {
    fetchCalled = true;
    throw new Error('Network calls are not expected when applying dashboard filters');
  };

  try {
    const opportunities = [
      createOpportunity('it-soccer-1', {
        sport: 'soccer',
        event: { league: 'Serie A' },
        roi: 0.04
      }),
      createOpportunity('uk-tennis-1', {
        sport: 'tennis',
        event: { league: 'Wimbledon' },
        roi: 0.06
      })
    ];

    const filtered = applyDashboardFilters(opportunities, {
      regions: ['IT'],
      sports: ['soccer'],
      markets: ALL_MARKET_FILTERS,
      minRoi: 0.03
    });

    assert.ok(
      Array.isArray(filtered),
      'Expected filters to return an array of opportunities'
    );
    assert.strictEqual(
      fetchCalled,
      false,
      'Expected no network calls while applying in-memory dashboard filters'
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('[P1][3.4-FILTERS-006] filtered feeds retain virtualization behavior from Story 3.2', () => {
  const largeList = Array.from({ length: 80 }, (_, index) =>
    createOpportunity(`arb-${index + 1}`, {
      sport: index % 2 === 0 ? 'soccer' : 'tennis',
      event: {
        league: index % 2 === 0 ? 'Serie A' : 'Wimbledon',
        date: '2025-11-22T18:00:00Z'
      },
      roi: 0.02 + index * 0.0005
    })
  );

  const filtered = applyDashboardFilters(largeList, {
    regions: ALL_REGION_CODES,
    sports: ALL_SPORT_FILTERS,
    markets: ['moneyline'],
    minRoi: 0.0
  });

  const html = renderToHtml(
    React.createElement(FeedTable, {
      opportunities: filtered,
      initialSortBy: 'time',
      initialSortDirection: 'asc'
    })
  );

  assert.ok(
    /data-testid="feed-table"[^>]*data-virtualized="true"/.test(html),
    'Expected virtualization to remain active when rendering a filtered result set above the threshold'
  );

  const rowMatches = html.match(/data-testid="feed-row"/g) ?? [];
  assert.ok(
    rowMatches.length > 0 && rowMatches.length < filtered.length,
    'Expected only a subset of filtered rows to be rendered when virtualization is active'
  );
});

test('[P1][3.4-FILTERS-007] feed pane shows filtered empty state when filters hide all rows', () => {
  const opportunities = [
    createOpportunity('it-soccer', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      roi: 0.04
    })
  ];

  useFeedStore.setState({
    opportunities,
    isLoading: false,
    error: null
  });

  useFeedFiltersStore.setState({
    regions: ['AU'],
    sports: ['tennis'],
    markets: ['totals'],
    minRoi: 0.1
  });

  const html = renderToHtml(React.createElement(FeedPane));

  assert.strictEqual(
    useFeedStore.getState().opportunities.length,
    1,
    'Underlying feed should still have data before filters are applied in the pane'
  );

  assert.ok(
    html.includes('data-testid="feed-empty-filters"'),
    'Expected filtered empty state when filters hide all rows while underlying feed has data'
  );
});

test('[P1][3.4-FILTERS-008] feed pane respects restored filter configuration on render', () => {
  const opportunities = [
    createOpportunity('it-soccer-moneyline', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      legs: [
        { bookmaker: 'Book-IT-1', market: 'moneyline', odds: 2.1, outcome: 'home' },
        { bookmaker: 'Book-IT-2', market: 'moneyline', odds: 2.1, outcome: 'away' }
      ],
      roi: 0.04
    }),
    createOpportunity('uk-tennis-moneyline', {
      sport: 'tennis',
      event: { league: 'Wimbledon' },
      legs: [
        { bookmaker: 'Book-UK-1', market: 'match-winner', odds: 2.1, outcome: 'home' },
        { bookmaker: 'Book-UK-2', market: 'match-winner', odds: 2.1, outcome: 'away' }
      ],
      roi: 0.06
    }),
    createOpportunity('it-soccer-totals-low-roi', {
      sport: 'soccer',
      event: { league: 'Serie A' },
      legs: [
        { bookmaker: 'Book-IT-1', market: 'totals', odds: 1.9, outcome: 'home' },
        { bookmaker: 'Book-IT-2', market: 'totals', odds: 1.9, outcome: 'away' }
      ],
      roi: 0.01
    })
  ];

  useFeedStore.setState({
    opportunities,
    isLoading: false,
    error: null
  });

  useFeedFiltersStore.setState({
    regions: ['IT'],
    sports: ['soccer'],
    markets: ALL_MARKET_FILTERS,
    minRoi: 0.03
  });

  const html = renderToHtml(React.createElement(FeedPane));

  const rowMatches = html.match(/data-testid="feed-row"/g) ?? [];

  assert.strictEqual(
    rowMatches.length,
    1,
    'Expected only opportunities matching the restored filter configuration to be rendered'
  );

  assert.ok(
    /data-testid="feed-filters-region-IT"[^>]*aria-pressed="true"/.test(html),
    'Expected IT region chip to be active based on restored configuration'
  );

  assert.ok(
    /data-testid="feed-filters-sport-soccer"[^>]*aria-pressed="true"/.test(html),
    'Expected soccer sport chip to be active based on restored configuration'
  );
});
