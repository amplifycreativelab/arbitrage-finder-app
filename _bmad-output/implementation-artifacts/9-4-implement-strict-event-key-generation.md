# Story 9.4: Implement Strict Event Key Generation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want collision-resistant event keys using slugs and minute precision,
so that cup vs league matches with the same teams do not produce false joins.

## Acceptance Criteria

1. [x] New strict key format: `sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin`
2. [x] Minute precision: `kickoffMin = floor(kickoffEpochMs / 60000)`
3. [x] **Strict mode requirement:** If `sportSlug` or `leagueSlug` is missing → return `null` (event not joinable across providers)
4. [x] No `'unknown'` placeholders are used in strict key generation
5. [x] Cup vs league matches with same teams/time produce different keys
6. [x] Normalized team names (lowercase, trimmed) for consistent matching

## Tasks / Subtasks

- [x] Task 1: Implement `generateStrictEventKey()` function (AC: 1, 2, 3, 4)
  - [x] Extract and validate sportSlug and leagueSlug from DeepScanEvent
  - [x] Normalize team names using existing `normalizeTeamName()` function
  - [x] Sort team names alphabetically for deterministic ordering
  - [x] Convert kickoffEpochMs to minute precision
  - [x] Return null in strict mode when required fields are missing
- [x] Task 2: Integrate with existing event matching (AC: 5, 6)
  - [x] Add strict key generation to event matching flow
  - [x] Ensure backward compatibility with existing key generation
  - [x] Create `matchDeepScanEventsByStrictKey()` for DeepScanEvent strict matching
- [x] Task 3: Add comprehensive unit tests
  - [x] Two different `leagueSlug` values produce different keys
  - [x] Same match with kickoff time within the same minute produces same key
  - [x] Previously colliding fixtures no longer collide
  - [x] Missing sportSlug/leagueSlug in strict mode returns null

## Dev Notes

### Background

The current event key format `teamA|teamB|hour` causes collisions when:
- Same teams play in different competitions on the same day
- Matches are rescheduled within the same hour
- Multi-competition fixtures overlap

This leads to **false arbitrage opportunities** that could result in financial losses.

### Architecture Context

**Target File:** `src/main/services/eventMatcher.ts`

**Key Types (from `shared/types.ts` and `src/main/services/deepScan.ts`):**
```typescript
// DeepScanEvent now includes canonical identity fields (Story 9.2)
interface DeepScanEvent {
  id: string
  name: string
  date?: string                    // ISO format - kept for backward compatibility
  kickoffEpochMs?: number          // Canonical numeric timestamp (milliseconds since epoch)
  league?: string                  // Display name (e.g., "Premier League")
  leagueSlug?: string              // Canonical slug (e.g., "england-premier-league")
  sport?: string                   // Display name (e.g., "Football")
  sportSlug?: string               // Canonical slug (e.g., "football")
}

// ArbitrageOpportunity.event structure
interface ArbitrageOpportunity {
  event: {
    name: string
    date: string
    league: string
  }
  // ... other fields
}
```

**Existing Functions to Leverage:**
- `normalizeTeamName(name: string): string` - Already handles lowercase, trim, accent removal, prefix/suffix stripping
- `extractTeamsFromEventName(eventName: string): [string, string] | null` - Parses "Team A vs Team B" format
- `generateEventKey(event): string | null` - Current implementation (to be supplemented, not replaced)

### Implementation Requirements

**Strict Mode Configuration:**
```typescript
const STRICT_MODE = true // Hardcoded for P0 correctness; can be made configurable later
```

**Key Format Specification:**
```
Format: sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin
Example: football|england-premier-league|arsenal|chelsea|28456789
```

**Team Normalization (reuse existing):**
- Use `normalizeTeamName()` from current file - it handles:
  - Lowercase + trim
  - Accent/diacritic removal (NFD normalization)
  - Common prefix removal (FC, AC, SC)
  - Common suffix removal (FC, SC, United, etc.)
  - Space collapsing

**Deterministic Ordering:**
- Sort normalized team names alphabetically before placing in key
- This ensures "Arsenal vs Chelsea" and "Chelsea vs Arsenal" produce the same key

**Kickoff Minute Calculation:**
```typescript
const kickoffMin = event.kickoffEpochMs 
  ? Math.floor(event.kickoffEpochMs / 60000)
  : undefined
```

**Strict Mode Validation:**
```typescript
if (STRICT_MODE) {
  if (!event.sportSlug || !event.leagueSlug || !event.kickoffEpochMs) {
    return null // Event not joinable across providers
  }
}
```

### Cross-Story Dependencies

**Stories 9.2 and 9.3 must be complete before this story:**
- `DeepScanEvent` must have `sportSlug`, `leagueSlug`, `kickoffEpochMs` populated
- `extractLeagueInfo()` and `extractSportInfo()` functions must be available in deepScan.ts

**Integration Points:**
- `matchDeepScanEventsByStrictKey()` in eventMatcher.ts groups DeepScanEvents by strict keys
- `matchEventsByKey()` continues to use legacy keys for ArbitrageOpportunity (different type)

### Testing Requirements

**Unit Tests (in `tests/` folder):**

1. **Collision Prevention Test:**
   ```typescript
   // Same teams, same time, different leagues = different keys
   const premierLeagueMatch = { sportSlug: 'football', leagueSlug: 'england-premier-league', name: 'Arsenal vs Chelsea', kickoffEpochMs: 1705312800000 }
   const faCupMatch = { sportSlug: 'football', leagueSlug: 'england-fa-cup', name: 'Arsenal vs Chelsea', kickoffEpochMs: 1705312800000 }
   expect(generateStrictEventKey(premierLeagueMatch)).not.toBe(generateStrictEventKey(faCupMatch))
   ```

