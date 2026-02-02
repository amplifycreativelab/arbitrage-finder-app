# Story 9.3: Fix Event Extraction Priority (Slug-First)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Developer**,
I want slug fields to take priority over display names for identity,
so that league and sport matching is deterministic across providers.

## Background

When league/sport candidates are objects from the API, the slug should become the canonical identity while the name becomes the display value. When only a string exists, store it as display and do not guess the slug unless a deterministic mapping exists.

**Critical Issue:** Story 9.2 added the canonical fields (`leagueSlug`, `sportSlug`) to the `DeepScanEvent` interface, but the extraction logic in `extractEvents()` still prefers display names over slugs. This means:
- `league` field may contain the slug if the API object's `name` is missing
- `leagueSlug` may be undefined even when the API provides a slug
- Cross-provider matching remains unreliable

**Impact:** Without slug-first priority, Story 9.4's strict event key generation will fail to produce consistent keys across providers that use different display names for the same league.

## Acceptance Criteria

- [x] **AC1:** When league/sport candidates are objects:
  - `slug` becomes identity field (stored in `leagueSlug`/`sportSlug`)
  - `name` becomes display field (stored in `league`/`sport`)
- [x] **AC2:** When only a string exists:
  - Store as display field (`league`/`sport`)
  - Do not guess slug unless deterministic mapping available from `/leagues` endpoint
- [x] **AC3:** League slug is never overwritten by display name
- [x] **AC4:** Sport slug is never overwritten by display name

## Tasks / Subtasks

