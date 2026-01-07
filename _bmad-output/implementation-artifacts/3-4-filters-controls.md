# Story 3.4: Filters & Controls

Status: done

## Story

As a User,  
I want to filter by region, sport, ROI, and market type,  
so that I only see relevant opportunities in the feed.

## Acceptance Criteria

1. The dashboard exposes filter controls in or above the left-pane feed for at least Region, Sport, Market Type (Moneyline, Draw No Bet, Totals), and a minimum ROI threshold, and applying any filter updates the visible `ArbitrageOpportunity[]` client-side via Zustand without triggering additional API calls.
2. Region and Sport filters default to sensible values (for example, all enabled on first run) and ensure that only opportunities whose bookmaker region and sport match the selected options are displayed, with an explicit "No opportunities match the current filters" empty state when nothing is visible.
3. Market Type filters allow users to include/exclude supported market types (at minimum Moneyline, Draw No Bet, Totals) while keeping the underlying opportunity model unchanged, and the feed grid clearly reflects the active selection via labels or chip-like indicators without breaking the Orange Terminal theme.
4. ROI filtering allows the user to set a minimum ROI threshold (for example via a numeric input or slider) and ensures that only opportunities at or above that threshold are rendered, working consistently with existing sorting, virtualization, and staleness visuals from Stories 3.2 and 3.3.
5. Filter preferences (Region, Sport, Market Type, ROI threshold) are persisted between sessions using the existing persisted state pattern (for example a zustand/persist-backed store) so that restarting the app restores the last-used filter configuration without requiring re-entry.
6. Component or integration tests cover: (a) basic filter behavior for each dimension in isolation, (b) combinations of Region/Sport/Market Type/ROI filters, (c) persistence of filter state across reloads, and (d) interaction with existing feed behavior (sorting, virtualization, and staleness indicators) without regressions.

## Tasks / Subtasks

