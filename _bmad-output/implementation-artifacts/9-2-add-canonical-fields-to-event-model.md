# Story 9.2: Add Canonical Fields to Event Model

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Developer**,
I want events to store canonical identity fields (slugs, epoch timestamps),
so that cross-provider matching is reliable and collision-resistant.

## Background

The current `extractEvents()` function in `src/main/services/deepScan.ts` prefers `league.name` over `league.slug`. This causes deduplication and cross-provider matching to be unreliable, as display names vary (e.g., "EPL" vs "Premier League"). Additionally, the current event key uses hour-truncated dates which causes collisions for cup vs league matches with the same teams.

**Critical Issue:** The current `DeepScanEvent` interface lacks canonical identity fields:
- `league` field stores display names which vary across providers
- `sport` field may contain display names instead of slugs  
- `date` is ISO string format, requiring repeated parsing for comparisons
- No separate fields for slugs vs display names

**Impact:** This causes **false arbitrage opportunities** in Story 9.4 when events from different leagues collide due to weak identity keys.

## Acceptance Criteria

- [x] **AC1:** Extend `DeepScanEvent` type with canonical identity fields:
  - `leagueSlug?: string` - canonical league identifier
  - `league?: string` - display name (human-readable)  
  - `sportSlug?: string` - canonical sport identifier
  - `sport?: string` - display name (human-readable)
  - `kickoffEpochMs?: number` - canonical numeric timestamp (milliseconds)
- [x] **AC2:** All discovered events have `sportSlug` and `leagueSlug` when the API returns them
- [x] **AC3:** `kickoffEpochMs` is populated for valid kickoff timestamps
- [x] **AC4:** Invalid dates result in `undefined` `kickoffEpochMs` but event remains processable

## Tasks / Subtasks