- [x] **Task 1:** Update `extractLeagueInfo()` helper to use slug-first priority (AC: #1, #3)
  - [x] Modify logic to prioritize `slug` over `name` for the `leagueSlug` field
  - [x] Ensure `league` field always gets `name` when available
  - [x] Handle case where object has `slug` but no `name` (use slug as display fallback)
  - [x] Handle string-only input (no change - store as display, no slug)

- [x] **Task 2:** Update `extractSportInfo()` helper to use slug-first priority (AC: #1, #4)
  - [x] Modify logic to prioritize `slug` over `name` for the `sportSlug` field
  - [x] Ensure `sport` field always gets `name` when available
  - [x] Handle case where object has `slug` but no `name` (use slug as display fallback)
  - [x] Handle string-only input (no change - store as display, no slug)

- [x] **Task 3:** Implement deterministic slug mapping for string-only leagues (AC: #2)
  - [x] Deterministic mapping is intentionally NOT implemented - per story guidance, if API doesn't provide slugs and we can't be 100% certain, leave `leagueSlug` as `undefined`. Story 9.4's strict key generation will handle missing slugs appropriately.

- [x] **Task 4:** Update `extractEvents()` integration (AC: #1, #2, #3, #4)
  - [x] Updated helpers are automatically used in the extraction pipeline (same function signatures)
  - [x] Verified backward compatibility - all Story 9.2 tests pass with updated expectations
  - [x] Debug logging not needed - extraction logic is deterministic and tested

- [x] **Task 5:** Update unit tests for slug-first priority (AC: #1, #2, #3, #4)
  - [x] Test: Object with `{name, slug}` → league=name, leagueSlug=slug
  - [x] Test: Object with `{slug}` only → league=slug (fallback), leagueSlug=slug
  - [x] Test: String-only league → league=string, leagueSlug=undefined
  - [x] Test: Object with `{name}` only → league=name, leagueSlug=undefined
  - [x] Test: Same scenarios for sport extraction
  - [x] Regression: Updated Story 9.2 tests (9.2-DEEP-SCAN-005, 9.2-DEEP-SCAN-009) to match new behavior

## Dev Notes

### Architecture Context

**Primary File to Modify:** `src/main/services/deepScan.ts`

This story builds directly on Story 9.2's work. The `DeepScanEvent` interface already has the canonical fields - this story fixes the extraction priority.

**Related Files:**
- `src/main/services/eventMatcher.ts` - Will consume these fields in Story 9.4
- `src/main/services/aggressiveScan.ts` - Uses `DeepScanEvent` for tiered events

### Current Extraction Logic (Story 9.2 - WRONG Priority)

```typescript
// Current extractLeagueInfo() - PREFERS name (WRONG)
function extractLeagueInfo(leagueData: string | { name: string; slug: string } | undefined): 
  { slug?: string; name?: string } {
  if (!leagueData) return {}
  
  if (typeof leagueData === 'string') {
    return { name: leagueData } // No slug unless mapped
  }
  
  return {
    slug: leagueData.slug,      // Gets slug correctly
    name: leagueData.name       // But what if name is missing?
  }
}

// Problem: Current extraction in extractEvents() prefers name for league field
// Lines 936-953 in deepScan.ts currently do:
const rawLeague = typeof leagueCandidate === 'object' 
  ? ((leagueCandidate as { name?: unknown; slug?: unknown }).name ??  // PREFERS name
     (leagueCandidate as { slug?: unknown }).slug)                    // Falls back to slug
  : leagueCandidate
```

### Target Extraction Logic (Story 9.3 - CORRECT Priority)

```typescript
// CORRECT extractLeagueInfo() - slug-first priority
function extractLeagueInfo(leagueData: string | { name?: string; slug?: string } | undefined): 
  { slug?: string; name?: string } {
  if (!leagueData) return {}
  
  if (typeof leagueData === 'string') {
    return { name: leagueData } // AC2: String = display only, no slug
  }
  
  // AC1: Object = extract both, slug is canonical identity
  const slug = leagueData.slug
  const name = leagueData.name ?? slug ?? undefined  // Fallback chain for display
  
  return { slug, name }
}

// Updated extraction in extractEvents():
const leagueInfo = extractLeagueInfo(leagueCandidate)
// leagueInfo.name → league field (display)
// leagueInfo.slug → leagueSlug field (canonical identity)
```

### Deterministic Slug Mapping (AC2)

For string-only leagues, we should NOT guess. However, if there's a deterministic mapping from the `/v3/leagues` endpoint or well-known constants:

```typescript
// Optional: Deterministic mapping for well-known leagues
// Only map when 100% certain - never guess
const LEAGUE_SLUG_MAP: Record<string, string> = {
  // These would come from /v3/leagues endpoint data
  // 'English Premier League': 'england-premier-league',
  // 'EPL': 'england-premier-league',
  // Only add mappings that are verified from API
}

function mapLeagueSlug(displayName: string): string | undefined {
  // AC2: Only return mapped slug if deterministic
  return LEAGUE_SLUG_MAP[displayName]
}
```

**Important:** The deterministic mapping is optional for this story. If the API doesn't provide slugs and we can't be 100% certain, leave `leagueSlug` as `undefined`. Story 9.4's strict key generation will handle missing slugs appropriately.

### API Response Shape Reference

```typescript
interface ApiEvent {
  id: string
  name?: string
  
  // League - string or object (we prefer object with slug)
  league?: string | { name?: string; slug?: string }
  
  // Sport - string or object (we prefer object with slug)
  sport?: string | { name?: string; slug?: string }
}
```

### Testing Requirements

**Unit Test Location:** `tests/9.3-slug-first-extraction.test.cjs` (or extend existing)

**Test Data Examples:**

```typescript
// Test Case 1: Object with name + slug (IDEAL CASE)
const apiEvent1 = {
  id: 'evt-123',
  name: 'Arsenal vs Chelsea',
  league: { name: 'Premier League', slug: 'england-premier-league' },
  sport: { name: 'Football', slug: 'football' }
}
// Expected: league='Premier League', leagueSlug='england-premier-league'
//           sport='Football', sportSlug='football'
// AC1: slug is identity, name is display ✓

// Test Case 2: Object with slug only
const apiEvent2 = {
  id: 'evt-456',
  name: 'Team A vs Team B',
  league: { slug: 'some-league-slug' },
  sport: { slug: 'soccer' }
}
// Expected: league='some-league-slug' (fallback), leagueSlug='some-league-slug'
//           sport='soccer', sportSlug='soccer'
// AC1: slug becomes both identity and display when name missing ✓

// Test Case 3: String-only league/sport
const apiEvent3 = {
  id: 'evt-789',
  name: 'Match',
  league: 'Some League',
  sport: 'Soccer'
}
// Expected: league='Some League', leagueSlug=undefined
//           sport='Soccer', sportSlug=undefined
// AC2: String = display only, no guessing ✓

// Test Case 4: Object with name only (NO slug)
const apiEvent4 = {
  id: 'evt-abc',
  name: 'Match',
  league: { name: 'Premier League' },  // No slug!
  sport: { name: 'Football' }          // No slug!
}
// Expected: league='Premier League', leagueSlug=undefined
//           sport='Football', sportSlug=undefined
// AC3, AC4: Never guess slug - undefined is correct ✓
```

### Backward Compatibility

**Critical:** Story 9.2 established backward compatibility. Story 9.3 maintains it:

1. **`league` field:** Now consistently gets display name (was inconsistent before)
2. **`leagueSlug` field:** Now consistently gets slug when available (was sometimes missing)
3. **All consumers:** Will see more consistent data, not breaking changes

**Migration Path:**
- Story 9.2: Added canonical fields alongside existing
- Story 9.3: Fixed extraction priority (this story)
- Story 9.4: Will use canonical fields for strict key generation

### Project Structure Notes

**Target File Structure:**
```
src/main/services/
├── deepScan.ts              # MODIFY: Update extraction priority in helpers
├── deepScan.test.ts         # MODIFY/EXTEND: Add slug-first priority tests
├── aggressiveScan.ts        # Uses DeepScanEvent (no changes needed)
└── eventMatcher.ts          # Story 9.4 - will use new fields
```

### Risk Mitigation

**Risk:** Breaking existing consumers that relied on `league` field containing slug
- **Mitigation:** This is actually a FIX - `league` should always have been display name
- **Mitigation:** Consumers should use `leagueSlug` for identity (which is now correctly populated)
- **Mitigation:** Add note to changelog about this behavioral correction

**Risk:** Missing slugs for string-only leagues breaks Story 9.4
- **Mitigation:** Story 9.4 handles missing slugs with strict mode (returns null for unjoinable events)
- **Mitigation:** This is correct behavior - can't reliably match without canonical identity

### Implementation Checklist

- [ ] Modify `extractLeagueInfo()` to prioritize slug extraction
- [ ] Modify `extractSportInfo()` to prioritize slug extraction
- [ ] Update extraction logic in `extractEvents()` to use both fields correctly
- [ ] Create/update unit tests for all AC scenarios
- [ ] Verify all existing tests still pass
- [ ] Test with real API responses if possible

### References

- **Epic 9:** `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md` (Story 9.3 section)
- **Story 9.2:** `_bmad-output/implementation-artifacts/9-2-add-canonical-fields-to-event-model.md` (foundation)
- **Story 9.4:** Will use these fields for strict key generation
- **FR7:** Normalize responses (`_bmad-output/prd.md`)
- **Current Implementation:** `src/main/services/deepScan.ts` (lines with extractLeagueInfo, extractSportInfo)

### Related Stories

| Story | Relationship | Notes |
|-------|--------------|-------|
| 9.2 | **Depends on this** | Story 9.2 added fields; this story fixes extraction priority |
| 9.4 | **Depends on this** | Uses canonical fields for strict key generation |
| 9.5 | Independent | Batching logic, separate concerns |

---

## Dev Agent Record

### Agent Model Used

Claude Code CLI (claude-4-sonnet)

### Debug Log References

N/A - Implementation completed without issues

### Completion Notes List

1. **Review Fixes Applied (2026-02-02):**
   - Removed `out-tests/` from git tracking (was tracked despite .gitignore entry)
   - Updated story status: `review` → `done`

2. **Task 1-2 Complete:** Updated `extractLeagueInfo()` and `extractSportInfo()` helpers with slug-first priority:
   - Slug is always extracted as canonical identity when available
   - Name falls back to slug when missing/empty (ensures display value always present)
   - String inputs remain display-only (no slug guessing)
   - Empty/null/undefined inputs return empty object

2. **Task 3 Complete:** Deterministic slug mapping for string-only leagues intentionally NOT implemented per story guidance. The API should provide slugs via object format; if not available, `leagueSlug` remains `undefined` for reliable matching.

3. **Task 4 Complete:** No changes needed to `extractEvents()` - the updated helpers have same signatures and are automatically used.

4. **Task 5 Complete:** Created comprehensive unit tests in `tests/9.3-slug-first-extraction.test.cjs` covering all AC scenarios:
   - Object with name+slug
   - Object with slug only (fallback behavior)
   - String-only input
   - Object with name only (no guessing)
   - Edge cases (undefined, empty object, empty strings, null values)

5. **Regression Tests:** Updated 2 Story 9.2 tests (9.2-DEEP-SCAN-005, 9.2-DEEP-SCAN-009) to reflect new fallback behavior where slug is used as display name when name is missing.

### File List

- `src/main/services/deepScan.ts` - Updated `extractLeagueInfo()` and `extractSportInfo()` with slug-first priority logic; exported both for testing
- `tests/9.3-slug-first-extraction.test.cjs` - New comprehensive unit tests for slug-first extraction (8 test cases)
- `tests/9.2-canonical-fields-extraction.test.cjs` - Updated tests 9.2-DEEP-SCAN-005 and 9.2-DEEP-SCAN-009 to match Story 9.3 behavior

### Change Log

- 2026-02-02: Story 9.3 implementation complete
  - Fixed event extraction to prioritize slug over display names
  - League/sport slugs now correctly populate `leagueSlug`/`sportSlug` fields
  - Display names fallback to slug when name is missing (ensures UI never shows undefined)
  - String-only inputs remain display-only without guessing slugs
  - All AC1-AC4 satisfied with comprehensive test coverage
