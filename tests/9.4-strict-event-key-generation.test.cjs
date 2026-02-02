'use strict';

const test = require('node:test');
const assert = require('node:assert');

/**
 * Story 9.4: Strict Event Key Generation Tests
 *
 * Tests cover:
 * - New strict key format: sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin
 * - Minute precision: kickoffMin = floor(kickoffEpochMs / 60000)
 * - Strict mode: return null if sportSlug or leagueSlug is missing
 * - Cup vs league matches with same teams produce different keys
 * - Normalized team names for consistent matching
 */

// Import real functions from compiled output
const {
  normalizeTeamName,
  extractTeamsFromEventName,
  generateStrictEventKey
} = require('../out-tests/src/main/services/eventMatcher.js');

// =============================================================================
// AC 1: New strict key format: sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin
// =============================================================================

test('[P0][9.4-STRICT-001] generateStrictEventKey produces correct format with all fields', () => {
  const event = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000 // Some timestamp
  };

  const key = generateStrictEventKey(event);

  // Key format: sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin
  // Teams sorted alphabetically: arsenal, chelsea
  const expectedMin = Math.floor(1705312800000 / 60000);
  assert.strictEqual(key, `football|england-premier-league|arsenal|chelsea|${expectedMin}`);
});

test('[P0][9.4-STRICT-002] generateStrictEventKey sorts team names alphabetically', () => {
  const event1 = {
    id: '1',
    name: 'Chelsea vs Arsenal',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  const event2 = {
    id: '2',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  // Same key regardless of home/away order
  assert.strictEqual(generateStrictEventKey(event1), generateStrictEventKey(event2));
});

// =============================================================================
// AC 2: Minute precision: kickoffMin = floor(kickoffEpochMs / 60000)
// =============================================================================

test('[P0][9.4-STRICT-003] generateStrictEventKey uses minute precision - same minute produces same key', () => {
  const baseEvent = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league'
  };

  // Same minute: 10:00:00 and 10:00:59
  const event1 = { ...baseEvent, kickoffEpochMs: 1705312800000 }; // 10:00:00
  const event2 = { ...baseEvent, kickoffEpochMs: 1705312859000 }; // 10:00:59

  assert.strictEqual(generateStrictEventKey(event1), generateStrictEventKey(event2));
});

test('[P0][9.4-STRICT-004] generateStrictEventKey different minutes produce different keys', () => {
  const baseEvent = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league'
  };

  // Different minutes: 10:00:xx and 10:01:xx
  const event1 = { ...baseEvent, kickoffEpochMs: 1705312800000 }; // minute M
  const event2 = { ...baseEvent, kickoffEpochMs: 1705312860000 }; // minute M+1

  assert.notStrictEqual(generateStrictEventKey(event1), generateStrictEventKey(event2));
});

// =============================================================================
// AC 3: Strict mode - return null if sportSlug or leagueSlug is missing
// =============================================================================

test('[P0][9.4-STRICT-005] generateStrictEventKey returns null when sportSlug is missing', () => {
  const event = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  assert.strictEqual(generateStrictEventKey(event), null);
});

test('[P0][9.4-STRICT-006] generateStrictEventKey returns null when leagueSlug is missing', () => {
  const event = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    kickoffEpochMs: 1705312800000
  };

  assert.strictEqual(generateStrictEventKey(event), null);
});

test('[P0][9.4-STRICT-007] generateStrictEventKey returns null when kickoffEpochMs is missing', () => {
  const event = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league'
  };

  assert.strictEqual(generateStrictEventKey(event), null);
});

test('[P0][9.4-STRICT-008] generateStrictEventKey returns null when name cannot be parsed', () => {
  const event = {
    id: '1',
    name: 'Invalid Event Name Without Separator',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  assert.strictEqual(generateStrictEventKey(event), null);
});

// =============================================================================
// AC 4: No 'unknown' placeholders in strict key generation
// =============================================================================

test('[P0][9.4-STRICT-009] generateStrictEventKey does not use unknown placeholders', () => {
  // This is implicitly tested by AC 3 - returns null instead of using 'unknown'
  const event = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sport: 'Football', // Display name, not slug
    league: 'Premier League', // Display name, not slug
    kickoffEpochMs: 1705312800000
  };

  // Should return null because sportSlug and leagueSlug are missing
  assert.strictEqual(generateStrictEventKey(event), null);
});

// =============================================================================
// AC 5: Cup vs league matches with same teams/time produce different keys
// =============================================================================

test('[P0][9.4-STRICT-010] generateStrictEventKey differentiates cup vs league matches', () => {
  const premierLeagueMatch = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  const faCupMatch = {
    id: '2',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-fa-cup',
    kickoffEpochMs: 1705312800000
  };

  const premierKey = generateStrictEventKey(premierLeagueMatch);
  const cupKey = generateStrictEventKey(faCupMatch);

  assert.notStrictEqual(premierKey, cupKey);
  assert.ok(premierKey.includes('england-premier-league'));
  assert.ok(cupKey.includes('england-fa-cup'));
});