- [x] **Task 1:** Extend `DeepScanEvent` interface in `src/main/services/deepScan.ts` (AC: #1)
  - [x] Add `leagueSlug?: string` field
  - [x] Add `sportSlug?: string` field
  - [x] Add `kickoffEpochMs?: number` field
  - [x] Ensure existing `league`, `sport`, `date` fields remain for backward compatibility
  - [x] Update JSDoc comments explaining canonical vs display fields

- [x] **Task 2:** Implement `extractCanonicalFields()` helper function (AC: #2, #3, #4)
  - [x] Extract `league.slug` → `leagueSlug`, `league.name` → `league`
  - [x] Extract `sport.slug` → `sportSlug`, `sport.name` → `sport`
  - [x] Parse `kickoff` or `date` or `commence_time` → `kickoffEpochMs` via `Date.parse()`
  - [x] Handle invalid dates gracefully (return `undefined`, don't throw)
  - [x] Handle string-only league/sport (no slug available) - store as display only

- [x] **Task 3:** Update `extractEvents()` function to populate canonical fields (AC: #2, #3, #4)
  - [x] Integrate `extractCanonicalFields()` into the extraction pipeline
  - [x] Ensure `homeTeam`/`awayTeam` extraction preserves for Story 9.4 key generation
  - [x] Maintain backward compatibility - existing consumers continue working

- [x] **Task 4:** Sync type definitions to `shared/types.ts` if needed (AC: #1)
  - [x] Check if `DeepScanEvent` is exported from `shared/types.ts`
  - [x] If exported there, ensure both definitions match exactly
  - [x] Prefer single source of truth (deepScan.ts exports for now) - VERIFIED: Only defined in deepScan.ts

- [x] **Task 5:** Add unit tests (AC: #2, #3, #4)
  - [x] Test: Parse `league` object with `{name, slug}` → both stored; slug is canonical
  - [x] Test: Parse `sport` object with `{name, slug}` → both stored; slug is canonical
  - [x] Test: String-only `league` or `sport` → stored as display, slug undefined
  - [x] Test: Valid ISO date → `kickoffEpochMs` is correct millisecond timestamp
  - [x] Test: Invalid date string → `kickoffEpochMs` is `undefined`, event still valid
  - [x] Test: Null/undefined date → `kickoffEpochMs` is `undefined`

## Dev Notes

### Architecture Context

**Primary File to Modify:** `src/main/services/deepScan.ts`

This service is the **core event discovery and extraction engine** for the Deep Scan feature. The `DeepScanEvent` interface is defined here and used throughout the application.

**Related Files:**
- `shared/types.ts` - May contain duplicate `DeepScanEvent` export (verify and sync)
- `src/main/services/eventMatcher.ts` - Will consume these fields in Story 9.4
- `src/main/services/aggressiveScan.ts` - Uses `DeepScanEvent` for tiered events

**Critical Architecture Patterns:**
- **Type Safety:** All changes must be TypeScript-compliant with no `any` types
- **Backward Compatibility:** Existing fields (`league`, `sport`, `date`) must remain unchanged
- **Null Safety:** All new fields are optional (`?`) to handle API variations gracefully
- **Date Parsing:** Use `Date.parse()` which returns `NaN` for invalid dates - check with `Number.isFinite()`

### Current `DeepScanEvent` Interface

```typescript
// src/main/services/deepScan.ts lines 73-79
export interface DeepScanEvent {
  id: string
  name: string
  date?: string       // ISO format - keep for backward compatibility
  league?: string     // Currently stores name OR slug (inconsistent!)
  sport?: string      // Currently stores name OR slug (inconsistent!)
}
```

### Target `DeepScanEvent` Interface

```typescript
export interface DeepScanEvent {
  id: string
  name: string
  date?: string           // ISO format - keep for backward compatibility
  kickoffEpochMs?: number // NEW: Canonical numeric timestamp
  
  // League fields
  league?: string         // Display name (e.g., "Premier League")
  leagueSlug?: string     // NEW: Canonical slug (e.g., "england-premier-league")
  
  // Sport fields  
  sport?: string          // Display name (e.g., "Football")
  sportSlug?: string      // NEW: Canonical slug (e.g., "football")
  
  // Future use (Story 9.4)
  homeTeam?: string       // For key generation
  awayTeam?: string       // For key generation
}
```

### Implementation Details

**1. Extraction Logic for League/Sport Objects**

The API returns league and sport as either:
- String: `"Premier League"` 
- Object: `{ name: "Premier League", slug: "england-premier-league" }`

Current code (lines 936-953) prefers `name` over `slug`. This is **wrong** - we need both:

```typescript
// Current (WRONG - loses slug):
const rawLeague = typeof leagueCandidate === 'object' 
  ? ((leagueCandidate as { name?: unknown; slug?: unknown }).name ??
     (leagueCandidate as { slug?: unknown }).slug)
  : leagueCandidate

// New (CORRECT - preserves both):
function extractLeagueInfo(leagueData: string | { name: string; slug: string } | undefined): 
  { slug?: string; name?: string } {
  if (!leagueData) return {}
  
  if (typeof leagueData === 'string') {
    return { name: leagueData } // No slug unless mapped
  }
  
  return {
    slug: leagueData.slug,  // Canonical identity
    name: leagueData.name   // Display value
  }
}
```

**2. Date Parsing Strategy**

```typescript
function parseKickoffTimestamp(dateString: string | undefined): number | undefined {
  if (!dateString || typeof dateString !== 'string') {
    return undefined
  }
  
  const parsed = Date.parse(dateString)
  
  // Date.parse returns NaN for invalid dates
  if (!Number.isFinite(parsed)) {
    return undefined
  }
  
  return parsed
}
```

**3. Updated `extractEvents()` Integration**

The `extractEvents()` function (lines 885-959) needs modification:

```typescript
function extractEvents(
  payload: unknown,
  defaults: { league?: string; sport?: string } = {}
): DeepScanEvent[] {
  // ... existing candidate extraction ...
  
  for (const item of candidates) {
    // ... existing id, name extraction ...
    
    // NEW: Extract canonical fields
    const leagueInfo = extractLeagueInfo(
      (item as { league?: unknown }).league ?? 
      (item as { event?: { league?: unknown } }).event?.league ??
      defaults.league
    )
    
    const sportInfo = extractSportInfo(
      (item as { sport?: unknown }).sport ?? defaults.sport
    )
    
    const kickoffEpochMs = parseKickoffTimestamp(
      (item as { kickoff?: unknown }).kickoff ??
      (item as { date?: unknown }).date ??
      (item as { commence_time?: unknown }).commence_time ??
      (item as { event?: { date?: unknown } }).event?.date
    )
    
    // ... existing home/away extraction for Story 9.4 ...
    
    seen.add(id)
    events.push({
      id,
      name,
      date,  // Keep for backward compatibility
      kickoffEpochMs,  // NEW
      league: leagueInfo.name,
      leagueSlug: leagueInfo.slug,  // NEW
      sport: sportInfo.name,
      sportSlug: sportInfo.slug,    // NEW
      // homeTeam, awayTeam - for Story 9.4
    })
  }
  
  return events
}
```

### API Response Shape Reference

Based on existing code and AGENTS.md, the Odds-API.io event object has this shape:

```typescript
interface ApiEvent {
  id: string
  name?: string
  home?: string | { name: string; id?: string }
  away?: string | { name: string; id?: string }
  home_team?: string
  away_team?: string
  
  // Date fields (various formats)
  date?: string           // ISO 8601
  commence_time?: string  // ISO 8601
  kickoff?: string        // ISO 8601
  
  // League - string or object
  league?: string | { name: string; slug: string }
  
  // Sport - string or object  
  sport?: string | { name: string; slug: string }
}
```

### Testing Requirements

**Unit Test Location:** Co-located as `src/main/services/deepScan.test.ts` (create if doesn't exist)

**Test Data Examples:**

```typescript
// Test Case 1: Object with name + slug
const apiEvent1 = {
  id: 'evt-123',
  name: 'Arsenal vs Chelsea',
  league: { name: 'Premier League', slug: 'england-premier-league' },
  sport: { name: 'Football', slug: 'football' },
  date: '2026-02-15T15:00:00Z'
}
// Expected: league='Premier League', leagueSlug='england-premier-league'
//           sport='Football', sportSlug='football'
//           kickoffEpochMs=1739631600000

// Test Case 2: String-only league/sport
const apiEvent2 = {
  id: 'evt-456',
  name: 'Team A vs Team B',
  league: 'Some League',
  sport: 'Soccer',
  date: '2026-02-15'
}
// Expected: league='Some League', leagueSlug=undefined
//           sport='Soccer', sportSlug=undefined
//           kickoffEpochMs=1739577600000

// Test Case 3: Invalid date
const apiEvent3 = {
  id: 'evt-789',
  name: 'Match',
  date: 'invalid-date'
}
// Expected: kickoffEpochMs=undefined, event still valid
```

### Backward Compatibility

**Critical:** All existing code must continue working without changes:

1. **`date` field:** Keep populated with ISO string (existing behavior)
2. **`league` field:** Keep populated with display name (may change from old behavior which stored slug)
3. **`sport` field:** Keep populated with display name

**Migration Path:**
- Story 9.2: Add new fields, populate alongside existing
- Story 9.3: Switch extraction priority (slug-first)
- Story 9.4: Use canonical fields for key generation

### Project Structure Notes

**Target File Structure:**
```
src/main/services/
├── deepScan.ts              # MODIFY: Add fields to interface + extraction logic
├── deepScan.test.ts         # CREATE/EXTEND: Unit tests for extraction
├── aggressiveScan.ts        # Uses DeepScanEvent (no changes needed - just imports)
└── eventMatcher.ts          # Story 9.4 - will use new fields
```

**Type Export Strategy:**
- `DeepScanEvent` is currently exported from `deepScan.ts`
- If also exported from `shared/types.ts`, must keep in sync
- Prefer `deepScan.ts` as single source of truth for this service

### Risk Mitigation

**Risk:** Breaking existing consumers of `DeepScanEvent`
- **Mitigation:** All new fields are optional (`?`)
- **Mitigation:** Existing required fields remain unchanged
- **Mitigation:** Run full TypeScript check after changes

**Risk:** Date parsing fails on unexpected formats
- **Mitigation:** Defensive parsing with `Number.isFinite()` check
- **Mitigation:** Return `undefined` rather than throw or return `NaN`
- **Mitigation:** Log warnings for invalid dates during development

**Risk:** API returns unexpected league/sport shapes
- **Mitigation:** Handle both string and object types
- **Mitigation:** Type guards for object detection
- **Mitigation:** Graceful fallback to string value

### Performance Considerations

- `Date.parse()` is fast for ISO strings (native optimization)
- No additional memory overhead (just 3 new optional fields)
- No breaking changes to event pipeline throughput

### References

- **Epic 9:** `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md` (Story 9.2 section)
- **Story 9.1:** `_bmad-output/implementation-artifacts/9-1-fix-arbitrage-endpoint-host.md` (pattern reference)
- **Story 9.3:** Will build on this story (slug-first priority)
- **Story 9.4:** Will use these fields for strict key generation
- **FR7:** Normalize responses (`_bmad-output/prd.md`)
- **Current Implementation:** `src/main/services/deepScan.ts` lines 73-79, 885-959

### Related Stories

| Story | Relationship | Notes |
|-------|--------------|-------|
| 9.1 | Independent | Completed - host fallback logic |
| 9.3 | Depends on this | Changes extraction priority (slug-first) |
| 9.4 | Depends on this | Uses canonical fields for strict key generation |
| 9.5 | Independent | Batching logic, separate concerns |

---

## Dev Agent Record

### Agent Model Used

Claude Code CLI (Sonnet)

### Debug Log References

N/A - Clean implementation, no debug issues encountered.

### Completion Notes List

- **Task 1 (Interface Extension)**: Extended `DeepScanEvent` interface with 3 new optional fields:
  - `leagueSlug?: string` - canonical league identifier
  - `sportSlug?: string` - canonical sport identifier  
  - `kickoffEpochMs?: number` - epoch timestamp in milliseconds
  - Added comprehensive JSDoc comments explaining canonical vs display fields
  - Maintained backward compatibility with existing `league`, `sport`, `date` fields

- **Task 2 (Helper Functions)**: Implemented 3 helper functions:
  - `extractLeagueInfo()` - extracts both slug (canonical) and name (display) from league data
  - `extractSportInfo()` - extracts both slug (canonical) and name (display) from sport data
  - `parseKickoffTimestamp()` - parses date strings to epoch ms, returns undefined for invalid dates

- **Task 3 (extractEvents Update)**: Modified extraction pipeline to:
  - Call helper functions for league, sport, and date extraction
  - Populate all new canonical fields alongside existing fields
  - Handle nested event structures (event.league, event.date)
  - Support multiple date field names (kickoff, date, commence_time)

- **Task 4 (Type Sync)**: Verified `DeepScanEvent` is only defined in `deepScan.ts` (single source of truth)

- **Task 5 (Tests)**: Created comprehensive test suite with 28 test cases:
  - 10 P0 (critical) tests covering AC2, AC3, AC4
  - 18 P1 tests covering edge cases and backward compatibility
  - All tests pass ✅

### File List

- `src/main/services/deepScan.ts` - MODIFIED: Extended DeepScanEvent interface, added helper functions, updated extractEvents()
- `tests/9.2-canonical-fields-extraction.test.cjs` - CREATED: 28 unit tests for canonical field extraction

### Change Log

- **2026-02-02**: Story 9.2 implementation complete
  - Added canonical identity fields (leagueSlug, sportSlug, kickoffEpochMs) to DeepScanEvent
  - Implemented extraction helpers with proper error handling
  - Created comprehensive test coverage (28 tests, all passing)
  - Updated sprint status: in-progress → review
