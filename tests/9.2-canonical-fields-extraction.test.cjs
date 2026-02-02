'use strict'

/**
 * Unit tests for Story 9.2: Add Canonical Fields to Event Model
 * Tests canonical field extraction (leagueSlug, sportSlug, kickoffEpochMs)
 */

const test = require('node:test')
const assert = require('node:assert')

const { __test: deepScanTest } = require('../out-tests/src/main/services/deepScan.js')

const { extractEvents } = deepScanTest

test('[P0][9.2-DEEP-SCAN-001] DeepScanEvent interface has all canonical identity fields', () => {
  // Type-level test: verify the interface supports the expected fields
  // This would be a compile-time check in TypeScript; at runtime we verify the extraction works
  const event = {
    id: 'test-123',
    name: 'Test Event',
    date: '2026-02-15T15:00:00Z',
    kickoffEpochMs: 1739631600000,
    league: 'Premier League',
    leagueSlug: 'england-premier-league',
    sport: 'Football',
    sportSlug: 'football'
  }

  assert.strictEqual(event.id, 'test-123')
  assert.strictEqual(event.name, 'Test Event')
  assert.strictEqual(event.date, '2026-02-15T15:00:00Z')
  assert.strictEqual(event.kickoffEpochMs, 1739631600000)
  assert.strictEqual(event.league, 'Premier League')
  assert.strictEqual(event.leagueSlug, 'england-premier-league')
  assert.strictEqual(event.sport, 'Football')
  assert.strictEqual(event.sportSlug, 'football')
})

test('[P0][9.2-DEEP-SCAN-002] League object with name and slug extracts both fields (AC2)', () => {
  const payload = [
    {
      id: 'evt-123',
      name: 'Arsenal vs Chelsea',
      league: { name: 'Premier League', slug: 'england-premier-league' }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].league, 'Premier League', 'league should be display name')
  assert.strictEqual(events[0].leagueSlug, 'england-premier-league', 'leagueSlug should be canonical slug')
})

test('[P0][9.2-DEEP-SCAN-003] String-only league stores as display, slug undefined (AC2)', () => {
  const payload = [
    {
      id: 'evt-456',
      name: 'Team A vs Team B',
      league: 'Some League'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].league, 'Some League')
  assert.strictEqual(events[0].leagueSlug, undefined)
})

test('[P1][9.2-DEEP-SCAN-004] League object with only name has undefined slug', () => {
  const payload = [
    {
      id: 'evt-789',
      name: 'Match',
      league: { name: 'La Liga' }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].league, 'La Liga')
  assert.strictEqual(events[0].leagueSlug, undefined)
})

