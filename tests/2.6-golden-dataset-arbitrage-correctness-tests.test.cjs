'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  calculateArbitrageFromSnapshots,
  calculateTwoLegArbitrageRoi
} = require('../out-tests/src/main/services/calculator.js');

const {
  arbitrageOpportunityListSchema
} = require('../out-tests/shared/schemas.js');

const {
  loadGoldenSnapshotsForOddsApiIo,
  loadGoldenSnapshotsForTheOddsApi,
  loadGoldenSnapshotsForNoSurebets
} = require('./helpers/golden-dataset.js');

test('[P0][2.6-GOLDEN-001] golden fixtures produce expected arbitrage opportunities', () => {
  const oddsApiSnapshots = loadGoldenSnapshotsForOddsApiIo();
  const theOddsSnapshots = loadGoldenSnapshotsForTheOddsApi();

  const result = calculateArbitrageFromSnapshots([
    ...oddsApiSnapshots,
    ...theOddsSnapshots
  ]);

  const parsed = arbitrageOpportunityListSchema.parse(result);

  assert.strictEqual(
    parsed.length,
    oddsApiSnapshots.length + theOddsSnapshots.length,
    'Each golden snapshot with positive ROI should produce one opportunity'
  );

  for (const snapshot of [...oddsApiSnapshots, ...theOddsSnapshots]) {
    const opportunity = parsed.find((op) => op.id === snapshot.id);
    assert.ok(opportunity, `Expected opportunity with id ${snapshot.id}`);

    assert.strictEqual(
      opportunity.sport,
      snapshot.sport,
      'Sport must match snapshot'
    );
    assert.strictEqual(
      opportunity.event.league,
      snapshot.league,
      'League must match snapshot'
    );
    assert.strictEqual(
      opportunity.event.name,
      snapshot.eventName,
      'Event name must match snapshot'
    );

    const expectedRoi = calculateTwoLegArbitrageRoi(
      snapshot.homeOdds,
      snapshot.awayOdds
    );
    assert.ok(
      expectedRoi > 0,
      'Golden snapshots for arbitrage scenarios must have positive ROI'
    );

    const delta = Math.abs(opportunity.roi - expectedRoi);
    assert.ok(
      delta < 1e-12,
      `ROI mismatch for ${snapshot.id}: expected ${expectedRoi}, got ${opportunity.roi}`
    );

    assert.notStrictEqual(
      opportunity.legs[0].bookmaker,
      opportunity.legs[1].bookmaker,
      'Golden opportunities must use distinct bookmakers for each leg'
    );
  }
});

test('[P0][2.6-GOLDEN-002] no-surebets fixture yields zero opportunities', () => {
  const noSurebetsSnapshots = loadGoldenSnapshotsForNoSurebets();

  const result = calculateArbitrageFromSnapshots(noSurebetsSnapshots);
  const parsed = arbitrageOpportunityListSchema.parse(result);

  assert.strictEqual(
    parsed.length,
    0,
    'No-surebets fixture must not produce any opportunities'
  );
});

test('[P1][2.6-R002-001] golden dataset enforces R-002 invariants', () => {
  const oddsApiSnapshots = loadGoldenSnapshotsForOddsApiIo();
  const theOddsSnapshots = loadGoldenSnapshotsForTheOddsApi();

  const result = calculateArbitrageFromSnapshots([
    ...oddsApiSnapshots,
    ...theOddsSnapshots
  ]);

  const parsed = arbitrageOpportunityListSchema.parse(result);
  const tolerance = 1e-9;

  parsed.forEach((opportunity) => {
    assert.ok(
      opportunity.roi >= 0,
      'R-002 invariant: ROI must be non-negative'
    );

    assert.notStrictEqual(
      opportunity.legs[0].bookmaker,
      opportunity.legs[1].bookmaker,
      'R-002 invariant: legs must reference distinct bookmakers'
    );

    const implied =
      1 / opportunity.legs[0].odds + 1 / opportunity.legs[1].odds;

    assert.ok(
      implied <= 1 + tolerance,
      `R-002 invariant: implied probability must satisfy 1/oddsA + 1/oddsB <= 1 + tolerance (got ${implied})`
    );
  });
});

test('[P1][2.6-R002-002] calculator behaves correctly near arbitrage boundary', () => {
  const samples = 250;
  const tolerance = 1e-9;

  for (let i = 0; i < samples; i++) {
    const oddsA = 1.2 + Math.random() * 4.8;
    const oddsB = 1.2 + Math.random() * 4.8;

    const implied = 1 / oddsA + 1 / oddsB;
    const roi = calculateTwoLegArbitrageRoi(oddsA, oddsB);

    assert.ok(roi >= 0, 'ROI must never be negative');

    if (implied < 1 - tolerance) {
      assert.ok(roi > 0, 'ROI should be positive when implied probability < 1');
    } else if (implied > 1 + tolerance) {
      assert.strictEqual(
        roi,
        0,
        'ROI should be zero when implied probability clearly exceeds 1'
      );
    }
  }
});

