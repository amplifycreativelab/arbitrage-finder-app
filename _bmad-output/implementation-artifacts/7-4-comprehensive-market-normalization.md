# Story 7.4: Comprehensive Market Normalization

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want all `/odds` markets normalized into canonical keys supporting the full breadth of two-way markets,
so that Continuous Deep Scan can find arbitrage across every market type the API provides.

## Acceptance Criteria

1. **Comprehensive two-way market parsing** - `/odds` response parsing produces normalized outcomes for **all two-way markets**, including:
   - **Goals/Scoring**: Match totals O/U, team totals O/U, BTTS, Goal in 1H/2H, clean sheet
   - **Handicaps**: Asian handicaps, European handicaps, team spreads
   - **Corners**: Match/team corners O/U, corner handicaps, race to X corners
   - **Cards**: Match/team cards O/U, red card Yes/No, player bookings
   - **Shots**: Match/team shots O/U, shots on target O/U
   - **Other**: Offsides O/U, fouls O/U, penalty Yes/No, own goal Yes/No

2. **Rich market metadata** - Each normalized market includes:
   - canonical market key (e.g., `corners_over_9.5_ft`, `cards_red_yes_ft`)
   - market group (aligns with Epic 6: `goals`, `handicap`, `corners`, `cards`, `shots`, `other`)
   - human-readable label for UI display
   - line/parameter value where applicable (e.g., 9.5 for corners O/U 9.5)

3. **Provider variance handling** - Normalization handles provider naming variance (case, punctuation, abbreviations)

4. **Graceful unknown market handling** - Unknown/unsupported markets are logged at debug level and skipped (no crashes)

5. **No minimum ROI threshold by default** - All arbitrage opportunities are surfaced regardless of ROI (user can filter in UI)

6. **Golden fixtures coverage** - Golden fixtures cover: Moneyline, Corners O/U, Cards O/U, BTTS, Asian Handicap, Red Card Yes/No

## Tasks / Subtasks

