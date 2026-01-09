/**
 * Story 6.1: Expanded Two-Way Market Types
 *
 * Tests for market group schema, metadata inference, canonical keys,
 * and group-based filtering functionality.
 */
const { describe, test } = require('node:test')
const assert = require('node:assert')

// Import from compiled out-tests output (per E4-AI-02)
const {
  MARKET_GROUPS,
  MARKET_GROUP_DISPLAYS,
  MARKET_PATTERNS,
  inferMarketMetadata,
  parseMarketKey,
  formatMarketLabelFromKey
} = require('../out-tests/shared/types.js')

// Load golden fixtures
const cornersFixtures = require('./fixtures/arbitrage/golden-corners-arbs.json')
const cardsFixtures = require('./fixtures/arbitrage/golden-cards-arbs.json')
const shotsFixtures = require('./fixtures/arbitrage/golden-shots-arbs.json')
const otherFixtures = require('./fixtures/arbitrage/golden-other-arbs.json')

describe('Story 6.1: Expanded Two-Way Market Types', () => {
  describe('Market Group Schema', () => {
    test('[P0][6.1-SCHEMA-001] MARKET_GROUPS constant contains all 6 groups', () => {
      assert.ok(Array.isArray(MARKET_GROUPS), 'MARKET_GROUPS should be an array')
      assert.strictEqual(MARKET_GROUPS.length, 6, 'Should have 6 market groups')

      const expectedGroups = ['goals', 'handicap', 'corners', 'cards', 'shots', 'other']
      for (const group of expectedGroups) {
        assert.ok(MARKET_GROUPS.includes(group), `Should include '${group}' group`)
      }
    })

    test('[P0][6.1-SCHEMA-002] MARKET_GROUP_DISPLAYS provides labels and descriptions', () => {
      assert.ok(Array.isArray(MARKET_GROUP_DISPLAYS), 'MARKET_GROUP_DISPLAYS should be an array')
      assert.strictEqual(MARKET_GROUP_DISPLAYS.length, 6, 'Should have 6 group displays')

      for (const display of MARKET_GROUP_DISPLAYS) {
        assert.ok(display.group, 'Each display should have a group')
        assert.ok(display.label, 'Each display should have a label')
        assert.ok(display.description, 'Each display should have a description')
      }
    })

    test('[P0][6.1-SCHEMA-003] MARKET_PATTERNS maps market strings to groups', () => {
      assert.ok(typeof MARKET_PATTERNS === 'object', 'MARKET_PATTERNS should be an object')

      const requiredPatterns = [
        'h2h', 'btts', 'handicap', 'corners', 'cards', 'shots', 'offsides', 'fouls', 'penalty'
      ]

      for (const pattern of requiredPatterns) {
        assert.ok(MARKET_PATTERNS[pattern], `Should have pattern for '${pattern}'`)
        assert.ok(MARKET_PATTERNS[pattern].group, `Pattern '${pattern}' should have group`)
        assert.ok(MARKET_PATTERNS[pattern].baseType, `Pattern '${pattern}' should have baseType`)
      }
    })
  })

  describe('Market Metadata Inference', () => {
    test('[P0][6.1-INFER-001] inferMarketMetadata returns correct group for goals markets', () => {
      const goalsMarkets = ['h2h', 'moneyline', 'totals', 'btts', 'btts_yes', 'draw-no-bet']
      for (const market of goalsMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'goals',
          `Market '${market}' should be in 'goals' group, got '${metadata.group}'`
        )
      }
    })

    test('[P0][6.1-INFER-002] inferMarketMetadata returns correct group for handicap markets', () => {
      const handicapMarkets = ['handicap', 'spreads', 'asian_handicap', 'ah', '0-handicap']
      for (const market of handicapMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'handicap',
          `Market '${market}' should be in 'handicap' group, got '${metadata.group}'`
        )
      }
    })

    test('[P0][6.1-INFER-003] inferMarketMetadata returns correct group for corners markets', () => {
      const cornersMarkets = ['corners', 'corners_over', 'corner_handicap', 'home_corners']
      for (const market of cornersMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'corners',
          `Market '${market}' should be in 'corners' group, got '${metadata.group}'`
        )
      }
    })

    test('[P0][6.1-INFER-004] inferMarketMetadata returns correct group for cards markets', () => {
      const cardsMarkets = ['cards', 'cards_over', 'red_card', 'bookings']
      for (const market of cardsMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'cards',
          `Market '${market}' should be in 'cards' group, got '${metadata.group}'`
        )
      }
    })

    test('[P0][6.1-INFER-005] inferMarketMetadata returns correct group for shots markets', () => {
      const shotsMarkets = ['shots', 'shots_over', 'shots_on_target', 'sot']
      for (const market of shotsMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'shots',
          `Market '${market}' should be in 'shots' group, got '${metadata.group}'`
        )
      }
    })

    test('[P0][6.1-INFER-006] inferMarketMetadata returns correct group for other markets', () => {
      const otherMarkets = ['offsides', 'fouls', 'penalty', 'own_goal']
      for (const market of otherMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'other',
          `Market '${market}' should be in 'other' group, got '${metadata.group}'`
        )
      }
    })

    test('[P0][6.1-INFER-007] inferMarketMetadata falls back to other for unknown markets', () => {
      const unknownMarkets = ['unknown_market', 'xyz123', 'random_type']
      for (const market of unknownMarkets) {
        const metadata = inferMarketMetadata(market)
        assert.strictEqual(
          metadata.group,
          'other',
          `Unknown market '${market}' should fall back to 'other' group`
        )
      }
    })
  })

  describe('Market Key Parsing', () => {
    test('[P0][6.1-PARSE-001] parseMarketKey extracts period from key', () => {
      const result = parseMarketKey('corners_over_9.5_ft')
      assert.strictEqual(result.period, 'ft', 'Should extract ft period')

      const result1h = parseMarketKey('cards_under_3.5_1h')
      assert.strictEqual(result1h.period, '1h', 'Should extract 1h period')
    })

    test('[P0][6.1-PARSE-002] parseMarketKey extracts line from key', () => {
      const result = parseMarketKey('corners_over_9.5_ft')
      assert.strictEqual(result.line, 9.5, 'Should extract 9.5 line')

      const result2 = parseMarketKey('shots_under_22.5')
      assert.strictEqual(result2.line, 22.5, 'Should extract 22.5 line')
    })

    test('[P0][6.1-PARSE-003] parseMarketKey extracts side from key', () => {
      const homeResult = parseMarketKey('goals_home_over_4.5')
      assert.strictEqual(homeResult.side, 'home', 'Should extract home side')

      const awayResult = parseMarketKey('goals_away_under_5.5')
      assert.strictEqual(awayResult.side, 'away', 'Should extract away side')
    })
  })

  describe('Market Label Formatting', () => {
    test('[P0][6.1-LABEL-001] formatMarketLabelFromKey returns human-readable labels', () => {
      assert.strictEqual(formatMarketLabelFromKey('h2h'), 'Moneyline')
      assert.strictEqual(formatMarketLabelFromKey('btts'), 'BTTS (Both Teams to Score)')
      assert.strictEqual(formatMarketLabelFromKey('corners'), 'Corners')
      assert.strictEqual(formatMarketLabelFromKey('red_card'), 'Red Card')
    })
  })

  describe('Golden Fixtures - Corners', () => {
    for (const fixture of cornersFixtures.fixtures) {
      test(`[P0][6.1-GOLDEN-${fixture.id}] ${fixture.description}`, () => {
        const opportunity = fixture.opportunity

        // Verify ROI is positive
        assert.ok(opportunity.roi > 0, `ROI should be positive: ${opportunity.roi}`)

        // Verify legs have distinct bookmakers
        assert.notStrictEqual(
          opportunity.legs[0].bookmaker,
          opportunity.legs[1].bookmaker,
          'Legs should have distinct bookmakers'
        )

        // Verify market group inference
        const metadata = inferMarketMetadata(opportunity.legs[0].market)
        assert.strictEqual(
          metadata.group,
          fixture.expectedGroup,
          `Market should be in '${fixture.expectedGroup}' group`
        )
      })
    }
  })

  describe('Golden Fixtures - Cards', () => {
    for (const fixture of cardsFixtures.fixtures) {
      test(`[P0][6.1-GOLDEN-${fixture.id}] ${fixture.description}`, () => {
        const opportunity = fixture.opportunity

        // Verify ROI is positive
        assert.ok(opportunity.roi > 0, `ROI should be positive: ${opportunity.roi}`)

        // Verify legs have distinct bookmakers
        assert.notStrictEqual(
          opportunity.legs[0].bookmaker,
          opportunity.legs[1].bookmaker,
          'Legs should have distinct bookmakers'
        )

        // Verify market group inference
        const metadata = inferMarketMetadata(opportunity.legs[0].market)
        assert.strictEqual(
          metadata.group,
          fixture.expectedGroup,
          `Market should be in '${fixture.expectedGroup}' group`
        )
      })
    }
  })

  describe('Golden Fixtures - Shots', () => {
    for (const fixture of shotsFixtures.fixtures) {
      test(`[P0][6.1-GOLDEN-${fixture.id}] ${fixture.description}`, () => {
        const opportunity = fixture.opportunity

        // Verify ROI is positive
        assert.ok(opportunity.roi > 0, `ROI should be positive: ${opportunity.roi}`)

        // Verify legs have distinct bookmakers
        assert.notStrictEqual(
          opportunity.legs[0].bookmaker,
          opportunity.legs[1].bookmaker,
          'Legs should have distinct bookmakers'
        )

        // Verify market group inference
        const metadata = inferMarketMetadata(opportunity.legs[0].market)
        assert.strictEqual(
          metadata.group,
          fixture.expectedGroup,
          `Market should be in '${fixture.expectedGroup}' group`
        )
      })
    }
  })

  describe('Golden Fixtures - Other', () => {
    for (const fixture of otherFixtures.fixtures) {
      test(`[P0][6.1-GOLDEN-${fixture.id}] ${fixture.description}`, () => {
        const opportunity = fixture.opportunity

        // Verify ROI is positive
        assert.ok(opportunity.roi > 0, `ROI should be positive: ${opportunity.roi}`)

        // Verify legs have distinct bookmakers
        assert.notStrictEqual(
          opportunity.legs[0].bookmaker,
          opportunity.legs[1].bookmaker,
          'Legs should have distinct bookmakers'
        )

        // Verify market group inference
        const metadata = inferMarketMetadata(opportunity.legs[0].market)
        assert.strictEqual(
          metadata.group,
          fixture.expectedGroup,
          `Market should be in '${fixture.expectedGroup}' group`
        )
      })
    }
  })

  describe('R-002 Invariants', () => {
    test('[P0][6.1-R002-001] All golden fixtures maintain roi >= 0 invariant', () => {
      const allFixtures = [
        ...cornersFixtures.fixtures,
        ...cardsFixtures.fixtures,
        ...shotsFixtures.fixtures,
        ...otherFixtures.fixtures
      ]

      for (const fixture of allFixtures) {
        assert.ok(
          fixture.opportunity.roi >= 0,
          `Fixture ${fixture.id} should have roi >= 0, got ${fixture.opportunity.roi}`
        )
      }
    })

    test('[P0][6.1-R002-002] All golden fixtures have distinct bookmakers', () => {
      const allFixtures = [
        ...cornersFixtures.fixtures,
        ...cardsFixtures.fixtures,
        ...shotsFixtures.fixtures,
        ...otherFixtures.fixtures
      ]

      for (const fixture of allFixtures) {
        const opp = fixture.opportunity
        assert.notStrictEqual(
          opp.legs[0].bookmaker,
          opp.legs[1].bookmaker,
          `Fixture ${fixture.id} should have distinct bookmakers`
        )
      }
    })

    test('[P0][6.1-R002-003] ROI calculation is mathematically correct for golden fixtures', () => {
      const allFixtures = [
        ...cornersFixtures.fixtures,
        ...cardsFixtures.fixtures,
        ...shotsFixtures.fixtures,
        ...otherFixtures.fixtures
      ]

      for (const fixture of allFixtures) {
        const opp = fixture.opportunity
        const impliedProb = 1 / opp.legs[0].odds + 1 / opp.legs[1].odds

        // For arbitrage, sum of probabilities should be < 1
        // ROI = 1 - impliedProb (approximately)
        const expectedRoi = 1 - impliedProb

        // Allow small floating point tolerance
        const tolerance = 0.005
        const diff = Math.abs(opp.roi - expectedRoi)

        assert.ok(
          diff < tolerance,
          `Fixture ${fixture.id} ROI mismatch: expected ~${expectedRoi.toFixed(4)}, got ${opp.roi.toFixed(4)}`
        )
      }
    })
  })
})
