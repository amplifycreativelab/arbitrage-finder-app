# Story 6.5: Card Rules Mismatch Warning Indicator

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

**As a** User,
**I want** to see a warning when an arbitrage opportunity involves bookmakers with different card counting rules,
**so that** I don't place bets that could result in a loss due to rule discrepancies.

## Background

When an arbitrage opportunity appears in Cards Over/Under markets (e.g., Over 4.5 cards vs Under 4.5 cards), the "guaranteed profit" assumes both bookmakers count cards the same way. However:
- Bookmaker A might count 2 yellows + 1 red as 2 cards (Sportsbet style - "Conservative")
- Bookmaker B might count the same scenario as 3 cards ("Standard")

In edge cases where the final card count lands between these definitions (e.g., exactly 2 cards in the match), one bet wins while the other loses—turning an "arb" into a loss.

This story depends on Story 1.5 (Bookmaker Card Counting Rules Configuration) which provides the configuration UI for setting each bookmaker's card counting rule.

## Acceptance Criteria

1. For every arbitrage opportunity in the **Cards** market group (`marketGroup: 'cards'`):
   - Check if the participating bookmakers have different card counting rules configured (Story 1.5)
   - If rules differ, display a **warning icon** (⚠️ or similar) in the opportunity row

2. **Tooltip/overlay** on hover shows:
   - "Card counting rules differ between bookmakers"
   - Bookmaker A: [Conservative/Standard] - [X cards for YY+R]
   - Bookmaker B: [Conservative/Standard] - [X cards for YY+R]

3. The warning is **non-blocking**—the opportunity still appears in the feed but is visually flagged

4. Clicking the warning icon opens a modal or expanded view explaining:
   - The exact rule difference
   - Example scenario where this could cause a loss
   - Suggestion to verify both bookmakers' settlement before placing bets

5. Warning respects the user's configured rules per bookmaker (falls back to "Standard" if not configured)

## Tasks / Subtasks

- [x] Extend `ArbitrageOpportunity` type with card rules warning metadata (AC: 1)
  - [x] Add `cardRulesWarning` field to type definition in `shared/types.ts`
  - [x] Update schema validation in `shared/schemas.ts`
- [x] Implement card rules mismatch detection logic (AC: 1)
  - [x] Create utility function `detectCardRulesMismatch()` in `src/main/services/calculator.ts`
  - [x] Read card rules from storage via `getBookmakerCardRule()`
  - [x] Apply detection only when `marketGroup === 'cards'`
  - [x] Cache bookmaker rule lookups per feed refresh for performance
- [x] Add warning indicator to feed row UI (AC: 1, 2)
  - [x] Create `CardRulesWarningIcon` component in `src/renderer/src/features/dashboard/`
  - [x] Integrate icon into `FeedTable.tsx` row renderer
  - [x] Implement tooltip with bookmaker rule details
- [x] Create warning detail modal (AC: 4)
  - [x] Create `CardRulesWarningModal` component
  - [x] Show rule difference explanation and example scenario
  - [x] Add click handler from warning icon to open modal
- [x] Handle fallback when rules not configured (AC: 5)
  - [x] Default to "Standard" rule for unknown bookmakers
  - [x] Uses existing `DEFAULT_CARD_COUNTING_RULE` from storage layer

## Dev Notes

### Type Extension

```typescript
// shared/types.ts
interface ArbitrageOpportunity {
  // ... existing fields ...
  cardRulesWarning?: {
    bookmakerA: { name: string; rule: 'conservative' | 'standard' };
    bookmakerB: { name: string; rule: 'conservative' | 'standard' };
    mismatch: boolean;
  };
}
```

### Detection Logic Location

Warning logic runs during opportunity normalization (after arb detection) in the calculator or adapter layer. Recommended location: `src/main/services/calculator.ts` within the `buildOpportunitiesFromRawOdds()` function or as a post-processing step.

### Performance Considerations

- Cache bookmaker rule lookups per feed refresh to avoid repeated store reads
- Detection only applies to `marketGroup === 'cards'` opportunities
- Use memoization if opportunity list is re-rendered frequently

### Dependencies

- **Story 1.5**: Bookmaker Card Counting Rules Configuration (provides `appSettingsStore.bookmakerCardRules`)
- **Story 6.1**: Expanded Two-Way Market Types (establishes `marketGroup: 'cards'` classification)
- **Story 7.4**: Comprehensive Market Normalization (cards support)

### Project Structure Notes

