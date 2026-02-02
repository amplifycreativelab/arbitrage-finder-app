# Story 9.5: Wire Aggressive Scan to /v3/odds/multi Batching

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want aggressive scan to use batch odds fetching,
so that scanning is 10x more efficient within API rate limits.

## Acceptance Criteria

1. [x] Aggressive scan uses `/v3/odds/multi` endpoint (AC: 1)
2. [x] Batch size limited to **10** events per request (API maximum) (AC: 2)
3. [x] `bookmakers` list is cached with TTL (>= 1 minute, recommend 5-10 minutes) (AC: 3)
4. [x] Events passed to fetcher are real `DeepScanEvent` objects, not placeholders (AC: 4)
5. [x] Aggressive scan produces odds requests and updates caches/arbs for tiered events (AC: 5)
6. [x] Requests are batched at 10 events wherever possible (AC: 6)

## Tasks / Subtasks

- [x] Task 1: Implement batch odds fetching in aggressiveScan.ts (AC: 1, 2, 4, 6)
  - [x] Create `fetchOddsForEvents()` function using `/v3/odds/multi` endpoint
  - [x] Batch events into groups of 10 (BATCH_SIZE_MAX)
  - [x] Pass real `DeepScanEvent` objects (not `{name: id}` placeholders)
  - [x] Integrate with existing `pollTier()` polling loop
- [x] Task 2: Implement bookmaker caching with TTL (AC: 3)
  - [x] Create bookmaker cache with 5-minute TTL (matching pattern in odds-api-io.ts)
  - [x] Cache structure: `{ fetchedAtMs: number; bookmakers: string[] }`
  - [x] Reuse existing `getSelectedBookmakers()` from `odds-api-io-bookmakers.ts`
- [x] Task 3: Integrate odds fetching with cache updates (AC: 5)
  - [x] Call `updateOddsCache()` after fetching odds
  - [x] Compute arbitrage opportunities from fetched odds
  - [x] Update `lastPolledAt` and `pollCount` for tiered events
  - [x] Call `boostEvent()` when arbs are detected
- [x] Task 4: Integration tests (AC: 6)
  - [x] Test: 23 events → exactly 3 multi calls (10/10/3)
  - [x] Test: Arbs are computed and surfaced from aggressive scan results

## Dev Notes

### Background

The aggressive scan tiering exists but odds fetching was previously a placeholder (see line 1224 in `aggressiveScan.ts`: "// Note: Actual odds fetching would happen here"). This story wires the aggressive scan to use `/v3/odds/multi` with proper batching.

### Architecture Context

**⚠️ CRITICAL DISTINCTION: Two Different Caches**

```
┌─────────────────────────────────────────────────────────────────────┐
│  BOOKMAKER LIST CACHE (5 min TTL)                                   │
│  ├── Cached: ["bet365", "pinnacle", "williamhill"]                  │
│  ├── Purpose: Avoid re-fetching user's selected bookmakers          │
│  └── Refresh: Every 5 minutes or when empty                         │
├─────────────────────────────────────────────────────────────────────┤
│  ODDS DATA (NO CACHE - Fresh Fetch Every Poll)                      │
│  ├── Fetched fresh from /v3/odds/multi on EVERY poll cycle          │
│  ├── Purpose: Get latest odds for arbitrage detection               │
│  └── No caching - real-time data is critical                        │
├─────────────────────────────────────────────────────────────────────┤
│  ODDS HISTORY CACHE (for volatility tracking)                       │
│  ├── Cached: Previous odds snapshots per event                      │
│  ├── Purpose: Track odds changes, detect volatility                 │
│  └── Managed by: updateOddsCache() function                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Target File:** `src/main/services/aggressiveScan.ts`

**Key Constants (already defined):**
```typescript
const BATCH_SIZE_MAX = 10  // Line 41 - API limit for /v3/odds/multi
```

**Existing Data Structures:**
```typescript
// From shared/types.ts - RawOddsPayload structure
interface RawOddsPayload {
  eventId: string
  bookmakers: BookmakerOdds[]
}