test('[P0][9.4-STRICT-011] generateStrictEventKey differentiates different sports', () => {
  const footballMatch = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  // Hypothetical: same team names in different sport
  const otherSportMatch = {
    id: '2',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'basketball',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  assert.notStrictEqual(
    generateStrictEventKey(footballMatch),
    generateStrictEventKey(otherSportMatch)
  );
});

// =============================================================================
// AC 6: Normalized team names for consistent matching
// =============================================================================

test('[P0][9.4-STRICT-012] generateStrictEventKey normalizes team names consistently', () => {
  const event1 = {
    id: '1',
    name: 'Arsenal FC vs Chelsea FC',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  const event2 = {
    id: '2',
    name: 'arsenal vs chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  assert.strictEqual(generateStrictEventKey(event1), generateStrictEventKey(event2));
});

test('[P0][9.4-STRICT-013] generateStrictEventKey handles accented team names', () => {
  const event1 = {
    id: '1',
    name: 'Atlético Madrid vs FC Barcelona',
    sportSlug: 'football',
    leagueSlug: 'spain-la-liga',
    kickoffEpochMs: 1705312800000
  };

  const event2 = {
    id: '2',
    name: 'Atletico Madrid vs Barcelona',
    sportSlug: 'football',
    leagueSlug: 'spain-la-liga',
    kickoffEpochMs: 1705312800000
  };

  assert.strictEqual(generateStrictEventKey(event1), generateStrictEventKey(event2));
});

// =============================================================================
// Edge cases and robustness
// =============================================================================

test('[P1][9.4-STRICT-014] generateStrictEventKey handles null event', () => {
  assert.strictEqual(generateStrictEventKey(null), null);
});

test('[P1][9.4-STRICT-015] generateStrictEventKey handles undefined event', () => {
  assert.strictEqual(generateStrictEventKey(undefined), null);
});

test('[P1][9.4-STRICT-016] generateStrictEventKey handles empty name', () => {
  const event = {
    id: '1',
    name: '',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  assert.strictEqual(generateStrictEventKey(event), null);
});

test('[P1][9.4-STRICT-017] generateStrictEventKey handles kickoffEpochMs of 0', () => {
  const event = {
    id: '1',
    name: 'Arsenal vs Chelsea',
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 0
  };

  // 0 is a valid timestamp (epoch start), should produce key with minute 0
  const key = generateStrictEventKey(event);
  assert.ok(key !== null);
  assert.ok(key.endsWith('|0'));
});

test('[P1][9.4-STRICT-018] generateStrictEventKey handles different separators in event name', () => {
  const baseEvent = {
    sportSlug: 'football',
    leagueSlug: 'england-premier-league',
    kickoffEpochMs: 1705312800000
  };

  const events = [
    { ...baseEvent, id: '1', name: 'Arsenal vs Chelsea' },
    { ...baseEvent, id: '2', name: 'Arsenal v Chelsea' },
    { ...baseEvent, id: '3', name: 'Arsenal - Chelsea' }
  ];

  const keys = events.map(e => generateStrictEventKey(e));

  // All should produce the same key
  assert.strictEqual(keys[0], keys[1]);
  assert.strictEqual(keys[1], keys[2]);
});

// =============================================================================
// Task 2: Integration with matchDeepScanEventsByStrictKey
// =============================================================================

const {
  matchDeepScanEventsByStrictKey
} = require('../out-tests/src/main/services/eventMatcher.js');

test('[P0][9.4-MATCH-001] matchDeepScanEventsByStrictKey groups events by strict key', () => {
  const events = [
    {
      id: '1',
      name: 'Arsenal vs Chelsea',
      sportSlug: 'football',
      leagueSlug: 'england-premier-league',
      kickoffEpochMs: 1705312800000
    },
    {
      id: '2',
      name: 'Chelsea vs Arsenal', // Same match, different order
      sportSlug: 'football',
      leagueSlug: 'england-premier-league',
      kickoffEpochMs: 1705312800000
    },
    {
      id: '3',
      name: 'Liverpool vs Manchester United',
      sportSlug: 'football',
      leagueSlug: 'england-premier-league',
      kickoffEpochMs: 1705312800000
    }
  ];

  const grouped = matchDeepScanEventsByStrictKey(events);

  // Should have 2 groups: Arsenal/Chelsea and Liverpool/Man Utd
  assert.strictEqual(grouped.size, 2);

  // Arsenal/Chelsea group should have 2 events
  const arsenalKey = generateStrictEventKey(events[0]);
  assert.ok(grouped.has(arsenalKey));
  assert.strictEqual(grouped.get(arsenalKey).length, 2);
});

test('[P0][9.4-MATCH-002] matchDeepScanEventsByStrictKey skips events without canonical fields', () => {
  const events = [
    {
      id: '1',
      name: 'Arsenal vs Chelsea',
      sportSlug: 'football',
      leagueSlug: 'england-premier-league',
      kickoffEpochMs: 1705312800000
    },
    {
      id: '2',
      name: 'Liverpool vs Man City',
      // Missing sportSlug, leagueSlug, kickoffEpochMs
      league: 'Premier League'
    }
  ];

  const grouped = matchDeepScanEventsByStrictKey(events);

  // Only 1 group - the event with canonical fields
  assert.strictEqual(grouped.size, 1);
});

test('[P0][9.4-MATCH-003] matchDeepScanEventsByStrictKey separates cup vs league matches', () => {
  const events = [
    {
      id: '1',
      name: 'Arsenal vs Chelsea',
      sportSlug: 'football',
      leagueSlug: 'england-premier-league',
      kickoffEpochMs: 1705312800000
    },
    {
      id: '2',
      name: 'Arsenal vs Chelsea',
      sportSlug: 'football',
      leagueSlug: 'england-fa-cup', // Different league
      kickoffEpochMs: 1705312800000
    }
  ];

  const grouped = matchDeepScanEventsByStrictKey(events);

  // Should have 2 separate groups - cup and league are different events
  assert.strictEqual(grouped.size, 2);
});

test('[P1][9.4-MATCH-004] matchDeepScanEventsByStrictKey handles empty array', () => {
  const grouped = matchDeepScanEventsByStrictKey([]);
  assert.strictEqual(grouped.size, 0);
});
