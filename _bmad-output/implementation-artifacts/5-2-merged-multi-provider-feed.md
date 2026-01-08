# Story 5.2: Merged Multi-Provider Feed

- **Status**: done

## Story

As a User,
I want a single, unified feed of arbitrage opportunities from all enabled providers,
so that I can see the best available surebets without thinking about underlying APIs.

## Acceptance Criteria

1. **Unified polling tick** – Poller can fetch opportunities from all enabled providers in a single tick using the centralized rate limiter (each provider respects its own Bottleneck instance).

2. **Merged deduplication** – Results from multiple providers are merged into a single `ArbitrageOpportunity[]` list with duplicate IDs deduplicated. When the same opportunity (matching event, market, and outcome) appears from both providers, only one is kept (prefer higher ROI or first-seen).

3. **Provider metadata preservation** – Provider metadata for each opportunity is preserved so the UI can display the originating provider(s) when needed. The existing `providerId?: ProviderId` field (from Story 5.1) is used, with a `mergedFrom?: ProviderId[]` extension for cross-provider deduplicated entries.

4. **Existing invariants pass** – Existing invariants (`roi >= 0`, distinct bookmakers, Zod schema validation) still pass for the merged feed. All opportunities flowing to the renderer satisfy the `arbitrageOpportunityListSchema`.

## Tasks / Subtasks

