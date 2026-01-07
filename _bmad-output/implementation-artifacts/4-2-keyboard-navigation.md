# Story 4.2: Keyboard Navigation

Status: done

## Story

As a User,  
I want to navigate the feed purely via keyboard,  
so that I can operate at high speed.

## Acceptance Criteria

1. With the feed focused, pressing `Arrow Up` / `Arrow Down` moves selection to the previous/next visible row in the opportunities table, never going out of bounds, and respects active filters and staleness/processed state (no selection of rows that are not currently rendered).
2. Each selection change (whether triggered by keyboard or mouse) updates the right-hand "Signal Preview" pane instantly, reusing the existing `ArbitrageOpportunity` + provider metadata from the dashboard store without issuing additional TRPC or poller requests.
3. The currently selected row is visually highlighted using the `data-state="selected"` pattern from the UX spec, with high-contrast styling that is consistent with the "Orange Terminal" theme and clearly communicates keyboard focus to the user.

## Tasks / Subtasks

- [x] Implement keyboard navigation and focus management for the feed table. (AC: #1, #3)
  - [x] Ensure the feed table (e.g. `FeedTable` / containing pane) can receive keyboard focus and wires `onKeyDown` handlers for `Arrow Up` / `Arrow Down` that drive a single shared "selected opportunity" state in the dashboard store rather than local component state. (AC: #1, #3)
  - [x] Clamp navigation so that pressing `Arrow Up` on the first visible row and `Arrow Down` on the last visible row keeps selection stable (no index underflow/overflow) and ensure that selection respects active filters and "processed" markers used by future copy-and-advance flows. (AC: #1)
  - [x] Keep the selected row scrolled into view within the feed `ScrollArea` as the user navigates, avoiding sudden jumps while ensuring that keyboard-only users can process long lists without touching the mouse. (AC: #1, #3)
- [x] Align selection state with the Signal Preview pane and existing dashboard stores. (AC: #1, #2)
  - [x] Reuse the existing Zustand feed store (e.g. `useFeedStore`) as the single source of truth for the selected opportunity id and selection index, and ensure both `FeedTable` rows and `SignalPreview` subscribe to the same state rather than duplicating selection logic. (AC: #1, #2)
  - [x] Verify that changing selection via keyboard produces the same state transitions as mouse-based row selection, including interaction with filters, staleness indicators, and provider/system status. (AC: #1, #2)
  - [x] Confirm that Signal Preview rendering continues to use the normalized `ArbitrageOpportunity` model and provider metadata from the store, and that selection changes do not introduce new TRPC or poller calls beyond the existing polling cadence. (AC: #2)
- [x] Implement visual and accessibility treatment for the selected row. (AC: #3)
  - [x] Apply `data-state="selected"` (or equivalent) to the selected row and wire Tailwind/shadcn styles so the selection highlight is clearly visible in the dark "Orange Terminal" theme while preserving sufficient contrast and readable text. (AC: #3)
  - [x] Ensure the keyboard-focused row and the visually selected row always match (no divergence between focus ring and selection highlight), and verify that staleness opacity rules and processed-row indicators do not obscure the active selection state. (AC: #1, #3)
  - [x] Keep the `Enter` key semantics reserved for the upcoming "Copy & Advance Workflow" (Story 4.3) so this story focuses solely on navigation and selection; confirm that no accidental copy or destructive actions are bound to navigation keys. (AC: #3)
- [x] Add focused tests for keyboard navigation and selection behavior. (AC: #1, #2, #3)
  - [x] Introduce renderer tests (e.g. `tests/4.2-keyboard-navigation.test.cjs`) that simulate keyboard focus on the feed, send `Arrow Up` / `Arrow Down` key events, and assert that the selected row id and index in the feed store change as expected while staying within bounds and respecting filters. (AC: #1, #3)
  - [x] Add tests that assert the right-hand Signal Preview updates instantly on keyboard-driven selection changes without triggering additional TRPC `pollAndGetFeedSnapshot` calls, reusing the patterns from `tests/4.1-signal-preview-pane.test.cjs`. (AC: #2)
  - [x] Add assertions that the selected row carries `data-state="selected"` and that its styling remains visible and aligned with the UX spec even under staleness/processed conditions. (AC: #3)

## Dev Notes

- This story establishes the keyboard-first navigation behavior for the dashboard feed, aligning with the UX design specification's core loop ("Scan ? Identify ? Copy") and ensuring that users can process arbitrage opportunities entirely via the keyboard.
- Keyboard navigation must reuse the existing feed selection state from Epic 3/Story 4.1 rather than introducing new ad-hoc state; `FeedTable`, `FeedPane`, and `SignalPreview` should all observe a single `selectedOpportunityId` / index in the dashboard store to keep behavior deterministic.
- Navigation logic must play well with staleness indicators, filters, and provider/system status: selection should only move across currently visible rows, degrade gracefully when the feed is empty or heavily filtered, and never infer health state (rely on the existing `DashboardStatusSnapshot` instead).
- Implementation should anticipate integration with Story 4.3 ("Copy & Advance Workflow") by ensuring that selection semantics (which row is "current") are stable, deterministic, and easy to advance from in response to an Enter key action, without embedding copy-specific behavior in this story.

### Learnings from Previous Story (4.1 -- Signal Preview Pane)

- Story 4.1 introduced a dedicated `SignalPreview` component and a pure `formatSignalPayload` helper that render a multi-line signal text payload from `ArbitrageOpportunity` + provider metadata, tightly aligned with the UX Signal Preview format and existing dashboard theme.
- Selection and preview behavior are already wired through a centralized dashboard feed store, with tests ensuring that preview updates do not trigger additional TRPC `pollAndGetFeedSnapshot` calls and that filtered-empty states are handled deliberately to avoid stale or misleading previews.
- The Senior Developer Review for Story 4.1 highlighted the importance of avoiding divergence between selection, filters, and preview (especially in filtered-empty scenarios), leading to explicit fixes and tests that ensure the preview respects the absence of visible rows rather than falling back to arbitrary opportunities.
- When implementing keyboard navigation, reuse the corrected selection/preview wiring from Story 4.1, avoid introducing parallel selection state, and ensure that any empty or degraded states in the preview are driven by the same store contracts and status snapshots rather than new booleans or special cases.

### Project Structure Notes

- Implement keyboard navigation and selection behavior in the existing dashboard components under `src/renderer/src/features/dashboard/**`, primarily `FeedTable.tsx`, `FeedPane.tsx`, and the associated Zustand feed/store modules referenced in the architecture doc.
- Keep the Signal Preview component (`SignalPreview.tsx`) focused on rendering; selection changes should be driven by the shared store and passed in as props or via hooks rather than via direct event wiring between the preview and the feed.
- Place new tests under `tests/4.2-keyboard-navigation.test.cjs` (or equivalent) alongside the existing Epic 3 and Story 4.1 tests, reusing fixtures and helpers for opportunities, staleness, and status to validate keyboard behavior without duplicating setup.

### References

- PRD: `_bmad-output/prd.md` (FR14: "Users can copy complete bet details to the clipboard with a single click" and keyboard-first workflows under Actions).
- UX Design: `_bmad-output/ux-design-specification.md` (sections 2.2 "Core User Experience", 4.1 "Layout Strategy: The Hybrid Dashboard", and 5.1 "Keyboard-Centric Workflow" including the Arrow Up/Down navigation table).
- Architecture: `_bmad-output/architecture.md` (keyboard-driven UI, project structure around `FeedTable.tsx` / `SignalPreview.tsx`, and `UX Error and Degraded States` guidance).
- Epics: `_bmad-output/epics.md` (Epic 4: Interaction & Workflow Efficiency, Story 4.2 "Keyboard Navigation").
- Testing: `_bmad-output/test-design-system.md` (risk R-005 on frozen/stale data and the expectation for P1 tests around dashboard behavior).
- Previous Story: `_bmad-output/implementation-artifacts/4-1-signal-preview-pane.md` (Signal Preview behavior, selection wiring, and completed tests that this story must respect and extend).

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->
- _bmad-output/implementation-artifacts/4-2-keyboard-navigation.context.xml

### Agent Model Used

GPT-based SM assistant (BMAD *create-story* workflow via Codex)

### Debug Log References

- `useFeedStore` extended the dashboard feed state with `selectedOpportunityIndex`, `syncSelectionWithVisibleIds`, and `moveSelectionByOffset` so keyboard navigation operates over the same single source of truth as mouse selection while clamping to the currently visible opportunities. (`src/renderer/src/features/dashboard/stores/feedStore.ts`)
- `FeedTable.tsx` now wires `onKeyDown` handlers for `Arrow Up` / `Arrow Down` on the scroll container, drives selection via the feed store, exposes `data-state="selected"` on the active row, and keeps the selected index scrolled into view under virtualization. (`src/renderer/src/features/dashboard/FeedTable.tsx`)
- `FeedPane.tsx` synchronizes feed selection with the filtered visible opportunities list using `syncSelectionWithVisibleIds`, ensuring that keyboard navigation, filters, and staleness/empty states stay aligned without introducing ad-hoc selection state. (`src/renderer/src/features/dashboard/FeedPane.tsx`)
- P1 tests in `tests/4.2-keyboard-navigation.test.cjs` cover store-level keyboard navigation behavior, boundary clamping, TRPC neutrality on selection changes, and `data-state="selected"` styling for the selected row.

### Completion Notes List

- Drafted Story 4.2 specification for keyboard-only navigation of the dashboard feed, grounded in the PRD, UX design specification, architecture, epics, and learnings from Story 4.1, with acceptance criteria, tasks, and dev notes structured for direct handoff to the implementation team.
- Implemented Story 4.2 end-to-end by extending the dashboard feed store with an explicit selection index, wiring keyboard navigation and focus management into `FeedTable` and `FeedPane`, and adding P1 tests to validate keyboard selection behavior, TRPC neutrality, and selected-row styling; story status is now `done` in the sprint artifacts.

### Completion Notes

**Completed:** 2025-11-22
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing

### File List

- _bmad-output/implementation-artifacts/4-2-keyboard-navigation.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/prd.md
- _bmad-output/ux-design-specification.md
- _bmad-output/architecture.md
- _bmad-output/epics.md
- _bmad-output/test-design-system.md
- _bmad-output/implementation-artifacts/4-1-signal-preview-pane.md
- _bmad-output/implementation-artifacts/4-2-keyboard-navigation.context.xml
- src/renderer/src/features/dashboard/stores/feedStore.ts
- src/renderer/src/features/dashboard/FeedPane.tsx
- src/renderer/src/features/dashboard/FeedTable.tsx
- tests/4.2-keyboard-navigation.test.cjs

## Change Log

- Initial draft created from PRD, architecture, UX design specification, epics, sprint-status, and previous story 4.1 review/implementation notes (Story 4.2: Keyboard Navigation); no implementation work has been performed yet, and story status is set to `drafted` in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Implemented Story 4.2: added keyboard navigation and selection index handling via the dashboard `useFeedStore`, updated `FeedTable` and `FeedPane` for Arrow Up/Down navigation and scroll-into-view behavior, and introduced P1 tests in `tests/4.2-keyboard-navigation.test.cjs` covering keyboard selection, TRPC neutrality, and selected-row styling; story status is now `done` in `_bmad-output/implementation-artifacts/sprint-status.yaml`.

### Review Follow-ups (AI)

- [x] [AI-Review][Low] Extend `tests/4.2-keyboard-navigation.test.cjs` to assert that the feed scroll container exposes keyboard navigation semantics (`role="listbox"`, `tabindex`, `aria-activedescendant`) in sync with the selected row. (AC: #1, #3)
- [x] [AI-Review][Low] Add a `DashboardLayout` + `SignalPreview` integration test that exercises keyboard-driven selection changes via the feed store and verifies that the preview tracks the selected opportunity without introducing additional TRPC `pollAndGetFeedSnapshot` calls. (AC: #2)
- [x] [AI-Review][Low] Confirm via tests that stale selected rows still surface the Orange Terminal selection highlight (`bg-ot-accent/10`) while marked stale, so staleness opacity does not obscure the active selection state. (AC: #1, #3)

## Senior Developer Review (AI)

- Outcome: APPROVE. All three acceptance criteria are implemented and verified via P1 tests for keyboard navigation bounds and filter alignment, Signal Preview wiring, and selected-row visual treatment. (tests/4.2-keyboard-navigation.test.cjs:73, 152, 230; tests/4.1-signal-preview-pane.test.cjs:76, 160)
- Keyboard navigation operates over a single shared selection state in the dashboard feed store and clamps within the visible, filtered opportunities list while keeping the active row scrolled into view and exposing correct listbox semantics (`role="listbox"`, `tabindex`, `aria-activedescendant`). (src/renderer/src/features/dashboard/stores/feedStore.ts:22, 119, 175; src/renderer/src/features/dashboard/FeedTable.tsx:10, 72, 256)
- The right-hand Signal Preview updates to reflect keyboard-driven selection changes via the shared store without introducing additional TRPC `pollAndGetFeedSnapshot` calls, reusing the existing `SignalPreview` + `DashboardLayout` wiring from Story 4.1. (src/renderer/src/features/dashboard/SignalPreview.tsx:4, 140; src/renderer/src/features/dashboard/DashboardLayout.tsx:12; tests/4.1-signal-preview-pane.test.cjs:160; tests/4.2-keyboard-navigation.test.cjs:333)
- Low-severity AI review findings have been addressed by extending Story 4.2’s P1 tests to cover feed scroll semantics, Signal Preview integration under keyboard navigation, and the combination of staleness opacity with Orange Terminal selection highlighting on the active row. (tests/4.2-keyboard-navigation.test.cjs:152, 230, 333)