- [x] Design the filter state model and wiring (AC: #1, #2, #3, #4).
  - [x] Extend the existing feed store (for example `feedStore` under `src/renderer/src/features/dashboard/stores/feedStore.ts`) or introduce a small filter-focused store to track selected regions, sports, market types, and minimum ROI.
  - [x] Add derived selectors or helper functions that compute a filtered `ArbitrageOpportunity[]` array from the raw feed snapshot based on the current filter state, ensuring filtering stays purely client-side.
  - [x] Define canonical values for regions (e.g. AU, UK, IT, RO), sports (e.g. Soccer, Tennis), and market types (Moneyline, Draw No Bet, Totals) to keep filters aligned with the PRD and data engine.
- [x] Implement filter UI controls in the dashboard feed pane (AC: #1, #2, #3, #4).
  - [x] Add a filter bar or equivalent UI in `FeedPane` or a dedicated component under `src/renderer/src/features/dashboard/` that renders Region, Sport, Market Type, and ROI controls above the grid without breaking the split-pane layout from Story 3.1.
  - [x] Wire the controls to the filter state model so that changing any filter immediately updates the derived opportunities set and the rendered rows in `FeedTable`.
  - [x] Ensure the filter UI respects the Orange Terminal theme (dark background, accent `#F97316`) and remains usable at the dashboard's minimum width.
  - [x] Add an explicit "No opportunities match the current filters" empty-state message when the filtered result set is empty while the underlying feed still has data.
- [x] Persist filter preferences between sessions (AC: #5).
  - [x] Reuse the existing persisted-state pattern (for example `zustand/persist` or an equivalent) to store Region, Sport, Market Type, and ROI filter settings in a non-sensitive preferences store.
  - [x] Restore persisted filter state on dashboard load so that filters are reapplied before or as soon as the first feed snapshot is rendered.
  - [x] Confirm that persistence plays well with provider changes and does not leak across epics or unrelated screens.
- [x] Add tests for filter behavior and integration (AC: #1, #2, #3, #4, #5, #6).
  - [x] Add a new Epic 3 test file (for example `tests/3.4-filters-controls.test.cjs` or `src/renderer/src/features/dashboard/__tests__/3-4-filters-controls.test.tsx`) that renders the dashboard or feed with a seeded `ArbitrageOpportunity[]` list and asserts that Region/Sport/Market Type/ROI filters behave as expected in isolation and in combination.
  - [x] Add tests that verify filter changes do not trigger additional TRPC/network calls beyond the normal feed snapshot polling behavior.
  - [x] Add tests that exercise saved filter preferences by seeding persisted state, rendering the dashboard, and asserting that filters and resulting rows reflect the restored configuration.
  - [x] Add regression checks to ensure existing behaviors from Stories 3.2 and 3.3 (sorting, virtualization, staleness labels/opacity) still function correctly when filters are active.

## Dev Notes

- This story builds on the Epic 3 dashboard foundation, layering user-controllable filters for Region, Sport, Market Type, and ROI on top of the existing feed grid from Story 3.2 and staleness visuals from Story 3.3 so users can focus on the subset of opportunities that matter to them.
- Filtering is intentionally implemented purely in the renderer against normalized `ArbitrageOpportunity[]` data provided by the data engine (adapters and poller), keeping provider logic and rate limiting responsibilities in Epic 2 and avoiding extra network requests when filters change.
- Filter state is modeled via Zustand (reusing the feed store pattern) so that the grid, staleness ticker, and any future right-pane interactions can consume the same filtered collection without duplicating logic.
- Persisting filter preferences aligns with the PRD's expectation that the app behave like a focused desktop tool: once a user dials in their regions, sports, and ROI/market-type preferences, those settings should "stick" across sessions without additional configuration.
- Accessibility and keyboard-first operation remain priorities: filter controls should be reachable via keyboard, provide clear labels, and avoid relying on color alone so they compose cleanly with Epic 4's planned interaction stories.

### Project Structure Notes

- Filter state and helpers should live alongside existing dashboard feed code under `src/renderer/src/features/dashboard/`, ideally extending `feedStore` or a closely related store module so that filtering logic is centralized and testable.
- Filter UI components should be colocated with the feed layout (for example in `FeedPane` or a small `FeedFilters` component) rather than embedded directly in `FeedTable`, keeping the grid focused on tabular rendering and reusability.
- Tests for filters and controls should be added under `tests/3.4-filters-controls.test.cjs` or the dashboard test directory, following the existing patterns from `tests/3.2-feed-left-pane-data-grid.test.cjs` and `tests/3.3-visual-staleness-logic.test.cjs` for fixtures and test IDs.

### References

- PRD: `_bmad-output/PRD.md` (FR3: region filters, FR4: sport toggles, FR10: ROI threshold, FR11: Market Type filters).
- Architecture: `_bmad-output/architecture.md` ("Data Architecture", "Implementation Patterns - Lifecycle/Consistency", "UX Error and Degraded States").
- UX: `_bmad-output/ux-design-specification.md` (Hybrid Dashboard layout, Orange Terminal theme, filter/control guidance for the left pane).
- Epics: `_bmad-output/epics.md` (Epic 3, Story 3.4 - Filters & Controls).
- Prior Stories: `_bmad-output/implementation-artifacts/3-1-main-layout-split-pane.md`, `_bmad-output/implementation-artifacts/3-2-feed-left-pane-data-grid.md`, `_bmad-output/implementation-artifacts/3-3-visual-staleness-logic.md`.

## Dev Agent Record

### Context Reference

- _bmad-output/implementation-artifacts/3-4-filters-controls.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex CLI / GPT-5.1, #yolo mode); BMAD Developer Agent (*develop-story* workflow via Codex CLI / GPT-5.1)

### Debug Log References

- [3.4-FILTERS-MODEL-001] Filter state modeled via a dedicated dashboard store built on top of normalized `ArbitrageOpportunity[]` data so that Region, Sport, Market Type, and ROI filters are applied consistently across the feed.
- [3.4-FILTERS-PERSISTENCE-001] Filter preferences persisted using the existing non-sensitive settings pattern so users retain their configuration between sessions without impacting secure API key storage.
- [3.4-FILTERS-INTEGRATION-001] Filters integrate with the existing feed grid, staleness visuals, and virtualization without introducing additional network calls or breaking keyboard navigation.
- [3.4-FILTERS-MODEL-002] Implemented `useFeedFiltersStore` (Zustand + persist) and `applyDashboardFilters` with canonical Region (AU/UK/IT/RO), Sport (soccer/tennis), Market Type (moneyline/draw-no-bet/totals), and ROI threshold fields, keeping filtering purely client-side against `ArbitrageOpportunity[]` snapshots.
- [3.4-FILTERS-UI-001] Added `FeedFilters` bar to `FeedPane` so Region/Sport/Market/ROI controls sit above the grid, use chip-like toggles matching the Orange Terminal theme, and expose an explicit "No opportunities match the current filters" empty state when the underlying feed has data but the filtered set is empty.
- [3.4-FILTERS-TESTS-001] Extended Epic 3 tests in `tests/3.4-filters-controls.test.cjs` to cover per-dimension filter behavior, combined Region/Sport/Market/ROI predicates, persisted filter configuration, guarantees that applying filters does not trigger network calls, and virtualization behavior on filtered result sets.

### Completion Notes List

- Story 3.4 drafted with acceptance criteria, tasks, and implementation notes grounded in PRD FR3, FR4, FR10, FR11 and the Epic 3 dashboard design, focusing on client-side filters, persisted preferences, and clean integration with the existing feed/staleness pipeline.
- Story 3.4 implemented end-to-end: added a dedicated persisted filter store and dashboard filter helpers, wired a `FeedFilters` UI bar into `FeedPane` above `FeedTable`, introduced a filtered empty state, and created Epic 3.4 tests validating filter behavior, combinations, persistence, non-network filtering, and virtualization/staleness integration, with the full regression suite passing.

### File List

- _bmad-output/PRD.md
- _bmad-output/architecture.md
- _bmad-output/ux-design-specification.md
- _bmad-output/epics.md
- _bmad-output/implementation-artifacts/3-1-main-layout-split-pane.md
- _bmad-output/implementation-artifacts/3-2-feed-left-pane-data-grid.md
- _bmad-output/implementation-artifacts/3-3-visual-staleness-logic.md
- _bmad-output/implementation-artifacts/3-4-filters-controls.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- shared/filters.ts
- src/renderer/src/features/dashboard/FeedPane.tsx
- src/renderer/src/features/dashboard/FeedTable.tsx
- src/renderer/src/features/dashboard/filters.ts
- src/renderer/src/features/dashboard/stores/feedFiltersStore.ts
- tests/3.2-feed-left-pane-data-grid.test.cjs
- tests/3.3-visual-staleness-logic.test.cjs
- tests/3.4-filters-controls.test.cjs

### Change Log

- Created initial draft for Story 3.4 - Filters & Controls, defining acceptance criteria, tasks, and implementation notes grounded in PRD FR3, FR4, FR10, FR11, Epics, and the existing dashboard feed layout so the implementation team can add client-side filters and persisted preferences without disrupting the current grid or staleness behavior.
- Implemented Story 3.4 - Filters & Controls by adding a persisted dashboard filter store, region/sport/market/ROI filtering pipeline, a `FeedFilters` UI bar above the feed grid, an explicit filtered empty state, and a dedicated Epic 3.4 test suite that exercises filter behavior, combinations, persistence, and integration with existing sorting, virtualization, and staleness logic, with all tests passing.

## Senior Developer Review (AI)

Reviewer: stefano  
Date: 2025-11-21  
Outcome: Changes Requested — edge-case semantics for empty Region/Sport/Market selections do not strictly satisfy AC #2, and there are minor test coverage gaps.

### Summary

- Filters are implemented as a dedicated persisted Zustand store plus a pure `applyDashboardFilters` helper, wired into `FeedPane` so all filtering remains client-side against `ArbitrageOpportunity[]` snapshots (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:1, src/renderer/src/features/dashboard/filters.ts:18, src/renderer/src/features/dashboard/FeedPane.tsx:180).
- Region, Sport, Market, and ROI filters are exposed via a compact `FeedFilters` bar above the grid, using chip-like toggles and a numeric ROI input that match the Orange Terminal theme and integrate cleanly with existing sorting, virtualization, and staleness behavior (src/renderer/src/features/dashboard/FeedPane.tsx:90, src/renderer/src/features/dashboard/FeedTable.tsx:63).
- Tests exercise the core filter predicates, filter composition, interaction with the feed filters store, network isolation, and virtualization behavior, but they do not yet cover the empty-filtered view UI or persistence across reloads (tests/3.4-filters-controls.test.cjs:71, tests/3.2-feed-left-pane-data-grid.test.cjs:44, tests/3.3-visual-staleness-logic.test.cjs:41).

### Key Findings

- [HIGH] Empty Region/Sport/Market selections behave as "no filter" rather than "no opportunities", which conflicts with the mental model implied by AC #2 ("selected options") and can confuse users when all chips appear off but the grid still shows data (src/renderer/src/features/dashboard/filters.ts:110, src/renderer/src/features/dashboard/FeedPane.tsx:29).
- [MEDIUM] There is no automated regression test asserting the "No opportunities match the current filters" empty-state rendering or the wiring between the filter store, `FeedFilters`, and `FeedTable` (AC #2, AC #6) (src/renderer/src/features/dashboard/FeedPane.tsx:232, tests/3.4-filters-controls.test.cjs:208).
- [LOW] Region inference is heuristically derived from league strings and currently covers a small set of competitions (Serie A/B/Coppa Italia, Wimbledon, English leagues, Liga I/1/Romania); this is acceptable for initial scope but should be revisited if new regions or sports are added (src/renderer/src/features/dashboard/filters.ts:32).
- [LOW] The "Active filters applied." banner appears even when filters are at defaults, which is technically accurate but may over-signal filtering; consider tightening the condition to activate only when a subset or non-zero ROI threshold is applied (src/renderer/src/features/dashboard/FeedPane.tsx:29).

### Acceptance Criteria Coverage

| AC# | Description | Status   | Evidence |
| --- | ----------- | -------- | -------- |
| 1   | Filter controls for Region, Sport, Market Type, and ROI, with client-side filtering via Zustand and no extra API calls. | Pass | `FeedPane` wires `useFeedStore` opportunities through `applyDashboardFilters` without touching TRPC or the poller (src/renderer/src/features/dashboard/FeedPane.tsx:180, src/renderer/src/features/dashboard/filters.ts:103), and tests verify no network usage while filtering (tests/3.4-filters-controls.test.cjs:273). |
| 2   | Region/Sport defaults and empty state when filters hide all data. | Pass | Defaults are all-enabled via `defaultState`, and the explicit empty-state message is rendered when `hasUnderlyingData && filteredCount === 0` (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:59, src/renderer/src/features/dashboard/FeedPane.tsx:232). Empty Region/Sport/Market selections are now treated as active filters and produce an empty result set instead of "no filter", with behavior validated by `3.4-FILTERS-007` (src/renderer/src/features/dashboard/filters.ts:103, tests/3.4-filters-controls.test.cjs:317). |
| 3   | Market Type include/exclude behavior with unchanged opportunity model and visible chip-like indicators. | Pass | Market type is inferred from leg markets and compared against the selected set without modifying opportunity structure (src/renderer/src/features/dashboard/filters.ts:69), and the UI renders per-market chips aligned with the Orange Terminal styling (src/renderer/src/features/dashboard/FeedPane.tsx:129). |
| 4   | ROI threshold filtering that composes with sorting, virtualization, and staleness visuals. | Pass | The ROI threshold is stored as a decimal and applied as a `roi >= minRoi` predicate (src/renderer/src/features/dashboard/filters.ts:141); virtualization and staleness continue to function on the filtered list, as validated by tests (src/renderer/src/features/dashboard/FeedTable.tsx:63, tests/3.4-filters-controls.test.cjs:317, tests/3.3-visual-staleness-logic.test.cjs:65). |
| 5   | Persisted Region/Sport/Market/ROI preferences across sessions using the existing pattern. | Pass | `useFeedFiltersStore` uses `persist` with JSON storage backed by `window.localStorage` in the renderer and a safe in-memory fallback for tests (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:38), and only the four filter fields are persisted via `partialize` (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:133). |
| 6   | Tests for per-dimension filters, combinations, persistence, and interaction with existing feed behavior. | Pass | Tests cover per-dimension behavior, combinations, store-driven configuration, network isolation, virtualization, the filtered empty-state UI, and restored persisted filter configuration (tests/3.4-filters-controls.test.cjs:71, 208, 235, 273, 317). |

Summary: 6 of 6 acceptance criteria fully implemented; all ACs satisfied and covered by tests.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| ---- | --------- | ----------- | -------- |
| Design filter state model and wiring (store + selectors). | Done | Done | Dedicated `useFeedFiltersStore` and `DashboardFilterState` with canonical Region/Sport/Market/ROI fields and a pure `applyDashboardFilters` helper (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:59, src/renderer/src/features/dashboard/filters.ts:18). |
| Implement filter UI controls in the dashboard feed pane. | Done | Done | `FeedFilters` sits above `FeedTable`, renders chips and ROI input, and drives filtered opportunities and the empty-state messaging (src/renderer/src/features/dashboard/FeedPane.tsx:18, 232). |
| Persist filter preferences between sessions. | Done | Done | Filter preferences are persisted with `zustand/persist` using a dedicated storage key and a JSON storage wrapper that targets non-sensitive fields only (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:66). |
| Add tests for filter behavior and integration. | Done | Done | `3.4-filters-controls` tests cover core filter logic, composition, store configuration, absence of network calls, virtualization, the filtered empty-state UI, and restored persisted filter configuration (tests/3.4-filters-controls.test.cjs:71, 208, 235, 273, 317). |

Summary: 4 of 4 top-level tasks fully verified; all tasks are implemented and covered by tests. No falsely marked-complete tasks were identified.

### Test Coverage and Gaps

- Core filter behavior, combinations, interaction with virtualization, filtered empty-state UI, and restored persisted filter configuration are now covered via `3.4-filters-controls`, `3.2-feed-left-pane-data-grid`, and `3.3-visual-staleness-logic` tests (tests/3.4-filters-controls.test.cjs:71, 208, 235, 317; tests/3.2-feed-left-pane-data-grid.test.cjs:44; tests/3.3-visual-staleness-logic.test.cjs:41).

### Architectural Alignment

- Filter logic remains strictly in the renderer and operates purely on the normalized `ArbitrageOpportunity[]` snapshots produced by the poller, consistent with the data engine separation constraints (_bmad-output/implementation-artifacts/3-4-filters-controls.context.xml:33, src/renderer/src/features/dashboard/FeedPane.tsx:195).
- `FeedTable` continues to own sorting, virtualization, and staleness visuals; filters only control which opportunities are passed into the table, keeping concerns separated (src/renderer/src/features/dashboard/FeedTable.tsx:63, src/renderer/src/features/dashboard/FeedPane.tsx:242).
- The persisted filter store reuses the existing Zustand pattern and stores only non-sensitive UI preferences, aligning with the architecture guidance around settings vs. credentials (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:59).

### Security Notes

- No new main-process or TRPC code paths were introduced; filters operate entirely in-memory in the renderer and do not alter polling cadence, adapter behavior, or network access (src/renderer/src/features/dashboard/FeedPane.tsx:195, tests/3.4-filters-controls.test.cjs:273).
- Filter preferences are stored via `localStorage` under a namespaced key and contain only non-sensitive Region/Sport/Market/ROI values, respecting the requirement to keep secure credentials separate (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:59).

### Best-Practices and References

- PRD FR3, FR4, FR10, and FR11 are implemented through client-side filters over the existing arbitrage snapshot model, as described in the Story Context and Epic 3 documentation (_bmad-output/PRD.md, _bmad-output/epics.md:213, _bmad-output/implementation-artifacts/3-4-filters-controls.context.xml:19).
- Dashboard behavior remains consistent with prior Epic 3 stories for layout, sorting, virtualization, and staleness visuals (_bmad-output/implementation-artifacts/3-2-feed-left-pane-data-grid.md, _bmad-output/implementation-artifacts/3-3-visual-staleness-logic.md, src/renderer/src/features/dashboard/FeedTable.tsx:63).

### Action Items

- [x] [HIGH][AC #2] Align empty Region/Sport/Market selection semantics with user expectations by treating empty selections as "show no opportunities" instead of "no filter", ensuring that toggling all chips off in any dimension produces an empty result set and surfaces the filtered empty state (src/renderer/src/features/dashboard/filters.ts:103, tests/3.4-filters-controls.test.cjs:317).
- [x] [MEDIUM][AC #2, AC #6] Add a test that renders `FeedPane` with an underlying non-empty opportunities list and filter settings that produce an empty filtered result, and assert that the `feed-empty-filters` empty state and message are rendered (src/renderer/src/features/dashboard/FeedPane.tsx:236, tests/3.4-filters-controls.test.cjs:317).
- [x] [MEDIUM][AC #5, AC #6] Add a test that seeds persisted filter state (via `useFeedFiltersStore`) before rendering the dashboard, then asserts that both the filter controls and resulting rows reflect the restored configuration without additional network calls (src/renderer/src/features/dashboard/stores/feedFiltersStore.ts:66, tests/3.4-filters-controls.test.cjs:235).
- [x] [LOW] Tighten when the "Active filters applied." banner appears so it activates only when filters differ from the default all-on/zero-ROI configuration, reducing potential confusion for users who have not yet changed any settings (src/renderer/src/features/dashboard/FeedPane.tsx:29).
- [ ] [LOW] If additional regions/sports are onboarded, centralize and extend league-to-region mapping to avoid drift and ensure consistent Region filter behavior across stories and adapters (src/renderer/src/features/dashboard/filters.ts:32, tests/2.4-production-adapter-odds-api-io.test.cjs:143, tests/2.5-test-adapter-the-odds-api-com.test.cjs:99).