- [x] **Task 1: Extend calculator for deduplication logic** (AC: #2, #4)
  - [x] 1.1 Create `deduplicateOpportunities(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[]` in `calculator.ts`
  - [x] 1.2 Implement deduplication key derivation: `eventName + eventDate + league + market + outcomeSet` (sorted)
  - [x] 1.3 When duplicates found, keep highest-ROI opportunity; if ROI equals, keep first-seen
  - [x] 1.4 Set `mergedFrom: ProviderId[]` on deduplicated entries to track source providers
  - [x] 1.5 Run Zod validation post-deduplication to ensure invariant compliance
  - [x] 1.6 Add unit tests for all edge cases: no duplicates, exact duplicates, ROI tie, empty input

- [x] **Task 2: Extend shared types for merged opportunities** (AC: #3)
  - [x] 2.1 Add `mergedFrom?: ProviderId[]` optional field to `ArbitrageOpportunity` interface in `shared/types.ts`
  - [x] 2.2 Update `arbitrageOpportunitySchema` in `shared/schemas.ts` to include optional `mergedFrom` array
  - [x] 2.3 Document field semantics: `providerId` = original source OR first source after merge; `mergedFrom` = all providers that returned this opportunity

- [x] **Task 3: Integrate deduplication into router feed procedures** (AC: #1, #2, #4)
  - [x] 3.1 Import `deduplicateOpportunities` in `router.ts`
  - [x] 3.2 Update `getFeedSnapshot` to call `deduplicateOpportunities()` after concatenating provider results
  - [x] 3.3 Update `pollAndGetFeedSnapshot` to call `deduplicateOpportunities()` after concatenating provider results
  - [x] 3.4 Verify schema validation passes after deduplication (opportunities returned to renderer)
  - [x] 3.5 Log deduplication stats in heartbeat: `totalOpportunities`, `uniqueOpportunities`, `duplicatesRemoved`

- [x] **Task 4: Update UI to handle merged opportunities** (AC: #3)
  - [x] 4.1 Update `FeedTable.tsx` to show multi-provider badge when `mergedFrom` has >1 provider
  - [x] 4.2 Update `SignalPreview.tsx` to display all source providers when `mergedFrom` is present
  - [x] 4.3 Style merged-source badges distinctively (e.g., combined chip "Merged: Odds-API.io + The-Odds-API.com")
  - [x] 4.4 Ensure keyboard navigation and copy workflow work correctly with merged feed

- [x] **Task 5: Add comprehensive tests** (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `tests/5-2-merged-multi-provider-feed.test.cjs` with test cases for:
    - Deduplication logic: key generation, ROI comparison, first-seen tiebreaker
    - Schema validation: ensure merged opportunities pass Zod validation
    - UI rendering: merged badges display correctly
    - End-to-end: multi-provider polling → deduplication → UI display
  - [x] 5.2 Add golden fixture with overlapping opportunities from both providers
  - [x] 5.3 Ensure existing Story 5.1 tests still pass (no regressions)

### Review Follow-ups (AI)

- [x] [AI-Review][MED-002] Add deduplication logging to getFeedSnapshot for observability parity
- [x] [AI-Review][MED-003] Use explicit stable sort in selectBestOpportunity to guarantee first-seen on ROI tie
- [x] [AI-Review][LOW-001] Add comprehensive JSDoc to getDeduplicationKey function
- [x] [AI-Review][LOW-002] Use human-friendly displayName in merged badge aria-label
- [x] [AI-Review][LOW] Consider adding a preference toggle for "prefer higher ROI" vs "prefer production provider" as deduplication strategy (deferred to future enhancement)
- [x] [AI-Review][LOW] Document deduplication key algorithm in architecture for future maintainers (added inline JSDoc)

## Dev Notes

### Architecture Compliance

- The merged feed extension follows the existing architecture patterns:
  - **Calculator:** Pure function `deduplicateOpportunities()` follows the same pattern as `calculateArbitrageFromSnapshots()` — takes array, returns validated array
  - **Types:** Extends `ArbitrageOpportunity` with optional `mergedFrom` field, backward compatible
  - **Router:** Deduplication happens server-side (main process) before data reaches renderer
  - **Validation:** All merged results pass through `arbitrageOpportunityListSchema.parse()` before return

### Key Files to Modify

| Category   | File                                      | Changes                                                         |
| ---------- | ----------------------------------------- | --------------------------------------------------------------- |
| Types      | `shared/types.ts`                         | Add `mergedFrom?: ProviderId[]` to `ArbitrageOpportunity`       |
| Schemas    | `shared/schemas.ts`                       | Update `arbitrageOpportunitySchema` with optional `mergedFrom`  |
| Calculator | `src/main/services/calculator.ts`         | Add `deduplicateOpportunities()` function                       |
| Router     | `src/main/services/router.ts`             | Integrate deduplication in `getFeedSnapshot`, `pollAndGetFeedSnapshot` |
| Dashboard  | `src/renderer/src/features/dashboard/FeedTable.tsx`    | Handle `mergedFrom` badges                          |
| Dashboard  | `src/renderer/src/features/dashboard/SignalPreview.tsx` | Display merged provider sources                    |
| Tests      | `tests/5-2-merged-multi-provider-feed.test.cjs`         | Comprehensive deduplication and merge tests        |

### Deduplication Algorithm

```typescript
// Deduplication key derivation (Task 1.2)
function getDeduplicationKey(opp: ArbitrageOpportunity): string {
  // Sort outcomes to ensure consistent key regardless of legs order
  const sortedOutcomes = opp.legs
    .map(leg => `${leg.outcome}:${leg.market}`)
    .sort()
    .join('|')
  
  return `${opp.event.name}|${opp.event.date}|${opp.event.league}|${sortedOutcomes}`
}

// Merge strategy: prefer highest ROI
function selectBestOpportunity(opps: ArbitrageOpportunity[]): ArbitrageOpportunity {
  if (opps.length === 1) return opps[0]
  
  // Sort by ROI descending; if equal, original order (first-seen wins)
  const sorted = [...opps].sort((a, b) => b.roi - a.roi)
  const best = sorted[0]
  
  // Track all source providers
  const allProviders = opps
    .map(o => o.providerId)
    .filter((id): id is ProviderId => !!id)
  
  return {
    ...best,
    mergedFrom: [...new Set(allProviders)]
  }
}
```

### Existing Functions to Leverage

From `calculator.ts` (Story 2.6):
- `mergeProviderOpportunities()` – Currently just flattens and deduplicates by ID; we extend this to use semantic deduplication
- `calculateTwoLegArbitrageRoi()` – Already validates ROI >= 0 invariant

From `poller.ts` (Story 5.1):
- `pollOnceForEnabledProviders()` – Already polls all enabled providers in parallel with per-provider rate limiters
- Opportunities already tagged with `providerId` in Story 5.1

### Learnings from Story 5.1 to Apply

1. **E5-AI-01 (Multi-provider boundaries):** Deduplication happens in main process after all providers return, before Zod validation. This keeps renderer logic simple.
2. **E5-AI-02 (Provider tagging):** `providerId` field already exists on opportunities; extend with `mergedFrom` for merge tracking.
3. **E4-AI-02 (Real function tests):** Import actual implementation from compiled output, not mock duplicates.

### Edge Cases to Handle

1. **Empty feed from one provider** – Merge should still work if one provider returns []
2. **All duplicates** – All opportunities match across providers; result should have half the count
3. **No duplicates** – Providers return completely disjoint opportunities; simple concatenation
4. **ROI tie** – Both providers show exact same opportunity with identical ROI; first-seen wins
5. **Partial overlap** – Some duplicates, some unique; correct merge and dedup

### Risk: Arbitrage Correctness (R-002)

The deduplication must NOT:
- Create false positives (fabricate non-existent opportunities)
- Drop valid unique opportunities
- Corrupt ROI or bookmaker data

All deduplication is key-based selection, never modification of opportunity data (except adding `mergedFrom`).

### Testing Strategy

| Test Type    | Coverage                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| Unit         | `deduplicateOpportunities()` pure function with golden fixtures          |
| Integration  | Router procedures return deduplicated feed                               |
| E2E          | UI displays merged badges correctly                                      |
| Regression   | Existing 5.1 multi-provider tests pass                                   |

### References

- [Source: _bmad-output/architecture.md#Data Architecture]
- [Source: _bmad-output/architecture.md#High-Risk Domain Patterns – Arbitrage Correctness (R-002)]
- [Source: _bmad-output/architecture.md#Implementation Patterns – Lifecycle Patterns]
- [Source: _bmad-output/epics.md#Story 5.2 – Merged Multi-Provider Feed]
- [Source: _bmad-output/implementation-artifacts/5-1-multi-provider-configuration-settings.md]

## Dev Agent Record

### Agent Model Used

Claude 3.5 Sonnet (Anthropic)

### Debug Log References

### Completion Notes List

- ✅ Implemented `deduplicateOpportunities()` pure function in calculator.ts with semantic key matching
- ✅ Added `mergedFrom?: ProviderId[]` field to ArbitrageOpportunity interface and Zod schema
- ✅ Integrated deduplication into router's `getFeedSnapshot` and `pollAndGetFeedSnapshot` procedures
- ✅ Added deduplication stats logging (totalOpportunities, uniqueOpportunities, duplicatesRemoved)
- ✅ Updated FeedTable.tsx with merged provider badge (purple ⚡ styling) when `mergedFrom.length > 1`
- ✅ Updated SignalPreview.tsx to display "Merged from: X + Y" when multiple providers
- ✅ Created comprehensive test suite (17 tests) covering all edge cases and golden fixtures
- ✅ All Story 5.2 tests pass (17/17)
- ✅ All Story 5.1 tests pass (21/21) - no regressions
- ✅ All Story 2.6 golden dataset tests pass (4/4) - no regressions
- ✅ TypeScript type checking passes
- ✅ Updated legacy tests in 2.1 to use multi-provider API

### Code Review Fixes (2026-01-08)
- ✅ MED-002: Added deduplication logging to getFeedSnapshot (parity with pollAndGetFeedSnapshot)
- ✅ MED-003: Implemented explicit stable sort with index fallback in selectBestOpportunity
- ✅ LOW-001: Added comprehensive JSDoc with @param, @returns, and @example to getDeduplicationKey
- ✅ LOW-002: Added getProviderDisplayName helper for human-friendly aria-label in merged badges
- ✅ LOW-004: Extracted PROVIDER_REQUEST_TIMEOUT_MS to module-level constant in poller.ts (5.1 scope)

### File List

- shared/types.ts
- shared/schemas.ts
- src/main/services/calculator.ts
- src/main/services/router.ts
- src/renderer/src/features/dashboard/FeedTable.tsx
- src/renderer/src/features/dashboard/SignalPreview.tsx
- tests/5-2-merged-multi-provider-feed.test.cjs
- tests/2.1-adapter-pattern-shared-types.test.cjs (updated for multi-provider API)