// TieredEvent structure (already in aggressiveScan.ts)
interface TieredEvent {
  id: string
  name: string
  date?: string
  league?: string
  sport?: string
  tier: EventTier
  minutesToKickoff: number
  lastPolledAt: string | null
  pollCount: number
  volatilityScore: number
  isBoosted: boolean
  boostExpiresAt: string | null
}
```

**Bookmaker Caching Pattern (from odds-api-io.ts lines 151-152, 357-365):**
```typescript
const SELECTED_BOOKMAKERS_TTL_MS = 5 * 60 * 1000 // 5 minutes
let cachedSelectedBookmakers: { fetchedAtMs: number; bookmakers: string[] } | null = null

// Usage pattern:
let selectedBookmakers = cachedSelectedBookmakers?.bookmakers ?? []
const cacheAgeMs = cachedSelectedBookmakers
  ? Date.now() - cachedSelectedBookmakers.fetchedAtMs
  : Infinity

if (!selectedBookmakers.length || cacheAgeMs > SELECTED_BOOKMAKERS_TTL_MS) {
  selectedBookmakers = await getSelectedBookmakers(apiKey)
  cachedSelectedBookmakers = { fetchedAtMs: Date.now(), bookmakers: selectedBookmakers }
}
```

**Existing Batch Odds Fetcher Pattern (from deepScan.ts lines 1522-1591):**
```typescript
const defaultBatchOddsFetcher: BatchOddsFetcher = async ({ events, apiKey, bookmakers, signal, correlationId }) => {
  // Clamp to API maximum of 10 events per batch
  const batchEvents = events.slice(0, BATCH_SIZE_MAX)
  const eventIds = batchEvents.map((e) => e.id).join(',')

  const url = new URL(ODDS_API_IO_ODDS_MULTI_PATH, ODDS_API_IO_BASE_URL)
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('eventIds', eventIds)
  url.searchParams.set('bookmakers', bookmakers.slice(0, 30).join(','))

  const response = await trackedRequest(...)
  const body = await response.json()
  const results = parseBatchOddsResponse(body, batchEvents)
  return { results }
}
```

**Integration Point - pollTier() function (lines 1141-1237):**
The polling loop already batches events (lines 1197-1201). You need to:
1. Replace the placeholder comment at line 1224 with actual odds fetching
2. Use the existing `batches` array structure
3. Call `updateOddsCache()` for each batch result
4. Compute arbitrage opportunities from the odds data

### Implementation Requirements

**Function to implement:**
```typescript
async function fetchOddsForEvents(
  events: DeepScanEvent[],
  apiKey: string,
  signal: AbortSignal
): Promise<RawOddsPayload[]> {
  // 1. Get cached bookmakers (with TTL check)
  // 2. Batch events into groups of 10
  // 3. Call /v3/odds/multi for each batch
  // 4. Return aggregated results
}
```

**Bookmaker List Cache (aggressiveScan.ts):**
```typescript
// Add near other constants (around line 41)
const BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes - ONLY for bookmaker LIST

// Add near other state variables (around line 48-70)
let cachedBookmakers: { fetchedAtMs: number; bookmakers: string[] } | null = null

/**
 * Get cached bookmaker LIST (names only, not odds).
 * This caches the user's selected bookmakers to avoid repeated settings lookups.
 * ODDS THEMSELVES ARE ALWAYS FRESH - fetched from /v3/odds/multi every poll.
 */
