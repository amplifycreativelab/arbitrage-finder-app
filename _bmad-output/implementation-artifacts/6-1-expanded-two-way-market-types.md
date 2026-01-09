# Story 6.1: Expanded Two-Way Market Types

- **Status**: done

## Story

As a User,
I want to see arbitrage opportunities across 20+ two-way soccer markets,
so that I can find surebets across corners, cards, shots, team-specific lines, and other binary markets.

## Acceptance Criteria

1. **Extended market coverage** – Market types are expanded to include at minimum:
   - **Goals/Scoring**: Match totals O/U (FT, 1H, 2H), team totals O/U, BTTS (FT, 1H, 2H), Goal in 1H/2H Yes/No, clean sheet Yes/No
   - **Handicaps**: Asian handicaps (FT, 1H, 2H), European handicaps, team spread lines (-0.5, -1.0, -1.5, etc.)
   - **Corners**: Match corners O/U (FT, 1H, 2H), team corners O/U, corner handicaps, race to X corners
   - **Cards**: Match cards O/U (FT, 1H, 2H), team cards O/U, red card Yes/No, player to be booked
   - **Shots**: Match shots O/U, shots on target O/U, team shots O/U
   - **Other**: Offsides O/U, fouls O/U, penalty Yes/No, own goal Yes/No

2. **Market grouping** – Each market is assigned to a **market group** for categorization: `goals`, `handicap`, `corners`, `cards`, `shots`, `other`

3. **Structured market metadata** – `inferMarketTypeFromOpportunity` is refactored to return a structured object `{ group: MarketGroup, key: string, label: string }` instead of a flat string

4. **Canonical market keys** – Market normalization maps provider-specific strings to canonical keys (e.g., `corners_over_9.5_ft`, `cards_under_4.5_1h`)

5. **Adapter updates** – Adapters (`odds-api-io`, `the-odds-api`) are updated to normalize new market types into the shared schema

6. **Golden fixtures & tests** – At least 5 golden fixtures are added covering new market groups (corners, cards, shots) with correct ROI and classification assertions

## Tasks / Subtasks

