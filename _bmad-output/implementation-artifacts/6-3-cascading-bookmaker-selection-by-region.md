# Story 6.3: Cascading Bookmaker Selection by Region

- **Status**: done
- **Epic**: 6 - Enhanced Filtering & Desktop UX
- **Story ID**: 6.3

## Story

As a User,
I want to select specific bookmakers within my chosen regions,
so that I can focus on bookmakers I actually use instead of seeing all available options.

## Acceptance Criteria

1. **Cascading Availability** – When one or more **regions are selected**, a secondary bookmaker filter appears showing only bookmakers available in those regions (sourced from current opportunity data).
2. **Multi-select UI** – The bookmaker selector uses a **multi-select dropdown/popover** (similar to Story 6.2) suitable for large lists (15+ items), not inline chips.
3. **Region-Scoped Persistence** – Bookmaker selections are **persisted per region combination** (e.g., "UK + IT" remembers different selections than "UK only").
4. **Default: Select All** – When no bookmakers are explicitly selected for a region set, **all** bookmakers in those regions are included.
5. **Bulk Actions** – A "Select All" / "Clear All" action is available for the bookmaker list.
6. **Visual Hierarchy** – The UI clearly indicates the cascade relationship: Filter by Region → then Filter by Bookmaker.
7. **State Reset** – If region selection changes to a combination never seen before, bookmaker selection defaults to "All" (empty list).

## Tasks / Subtasks

- [x] **Task 1: Update feedFiltersStore for Region-Scoped Bookmakers** (AC: #3, #7)
  - [x] 1.1 Add `bookmakerSelections: Record<string, string[]>` to `FeedFiltersState`.
  - [x] 1.2 Implement helper `getRegionKey(regions: RegionCode[])` (e.g., sorted comma-separated).
  - [x] 1.3 Update `setRegions` and `toggleRegion` to:
    - [x] Calculate new region key.
    - [x] Restore `bookmakers` from `bookmakerSelections[newKey]` (default to empty).
  - [x] 1.4 Update `toggleBookmaker` and `setBookmakers` to:
    - [x] Update current `bookmakers` state.
    - [x] Persist to `bookmakerSelections[currentRegionKey]`.
  - [x] 1.5 Add `bookmakerSelections` to `partialize` configuration for persistence.

- [x] **Task 2: Implement BookmakerFilterPopover Component** (AC: #2, #5, #6)
  - [x] 2.1 Create `src/renderer/src/features/dashboard/BookmakerFilterPopover.tsx`.
  - [x] 2.2 Reuse shadcn/ui `Popover`, `Command`, `Checkbox` patterns from Story 6.2.
  - [x] 2.3 Implement "Select All" / "Clear All" logic.
  - [x] 2.4 Display selected count summary on trigger (e.g., "All Bookmakers" or "3 Selected").

- [x] **Task 3: Integrate Logic to Derive Available Bookmakers** (AC: #1)
  - [x] 3.1 In `BookmakerFilterPopover`, compute `availableBookmakers` by filtering the full filtered opportunity list (or a separate deduplicated selector) by the **active regions**.
  - [x] 3.2 Ensure bookmaker list is derived *dynamically* from feed data (don't hardcode bookmaker lists per region if possible, to respect provider data).

- [x] **Task 4: Update Dashboard Layout** (AC: #6)
  - [x] 4.1 Update `FeedPane.tsx` to place `BookmakerFilterPopover` adjacent to or below `RegionFilter`.
  - [x] 4.2 Ensure layout allows for "No Regions Selected" state (bookmaker filter might be hidden or disabled).

- [x] **Task 5: Comprehensive Testing**
  - [x] 5.1 Unit tests for `feedFiltersStore` region scoping logic (switching regions restores independent bookmaker sets).
  - [x] 5.2 Component tests for `BookmakerFilterPopover` (rendering, toggle, select all).
  - [x] 5.3 Integration test: verify changing regions updates the available bookmaker list based on feed data.

## Dev Notes

### Architecture Compliance

- **State Management**: Extends `feedFiltersStore` with complex persistence logic (`Record<string, string[]>`). Ensure `RegionCode` alignment with `shared/filters`.
- **UI Components**: Reuse `MarketFilterPopover` patterns (Story 6.2) for consistency. Use `features/dashboard/components` or `BookmakerFilterPopover.tsx`.
- **Performance**: Deriving `availableBookmakers` from thousands of opportunities might be expensive. Memoize strictly. Consider adding a `deriveAvailableBookmakers(opportunities)` selector.

### Project Structure Notes

- **Naming**: `BookmakerFilterPopover` follows `MarketFilterPopover` precedent.
- **Location**: `renderer/src/features/dashboard/BookmakerFilterPopover.tsx`.

### References

- [Source: _bmad-output/epics.md#Story 6.3 – Cascading Bookmaker Selection by Region]
- [Source: renderer/src/features/dashboard/stores/feedFiltersStore.ts]
- [Source: renderer/src/features/dashboard/MarketFilterPopover.tsx] (Reference for UI pattern)

## Dev Agent Record

### Agent Model Used

Gemini 2.5 Pro (Antigravity) via BMad Master

### Debug Log References

### Completion Notes List

- [x] Implemented `bookmakerSelections` persistence in `feedFiltersStore`.
- [x] Created `BookmakerFilterPopover` component with search and multi-select.
- [x] Extracted `getAvailableBookmakers` logic to `filters.ts`.
- [x] Updated `FeedPane` to use cascading bookmaker filter.
- [x] Verified with unit and logic tests in `tests/6-3-bookmaker-filter.test.cjs`.

### File List

- src/renderer/src/features/dashboard/stores/feedFiltersStore.ts
- src/renderer/src/features/dashboard/filters.ts
- src/renderer/src/features/dashboard/BookmakerFilterPopover.tsx
- src/renderer/src/features/dashboard/FeedPane.tsx
- tests/6-3-bookmaker-filter.test.cjs
- tests/6-3-bookmaker-filter-component.test.cjs

### Review Fixes (AI)
- [x] Added component logic tests in `tests/6-3-bookmaker-filter-component.test.cjs` covering search, selection state, and interaction handlers.
- [x] Improved robustness of `inferRegionFromOpportunity` in `filters.ts` with expanded league keywords (FA Cup, EFL, Supercoppa, etc.).