async function getCachedBookmakers(apiKey: string): Promise<string[]> {
  let bookmakers = cachedBookmakers?.bookmakers ?? []
  const cacheAgeMs = cachedBookmakers ? Date.now() - cachedBookmakers.fetchedAtMs : Infinity

  if (!bookmakers.length || cacheAgeMs > BOOKMAKER_CACHE_TTL_MS) {
    bookmakers = await getSelectedBookmakers(apiKey)  // Fetches bookmaker NAMES only
    cachedBookmakers = { fetchedAtMs: Date.now(), bookmakers }
  }

  return bookmakers
}
```

**Integration in pollTier():**
Replace lines 1206-1228 with:
```typescript
for (const batch of batches) {
  if (!isRunning || abortController?.signal.aborted) {
    break
  }

  // Get DeepScanEvent objects for this batch
  const deepScanEvents = batch.map(tieredEvent => /* convert to DeepScanEvent */)

  // Fetch FRESH odds using batch endpoint (NO CACHE - odds change constantly)
  // Bookmaker list may be cached (5min), but odds are always fresh
  const oddsResults = await fetchOddsForEvents(
    deepScanEvents,
    apiKey,
    abortController.signal
  )

  // Process results and update caches
  for (const odds of oddsResults) {
    // Compute arbs from odds
    const arbsFound = computeArbitrageOpportunities(odds)
    totalArbsFound += arbsFound

    // Update odds cache
    updateOddsCache(odds.eventId, odds, arbsFound)

    // Boost events with arbs
    if (arbsFound > 0) {
      boostEvent(odds.eventId, 'arb_detected')
    }
  }

  // Record request usage
  recordRequest(1)
  if (quotaBudget) {
    quotaBudget.perTier[tier].usedThisHour++
  }

  // Update event poll metadata
  const now = new Date().toISOString()
  for (const event of batch) {
    event.lastPolledAt = now
    event.pollCount++
  }

  lastPollAt = now
}
```

**API Configuration:**
```typescript
// Add constants
const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io'
const ODDS_API_IO_ODDS_MULTI_PATH = '/v3/odds/multi'
```

### Cross-Story Dependencies

**Previous stories that must be complete:**
- Story 9.1: Fix Arbitrage Endpoint Host - Uses same adapter file
- Story 9.2: Add Canonical Fields to Event Model - DeepScanEvent structure
- Story 9.4: Implement Strict Event Key Generation - Event matching (currently in review)

**Integration Points:**
- Uses `getSelectedBookmakers()` from `odds-api-io-bookmakers.ts`
- Uses `updateOddsCache()` already defined in aggressiveScan.ts (lines 705-758)
- Uses `boostEvent()` already defined in aggressiveScan.ts (lines 590-641)
- Uses `recordRequest()` already defined in aggressiveScan.ts (lines 533-539)

### Testing Requirements

**Integration Tests:**
```typescript
// Test: Batch construction with 23 events → exactly 3 multi calls
test('23 events should result in 3 batch calls (10/10/3)', async () => {
  const events = generateMockEvents(23)
  const fetchSpy = vi.spyOn(global, 'fetch')
  
  await fetchOddsForEvents(events, 'test-api-key', new AbortController().signal)
  
  expect(fetchSpy).toHaveBeenCalledTimes(3)
  // Verify each call has max 10 eventIds
})
```

**Functional Tests:**
```typescript
// Test: Arbs are computed and surfaced from aggressive scan results
test('aggressive scan should compute arbs from fetched odds', async () => {
  // Mock odds response with arbitrage opportunity
  const mockOdds = createMockOddsWithArbitrage()
  
  // Run pollTier
  const result = await pollTier('imminent')
  
  expect(result.arbsFound).toBeGreaterThan(0)
  expect(oddsCache.get(eventId)?.hasActiveArbs).toBe(true)
})
```

### Project Structure Notes

- **Source:** `src/main/services/aggressiveScan.ts`
- **Bookmaker Service:** `src/main/services/odds-api-io-bookmakers.ts`
- **Types:** `shared/types.ts` (RawOddsPayload, TieredEvent, etc.)
- **Tests:** `tests/9.5-aggressive-scan-multi-batching.test.cjs`

### FAQ

**Q: Will odds be stale if bookmaker list is cached for 5 minutes?**

**A: NO.** The 5-minute cache is **only for the bookmaker names** (e.g., `["bet365", "pinnacle"]`). The actual **odds values** are fetched **fresh every poll cycle** from `/v3/odds/multi`. 

Example flow:
1. Poll cycle starts (every 30-600 seconds depending on tier)
2. Get bookmaker list (from cache if <5min old, else refresh) ← This is just the list of names
3. Call `/v3/odds/multi?eventIds=...&bookmakers=bet365,pinnacle` ← **FRESH odds fetched here**
4. Process fresh odds, update caches, compute arbs
5. Wait for next poll cycle

The bookmaker list only changes when the user changes settings, so caching it is safe. Odds change constantly, so they are never cached.

---

### References

- [Source: `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md#Story 9.5`]
- [Source: `src/main/services/aggressiveScan.ts` - pollTier() function, lines 1141-1237]
- [Source: `src/main/services/aggressiveScan.ts` - updateOddsCache(), lines 705-758]
- [Source: `src/main/services/deepScan.ts` - defaultBatchOddsFetcher, lines 1522-1591]
- [Source: `src/main/adapters/odds-api-io.ts` - Bookmaker caching pattern, lines 151-152, 357-365]
- [Source: `src/main/services/odds-api-io-bookmakers.ts` - getSelectedBookmakers()]
- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)
- P0 Issue: Aggressive scan partially wired

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Implementation completed without debug issues

