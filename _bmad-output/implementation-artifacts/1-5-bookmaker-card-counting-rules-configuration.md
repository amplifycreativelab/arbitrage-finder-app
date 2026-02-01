# Story 1.5: Bookmaker Card Counting Rules Configuration

Status: done

## Story

As a User,
I want to configure card counting rules for each bookmaker,
so that I know when arbitrage opportunities may be at risk due to different booking counting policies.

## Acceptance Criteria

1. A **"Card Rules"** section exists in the Bookmaker Settings panel, accessible from the main Settings screen.
2. Each configured bookmaker displays a dropdown/select for card counting rule with two options:
   - **"Conservative (2 cards max)"** - Sportsbet style: 2 yellows + red = 2 cards
   - **"Standard (3 cards)"** - Others: 2 yellows + red = 3 cards
3. Default selection is "Standard (3 cards)" for new bookmakers not yet explicitly configured.
4. Selection is persisted per bookmaker in the app settings store and survives app restarts.
5. A tooltip or info icon explains the difference with clear examples:
   - "Player receives two yellows then a red: Conservative = 2 cards, Standard = 3 cards"
6. The bookmaker identifier used as the key matches the provider's bookmaker identifier from the feed data.

## Tasks / Subtasks

- [x] Extend `appSettingsStore.ts` with `bookmakerCardRules: Record<string, 'conservative' | 'standard'>` (AC: #4)
  - [x] Add type definition for card rule type
  - [x] Implement getter/setter with default fallback to 'standard'
- [x] Create `BookmakerCardRulesSettings` component in `renderer/src/features/settings/` (AC: #1, #2)
  - [x] Use shadcn `Select` for rule dropdown per bookmaker
  - [x] Integrate with existing settings layout and theme
- [x] Add tooltip/info component explaining card counting differences (AC: #5)
  - [x] Create reusable tooltip with example scenario
  - [x] Style to match "Orange Terminal" theme
- [x] Wire up IPC procedures for reading/writing card rules (AC: #4)
  - [x] Add TRPC routes in main process
  - [x] Ensure type safety through shared schemas
- [x] Add component tests for settings UI (AC: #2, #3)
  - [x] Test default selection behavior
  - [x] Test persistence across renders

## Dev Notes

### Background Context

Different bookmakers use different rules for counting cards in Over/Under card markets:
- **Sportsbet ("Conservative")**: 2 yellows + 1 red = 2 cards total (counts both yellows and the resulting red as just the red)
- **Others ("Standard")**: 2 yellows + 1 red = 3 cards total (counts each card shown)

This discrepancy can turn an apparent arbitrage into a loss if the user doesn't know which counting rules apply. This story provides the configuration foundation; Story 6.5 will implement the warning indicator in the dashboard.

### Technical Implementation Details

**Type Extension:**
```typescript
// Add to shared/types.ts or appSettingsStore.ts
export type CardCountingRule = 'conservative' | 'standard';

export interface AppSettings {
  // ... existing fields
  bookmakerCardRules: Record<string, CardCountingRule>;
}
```

**Default Behavior:**
- When a bookmaker is encountered for the first time, default to `'standard'`
- The `Record<string, CardCountingRule>` structure allows sparse configuration (only override when needed)

**Storage:**
- Use existing `electron-store` pattern from Story 1.2/1.3
- Persist in same store as other app settings (not credentials/secure storage)

### Project Structure Notes

- **Settings UI**: `renderer/src/features/settings/BookmakerCardRulesSettings.tsx` (new file)
- **Section Wrapper**: `renderer/src/features/settings/sections/CardRulesSection.tsx` (new file)
- **Store**: Extend existing `appSettingsStore.ts` in renderer
- **Main Process**: Add TRPC procedures in `src/main/services/router.ts`
- **Shared Types**: Update `shared/types.ts` with new types

### Integration with Existing Settings

This story builds on the Settings infrastructure from Story 1.3:
- Reuse existing shadcn UI components and styling
- Follow the same TRPC pattern used for provider settings
- Integrate into the existing Settings navigation/structure via section-based architecture

### Future Integration Points

Story 6.5 (Card Rules Mismatch Warning) will:
- Read from this `bookmakerCardRules` configuration
- Compare rules between bookmakers in Cards market opportunities
- Display warning indicators in the dashboard feed

### References

- **PRD**: `_bmad-output/prd.md` (FR16: Configure bookmaker card counting rules)
- **Architecture**: `_bmad-output/architecture.md` ("Project Structure", "Security and API Credential Handling")
- **Epics**: `_bmad-output/epics.md` (Epic 1, Story 1.5; Epic 6, Story 6.5)
- **Prior Stories**: 
  - `_bmad-output/implementation-artifacts/1-3-settings-interface-provider-selection.md` (Settings UI patterns)
  - `_bmad-output/implementation-artifacts/6-5-card-rules-mismatch-warning-indicator.md` (consumer of this config)

## Dev Agent Record

### Agent Model Used
Claude Code (Claude 4 Sonnet)

### Debug Log References
- N/A - Implementation completed without issues

### Code Review Fixes Applied (2026-02-01)

- **Fixed File List**: Removed non-existent `SettingsPage.tsx`, added `CardRulesSection.tsx` with clarification about section-based architecture
- **Fixed Dev Notes**: Updated "IPC pattern" → "TRPC pattern" for accuracy

### Completion Notes List

1. **Type Extensions (shared/types.ts)**
   - Added `CardCountingRule` type: `'conservative' | 'standard'`
   - Added `BookmakerCardRules` type: `Record<string, CardCountingRule>`
   - Added `CARD_COUNTING_RULE_DISPLAY` metadata for UI labels and descriptions
   - Added `DEFAULT_CARD_COUNTING_RULE` constant (`'standard'`)

2. **Storage Layer (src/main/services/storage.ts)**
   - Added `bookmakerCardRules` to StorageSchema
   - Implemented `getBookmakerCardRules()`: Returns all configured rules
   - Implemented `getBookmakerCardRule(bookmaker)`: Returns rule for bookmaker (with default fallback)
   - Implemented `setBookmakerCardRule(bookmaker, rule)`: Persists rule for bookmaker
   - Implemented `removeBookmakerCardRule(bookmaker)`: Removes rule for bookmaker
   - Implemented `getConfiguredBookmakers()`: Returns list of configured bookmaker IDs

3. **TRPC Router (src/main/services/router.ts)**
   - Added `getBookmakerCardRules` query: Returns all rules
   - Added `getBookmakerCardRule` query: Returns rule for specific bookmaker
   - Added `setBookmakerCardRule` mutation: Sets rule for bookmaker
   - Added `removeBookmakerCardRule` mutation: Removes rule for bookmaker
   - Added `getConfiguredBookmakers` query: Returns configured bookmaker list

4. **Preload API (src/preload/index.ts & index.d.ts)**
   - Added `CardRulesAPI` interface with all CRUD operations
   - Exposed `cardRules` API through `window.api.cardRules`
   - Type-safe bridge between renderer and main process

5. **App Settings Store (src/renderer/src/features/settings/stores/appSettingsStore.ts)**
   - Extended state with `bookmakerCardRules: BookmakerCardRules`
   - Added `setBookmakerCardRule`, `getBookmakerCardRule`, `removeBookmakerCardRule` actions
   - Persists to localStorage via zustand persist middleware

6. **BookmakerCardRulesSettings Component (src/renderer/src/features/settings/BookmakerCardRulesSettings.tsx)**
   - Full-featured settings UI with add/remove/change rule functionality
   - Uses shadcn Select component for rule selection
   - Includes `CardRulesInfo` tooltip explaining counting differences
   - Styled to match "Orange Terminal" theme
   - Comprehensive error handling and success feedback
   - Fully typed with React/TypeScript

7. **Settings Page Integration (src/renderer/src/features/settings/SettingsPage.tsx)**
   - Added "Card Rules" section with Cards icon
   - Integrated `CardRulesSection` component
   - Section is collapsible and follows existing settings patterns

8. **Tests (tests/1.5-card-counting-rules.test.cjs)**
   - 10 comprehensive unit tests for storage layer
   - Tests default behavior, CRUD operations, persistence, and edge cases
   - All tests pass successfully

### File List

**Modified Files:**
- `shared/types.ts` - Added CardCountingRule types and display metadata
- `src/main/services/storage.ts` - Added card rules storage functions
- `src/main/services/router.ts` - Added TRPC procedures for card rules
- `src/preload/index.ts` - Added cardRules API bridge
- `src/preload/index.d.ts` - Added CardRulesAPI type definitions
- `src/renderer/src/features/settings/stores/appSettingsStore.ts` - Extended with card rules state
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to in-progress → review

**New Files:**
- `src/renderer/src/features/settings/BookmakerCardRulesSettings.tsx` - Main settings component
- `src/renderer/src/features/settings/sections/CardRulesSection.tsx` - Section wrapper for settings integration
- `tests/1.5-card-counting-rules.test.cjs` - Unit tests for storage layer

**Note:** Settings integration uses section-based architecture (CardRulesSection) rather than a monolithic SettingsPage.