2. **Minute Precision Test:**
   ```typescript
   // Same minute = same key
   const time1 = 1705312800000 // 10:00:00
   const time2 = 1705312859000 // 10:00:59
   expect(generateStrictEventKey({...event, kickoffEpochMs: time1}))
     .toBe(generateStrictEventKey({...event, kickoffEpochMs: time2}))
   ```

3. **Strict Mode Null Return:**
   ```typescript
   // Missing required fields = null
   expect(generateStrictEventKey({ name: 'Arsenal vs Chelsea' })).toBeNull()
   expect(generateStrictEventKey({ sportSlug: 'football', name: 'Arsenal vs Chelsea' })).toBeNull()
   ```

4. **Team Normalization Test:**
   ```typescript
   // Different naming conventions = same key
   const event1 = { name: 'Arsenal FC vs Chelsea FC', ... }
   const event2 = { name: 'arsenal vs chelsea', ... }
   expect(generateStrictEventKey(event1)).toBe(generateStrictEventKey(event2))
   ```

### Performance Considerations

- Key generation is on the hot path for event matching
- Keep normalization efficient (existing function already optimized)
- Use string concatenation with template literals (fastest in V8)
- Consider memoization if same events are keyed repeatedly

### Error Handling

- Invalid/missing team names: Return `null` (event not matchable)
- Invalid kickoff time: Return `null` in strict mode
- Missing slugs: Return `null` in strict mode (event will be excluded from cross-provider matching)

### Project Structure Notes

- **Source:** `src/main/services/eventMatcher.ts`
- **Tests:** `tests/eventMatcher.test.ts` (create if doesn't exist)
- **Shared Types:** `shared/types.ts` (for ArbitrageOpportunity, MarketQuote)
- **DeepScan Types:** `src/main/services/deepScan.ts` (for DeepScanEvent)

### References

- [Source: `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md#Story 9.4`]
- [Source: `src/main/services/eventMatcher.ts` - existing `generateEventKey()` function]
- [Source: `src/main/services/deepScan.ts` - `DeepScanEvent` interface]
- [Source: `shared/types.ts` - `ArbitrageOpportunity` interface]
- FR7 (Normalize responses)
- Story 9.2 (Add Canonical Fields to Event Model)
- Story 9.3 (Fix Event Extraction Priority)
- Risk: R-002 (Arbitrage Correctness)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- All 22 story-specific tests pass (9.4-strict-event-key-generation.test.cjs)
- All 65 Epic 9 tests pass (9.1, 9.2, 9.3, 9.4)
- All 45 cross-provider aggregator tests pass (5-4-cross-provider-aggregator.test.cjs)
- Full test suite: 818 pass, 24 pre-existing failures (UI component tests unrelated to this story)

### Completion Notes List

- Implemented `generateStrictEventKey()` function with strict mode validation
- Key format: `sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin`
- Returns `null` when sportSlug, leagueSlug, or kickoffEpochMs is missing (AC3)
- Uses minute precision for kickoff time: `Math.floor(kickoffEpochMs / 60000)` (AC2)
- Normalizes and alphabetically sorts team names for deterministic keys (AC6)
- Added `matchDeepScanEventsByStrictKey()` for grouping DeepScanEvents by strict key
- Maintained backward compatibility with existing `generateEventKey()` and `matchEventsByKey()`
- 22 comprehensive unit tests covering all acceptance criteria and edge cases

### File List

- `src/main/services/eventMatcher.ts` - Added `generateStrictEventKey()`, `matchDeepScanEventsByStrictKey()`, and `DeepScanEventLike` interface
- `tests/9.4-strict-event-key-generation.test.cjs` - 22 unit tests for strict key generation

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.5 (Adversarial Code Review)
**Date:** 2026-02-02

### Findings Summary

| Severity | Count | Status |
|----------|-------|--------|
| HIGH | 2 | Fixed |
| MEDIUM | 2 | Fixed/Noted |
| LOW | 2 | Noted |

### Issues Found & Resolved

**H1. Task 2 subtask wording incorrect** → FIXED
- Original: "Update `matchEventsByKey()` to use strict keys when available"
- Corrected: "Create `matchDeepScanEventsByStrictKey()` for DeepScanEvent strict matching"
- Rationale: `ArbitrageOpportunity.event` lacks canonical fields; separate function is correct architecture

**H2. Duplicate type definition** → FIXED
- Replaced local `DeepScanEventLike` interface with import from `./deepScan`
- Now uses canonical `DeepScanEvent` type

**M1. Backward compatibility** → VERIFIED
- All 45 cross-provider aggregator tests pass
- All 22 story-specific tests pass

**M2/L1/L2. Untracked files** → NOTED
- Story file, test file, sprint-status need git staging (user action)

### Validation

- ✅ All 22 story-specific tests pass
- ✅ All 45 backward-compatibility tests pass
- ✅ TypeScript compilation succeeds
- ✅ All ACs verified in code

### Verdict: APPROVED

## Change Log

- 2026-02-02: Story 9.4 implementation complete - Added strict event key generation with collision-resistant format
- 2026-02-02: Code review fixes applied - Fixed duplicate type, corrected task wording, verified tests