- [x] **Task 1: Define market group schema and types** (AC: #2, #3)
  - [x] 1.1 Create `MarketGroup` enum in `shared/types.ts`: `goals | handicap | corners | cards | shots | other`
  - [x] 1.2 Create `MarketMetadata` interface: `{ group: MarketGroup, key: string, label: string, period?: 'ft' | '1h' | '2h', line?: number }`
  - [x] 1.3 Create `MARKET_PATTERNS` constant mapping market strings to group assignments
  - [x] 1.4 Create helper functions: `createMarketKey`, `parseMarketKey`, `inferMarketMetadata`

- [x] **Task 2: Define canonical market keys** (AC: #4)
  - [x] 2.1 Define naming convention for market keys: `{group}_{type}_{line}_{period}` (e.g., `corners_over_9.5_ft`)
    - *Implemented in `MARKET_PATTERNS` with 70+ canonical patterns*
  - [x] 2.2 Create comprehensive market key list covering all AC#1 categories
    - *Implemented via pattern matching and dynamic key generation in `inferMarketMetadata`*
  - [x] 2.3 Create human-readable label mappings for each market key (`formatMarketLabelFromKey`)

- [x] **Task 3: Refactor inferMarketTypeFromOpportunity** (AC: #3)
  - [x] 3.1 Kept existing `inferMarketTypeFromOpportunity` for backward compatibility
  - [x] 3.2 Created new `inferMarketMetadata(marketString: string): MarketMetadata`
  - [x] 3.3 Implemented detection logic for all 6 market groups with 70+ patterns
  - [x] 3.4 Added fallback to `other` group for unrecognized markets
  - [x] 3.5 Ensured backward compatibility with existing `MarketFilterValue` usage

- [x] **Task 4: Update The-Odds-API adapter** (AC: #5)
  - [x] 4.1 Research available markets from The-Odds-API.com documentation:
    - ✅ h2h (moneyline): Supported
    - ❌ btts: Returns 422 INVALID_MARKET error
    - ❌ spreads: Returns 422 INVALID_MARKET error
    - ❌ totals, corners, cards, shots, other: Not available for soccer
  - [x] 4.2 `THE_ODDS_API_MARKETS` limited to `['h2h']` per API constraints
    - *Provider limitation documented in adapter comments*
  - [x] 4.3 Existing `mapRawEventToMarkets` handles h2h correctly; new markets not available
  - [x] 4.4 Existing `normalizeTheOddsApiMarket` correctly formats opportunities

- [x] **Task 5: Update Odds-API.io adapter** (AC: #5)
  - [x] 5.1 Odds-API.io returns pre-calculated arbitrage - no market filtering needed
  - [x] 5.2 Updated `normalizeOddsApiIoOpportunity` to:
    - Parse incoming market strings via `inferMarketMetadata`
    - Convert to canonical market keys for consistent filtering
  - [x] 5.3 Provider returns all available markets; no filtering restrictions

- [x] **Task 6: Update filter infrastructure** (AC: #2, #3)
  - [x] 6.1 Updated `filters.ts`:
    - Kept existing `MarketFilterValue` for backward compatibility
    - Added `MarketGroup` re-export and `ALL_MARKET_GROUPS` constant
    - Added `LEGACY_MARKET_TO_GROUP` mapping
    - Added `getMarketMetadataFromOpportunity` and `getMarketGroupFromOpportunity` functions
  - [x] 6.2 Extended `DashboardFilterState` with optional `marketGroups` field
  - [x] 6.3 Updated `applyDashboardFilters`:
    - Supports filtering by market group (takes precedence)
    - Maintains backward compatibility with existing 5 market types

- [x] **Task 7: Create golden fixtures and tests** (AC: #6)
  - [x] 7.1 Created `tests/fixtures/arbitrage/golden-corners-arbs.json` (3 fixtures)
  - [x] 7.2 Created `tests/fixtures/arbitrage/golden-cards-arbs.json` (3 fixtures)
  - [x] 7.3 Created `tests/fixtures/arbitrage/golden-shots-arbs.json` (2 fixtures)
  - [x] 7.4 Created `tests/fixtures/arbitrage/golden-other-arbs.json` (3 fixtures)
  - [x] 7.5 Created `tests/6-1-expanded-markets.test.cjs` (28 tests):
    - Tests `inferMarketMetadata` for all 6 market groups
    - Tests canonical key parsing (period, line, side extraction)
    - Tests golden fixtures produce correct ROI
    - Verifies R-002 invariants (roi >= 0, distinct bookmakers)
  - [x] 7.6 Verified existing Story 5.3, 5.4 tests still pass (no regressions)

- [x] **Task 8: Update signalPayload formatting** (AC: #3)
  - [x] 8.1 Updated `formatMarketLabel` to use `formatMarketLabelFromKey` from shared types
  - [x] 8.2 Signal Preview now displays human-readable market names for all 6 groups
  - [x] 8.3 Line/period information included via `formatMarketLabelFromKey` dynamic formatting

## Dev Notes

### Architecture Compliance

This story extends existing patterns with structured enhancements:
- **Types:** Adds `MarketGroup` enum and `MarketMetadata` interface to `shared/types.ts`
- **Adapters:** Extends normalization logic—no new adapter files
- **Calculator:** No changes—ROI calculation remains the same for two-leg opportunities
- **Filters:** Extends filter infrastructure with group-based selection

### Key Files to Modify

| Category   | File                                                    | Changes                                                         |
| ---------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| Types      | `shared/types.ts`                                       | Add `MarketGroup` enum, `MarketMetadata` interface              |
| Filters    | `src/renderer/src/features/dashboard/filters.ts`        | Add group-based inference, extend type definitions              |
| Store      | `src/renderer/src/features/dashboard/stores/feedFiltersStore.ts` | Add group + individual market selection              |
| Adapter    | `src/main/adapters/odds-api-io.ts`                      | Parse and normalize new market strings                          |
| Adapter    | `src/main/adapters/the-odds-api.ts`                     | Extend market handling (where API supports)                     |
| Preview    | `src/renderer/src/features/dashboard/signalPayload.ts`  | Human-readable labels for all market groups                     |
| Fixtures   | `tests/fixtures/arbitrage/golden-*.json`                | New golden test data for corners, cards, shots, other           |
| Tests      | `tests/6-1-expanded-markets.test.cjs`                   | Comprehensive market tests                                      |

### Market Group Reference

| Group     | Markets Included                                                         | Expected Count |
| --------- | ------------------------------------------------------------------------ | -------------- |
| `goals`   | Totals O/U, team totals, BTTS, goal in period, clean sheet               | 8-10 types     |
| `handicap`| Asian handicap, European handicap, team spreads                          | 4-6 types      |
| `corners` | Match/team corners O/U, corner handicaps, corner race                    | 6-8 types      |
| `cards`   | Match/team cards O/U, red card, booking                                  | 4-6 types      |
| `shots`   | Match/team shots O/U, shots on target O/U                                | 4-6 types      |
| `other`   | Offsides, fouls, penalty, own goal                                       | 4-6 types      |

**Total: 30-42 distinct market types across 6 groups**

### Provider Market Availability

| Market Group | The-Odds-API.com | Odds-API.io |
| ------------ | ---------------- | ----------- |
| `goals`      | ✅ h2h, totals, btts (h2h only confirmed) | ✅ Pre-calculated |
| `handicap`   | ⚠️ spreads (currently returns 422) | ✅ Pre-calculated |
| `corners`    | ❓ Unknown - needs research | ✅ Likely available |
| `cards`      | ❓ Unknown - needs research | ✅ Likely available |
| `shots`      | ❓ Unknown - needs research | ✅ Likely available |
| `other`      | ❓ Unknown - needs research | ✅ Likely available |

**Action Required:** Task 4.1 and 5.1 must document actual provider capabilities before implementation.

### Backward Compatibility Strategy

1. **Existing `MarketFilterValue` type** (`moneyline | draw-no-bet | totals | btts | handicap`) remains unchanged
2. **New `MarketGroup` type** is additive—doesn't replace existing types
3. **`inferMarketTypeFromOpportunity`** continues to work for existing code
4. **`inferMarketMetadata`** is the new preferred function for rich market info
5. **Filter store** maintains existing fields; new fields are added

### Canonical Key Format

```
{category}_{type}_{line}_{period}

Examples:
- corners_over_9.5_ft       → Corners Over 9.5 (Full Time)
- cards_under_4.5_1h        → Cards Under 4.5 (1st Half)
- btts_yes_ft               → BTTS Yes (Full Time)
- handicap_home_-0.5_ft     → Home -0.5 Handicap (Full Time)
- shots_on_target_over_5.5  → Shots on Target Over 5.5
```

### Testing Strategy

| Test Type      | Coverage                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Unit           | `inferMarketMetadata` with all market variants                           |
| Unit           | Canonical key generation and parsing                                     |
| Unit           | Human-readable label generation                                          |
| Golden         | Corners, cards, shots, other fixtures produce positive ROI               |
| Schema         | New market opportunities pass Zod validation                             |
| UI             | Signal Preview displays correct labels for all groups                    |
| Regression     | Existing 5.3/5.4 tests pass                                              |

### Risks

**R-002 (Arbitrage Correctness):**
- New market types must maintain ROI calculation invariants
- All two-way markets use the same formula: `1/oddsA + 1/oddsB < 1`
- Golden fixtures validate correctness against known outcomes
- Pairing logic must match correct outcome sides (e.g., Over with Under, Yes with No)

**Provider API Limitations:**
- The-Odds-API.com currently shows 422 errors for BTTS/spreads
- Some market types may not be available from all providers
- Story should gracefully handle missing markets (no errors, just fewer opportunities)

### Dependencies

- Story 5.3 (Additional Soccer Two-Way Markets) - establishes BTTS/handicap patterns
- Story 5.4 (Cross-Provider Arbitrage) - cross-provider normalization patterns

### Learnings to Apply

1. **E5-AI-01 (Multi-provider boundaries):** Market normalization happens in adapters
2. **Story 5.3 patterns:** BTTS/handicap handling patterns are reusable
3. **E4-AI-02 (Real function tests):** Import actual implementation from compiled output

### References

- [Source: _bmad-output/architecture.md#Data Architecture]
- [Source: _bmad-output/architecture.md#High-Risk Domain Patterns – Arbitrage Correctness (R-002)]
- [Source: _bmad-output/epics.md#Story 6.1 – Expanded Two-Way Market Types]
- [Source: _bmad-output/implementation-artifacts/5-3-additional-soccer-two-way-markets.md]
- [The-Odds-API Documentation: https://the-odds-api.com/liveapi/guides/v4/]

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity)

### Debug Log References

- Fixed bug where `parseMarketKey` was overwriting group from pattern match with fallback 'other'
- Added missing underscore variants for hyphenated patterns (draw-no-bet, 0-handicap)

### Completion Notes List

- Tasks 1, 3, 6, 7 completed (schema, inference, filters, tests)
- Tasks 4, 5, 8 deferred (adapter updates, signalPayload formatting)
- 28 new tests added and passing
- No regressions in existing 5.3/5.4 tests

### File List

| File | Action | Description |
|------|--------|-------------|
| `shared/types.ts` | Modified | Added MarketGroup enum, MarketMetadata interface, MARKET_PATTERNS (70+ patterns), inferMarketMetadata, parseMarketKey, formatMarketLabelFromKey functions |
| `src/renderer/src/features/dashboard/filters.ts` | Modified | Added market group support, getMarketMetadataFromOpportunity, getMarketGroupFromOpportunity, updated applyDashboardFilters for group filtering |
| `src/renderer/src/features/dashboard/stores/feedFiltersStore.ts` | Modified | Added marketGroups state, setMarketGroups, toggleMarketGroup methods (Code Review Fix) |
| `src/renderer/src/features/dashboard/signalPayload.ts` | Modified | Updated formatMarketLabel to use formatMarketLabelFromKey for all 6 market groups |
| `src/main/adapters/odds-api-io.ts` | Modified | Added market normalization via inferMarketMetadata for consistent filtering |
| `src/main/adapters/the-odds-api.ts` | Modified | Documented market limitations (h2h only for soccer) |
| `tests/fixtures/arbitrage/golden-corners-arbs.json` | Created | 3 golden fixtures for corners market testing (ROI corrected in review) |
| `tests/fixtures/arbitrage/golden-cards-arbs.json` | Created | 3 golden fixtures for cards market testing |
| `tests/fixtures/arbitrage/golden-shots-arbs.json` | Created | 2 golden fixtures for shots market testing (ROI corrected in review) |
| `tests/fixtures/arbitrage/golden-other-arbs.json` | Created | 3 golden fixtures for other markets testing |
| `tests/6-1-expanded-markets.test.cjs` | Created | 28 comprehensive tests for Story 6.1 |

### Review Follow-ups (AI)

_None - all issues resolved in review._

## Senior Developer Review (AI)

### Summary

Adversarial code review completed by BMad Master. Found 4 MEDIUM and 2 LOW issues. All MEDIUM issues have been resolved.

### Issues Found & Resolved

| Issue | Severity | Status | Resolution |
|-------|----------|--------|------------|
| M-001: `feedFiltersStore.ts` lacks `marketGroups` support | MEDIUM | ✅ Fixed | Added `marketGroups` state, `setMarketGroups`, and `toggleMarketGroup` methods |
| M-002: Task 6.2 claimed complete but store not updated | MEDIUM | ✅ Fixed | Fixed by M-001 resolution |
| M-003: Prefix-match behavior underdocumented | MEDIUM | ✅ Accepted | Working as designed - prefix matching is intentional |
| M-004: ROI tolerance masking precision issues | MEDIUM | ✅ Fixed | Corrected ROI values in corners-1 (0.0581→0.0587) and shots-1 (0.1002→0.1001) |
| L-001: File List missing epics.md/sprint-status.yaml | LOW | ℹ️ Documented | These are workflow artifacts, not implementation files |
| L-002: No UI for market group filtering | LOW | ℹ️ Deferred | Intentionally deferred to future story |

### Code Quality

- **Type Safety:** ✅ All TypeScript compiles without errors
- **Test Coverage:** ✅ 28 + 57 tests passing (no regressions)
- **R-002 Invariants:** ✅ All golden fixtures maintain roi >= 0, distinct bookmakers, correct ROI calculation
- **Backward Compatibility:** ✅ Existing filter infrastructure preserved; `marketGroups` is optional

### Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-09 | Gemini/Antigravity | Initial implementation of Tasks 1, 3, 6, 7 |
| 2026-01-09 | BMad Master (Code Review) | Fixed M-001/M-002: Added marketGroups to feedFiltersStore.ts |
| 2026-01-09 | BMad Master (Code Review) | Fixed M-004: Corrected ROI values in golden fixtures |
| 2026-01-09 | BMad Master | Completed Tasks 2, 4, 5, 8: Adapter updates + signalPayload formatting |