- **Main Process**: `src/main/services/calculator.ts` - detection logic
- **Renderer**: `src/renderer/src/features/dashboard/` - UI components
- **Shared**: `shared/types.ts`, `shared/schemas.ts` - type definitions

### Architecture Alignment

- Follows **High-Risk Domain Patterns** → Arbitrage Correctness (R-002)
- Uses existing **Zustand store** pattern for settings access
- Integrates with **SystemStatus/ProviderStatus** pattern for non-blocking warnings
- Uses **shadcn/ui** components for tooltip and modal (consistent with Story 1.5)

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (kimi-cli)

### Debug Log References

- TypeScript compilation: All files compile without errors
- Build: Verified schema validation with existing test patterns
- Code Review (CR 6.5): All findings addressed
  - [H-1] FIXED: Added `tests/6.5-card-rules-warning.test.cjs` with 14 unit tests
  - [M-2] VERIFIED: `clearCardRulesCache()` already called at `deepScan.ts:2902`
  - [M-1] FIXED: Updated File List with missing files
  - [L-1] FIXED: Removed main process import from `CardRulesWarningIcon.tsx`
    - Moved helper functions inline to renderer component
    - Component now imports only from `shared/types` (renderer-safe)
  - All 14 new tests pass (13 P0, 1 P1)

### Completion Notes List

1. **Type Extension (AC: 1)**: Added `CardRulesWarning` interface and `cardRulesWarning` optional field to `ArbitrageOpportunity` type in `shared/types.ts`. Updated Zod schema in `shared/schemas.ts` with proper validation for the new field.

2. **Detection Logic (AC: 1)**: Implemented `detectCardRulesMismatch()` function in `src/main/services/calculator.ts` with:
   - Cached rule lookups via `cardRulesCache` to avoid repeated store reads
   - Market group filtering (only applies to 'cards' group)
   - Integration into `buildOpportunitiesFromRawOdds()` in `deepScan.ts`
   - Integration into `createCrossProviderOpportunity()` in `crossProviderCalculator.ts`

3. **UI Components (AC: 1, 2, 4)**: Created:
   - `CardRulesWarningIcon.tsx`: Warning icon (⚠️) with hover tooltip showing bookmaker rules
   - `CardRulesWarningModal.tsx`: Full modal with risk explanation, example scenario, and recommendations
   - Integrated into `FeedTable.tsx` with data attributes for testing

4. **Fallback Handling (AC: 5)**: Uses existing `DEFAULT_CARD_COUNTING_RULE` ('standard') via storage layer's `getBookmakerCardRule()` function.

### File List

| File | Purpose | Status |
|------|---------|--------|
| `shared/types.ts` | Extend `ArbitrageOpportunity` type with `cardRulesWarning` field | ✅ |
| `shared/schemas.ts` | Update Zod schema with `cardRulesWarningSchema` | ✅ |
| `src/main/services/calculator.ts` | Card rules mismatch detection logic and cache | ✅ |
| `src/main/services/deepScan.ts` | Integration of detection in opportunity building | ✅ |
| `src/main/services/crossProviderCalculator.ts` | Cross-provider opportunity detection | ✅ |
| `src/main/services/storage.ts` | `getBookmakerCardRule()` storage function | ✅ |
| `src/renderer/src/features/dashboard/CardRulesWarningIcon.tsx` | Warning icon component with tooltip | ✅ |
| `src/renderer/src/features/dashboard/CardRulesWarningModal.tsx` | Detailed warning modal | ✅ |
| `src/renderer/src/features/dashboard/FeedTable.tsx` | Integration point for warning icon | ✅ |
| `tests/6.5-card-rules-warning.test.cjs` | Unit tests for detection logic, schema validation, integration | ✅ |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-01 | Story 6.5 implementation complete. Added card rules mismatch warning indicator for Cards market group opportunities. |
| 2026-02-01 | Code review CR 6.5: Added comprehensive unit tests (14 tests), verified cache clearing, updated File List documentation. |

---

## References

- [Source: _bmad-output/epics.md#story-6-5-card-rules-mismatch-warning-indicator]
- [Source: _bmad-output/epics.md#story-1-5-bookmaker-card-counting-rules-configuration]
- [Source: _bmad-output/architecture.md#high-risk-domain-patterns-arbitrage-correctness-r-002]
- [Source: _bmad-output/architecture.md#data-architecture]
- FR17: Warn on card rules mismatch in arbitrage opportunities