### Completion Notes List

1. **Task 1 - Batch Odds Fetching**: Implemented `fetchOddsForEvents()` function in `aggressiveScan.ts` that:
   - Uses `/v3/odds/multi` endpoint for batch odds fetching
   - Batches events into groups of 10 (BATCH_SIZE_MAX constant)
   - Handles API response parsing with `parseBatchOddsResponse()` helper
   - Includes abort signal support for cancellation

2. **Task 2 - Bookmaker Caching**: Implemented `getCachedBookmakers()` function with:
   - 5-minute TTL (`BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000`)
   - Cache structure: `{ fetchedAtMs: number; bookmakers: string[] }`
   - Reuses `getSelectedBookmakers()` from `odds-api-io-bookmakers.ts`
   - Only caches bookmaker names (not odds data)

3. **Task 3 - Cache/Arb Integration**: Updated `pollTier()` function to:
   - Convert `TieredEvent` to `DeepScanEvent` for API calls
   - Call `fetchOddsForEvents()` for each batch
   - Compute arbs using `computeArbitrageFromOdds()` (uses `calculateTwoLegArbitrageRoi`)
   - Call `updateOddsCache()` after fetching odds
   - Call `boostEvent()` when arbs detected
   - Update `lastPolledAt` and `pollCount` for tiered events
   - Track arb counts in `arbsFoundThisHour` and `arbsFoundTotal`

4. **Task 4 - Tests**: Created comprehensive test suite `tests/9.5-aggressive-scan-multi-batching.test.cjs` with 19 passing tests covering:
   - AC1 & AC6: Batch construction and `/v3/odds/multi` endpoint usage
   - AC2: Batch size limits (never exceeds 10 events)
   - AC3: Bookmaker cache TTL behavior
   - AC4: Real DeepScanEvent objects (not placeholders)
   - AC5: Arb computation and cache updates
   - Integration flow with 23 events → 3 batches (10/10/3)
   - Integration tests with mocked fetch for URL structure, abort signal, and error handling

### Code Review Fixes (2026-02-02)

1. **Added batch delay** - 100ms delay between batch requests to avoid rate limiting (`BATCH_DELAY_MS`)
2. **Added bookmaker truncation warning** - Logs warning when configured bookmakers exceed API max of 30
3. **Added integration tests** - 3 new tests with mocked fetch covering URL structure, abort handling, and HTTP errors
4. **Removed dead code** - Cleaned up unused `mockOddsResponse` variable in tests

### Senior Developer Review (AI) - 2026-02-02

**Reviewer:** Amelia (Dev Agent)  
**Issues Found:** 0 High, 6 Medium, 3 Low → **Fixed: 4**

**Fixes Applied:**
1. ✅ Removed `export` from `fetchOddsForEvents()` - function is internal only
2. ✅ Fixed `DeepScanEvent` conversion to include slug fields (`leagueSlug`, `sportSlug`, `kickoffEpochMs`) from Story 9.2
3. ✅ Fixed arb counting - removed duplicate increment inside batch loop (was adding per-batch totals multiple times)

**Deferred (non-blocking):**
- Retry-After handling for 429 (covered by Story 9.7)
- Failed request quota tracking (can be enhanced later)
- Tests use mocks (functional tests sufficient for this story)
- BATCH_DELAY_MS configurability
- Bookmaker cache MAX_BOOKMAKERS enforcement
- Odds validation (covered by Story 9.9)

**Outcome:** Approve with fixes applied

### File List

- `src/main/services/aggressiveScan.ts` - Modified: Added batch odds fetching, bookmaker caching, arb computation, batch delay, truncation warning
- `tests/9.5-aggressive-scan-multi-batching.test.cjs` - New: Test suite for Story 9.5 (19 tests)

## Change Log

- 2026-02-02: Story 9.5 created - Wire aggressive scan to /v3/odds/multi batching
- 2026-02-02: Story 9.5 implemented - All tasks complete, 16 tests passing
- 2026-02-02: Code review completed - Fixed 4 issues, added 3 integration tests, 19 tests passing