- [ ] **Task 1: Extend MARKET_PATTERNS registry for comprehensive coverage** (AC: #1, #3)
  - [ ] 1.1 Add missing Goals/Scoring patterns to `MARKET_PATTERNS` in `shared/types.ts`:
    ```typescript
    // Goal in 1H/2H binaries
    goal_in_1h: { group: 'goals', baseType: 'goal_occurrence_1h' },
    goal_in_2h: { group: 'goals', baseType: 'goal_occurrence_2h' },
    goal_in_match_yes: { group: 'goals', baseType: 'goal_occurrence' },
    goal_in_match_no: { group: 'goals', baseType: 'goal_occurrence' },
    // Team-specific variants
    home_to_score: { group: 'goals', baseType: 'team_to_score' },
    away_to_score: { group: 'goals', baseType: 'team_to_score' },
    home_clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
    away_clean_sheet: { group: 'goals', baseType: 'clean_sheet' },
    ```
  - [ ] 1.2 Add comprehensive Corners patterns:
    ```typescript
    match_corners: { group: 'corners', baseType: 'corners_totals' },
    match_corners_over: { group: 'corners', baseType: 'corners_over' },
    match_corners_under: { group: 'corners', baseType: 'corners_under' },
    first_half_corners: { group: 'corners', baseType: 'corners_1h' },
    second_half_corners: { group: 'corners', baseType: 'corners_2h' },
    corners_1h: { group: 'corners', baseType: 'corners_1h' },
    corners_2h: { group: 'corners', baseType: 'corners_2h' },
    corner_match_bet: { group: 'corners', baseType: 'corners_winner' },
    ```
  - [ ] 1.3 Add comprehensive Cards patterns:
    ```typescript
    match_cards: { group: 'cards', baseType: 'cards_totals' },
    match_bookings: { group: 'cards', baseType: 'cards_totals' },
    booking_points: { group: 'cards', baseType: 'booking_points' },
    first_half_cards: { group: 'cards', baseType: 'cards_1h' },
    cards_1h: { group: 'cards', baseType: 'cards_1h' },
    cards_2h: { group: 'cards', baseType: 'cards_2h' },
    any_player_red: { group: 'cards', baseType: 'red_card' },
    red_card_shown: { group: 'cards', baseType: 'red_card' },
    ```
  - [ ] 1.4 Add comprehensive Shots patterns:
    ```typescript
    match_shots: { group: 'shots', baseType: 'shots_totals' },
    total_shots: { group: 'shots', baseType: 'shots_totals' },
    shots_total: { group: 'shots', baseType: 'shots_totals' },
    sot_over: { group: 'shots', baseType: 'shots_on_target_over' },
    sot_under: { group: 'shots', baseType: 'shots_on_target_under' },
    shots_on_target_total: { group: 'shots', baseType: 'shots_on_target' },
    ```
  - [ ] 1.5 Add comprehensive Other/Props patterns:
    ```typescript
    offside_totals: { group: 'other', baseType: 'offsides' },
    total_offsides: { group: 'other', baseType: 'offsides' },
    match_fouls: { group: 'other', baseType: 'fouls' },
    total_fouls: { group: 'other', baseType: 'fouls' },
    penalty_awarded: { group: 'other', baseType: 'penalty' },
    penalty_scored: { group: 'other', baseType: 'penalty' },
    own_goal_scored: { group: 'other', baseType: 'own_goal' },
    throw_in_totals: { group: 'other', baseType: 'throw_ins' },
    goal_kick_totals: { group: 'other', baseType: 'goal_kicks' },
    ```

- [ ] **Task 2: Enhance inferMarketMetadata for complex market parsing** (AC: #1, #2, #3)
  - [ ] 2.1 Add period detection from market key suffix in `inferMarketMetadata()`:
    - Check for `_1h`, `_2h`, `_ft`, `first_half_`, `second_half_` patterns
    - Set `period` field on returned `MarketMetadata`
  - [ ] 2.2 Add line extraction from market key in `inferMarketMetadata()`:
    - Extract numeric values from patterns like `over_2.5`, `under_9.5`, `handicap_-1.5`
    - Set `line` field on returned `MarketMetadata`
  - [ ] 2.3 Add side detection (home/away/match) in `inferMarketMetadata()`:
    - Check for `home_`, `away_`, `team1_`, `team2_` prefixes
    - Set `side` field on returned `MarketMetadata`
  - [ ] 2.4 Improve prefix matching to handle compound patterns:
    ```typescript
    // Handle patterns like "corners_totals_over_9.5_ft"
    // First try exact match, then progressively shorter prefixes
    ```
  - [ ] 2.5 Add fuzzy matching for common abbreviations and variants:
    ```typescript
    const ALIAS_MAP: Record<string, string> = {
      'btts': 'both_teams_to_score',
      'sot': 'shots_on_target',
      'dnb': 'draw_no_bet',
      'ah': 'asian_handicap',
      'o/u': 'over_under',
      'ou': 'over_under',
    }
    ```

- [ ] **Task 3: Enhance buildOpportunitiesFromRawOdds for comprehensive markets** (AC: #1, #5)
  - [ ] 3.1 Update `buildOpportunitiesFromRawOdds()` in `deepScan.ts` to handle all market types:
    - Ensure two-outcome markets (O/U, Yes/No) are correctly identified
    - Skip markets with != 2 outcomes (3-way markets, etc.)
  - [ ] 3.2 Improve outcome normalization in `normalizeOutcomeName()`:
    ```typescript
    // Handle additional patterns:
    // "Over 9.5" -> "over_9.5"
    // "Under 2.5 Goals" -> "under_2.5"
    // "Yes" / "No" for binary markets
    // "+1.5" / "-1.5" for handicaps
    ```
  - [ ] 3.3 Ensure line-aware market key generation works for all market types:
    - Corners: `corners_over_9.5_ft`, `corners_under_9.5_ft`
    - Cards: `cards_over_4.5_ft`, `cards_under_4.5_ft`
    - Shots: `shots_over_25.5_ft`, `shots_on_target_over_5.5_ft`
  - [ ] 3.4 Ensure AC #5: Remove any default minRoi floor (already handled - verify no regression)

- [ ] **Task 4: Enhance formatMarketLabelFromKey for readable labels** (AC: #2)
  - [ ] 4.1 Add label mappings for new market types in `formatMarketLabelFromKey()`:
    ```typescript
    const additionalLabels: Record<string, string> = {
      corners_1h: 'Corners (1H)',
      corners_2h: 'Corners (2H)',
      cards_1h: 'Cards (1H)',
      cards_2h: 'Cards (2H)',
      goal_occurrence_1h: 'Goal in 1H',
      goal_occurrence_2h: 'Goal in 2H',
      team_to_score: 'Team to Score',
      corners_winner: 'Corner Match Bet',
      booking_points: 'Booking Points',
      // ... etc
    }
    ```
  - [ ] 4.2 Improve dynamic label generation for compound keys:
    - `corners_over_9.5_ft` -> "Corners Over 9.5 (FT)"
    - `cards_red_yes_ft` -> "Red Card Yes (FT)"
    - `shots_on_target_over_5.5` -> "Shots on Target Over 5.5"
  - [ ] 4.3 Handle numeric line values in labels:
    - Extract line from key, format with appropriate precision
    - "Over 2.5" not "Over 2.50"

- [ ] **Task 5: Add debug logging for unknown markets** (AC: #4)
  - [ ] 5.1 Add debug-level logging in `inferMarketMetadata()` for unrecognized patterns:
    ```typescript
    if (!exactMatch && !prefixMatch) {
      logDebug('market.unknown', {
        context: 'service:deepScan',
        operation: 'inferMarketMetadata',
        providerId: 'odds-api-io',
        correlationId: null,
        durationMs: null,
        errorCategory: null,
        rawMarketKey: marketString,
        normalizedKey: normalized,
        assignedGroup: 'other'
      })
    }
    ```
  - [ ] 5.2 Track unknown market keys for reporting:
    - Add `unknownMarketKeys: Set<string>` tracking in scan cycle
    - Include count in `continuousScan.cycle.complete` log
  - [ ] 5.3 Ensure unknown markets don't crash - fallback to 'other' group always works

- [ ] **Task 6: Create golden fixtures for comprehensive market coverage** (AC: #6)
  - [ ] 6.1 Create `tests/fixtures/raw-odds-corners.json`:
    - Event with corners O/U from multiple bookmakers
    - Expected arbitrage opportunity with `corners_over_9.5_ft` market
  - [ ] 6.2 Create `tests/fixtures/raw-odds-cards.json`:
    - Event with cards O/U and red card Yes/No markets
    - Expected arbitrage opportunity with `cards_under_4.5_ft` market
  - [ ] 6.3 Create `tests/fixtures/raw-odds-btts.json`:
    - Event with BTTS Yes/No from multiple bookmakers
    - Expected arbitrage with correct `btts_yes_ft` / `btts_no_ft` outcomes
  - [ ] 6.4 Create `tests/fixtures/raw-odds-asian-handicap.json`:
    - Event with Asian handicap markets (-0.5, -1.0, -1.5 lines)
    - Expected arbitrage with line-aware market keys
  - [ ] 6.5 Create `tests/fixtures/raw-odds-red-card.json`:
    - Event with Red Card Yes/No binary market
    - Expected arbitrage opportunity

- [ ] **Task 7: Create unit tests for market normalization** (AC: #1-#6)
  - [ ] 7.1 Unit tests for `inferMarketMetadata()`:
    - Test exact pattern matches (btts, corners, cards, etc.)
    - Test prefix matches with line extraction
    - Test period detection (_1h, _2h, _ft)
    - Test side detection (home_, away_)
    - Test unknown market fallback to 'other'
  - [ ] 7.2 Unit tests for `normalizeOutcomeName()`:
    - Test "Over X.X" patterns
    - Test "Under X.X" patterns
    - Test "Yes"/"No" patterns
    - Test handicap line patterns
  - [ ] 7.3 Unit tests for `formatMarketLabelFromKey()`:
    - Test all market groups produce readable labels
    - Test line values are formatted correctly
    - Test period suffixes are added
  - [ ] 7.4 Integration tests for `buildOpportunitiesFromRawOdds()`:
    - Test each golden fixture produces expected opportunities
    - Test market metadata is correctly populated on opportunities
    - Test unknown markets don't crash
  - [ ] 7.5 Create test file: `tests/7-4-comprehensive-market-normalization.test.cjs`

- [ ] **Task 8: Update TypeScript types and exports** (AC: #2)
  - [ ] 8.1 Ensure `MarketMetadata` interface has all required fields:
    ```typescript
    interface MarketMetadata {
      group: MarketGroup
      key: string
      label: string
      period?: MarketPeriod  // 'ft' | '1h' | '2h'
      line?: number
      side?: 'home' | 'away' | 'match'
    }
    ```
  - [ ] 8.2 Add any missing type exports to `shared/types.ts`
  - [ ] 8.3 Verify Zod schemas in `shared/schemas.ts` cover market metadata fields

## Dev Notes

### Architecture Compliance

This story extends the market normalization infrastructure from Epic 6 and Stories 7.1-7.3:

| Component | File | Pattern |
|-----------|------|---------|
| Market Patterns | `shared/types.ts` | Extend `MARKET_PATTERNS` registry |
| Market Inference | `shared/types.ts` | Enhance `inferMarketMetadata()` |
| Label Formatting | `shared/types.ts` | Enhance `formatMarketLabelFromKey()` |
| Arbitrage Building | `src/main/services/deepScan.ts` | Enhance `buildOpportunitiesFromRawOdds()` |
| Outcome Normalization | `src/main/services/deepScan.ts` | Enhance `normalizeOutcomeName()` |
| Golden Fixtures | `tests/fixtures/` | Add market-specific fixtures |
| Tests | `tests/7-4-comprehensive-market-normalization.test.cjs` | Follow story test naming |

### Technical Implementation Notes

**Current State (from Stories 7.1-7.3):**

The following market normalization is already implemented:
- `MARKET_PATTERNS` in `shared/types.ts` covers ~50 patterns ✅
- `inferMarketMetadata()` handles exact and prefix matching ✅
- `parseMarketKey()` extracts period, line, side from keys ✅
- `formatMarketLabelFromKey()` generates human-readable labels ✅
- `buildOpportunitiesFromRawOdds()` builds opportunities from raw odds ✅
- `normalizeOutcomeName()` normalizes outcome names ✅
- Line-aware market key generation (from Story 7.1 review fixes) ✅

**What Story 7.4 Adds:**

1. **Extended Pattern Registry** - Add ~30+ new patterns for:
   - Goal occurrence binaries (goal in 1H/2H)
   - First/second half corners and cards
   - Shots on target variants
   - Penalty and own goal binaries
   - Booking points markets

2. **Enhanced Period Detection** - Handle more period patterns:
   - `_1h`, `_2h`, `_ft` suffixes
   - `first_half_`, `second_half_` prefixes
   - Period-less markets default to FT

3. **Debug Logging for Unknown Markets** - Track unrecognized market keys:
   - Log at debug level (not warn - don't pollute logs)
   - Report count in scan completion logs
   - Helps identify new market types from API

4. **Golden Fixtures** - Comprehensive test coverage:
   - Each major market group has a dedicated fixture
   - Fixtures include realistic bookmaker odds
   - Expected arbitrage opportunities documented

**Key Code Locations:**

```typescript
// shared/types.ts - Main normalization infrastructure
export const MARKET_PATTERNS: Record<string, { group: MarketGroup; baseType: string }>
export function inferMarketMetadata(marketString: string): MarketMetadata
export function parseMarketKey(key: string): Partial<MarketMetadata>
export function formatMarketLabelFromKey(key: string): string

// src/main/services/deepScan.ts - Arbitrage detection
function normalizeOutcomeName(name: string): string
function extractLineFromOutcomeName(name: string): number | undefined
function buildOpportunitiesFromRawOdds(payload: RawOddsPayload, config: DeepScanConfig, foundAt: string): ArbitrageOpportunity[]
```

### Key Design Decisions

1. **Centralized Pattern Registry**: All market patterns live in `MARKET_PATTERNS` in `shared/types.ts` for single-source-of-truth and easy extension.

2. **Graceful Degradation**: Unknown markets fall back to `group: 'other'` rather than throwing errors. This ensures the scan never crashes on new API market types.

3. **Debug-Level Logging**: Unknown market logging is at debug level to avoid polluting production logs while still enabling investigation.

4. **No Default ROI Floor**: AC #5 explicitly requires no minimum ROI threshold. Users filter in UI via `feedFiltersStore.deepScanRoiThresholds`.

5. **Line-Aware Deduplication**: Markets with different lines (e.g., Corners O/U 9.5 vs O/U 10.5) are tracked separately using line-aware keys.

### Dependencies

- Epic 6 (Expanded Two-Way Market Types) - provides `MarketMetadata` types and pattern infrastructure
- Story 7.1 (Deep Scan Mode) - provides `buildOpportunitiesFromRawOdds()` and line-aware fixes
- Story 7.2 (Continuous Deep Scan) - provides continuous scan infrastructure
- Story 7.3 (Automatic Event Discovery) - provides batch scanning and market stats tracking

### Previous Story Intelligence (Story 7.3)

From Story 7.3 implementation:
- `marketsScanned` and `marketGroupsWithArbs` tracking added to `DeepScanProgress`
- Market statistics included in `continuousScan.cycle.complete` logs
- StatusBar shows live scan progress metrics
- Renderer TRPC test stub includes all deep scan procedures

**Story 7.3 Code Review Fixes Applied:**
- TRPC stubs for deep scan procedures prevent `undefined.mutate` crashes
- Cache invalidation subscription guarded in non-Electron environments
- Market statistics properly tracked and logged

### Git Intelligence

Recent commits:
- `f9104c6` - chore: update compiled test output files
- `2863a74` - story 7.2: continuous deep scan mode
- `bc318eb` - story 7.1

Files likely to be modified:
- `shared/types.ts` - extend MARKET_PATTERNS, enhance inference functions
- `src/main/services/deepScan.ts` - enhance normalizeOutcomeName, buildOpportunitiesFromRawOdds
- `tests/fixtures/` - add golden fixtures for market types
- `tests/7-4-comprehensive-market-normalization.test.cjs` - comprehensive test suite

### Out of Scope for Story 7.4

- 3-way market support (1X2, double chance) - only 2-way markets
- Player-level prop markets (first goalscorer, player shots, etc.)
- Live/in-play market handling
- Cross-provider market matching (Story 5.4 covers this)
- Market odds movement/history tracking
- UI changes for market display (existing UI handles new markets automatically)

### Risk Assessment

**R-001 (API Variance):**
- Odds-API.io market keys may vary by bookmaker
- Mitigation: Extensive pattern matching, fuzzy alias resolution, graceful fallback

**R-002 (Arbitrage Correctness):**
- New market types must correctly identify complementary outcomes
- Mitigation: Golden fixtures with known-correct arbitrage opportunities

**R-003 (Performance):**
- Extended pattern matching may impact scan speed
- Mitigation: Exact match first, then prefix match (current pattern preserved)

**R-004 (Unknown Market Types):**
- API may return market types not in our registry
- Mitigation: Debug logging, fallback to 'other' group, no crashes

### Testing Strategy

**Unit Tests:**
- `inferMarketMetadata()` for all pattern types
- `normalizeOutcomeName()` for all outcome formats
- `formatMarketLabelFromKey()` for all label formats
- Unknown market handling

**Integration Tests:**
- Golden fixtures → expected opportunities
- Full scan cycle with market-diverse events
- Unknown market logging (verify no errors)

**Golden Fixtures:**
- Corners O/U (Tier A market)
- Cards O/U (Tier A market)
- BTTS (Tier S market)
- Asian Handicap (Tier S market)
- Red Card Yes/No (Tier B market)
- Moneyline (existing, verify no regression)

### References

- [Source: _bmad-output/epics.md#Story 7.4 – Comprehensive Market Normalization]
- [Source: _bmad-output/architecture.md#Data Architecture]
- [Source: shared/types.ts - MARKET_PATTERNS, inferMarketMetadata]
- [Source: src/main/services/deepScan.ts - buildOpportunitiesFromRawOdds, normalizeOutcomeName]
- [Source: _bmad-output/implementation-artifacts/7-3-automatic-event-discovery-batch-scanning.md]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
