# Story 5.4: Cross-Provider Arbitrage Aggregator (Advanced)

Status: done

## Story

As a Power User,
I want arbitrage opportunities that combine odds from different providers and bookmakers,
so that I can capture surebets that are only visible across feeds.

## Acceptance Criteria

1. **Cross-provider calculator** – A new calculator accepts normalized market quotes from multiple providers and constructs cross-provider `ArbitrageOpportunity` pairs using the existing ROI formula (`1/oddsA + 1/oddsB < 1`).

2. **Event/market normalization** – Event and market identifiers are normalized so that quotes from different APIs for the same underlying fixture and market can be safely combined. This includes:
   - Fuzzy matching of event names (handling team name variations)
   - Date/time alignment with tolerance for minor discrepancies
   - Market type canonical mapping (already established in Story 5.3)

3. **Cross-provider opportunities** – Cross-provider opportunities respect all existing invariants (`roi >= 0`, distinct bookmakers, validated schema) and are clearly labeled in the dashboard with a visual indicator (e.g., "Cross-Feed" badge).

4. **Golden dataset & tests** – Tests using a "cross-feed" golden dataset verify that expected multi-provider arbs are created and no spurious arbs are emitted when implied probabilities are ≥ 1.

## Tasks / Subtasks

- [x] **Task 1: Event normalization key generator** (AC: #2)
  - [x] 1.1 Create `src/main/services/eventMatcher.ts` with event normalization functions
  - [x] 1.2 Implement `normalizeTeamName(name: string): string` to handle team name variations:
    - Strip common suffixes (FC, SC, etc.)
    - Strip common prefixes (FC, AC, SC)
    - Remove accents/diacritics using `String.normalize('NFD')`
    - Lowercase and trim
    - NOTE: V1 does NOT expand abbreviations (e.g., "Man Utd" stays as "man utd") for safety
  - [x] 1.3 Implement `generateEventKey(event: { name: string; date: string; league: string }): string`:
    - Extract home/away teams from event name
    - Normalize both team names
    - Sort alphabetically for consistent key regardless of home/away order
    - Include date (truncate to hour for tolerance)
    - Format: `{sortedTeam1}|{sortedTeam2}|{dateHour}`
  - [x] 1.4 Implement `matchEventsByKey(opps: ArbitrageOpportunity[]): Map<string, ArbitrageOpportunity[]>`:
    - Group opportunities by normalized event key
    - Return map of event key → opportunities from different events

- [x] **Task 2: Market quote extraction** (AC: #1, #2)
  - [x] 2.1 Create `MarketQuote` interface in `shared/types.ts`:
    ```typescript
    interface MarketQuote {
      eventKey: string           // normalized event key
      providerId: ProviderId     // source provider
      bookmaker: string          // bookmaker name
      market: string             // canonical market type
      outcome: string            // 'home' | 'away' | 'yes' | 'no' | etc.
      odds: number               // decimal odds
      originalEventName: string  // for debugging/display
      originalEventDate: string  // for staleness tracking
      foundAt: string            // when quote was fetched
      point?: number             // for handicap markets
    }
    ```
  - [x] 2.2 Implement `extractQuotesFromOpportunity(opp: ArbitrageOpportunity): MarketQuote[]` in `eventMatcher.ts`:
    - Extract each leg as a separate quote
    - Associate with normalized event key
    - Preserve provider and bookmaker info
  - [x] 2.3 Implement `extractAllQuotes(opps: ArbitrageOpportunity[]): MarketQuote[]`:
    - Flatten all opportunities into individual quotes
    - Filter to quotes with valid odds

- [x] **Task 3: Cross-provider arbitrage calculator** (AC: #1, #3)
  - [x] 3.1 Add `src/main/services/crossProviderCalculator.ts` with core algorithm
  - [x] 3.2 Implement `findCrossProviderArbitrages(quotes: MarketQuote[]): ArbitrageOpportunity[]`:
    - Group quotes by (eventKey + market + outcome)
    - For each event+market combination, find best odds per outcome across all providers
    - Generate arbitrage opportunity if `1/bestHomeOdds + 1/bestAwayOdds < 1`
    - Ensure legs reference DIFFERENT bookmakers (critical invariant)
    - Generate unique ID: `xprov:${eventKey}:${market}:${homeBookmaker}:${awayBookmaker}`
  - [x] 3.3 Apply existing invariants:
    - `roi >= 0`
    - Distinct bookmakers on each leg
    - Validate against `arbitrageOpportunitySchema`
  - [x] 3.4 Set `isCrossProvider: true` flag (add to `ArbitrageOpportunity` type)
  - [x] 3.5 Populate `mergedFrom` with all contributing provider IDs

- [x] **Task 4: Integrate into poller and merge flow** (AC: #1)
  - [x] 4.1 Update `pollOnceForEnabledProviders()` in `poller.ts`:
    - After collecting all opportunities from providers
    - Extract quotes from all opportunities
    - Call `findCrossProviderArbitrages(quotes)`
    - Merge cross-provider arbs into result set
  - [x] 4.2 Cross-provider opportunities are NOT deduplicated against same-provider opportunities:
    - They represent a different arbitrage path (different bookmaker combination)
    - Both can co-exist in the feed
  - [x] 4.3 Log cross-provider arb generation metrics:
    - Count of quotes extracted
    - Count of cross-provider arbs found
    - Include in heartbeat log

- [x] **Task 5: Update shared types and schemas** (AC: #3)
  - [x] 5.1 Add `isCrossProvider?: boolean` to `ArbitrageOpportunity` in `shared/types.ts`
  - [x] 5.2 Add `MarketQuote` interface to `shared/types.ts`
  - [x] 5.3 Update `arbitrageOpportunitySchema` in `shared/schemas.ts`:
    - Add optional `isCrossProvider` boolean field
    - Ensure validation passes for cross-provider opportunities

- [x] **Task 6: Dashboard cross-provider indicators** (AC: #3)
  - [x] 6.1 Update `FeedTable.tsx` to display "Cross-Feed" badge for opportunities where `isCrossProvider === true`
  - [x] 6.2 Style badge distinctively (different color from `mergedFrom` badge):
    - Used violet/purple accent (border-violet-400/50, bg-violet-500/20)
    - Badge text: "⚡ Cross-Feed"
  - [x] 6.3 Update `SignalPreview.tsx` to show cross-provider origin:
    - Display "⚡ Cross-Provider Arbitrage" header
    - Show contributing providers from `mergedFrom`
  - [x] 6.4 Added data-cross-provider attribute for testing

- [x] **Task 7: Golden fixtures and comprehensive tests** (AC: #4)
  - [x] 7.1 Create `tests/fixtures/arbitrage/golden-cross-provider.json`:
    - Include scenario: Same event from Odds-API.io and The-Odds-API with different bookmaker odds
    - Include scenario: Event name variations (e.g., "FC Barcelona" vs "Barcelona") that should match
    - Include scenario: Near-date events that should match (same hour)
    - Include negative scenario: No arb when implied probability ≥ 1
    - Include negative scenario: No arb when same bookmaker on both legs
    - Include scenario: BTTS market cross-provider arbitrage
  - [x] 7.2 Create unit tests for `eventMatcher.ts`:
    - `normalizeTeamName` handles common variations
    - `generateEventKey` produces consistent keys
    - `extractQuotesFromOpportunity` extracts all leg data correctly
  - [x] 7.3 Create unit tests for `crossProviderCalculator.ts`:
    - Finds valid cross-provider arbs from mixed quotes
    - Respects distinct bookmaker invariant
    - Calculates ROI correctly
    - Validates against schema
    - Does NOT produce arbs when implied prob ≥ 1
  - [x] 7.4 Create integration test `tests/5-4-cross-provider-aggregator.test.cjs`:
    - End-to-end flow with golden fixtures (45 tests)
    - All tests pass
  - [x] 7.5 Existing tests (5.1, 5.2, 5.3) still pass (no regressions)

- [x] **Task 8: Edge cases and robustness** (AC: #1, #2, #4)
  - [x] 8.1 Handle timezone differences in event dates:
    - All dates normalized to UTC via `toISOString().slice(0, 13)` (hour truncation)
  - [x] 8.2 Handle missing event data gracefully:
    - `generateEventKey` returns null for invalid events
    - `extractQuotesFromOpportunity` returns empty array for invalid opportunities
    - Cross-provider calculator logs warnings for schema validation failures
  - [x] 8.3 Handle stale cross-provider arbs:
    - Uses oldest `foundAt` from contributing quotes for staleness tracking
  - [x] 8.4 Performance optimization:
    - Pre-filter quotes to only valid ones with positive odds
    - Efficient Map-based grouping by event key + market + outcome

## Dev Notes

### Architecture Compliance

This story introduces new components while following established patterns:

| Component | File | Pattern |
|-----------|------|---------|
| Event Matcher | `src/main/services/eventMatcher.ts` | New service following naming pattern |
| Cross-Provider Calculator | `src/main/services/crossProviderCalculator.ts` | New service following naming pattern |
| Types | `shared/types.ts` | Extend existing `ArbitrageOpportunity` |
| Schemas | `shared/schemas.ts` | Extend existing schema |
| Tests | `tests/5-4-cross-provider-aggregator.test.cjs` | Follow story test naming |

### Key Technical Decisions

1. **Event Matching Strategy**: Use normalized team names + date truncation for fuzzy matching
   - V1 implementation: Strips FC/SC prefixes and suffixes, removes diacritics, lowercases
   - Does NOT expand abbreviations (e.g., "Man Utd" stays as "man utd") for safety
   - Date tolerance: same hour (truncated to 13 chars of ISO string)

2. **Quote-Based Architecture**: Extract individual quotes then recombine
   - Decouples cross-provider logic from adapter normalization
   - Enables future enhancements (e.g., three-way arbs, more markets)
   - Clean separation of concerns

3. **Non-Deduplication of Cross-Provider Arbs**: Cross-provider arbs represent DIFFERENT opportunities
   - Same event + market but different bookmaker combination
   - Should NOT replace same-provider arbs (user might want both strategies)
   - Both can co-exist in the feed

### Algorithm Pseudocode

```typescript
// 1. Extract quotes from all opportunities
const quotes = allOpportunities.flatMap(extractQuotesFromOpportunity)

// 2. Group by (eventKey + market + outcome)
const grouped = groupBy(quotes, q => `${q.eventKey}|${q.market}|${q.outcome}`)

// 3. For each (eventKey + market), find best home/away odds
const eventMarkets = uniqueEventMarkets(quotes)
for (const { eventKey, market } of eventMarkets) {
  const homeQuotes = grouped.get(`${eventKey}|${market}|home`)
  const awayQuotes = grouped.get(`${eventKey}|${market}|away`)
  
  // Find best odds with DIFFERENT bookmakers
  const bestHome = maxBy(homeQuotes, q => q.odds)
  const bestAway = maxBy(awayQuotes.filter(q => q.bookmaker !== bestHome.bookmaker), q => q.odds)
  
  // Check for arbitrage
  const roi = 1 - (1/bestHome.odds + 1/bestAway.odds)
  if (roi > 0) {
    opportunities.push(createCrossProviderOpportunity(bestHome, bestAway, roi))
  }
}
```

### Team Name Normalization Examples (V1)

| Original | Normalized |
|----------|------------|
| "Arsenal FC" | "arsenal" |
| "Manchester United" | "manchester united" |
| "Man Utd" | "man utd" (NOT expanded in V1) |
| "FC Barcelona" | "barcelona" |
| "Inter Milan" | "inter milan" |
| "Atlético Madrid" | "atletico madrid" |
| "Bayern München" | "bayern munchen" |

### Risk Assessment

**R-002 (Arbitrage Correctness):**
- Cross-provider arbs use the same ROI formula as same-provider arbs
- CRITICAL: Ensure distinct bookmaker invariant is enforced ✅
- Golden fixtures cover edge cases (near-zero ROI, name variations) ✅

**R-005 (Stale Data):**
- Cross-provider arbs use oldest `foundAt` from contributing quotes ✅
- Staleness displayed appropriately via existing staleness mechanism ✅

### Previous Story Intelligence

**From Story 5.2 (Merged Multi-Provider Feed):**
- `deduplicateOpportunities()` uses semantic keys based on event + market + outcomes
- `mergedFrom` tracks contributing providers
- Provider tagging is established via `providerId` field

**From Story 5.3 (Additional Soccer Two-Way Markets):**
- Canonical market types: `moneyline`, `draw-no-bet`, `totals`, `btts`, `handicap`
- Market type inference is centralized in `inferMarketTypeFromOpportunity`
- Golden fixture pattern is established

### Dependencies

- Story 5.2 (Merged Multi-Provider Feed) - for multi-provider polling infrastructure
- Story 5.3 (Additional Soccer Two-Way Markets) - for complete market type coverage

### Out of Scope for Story 5.4

- Three-way arbitrage (e.g., 1X2 with draw)
- Multi-leg arbitrage (more than 2 outcomes)
- Automated bet placement
- Historical cross-provider analysis
- Cross-sport arbitrage
- Abbreviation expansion (e.g., "Man Utd" → "Manchester United") - deferred to future story

### References

- [Source: _bmad-output/architecture.md#Data Architecture]
- [Source: _bmad-output/architecture.md#High-Risk Domain Patterns – Arbitrage Correctness (R-002)]
- [Source: _bmad-output/architecture.md#Implementation Patterns – Naming Patterns]
- [Source: _bmad-output/epics.md#Story 5.4 – Cross-Provider Arbitrage Aggregator (Advanced)]
- [Source: _bmad-output/implementation-artifacts/5-2-merged-multi-provider-feed.md#Deduplication Algorithm]
- [Source: _bmad-output/implementation-artifacts/5-3-additional-soccer-two-way-markets.md]

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

None required.

### Completion Notes List

1. **V1 Normalization Decision**: Abbreviation expansion (e.g., "Man Utd" → "Manchester United") was removed from V1 implementation as it caused false matches. Cross-provider matching relies on:
   - Identical base team names after FC/SC prefix/suffix removal
   - Same hour for event date
   - This is conservative but safe; future stories can add curated alias mapping

2. **BTTS Market Support**: The cross-provider calculator correctly handles BTTS markets by using `yes/no` outcomes instead of `home/away` for these market types.

3. **Performance**: Cross-provider calculation is only performed when 2+ providers are enabled and opportunities exist. Uses efficient Map-based grouping.

4. **45 Tests Pass**: Comprehensive test coverage including:
   - Team name normalization (12 tests)
   - Event key generation (4 tests)
   - Quote extraction (2 tests)
   - Cross-provider calculator (6 tests)
   - Golden fixture scenarios (6 tests)
   - R-002 invariant tests (3 tests)
   - Plus additional normalization golden tests

### File List

- `shared/types.ts` - Added `isCrossProvider` flag, `MarketQuote` interface, and `originalLeague` field (code review fix)
- `shared/schemas.ts` - Added `isCrossProvider` to schema
- `src/main/services/eventMatcher.ts` - NEW: Event normalization and quote extraction (updated with `originalLeague`)
- `src/main/services/crossProviderCalculator.ts` - NEW: Cross-provider arb calculation (updated to use `originalLeague`)
- `src/main/services/poller.ts` - Integrated cross-provider calculation into polling loop
- `src/renderer/src/features/dashboard/FeedTable.tsx` - Added Cross-Feed badge
- `src/renderer/src/features/dashboard/FeedPane.tsx` - Multi-provider feed integration (touched for 5.4 context)
- `src/renderer/src/features/dashboard/SignalPreview.tsx` - Added cross-provider indicator
- `src/renderer/src/features/dashboard/signalPayload.ts` - Cross-provider header in copied signal text (code review fix)
- `src/renderer/src/features/dashboard/filters.ts` - Filter state management (touched for 5.4 context)
- `tests/fixtures/arbitrage/golden-cross-provider.json` - NEW: Golden fixtures
- `tests/5-4-cross-provider-aggregator.test.cjs` - NEW: 45 comprehensive tests (updated with `originalLeague`)
- `tests/helpers/golden-dataset.js` - Helper utilities for golden fixture tests
- `src/main/adapters/the-odds-api.ts` - Fixed market support (runtime bugfix)
- `tests/2.5-test-adapter-the-odds-api-com.test.cjs` - Updated expected markets + multi-provider polling API

### Code Review Session (2026-01-09)

**Reviewer:** BMad Master (adversarial code review)

**Fixed Issues:**
- **MED-001**: Documented 6 additional git-changed files in File List
- **MED-002**: Signal payload text now shows "⚡ Cross-Provider Arbitrage" header with source providers
- **MED-004**: Added `originalLeague` field to `MarketQuote` interface; cross-provider opportunities now preserve league info

**Won't Fix (V1):**
- **MED-003**: Greedy algorithm for best odds selection (acceptable for V1)
- **MED-005**: Quote extraction GC pressure on each poll cycle (acceptable for V1)
- **LOW-002**: Minor log operation name overlap
- **LOW-003**: Hard-coded 'soccer' sport type (app is soccer-focused)

### Runtime Bugfix (2026-01-09)

**Issue:** The-Odds-API.com was returning HTTP 422 errors with message "Markets not supported by this endpoint: btts"

**Root Cause:** Story 5.3 added BTTS and spreads markets to the adapter, but The-Odds-API.com only supports `h2h` for the soccer odds endpoint. This was a provider capability assumption error.

**Fix Applied:**
- `src/main/adapters/the-odds-api.ts`: Changed `THE_ODDS_API_MARKETS` from `['h2h', 'btts', 'spreads']` to `['h2h']`
- `tests/2.5-test-adapter-the-odds-api-com.test.cjs`: Updated expected markets assertion and migrated to multi-provider polling API

**Note:** BTTS and spreads markets are still available via `odds-api-io` provider. Cross-provider matching for these markets will only occur when that provider is enabled.
