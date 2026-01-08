/**
 * Story 5.2: Merged Multi-Provider Feed Tests
 *
 * Tests cover:
 * - Deduplication logic: key generation, ROI comparison, first-seen tiebreaker
 * - Schema validation: ensure merged opportunities pass Zod validation
 * - mergedFrom field population
 * - Edge cases: empty input, no duplicates, all duplicates, ROI tie
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')

// Import real implementations from compiled output (per E4-AI-02)
const calculator = require('../out-tests/src/main/services/calculator.js')
const schemas = require('../out-tests/shared/schemas.js')

// ============================================================
// Helper: Create mock ArbitrageOpportunity
// ============================================================

function createOpportunity({
  id = 'opp-1',
  eventName = 'Match A vs B',
  eventDate = '2025-12-01T15:00:00Z',
  league = 'Premier League',
  market = 'moneyline',
  homeOutcome = 'home',
  awayOutcome = 'away',
  homeOdds = 2.0,
  awayOdds = 2.2,
  roi = 0.045,
  providerId = 'odds-api-io',
  mergedFrom = undefined
}) {
  return {
    id,
    sport: 'soccer',
    event: {
      name: eventName,
      date: eventDate,
      league
    },
    legs: [
      {
        bookmaker: 'Bet365',
        market,
        odds: homeOdds,
        outcome: homeOutcome
      },
      {
        bookmaker: 'Pinnacle',
        market,
        odds: awayOdds,
        outcome: awayOutcome
      }
    ],
    roi,
    foundAt: '2025-12-01T12:00:00Z',
    providerId,
    mergedFrom
  }
}

// ============================================================
// Deduplication Key Tests
// ============================================================

test('[P0][5.2-DEDUP-001] deduplicateOpportunities returns empty array for empty input', async () => {
  const result = calculator.deduplicateOpportunities([])
  assert.ok(Array.isArray(result), 'Should return an array')
  assert.strictEqual(result.length, 0, 'Should be empty')
})

test('[P0][5.2-DEDUP-002] deduplicateOpportunities returns single opportunity unchanged', async () => {
  const opp = createOpportunity({ id: 'single-1' })
  const result = calculator.deduplicateOpportunities([opp])

  assert.strictEqual(result.length, 1, 'Should have 1 opportunity')
  assert.strictEqual(result[0].id, 'single-1', 'Should preserve id')
  assert.strictEqual(result[0].mergedFrom, undefined, 'Should not set mergedFrom for single source')
})

test('[P0][5.2-DEDUP-003] deduplicateOpportunities merges duplicates from different providers', async () => {
  const opp1 = createOpportunity({
    id: 'opp-provider-a',
    eventName: 'Team X vs Team Y',
    providerId: 'odds-api-io',
    roi: 0.05
  })
  const opp2 = createOpportunity({
    id: 'opp-provider-b',
    eventName: 'Team X vs Team Y',
    providerId: 'the-odds-api',
    roi: 0.04
  })

  const result = calculator.deduplicateOpportunities([opp1, opp2])

  assert.strictEqual(result.length, 1, 'Should deduplicate to 1 opportunity')
  assert.ok(result[0].mergedFrom, 'Should set mergedFrom')
  assert.strictEqual(result[0].mergedFrom.length, 2, 'Should have 2 providers in mergedFrom')
  assert.ok(result[0].mergedFrom.includes('odds-api-io'), 'Should include odds-api-io')
  assert.ok(result[0].mergedFrom.includes('the-odds-api'), 'Should include the-odds-api')
})

test('[P0][5.2-DEDUP-004] deduplicateOpportunities prefers higher ROI', async () => {
  const lowRoi = createOpportunity({
    id: 'low-roi',
    eventName: 'Same Match',
    providerId: 'odds-api-io',
    roi: 0.03
  })
  const highRoi = createOpportunity({
    id: 'high-roi',
    eventName: 'Same Match',
    providerId: 'the-odds-api',
    roi: 0.06
  })

  const result = calculator.deduplicateOpportunities([lowRoi, highRoi])

  assert.strictEqual(result.length, 1, 'Should deduplicate to 1')
  assert.strictEqual(result[0].id, 'high-roi', 'Should keep higher ROI opportunity')
  assert.strictEqual(result[0].roi, 0.06, 'Should have higher ROI value')
})

test('[P0][5.2-DEDUP-005] deduplicateOpportunities uses first-seen for ROI tie', async () => {
  const first = createOpportunity({
    id: 'first-seen',
    eventName: 'Tie Match',
    providerId: 'odds-api-io',
    roi: 0.05
  })
  const second = createOpportunity({
    id: 'second-seen',
    eventName: 'Tie Match',
    providerId: 'the-odds-api',
    roi: 0.05
  })

  const result = calculator.deduplicateOpportunities([first, second])

  assert.strictEqual(result.length, 1, 'Should deduplicate to 1')
  assert.strictEqual(result[0].id, 'first-seen', 'Should keep first-seen when ROI ties')
})

test('[P1][5.2-DEDUP-006] deduplicateOpportunities handles no duplicates (disjoint)', async () => {
  const opp1 = createOpportunity({
    id: 'unique-1',
    eventName: 'Match A',
    providerId: 'odds-api-io'
  })
  const opp2 = createOpportunity({
    id: 'unique-2',
    eventName: 'Match B',
    providerId: 'the-odds-api'
  })

  const result = calculator.deduplicateOpportunities([opp1, opp2])

  assert.strictEqual(result.length, 2, 'Should keep both unique opportunities')
  const ids = result.map((o) => o.id)
  assert.ok(ids.includes('unique-1'), 'Should include unique-1')
  assert.ok(ids.includes('unique-2'), 'Should include unique-2')
})

test('[P1][5.2-DEDUP-007] deduplicateOpportunities handles all duplicates', async () => {
  // All 4 opportunities are duplicates of the same event
  const opps = [
    createOpportunity({ id: 'dup-1', eventName: 'Same Event', providerId: 'odds-api-io', roi: 0.03 }),
    createOpportunity({ id: 'dup-2', eventName: 'Same Event', providerId: 'the-odds-api', roi: 0.05 }),
    createOpportunity({ id: 'dup-3', eventName: 'Same Event', providerId: 'odds-api-io', roi: 0.04 }),
    createOpportunity({ id: 'dup-4', eventName: 'Same Event', providerId: 'the-odds-api', roi: 0.02 })
  ]

  const result = calculator.deduplicateOpportunities(opps)

  assert.strictEqual(result.length, 1, 'Should collapse to 1 opportunity')
  assert.strictEqual(result[0].id, 'dup-2', 'Should keep highest ROI (dup-2 with 0.05)')
})

test('[P1][5.2-DEDUP-008] deduplicateOpportunities handles partial overlap', async () => {
  // 2 duplicates + 1 unique
  const opps = [
    createOpportunity({ id: 'match-a-1', eventName: 'Match A', providerId: 'odds-api-io', roi: 0.04 }),
    createOpportunity({ id: 'match-a-2', eventName: 'Match A', providerId: 'the-odds-api', roi: 0.03 }),
    createOpportunity({ id: 'match-b-1', eventName: 'Match B', providerId: 'odds-api-io', roi: 0.05 })
  ]

  const result = calculator.deduplicateOpportunities(opps)

  assert.strictEqual(result.length, 2, 'Should have 2 unique opportunities')

  const matchA = result.find((o) => o.event.name === 'Match A')
  const matchB = result.find((o) => o.event.name === 'Match B')

  assert.ok(matchA, 'Should have Match A')
  assert.ok(matchB, 'Should have Match B')
  assert.strictEqual(matchA.id, 'match-a-1', 'Match A should keep higher ROI')
  assert.ok(matchA.mergedFrom, 'Match A should have mergedFrom')
  assert.strictEqual(matchB.mergedFrom, undefined, 'Match B should not have mergedFrom (single source)')
})

// ============================================================
// Schema Validation Tests
// ============================================================

test('[P0][5.2-SCHEMA-001] mergedFrom is accepted by arbitrageOpportunitySchema', async () => {
  const opp = {
    id: 'schema-test',
    sport: 'soccer',
    event: {
      name: 'Test Match',
      date: '2025-12-01T15:00:00Z',
      league: 'Test League'
    },
    legs: [
      { bookmaker: 'BookA', market: 'moneyline', odds: 2.0, outcome: 'home' },
      { bookmaker: 'BookB', market: 'moneyline', odds: 2.1, outcome: 'away' }
    ],
    roi: 0.024,
    foundAt: '2025-12-01T12:00:00Z',
    providerId: 'odds-api-io',
    mergedFrom: ['odds-api-io', 'the-odds-api']
  }

  // Should not throw
  const parsed = schemas.arbitrageOpportunitySchema.parse(opp)
  assert.ok(parsed, 'Should parse successfully')
  assert.deepStrictEqual(parsed.mergedFrom, ['odds-api-io', 'the-odds-api'], 'Should preserve mergedFrom')
})

test('[P0][5.2-SCHEMA-002] arbitrageOpportunitySchema accepts undefined mergedFrom', async () => {
  const opp = {
    id: 'no-merged',
    sport: 'soccer',
    event: {
      name: 'Test Match',
      date: '2025-12-01T15:00:00Z',
      league: 'Test League'
    },
    legs: [
      { bookmaker: 'BookA', market: 'moneyline', odds: 2.0, outcome: 'home' },
      { bookmaker: 'BookB', market: 'moneyline', odds: 2.1, outcome: 'away' }
    ],
    roi: 0.024,
    foundAt: '2025-12-01T12:00:00Z',
    providerId: 'odds-api-io'
    // mergedFrom omitted
  }

  const parsed = schemas.arbitrageOpportunitySchema.parse(opp)
  assert.ok(parsed, 'Should parse successfully without mergedFrom')
  assert.strictEqual(parsed.mergedFrom, undefined, 'mergedFrom should be undefined')
})

test('[P1][5.2-SCHEMA-003] deduplicateOpportunities output passes schema validation', async () => {
  const opps = [
    createOpportunity({ id: 'opp-1', eventName: 'Match 1', providerId: 'odds-api-io', roi: 0.04 }),
    createOpportunity({ id: 'opp-2', eventName: 'Match 1', providerId: 'the-odds-api', roi: 0.05 })
  ]

  const result = calculator.deduplicateOpportunities(opps)

  // Should not throw - output is already validated by deduplicateOpportunities
  const parsed = schemas.arbitrageOpportunityListSchema.parse(result)
  assert.ok(parsed, 'Deduplicated output should pass list schema')
  assert.strictEqual(parsed.length, 1, 'Should have 1 deduplicated opportunity')
})

// ============================================================
// Deduplication Stats Tests
// ============================================================

test('[P1][5.2-STATS-001] getDeduplicationStats computes correct values', async () => {
  const stats = calculator.getDeduplicationStats(10, 7)

  assert.strictEqual(stats.totalOpportunities, 10, 'totalOpportunities should be 10')
  assert.strictEqual(stats.uniqueOpportunities, 7, 'uniqueOpportunities should be 7')
  assert.strictEqual(stats.duplicatesRemoved, 3, 'duplicatesRemoved should be 3')
})

test('[P2][5.2-STATS-002] getDeduplicationStats handles zero duplicates', async () => {
  const stats = calculator.getDeduplicationStats(5, 5)

  assert.strictEqual(stats.totalOpportunities, 5)
  assert.strictEqual(stats.uniqueOpportunities, 5)
  assert.strictEqual(stats.duplicatesRemoved, 0)
})

test('[P2][5.2-STATS-003] getDeduplicationStats handles all duplicates', async () => {
  const stats = calculator.getDeduplicationStats(10, 1)

  assert.strictEqual(stats.totalOpportunities, 10)
  assert.strictEqual(stats.uniqueOpportunities, 1)
  assert.strictEqual(stats.duplicatesRemoved, 9)
})

// ============================================================
// Golden Fixture Tests
// ============================================================

test('[P0][5.2-GOLDEN-001] golden fixture: overlapping opportunities from both providers', async () => {
  // Simulate real-world scenario: both providers return opportunities for the same matches
  const provider1Opps = [
    createOpportunity({
      id: 'p1-match-1',
      eventName: 'Arsenal vs Chelsea',
      eventDate: '2025-12-15T15:00:00Z',
      league: 'Premier League',
      market: 'moneyline',
      providerId: 'odds-api-io',
      roi: 0.032
    }),
    createOpportunity({
      id: 'p1-match-2',
      eventName: 'Liverpool vs Man City',
      eventDate: '2025-12-15T17:30:00Z',
      league: 'Premier League',
      market: 'moneyline',
      providerId: 'odds-api-io',
      roi: 0.045
    }),
    createOpportunity({
      id: 'p1-match-3',
      eventName: 'Bayern vs Dortmund',
      eventDate: '2025-12-15T18:30:00Z',
      league: 'Bundesliga',
      market: 'moneyline',
      providerId: 'odds-api-io',
      roi: 0.028
    })
  ]

  const provider2Opps = [
    createOpportunity({
      id: 'p2-match-1',
      eventName: 'Arsenal vs Chelsea',
      eventDate: '2025-12-15T15:00:00Z',
      league: 'Premier League',
      market: 'moneyline',
      providerId: 'the-odds-api',
      roi: 0.038 // Higher ROI than provider1
    }),
    createOpportunity({
      id: 'p2-match-2',
      eventName: 'Liverpool vs Man City',
      eventDate: '2025-12-15T17:30:00Z',
      league: 'Premier League',
      market: 'moneyline',
      providerId: 'the-odds-api',
      roi: 0.041 // Lower ROI than provider1
    }),
    // No Bayern vs Dortmund from provider2 - unique to provider1
    createOpportunity({
      id: 'p2-match-4',
      eventName: 'Real Madrid vs Barcelona',
      eventDate: '2025-12-15T20:00:00Z',
      league: 'La Liga',
      market: 'moneyline',
      providerId: 'the-odds-api',
      roi: 0.055
    })
  ]

  const combined = [...provider1Opps, ...provider2Opps]
  const result = calculator.deduplicateOpportunities(combined)

  // Expected: 4 unique matches
  // - Arsenal vs Chelsea: merged (highest ROI from provider2 = 0.038)
  // - Liverpool vs Man City: merged (highest ROI from provider1 = 0.045)
  // - Bayern vs Dortmund: unique to provider1 (no merge)
  // - Real Madrid vs Barcelona: unique to provider2 (no merge)
  assert.strictEqual(result.length, 4, 'Should have 4 unique opportunities')

  const arsenalMatch = result.find((o) => o.event.name === 'Arsenal vs Chelsea')
  const liverpoolMatch = result.find((o) => o.event.name === 'Liverpool vs Man City')
  const bayernMatch = result.find((o) => o.event.name === 'Bayern vs Dortmund')
  const elClassico = result.find((o) => o.event.name === 'Real Madrid vs Barcelona')

  assert.ok(arsenalMatch, 'Should have Arsenal vs Chelsea')
  assert.ok(liverpoolMatch, 'Should have Liverpool vs Man City')
  assert.ok(bayernMatch, 'Should have Bayern vs Dortmund')
  assert.ok(elClassico, 'Should have Real Madrid vs Barcelona')

  // Check merged opportunities have mergedFrom
  assert.ok(arsenalMatch.mergedFrom, 'Arsenal match should have mergedFrom')
  assert.strictEqual(arsenalMatch.mergedFrom.length, 2, 'Arsenal mergedFrom should have 2 providers')
  assert.strictEqual(arsenalMatch.roi, 0.038, 'Arsenal should use higher ROI from provider2')

  assert.ok(liverpoolMatch.mergedFrom, 'Liverpool match should have mergedFrom')
  assert.strictEqual(liverpoolMatch.roi, 0.045, 'Liverpool should use higher ROI from provider1')

  // Check unique opportunities don't have mergedFrom
  assert.strictEqual(bayernMatch.mergedFrom, undefined, 'Bayern match should not have mergedFrom')
  assert.strictEqual(elClassico.mergedFrom, undefined, 'El Clasico should not have mergedFrom')
})

// ============================================================
// Edge Cases
// ============================================================

test('[P2][5.2-EDGE-001] deduplicateOpportunities handles opportunities without providerId', async () => {
  const opp1 = createOpportunity({ id: 'no-provider-1', eventName: 'Match', providerId: undefined })
  const opp2 = createOpportunity({ id: 'no-provider-2', eventName: 'Match', providerId: undefined })

  const result = calculator.deduplicateOpportunities([opp1, opp2])

  assert.strictEqual(result.length, 1, 'Should deduplicate')
  // mergedFrom should be empty or undefined since no providerIds
  assert.ok(
    result[0].mergedFrom === undefined || result[0].mergedFrom.length === 0,
    'mergedFrom should be empty when no providerIds'
  )
})

test('[P2][5.2-EDGE-002] deduplicateOpportunities preserves all opportunity fields', async () => {
  const opp = createOpportunity({
    id: 'full-fields',
    eventName: 'Complete Match',
    eventDate: '2025-12-25T12:00:00Z',
    league: 'Test League',
    market: 'totals',
    homeOutcome: 'over',
    awayOutcome: 'under',
    homeOdds: 1.9,
    awayOdds: 2.1,
    roi: 0.048,
    providerId: 'odds-api-io'
  })

  const result = calculator.deduplicateOpportunities([opp])

  assert.strictEqual(result.length, 1)
  const output = result[0]

  assert.strictEqual(output.id, 'full-fields')
  assert.strictEqual(output.sport, 'soccer')
  assert.strictEqual(output.event.name, 'Complete Match')
  assert.strictEqual(output.event.date, '2025-12-25T12:00:00Z')
  assert.strictEqual(output.event.league, 'Test League')
  assert.strictEqual(output.legs[0].market, 'totals')
  assert.strictEqual(output.legs[0].outcome, 'over')
  assert.strictEqual(output.legs[1].outcome, 'under')
  assert.strictEqual(output.roi, 0.048)
  assert.strictEqual(output.providerId, 'odds-api-io')
})

console.log('Story 5.2 tests defined. Run with: node --test tests/5-2-merged-multi-provider-feed.test.cjs')