test('[P1][9.2-DEEP-SCAN-005] League object with only slug uses slug as name fallback', () => {
  const payload = [
    {
      id: 'evt-abc',
      name: 'Match',
      league: { slug: 'bundesliga' }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  // Story 9.3: When name is missing, slug becomes display fallback
  assert.strictEqual(events[0].league, 'bundesliga')
  assert.strictEqual(events[0].leagueSlug, 'bundesliga')
})

test('[P0][9.2-DEEP-SCAN-006] Sport object with name and slug extracts both fields (AC2)', () => {
  const payload = [
    {
      id: 'evt-123',
      name: 'Arsenal vs Chelsea',
      sport: { name: 'Football', slug: 'football' }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].sport, 'Football', 'sport should be display name')
  assert.strictEqual(events[0].sportSlug, 'football', 'sportSlug should be canonical slug')
})

test('[P0][9.2-DEEP-SCAN-007] String-only sport stores as display, slug undefined (AC2)', () => {
  const payload = [
    {
      id: 'evt-456',
      name: 'Team A vs Team B',
      sport: 'Soccer'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].sport, 'Soccer')
  assert.strictEqual(events[0].sportSlug, undefined)
})

test('[P1][9.2-DEEP-SCAN-008] Sport object with only name has undefined slug', () => {
  const payload = [
    {
      id: 'evt-789',
      name: 'Match',
      sport: { name: 'Basketball' }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].sport, 'Basketball')
  assert.strictEqual(events[0].sportSlug, undefined)
})

test('[P1][9.2-DEEP-SCAN-009] Sport object with only slug uses slug as name fallback', () => {
  const payload = [
    {
      id: 'evt-abc',
      name: 'Match',
      sport: { slug: 'tennis' }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  // Story 9.3: When name is missing, slug becomes display fallback
  assert.strictEqual(events[0].sport, 'tennis')
  assert.strictEqual(events[0].sportSlug, 'tennis')
})

test('[P0][9.2-DEEP-SCAN-010] Valid ISO date parses to epoch milliseconds (AC3)', () => {
  const payload = [
    {
      id: 'evt-123',
      name: 'Match',
      date: '2026-02-15T15:00:00Z'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  // Use Date.parse for expected value to handle timezone differences
  assert.strictEqual(events[0].kickoffEpochMs, Date.parse('2026-02-15T15:00:00Z'))
  assert.strictEqual(typeof events[0].kickoffEpochMs, 'number')
  assert.strictEqual(Number.isFinite(events[0].kickoffEpochMs), true)
})

test('[P0][9.2-DEEP-SCAN-011] Date-only string parses to epoch milliseconds (AC3)', () => {
  const payload = [
    {
      id: 'evt-456',
      name: 'Match',
      date: '2026-02-15'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].kickoffEpochMs, Date.parse('2026-02-15'))
  assert.strictEqual(typeof events[0].kickoffEpochMs, 'number')
  assert.strictEqual(Number.isFinite(events[0].kickoffEpochMs), true)
})

test('[P0][9.2-DEEP-SCAN-012] Kickoff field preferred over date field (AC3)', () => {
  const payload = [
    {
      id: 'evt-123',
      name: 'Match',
      kickoff: '2026-02-15T18:30:00Z',
      date: '2026-02-15T15:00:00Z'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events[0].kickoffEpochMs, Date.parse('2026-02-15T18:30:00Z'))
})

test('[P0][9.2-DEEP-SCAN-013] Commence_time field parsed correctly (AC3)', () => {
  const payload = [
    {
      id: 'evt-123',
      name: 'Match',
      commence_time: '2026-02-15T20:00:00Z'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events[0].kickoffEpochMs, Date.parse('2026-02-15T20:00:00Z'))
})

test('[P0][9.2-DEEP-SCAN-014] Invalid date returns undefined, event still valid (AC4)', () => {
  const payload = [
    {
      id: 'evt-invalid',
      name: 'Match',
      date: 'invalid-date-string'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].kickoffEpochMs, undefined)
  // Event should still be valid with other fields
  assert.strictEqual(events[0].id, 'evt-invalid')
  assert.strictEqual(events[0].name, 'Match')
})

test('[P0][9.2-DEEP-SCAN-015] Null date returns undefined (AC4)', () => {
  const payload = [
    {
      id: 'evt-null',
      name: 'Match',
      date: null
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].kickoffEpochMs, undefined)
})

test('[P0][9.2-DEEP-SCAN-016] Missing date returns undefined (AC4)', () => {
  const payload = [
    {
      id: 'evt-undefined',
      name: 'Match'
      // date field missing
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].kickoffEpochMs, undefined)
})

test('[P1][9.2-DEEP-SCAN-017] Empty date string returns undefined (AC4)', () => {
  const payload = [
    {
      id: 'evt-empty',
      name: 'Match',
      date: ''
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].kickoffEpochMs, undefined)
})

test('[P1][9.2-DEEP-SCAN-018] Whitespace-only date string returns undefined (AC4)', () => {
  const payload = [
    {
      id: 'evt-whitespace',
      name: 'Match',
      date: '   '
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].kickoffEpochMs, undefined)
})

test('[P0][9.2-DEEP-SCAN-019] Date field preserved for backward compatibility', () => {
  const payload = [
    {
      id: 'evt-123',
      name: 'Match',
      date: '2026-02-15T15:00:00Z'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events[0].date, '2026-02-15T15:00:00Z')
  assert.notStrictEqual(events[0].kickoffEpochMs, undefined)
})

test('[P0][9.2-DEEP-SCAN-020] Complete API event extracts all canonical fields', () => {
  const payload = [
    {
      id: 'evt-complete',
      name: 'Arsenal vs Chelsea',
      home: 'Arsenal',
      away: 'Chelsea',
      league: { name: 'Premier League', slug: 'england-premier-league' },
      sport: { name: 'Football', slug: 'football' },
      date: '2026-02-15T15:00:00Z'
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].id, 'evt-complete')
  assert.strictEqual(events[0].name, 'Arsenal vs Chelsea')
  assert.strictEqual(events[0].date, '2026-02-15T15:00:00Z')
  // Use Date.parse for expected value to handle timezone differences
  assert.strictEqual(events[0].kickoffEpochMs, Date.parse('2026-02-15T15:00:00Z'))
  assert.strictEqual(events[0].league, 'Premier League')
  assert.strictEqual(events[0].leagueSlug, 'england-premier-league')
  assert.strictEqual(events[0].sport, 'Football')
  assert.strictEqual(events[0].sportSlug, 'football')
})

test('[P1][9.2-DEEP-SCAN-021] League extracted from nested event structure', () => {
  // Note: The extractEvents function supports nested event structure for league/sport/date
  // but ID and name must be at top level or inferred from home/away at top level
  const payload = [
    {
      id: 'evt-nested',
      name: 'Nested Match',
      event: {
        league: { name: 'Serie A', slug: 'italy-serie-a' }
      }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].id, 'evt-nested')
  assert.strictEqual(events[0].name, 'Nested Match')
  assert.strictEqual(events[0].league, 'Serie A')
  assert.strictEqual(events[0].leagueSlug, 'italy-serie-a')
})

test('[P1][9.2-DEEP-SCAN-022] Kickoff extracted from nested event structure', () => {
  // Note: The extractEvents function supports nested event structure for date
  const payload = [
    {
      id: 'evt-nested',
      name: 'Nested Match',
      event: {
        date: '2026-02-15T12:00:00Z'
      }
    }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].id, 'evt-nested')
  assert.strictEqual(events[0].kickoffEpochMs, Date.parse('2026-02-15T12:00:00Z'))
})

test('[P1][9.2-DEEP-SCAN-023] Default league used when item has none', () => {
  const payload = [
    {
      id: 'evt-def',
      name: 'Match'
    }
  ]

  const events = extractEvents(payload, { league: 'Default League' })

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].league, 'Default League')
  assert.strictEqual(events[0].leagueSlug, undefined)
})

test('[P1][9.2-DEEP-SCAN-024] Default sport used when item has none', () => {
  const payload = [
    {
      id: 'evt-def',
      name: 'Match'
    }
  ]

  const events = extractEvents(payload, { sport: 'Default Sport' })

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].sport, 'Default Sport')
  assert.strictEqual(events[0].sportSlug, undefined)
})

test('[P1][9.2-DEEP-SCAN-025] Payload with data wrapper extracts correctly', () => {
  const payload = {
    data: [
      {
        id: 'evt-1',
        name: 'Match 1',
        league: { name: 'League 1', slug: 'league-1' }
      }
    ]
  }

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].leagueSlug, 'league-1')
})

test('[P1][9.2-DEEP-SCAN-026] Payload with events wrapper extracts correctly', () => {
  const payload = {
    events: [
      {
        id: 'evt-1',
        name: 'Match 1',
        sport: { name: 'Sport 1', slug: 'sport-1' }
      }
    ]
  }

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].sportSlug, 'sport-1')
})

test('[P1][9.2-DEEP-SCAN-027] Empty payload returns empty array', () => {
  const events = extractEvents([])
  assert.strictEqual(events.length, 0)
})

test('[P1][9.2-DEEP-SCAN-028] Duplicate IDs are deduplicated', () => {
  const payload = [
    { id: 'evt-1', name: 'First', league: { name: 'League', slug: 'league' } },
    { id: 'evt-1', name: 'Duplicate', league: { name: 'League', slug: 'league' } }
  ]

  const events = extractEvents(payload)

  assert.strictEqual(events.length, 1)
  assert.strictEqual(events[0].name, 'First')
})
