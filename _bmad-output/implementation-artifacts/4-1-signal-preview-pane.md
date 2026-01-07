# Story 4.1: Signal Preview Pane

Status: done

## Story

As a User,  
I want a detailed preview of the selected signal,  
so that I can quickly copy it into my workflow.

## Acceptance Criteria

1. The right-hand "Signal Preview" pane renders the full formatted text payload for the currently selected `ArbitrageOpportunity`, using provider metadata and event details to match the multi-line formatting standard defined in `_bmad-output/ux-design-specification.md` (section 6.2 "Signal Preview"), so that what the user sees is exactly what will be sent to Telegram or similar downstream channels.
2. The preview uses a monospace font and card + pre/code block styling consistent with the "Orange Terminal" theme (dark background, orange ROI / action emphasis, high-contrast text) and remains legible alongside staleness visuals and status indicators introduced in Stories 3.3 and 3.5.
3. Changing the selected opportunity (via keyboard navigation or mouse selection in the feed) updates the preview instantly without triggering additional network calls, stays in sync with active filters and staleness logic, and exposes a deterministic string representation that can be reused by the "Copy & Advance" workflow for FR14.

## Tasks / Subtasks

- [x] Introduce a dedicated `SignalPreview` component that renders the right-pane preview from a selected `ArbitrageOpportunity` and `ProviderMetadata`, replacing the static placeholder in `DashboardLayout` with a card + monospace text block that matches the UX formatting standard and displays both legs, event context, and ROI clearly. (AC: #1, #2)
  - [x] Define a pure formatting helper (for example `formatSignalPayload`) that maps `ArbitrageOpportunity` + provider metadata into the multi-line signal text described in `_bmad-output/ux-design-specification.md` (section 6.2), keeping formatting concerns in the renderer and avoiding any duplication of business logic from the data engine. (AC: #1, #2)
- [x] Wire the preview to the existing dashboard selection state so that keyboard and mouse changes in `FeedTable` update a single "selected opportunity" source of truth, and pass that selection into `SignalPreview` so the preview updates instantly without additional TRPC / poller calls. (AC: #1, #3)
  - [x] Reuse or extend the Epic 3 dashboard stores (e.g. `useFeedStore` / filter stores) rather than introducing ad-hoc React state, ensuring that selection, filters, staleness, and status snapshots remain coherent in the dashboard. (AC: #2, #3)
- [x] Ensure the preview behaves correctly under staleness, filters, and system/provider status changes so that users always see a trustworthy representation of the selected row. (AC: #2, #3)
  - [x] Confirm that when filters hide the selected row, the preview either clears or updates to the next visible row in a predictable way, consistent with existing empty-state messaging from Story 3.4. (AC: #3)
  - [x] Verify that system/provider `SystemStatus` / `ProviderStatus` changes (Story 3.5) do not break preview rendering and that the preview remains readable in degraded/stale states (for example, no overlapping banners or clipped content). (AC: #2, #3)
- [x] Add tests for signal formatting and preview behavior, following the patterns in `_bmad-output/test-design-system.md` and existing Epic 3 renderer tests. (AC: #1, #2, #3)
  - [x] Create a dedicated test file (for example `tests/4.1-signal-preview-pane.test.cjs`) that seeds representative `ArbitrageOpportunity` fixtures and asserts the rendered multi-line preview text matches the expected formatting, including provider labels, event details, markets, odds, and ROI. (AC: #1, #2)
  - [x] Add tests that simulate keyboard and mouse selection changes in the feed and assert that the preview updates instantly without additional TRPC calls, remains in sync with filters / staleness state, and exposes a stable string suitable for reuse by the Copy & Advance story. (AC: #2, #3)

### Review Follow-ups (AI)

- [x] [AI-Review][Medium] Ensure `SignalPreview` respects filtered-empty state and does not fall back to the first underlying opportunity when `selectedOpportunityId` is `null` and filters hide all rows; instead, render the empty preview state so the right pane stays consistent with the `feed-empty-filters` view. (AC: #3)
- [x] [AI-Review][Low] Extend `tests/4.1-signal-preview-pane.test.cjs` to assert that `SignalPreview` output (for example, via `data-opportunity-id`) tracks `selectedOpportunityId` and that filtered-empty scenarios do not render a stale preview while still avoiding additional TRPC `pollAndGetFeedSnapshot` calls. (AC: #3)

## Dev Notes

- This story introduces the first production-ready version of the right-hand "Signal Preview" pane, turning the layout shell from Story 3.1 into a concrete staging area for the text payload that will later be copied in Story 4.3 ("Copy & Advance Workflow"), and it must stay tightly aligned with the `ArbitrageOpportunity` model in `shared/types.ts` and the UX formatting standard in `_bmad-output/ux-design-specification.md`.
- The preview logic should remain purely presentational: it consumes the already-normalized `ArbitrageOpportunity` objects and provider metadata from existing stores and does not reimplement business logic from adapters, the poller, or rate-limiting; any future changes to the domain model should flow from shared contracts, not from ad-hoc parsing in the preview.

### Learnings from Previous Story (3.5 -- Provider & System Status Indicators)

- Story 3.5 centralized system and provider health as `SystemStatus` / `ProviderStatus` values in the main `poller.ts` service and exposed a `DashboardStatusSnapshot` via TRPC, with the renderer (StatusBar and FeedPane) treating status as an input rather than re-deriving health from "no rows" or incidental signals.
- The Senior Developer Review for Story 3.5 flagged missing **direct tests** around `getDashboardStatusSnapshot`'s mapping from rate-limit, error, configuration, and staleness inputs to `SystemStatus` / `ProviderStatus`, as well as minor UX gaps where the provider failure banner still uses raw `providerId` strings and lacks an explicit "Down but data still present" regression test scenario.
- When implementing this story, keep the preview logic independent of status computation, reusing the existing status snapshot and avoiding any new boolean flags or inferred health states in the preview; if preview-specific behavior depends on degraded/error states (for example, showing a subtle warning that signals may be stale), it should use the same `DashboardStatusSnapshot` contract to stay aligned.
- Any additional tests added for the preview should consider piggybacking on the existing Epic 3 test harness (server-side React render over the compiled bundle) and can optionally cover the outstanding "Down but data still present" scenario as part of jointly exercising the preview, status chip, and provider banners.

### Project Structure Notes

- Implement the new preview component at `src/renderer/src/features/dashboard/SignalPreview.tsx`, following the naming and folder conventions from `_bmad-output/architecture.md` ("Project Structure" and "Naming Patterns"), and keep it focused on rendering and formatting, with selection and data loading handled by existing dashboard stores.
- Update `DashboardLayout.tsx` to accept a `SignalPreview` component driven by the dashboard state rather than embedding static placeholder text; keep the right-pane layout (borders, padding, font sizes) consistent with the existing design shell.
- Place tests for this story alongside the existing Epic 3 renderer tests under `tests/4.1-signal-preview-pane.test.cjs` (or an equivalent `__tests__` path), reusing the fixtures and helpers already used by `tests/3.3-visual-staleness-logic.test.cjs`, `tests/3.4-filters-controls.test.cjs`, and `tests/3.5-provider-system-status-indicators.test.cjs`.

### References

- PRD: `_bmad-output/prd.md` (Dashboard & Visualization FR9–FR13 and Actions FR14 "copy complete bet details to the clipboard with a single click").
- UX Design: `_bmad-output/ux-design-specification.md` (sections 4.1 "Layout Strategy: The Hybrid Dashboard", 5.1 "Keyboard-Centric Workflow", and 6.2 "Signal Preview" formatting standard).
- Architecture: `_bmad-output/architecture.md` ("Project Structure", `ArbitrageOpportunity` data model, and `UX Error and Degraded States` guidance for handling stale/degraded data).
- Epics: `_bmad-output/epics.md` (Epic 4: Interaction & Workflow Efficiency, Story 4.1 "Signal Preview Pane").
- Testing: `_bmad-output/test-design-system.md` (risk R-005: frozen/stale data and the expectation for P1 tests around dashboard behavior).
- Previous Story: `_bmad-output/implementation-artifacts/3-5-provider-system-status-indicators.md` (status model, StatusBar/FeedPane behavior, tests, and outstanding action items).

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->
- _bmad-output/implementation-artifacts/4-1-signal-preview-pane.context.xml

### Agent Model Used

GPT-based SM assistant (BMAD create-story workflow via Codex)

### Debug Log References

- `SignalPreview.tsx` implements a pure `formatSignalPayload` helper and a right-pane preview component wired to the dashboard theme, rendering multi-line signal payload text from `ArbitrageOpportunity` + `ProviderMetadata`. (`src/renderer/src/features/dashboard/SignalPreview.tsx`)
- Dashboard selection, filters, and preview state are coordinated via the existing feed store and feed pane, with selection derived from `useFeedStore` and reflected into both `FeedTable` row state and `SignalPreview`. (`src/renderer/src/features/dashboard/stores/feedStore.ts`, `FeedPane.tsx`, `FeedTable.tsx`, `DashboardLayout.tsx`)
- P1 tests in `tests/4.1-signal-preview-pane.test.cjs` cover signal formatting, preview rendering, and selection changes, including an assertion that preview updates do not trigger additional TRPC `pollAndGetFeedSnapshot` calls.

### Completion Notes List

- Drafted Story 4.1 specification for the Signal Preview pane, grounded in the PRD, UX design specification, architecture, epics, and learnings from Story 3.5, with acceptance criteria, tasks, and dev notes structured for direct handoff to the implementation team.
- Implemented the production Signal Preview pane by introducing a dedicated `SignalPreview` component and `formatSignalPayload` helper, wiring selection through the existing dashboard feed store and filters, and ensuring the preview remains legible and trustworthy under staleness, filter, and provider/system status changes, with P1 regression tests validating formatting and selection behavior.

### File List

- _bmad-output/implementation-artifacts/4-1-signal-preview-pane.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/ux-design-specification.md
- _bmad-output/architecture.md
- _bmad-output/epics.md
- src/renderer/src/features/dashboard/DashboardLayout.tsx
- src/renderer/src/features/dashboard/FeedPane.tsx
- src/renderer/src/features/dashboard/FeedTable.tsx
- src/renderer/src/features/dashboard/SignalPreview.tsx
- src/renderer/src/features/dashboard/stores/feedStore.ts
- tests/4.1-signal-preview-pane.test.cjs

## Change Log

- Initial draft created from PRD, architecture, UX design specification, epics, and previous story 3.5 review notes (Story 4.1); no implementation work had been performed yet, and story status was initially set to `drafted` in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Implemented Story 4.1 end-to-end: added a dedicated `SignalPreview` component and `formatSignalPayload` helper matching the UX 6.2 Signal Preview standard, wired the preview to the dashboard feed selection and filters via `useFeedStore`, updated `DashboardLayout` to host the preview card, and introduced P1 tests in `tests/4.1-signal-preview-pane.test.cjs` covering formatting, selection behavior, and the absence of extra TRPC calls when preview updates; story status is now `review` in `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- 2025-11-22: Senior Developer Review (AI) notes appended with outcome "Changes Requested"; follow-up items recorded under "Review Follow-ups (AI)" and the engineering backlog.
- 2025-11-22: Addressed 4.1 review follow-ups by teaching `SignalPreview` to respect filtered-empty state via `hasVisibleOpportunities` in the feed store and extending tests to assert selection tracking and filtered-empty behavior without additional TRPC calls; story returned to `review` in `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Senior Developer Review (AI)

Reviewer: stefano  
Date: 2025-11-22  
Outcome: Approved

### Summary

- Implementation largely matches the UX Signal Preview specification and architecture, but the preview can become inconsistent with feed filters in the filtered-empty state, and AC #3 lacks full test coverage.

### Key Findings

- [Medium] `SignalPreview` falls back to the first underlying opportunity when `selectedOpportunityId` is `null`, so when filters hide all rows the right pane can still show a payload for a row that is no longer visible in the feed (AC #3). (src/renderer/src/features/dashboard/SignalPreview.tsx:140; src/renderer/src/features/dashboard/FeedPane.tsx:335)
- [Low] The 4.1 test suite does not assert that the preview actually tracks selection changes or the filtered-empty scenario; it only asserts that no additional TRPC calls occur when changing selection (AC #3). (tests/4.1-signal-preview-pane.test.cjs:160)

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Signal preview renders full formatted payload for selected `ArbitrageOpportunity` using provider metadata and matches the UX section 6.2 formatting standard. | Met | src/renderer/src/features/dashboard/SignalPreview.tsx:92; tests/4.1-signal-preview-pane.test.cjs:76 |
| 2 | Preview uses monospace font and card + pre/code styling consistent with the "Orange Terminal" theme. | Met | src/renderer/src/features/dashboard/DashboardLayout.tsx:23; src/renderer/src/features/dashboard/SignalPreview.tsx:159 |
| 3 | Changing the selected opportunity updates the preview instantly without extra network calls, stays in sync with active filters/staleness, and exposes a deterministic string representation, including the filtered-empty state. | Met | src/renderer/src/features/dashboard/SignalPreview.tsx:140; src/renderer/src/features/dashboard/FeedPane.tsx:335; src/renderer/src/features/dashboard/stores/feedStore.ts:36; tests/4.1-signal-preview-pane.test.cjs:120, 160 |

Summary: 3 of 3 ACs implemented and verified via targeted P1 tests.

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| Introduce `SignalPreview` component and card-style preview in the right pane. | Complete | Verified | src/renderer/src/features/dashboard/SignalPreview.tsx:140; src/renderer/src/features/dashboard/DashboardLayout.tsx:23 |
| Provide pure `formatSignalPayload` helper matching UX formatting standard. | Complete | Verified | src/renderer/src/features/dashboard/SignalPreview.tsx:92; tests/4.1-signal-preview-pane.test.cjs:76 |
| Wire preview to existing dashboard selection and feed store, avoiding new TRPC calls. | Complete | Verified | src/renderer/src/features/dashboard/FeedTable.tsx:61; src/renderer/src/features/dashboard/stores/feedStore.ts:36; tests/4.1-signal-preview-pane.test.cjs:160 |
| Ensure preview behavior under staleness, filters, and provider/system statuses and validate via tests. | Complete | Verified | src/renderer/src/features/dashboard/SignalPreview.tsx:140; src/renderer/src/features/dashboard/FeedPane.tsx:335; tests/4.1-signal-preview-pane.test.cjs:160 |
| Add P1 tests for formatting and preview behavior in `tests/4.1-signal-preview-pane.test.cjs`. | Complete | Verified | tests/4.1-signal-preview-pane.test.cjs:76, 120, 160 |

Summary: All tasks are implemented and verified in code; preview behavior and test coverage for AC #3 are now complete.

### Test Coverage and Gaps

- P1 tests cover signal payload formatting, preview rendering, selection wiring without additional TRPC `pollAndGetFeedSnapshot` calls, and the filtered-empty case where no visible opportunities remain. (tests/4.1-signal-preview-pane.test.cjs:76, 120, 160)
- No outstanding test gaps identified for this story.

### Architectural Alignment

- Presentation-only logic and data shapes respect shared `ArbitrageOpportunity` and `ProviderMetadata` contracts; selection and provider metadata come from the existing feed store rather than ad-hoc component state. (src/renderer/src/features/dashboard/SignalPreview.tsx; src/renderer/src/features/dashboard/stores/feedStore.ts)
- Layout and styling stay within the Epic 3 dashboard shell and "Orange Terminal" theme defined in `_bmad-output/ux-design-specification.md` and `_bmad-output/architecture.md`, with no new cross-process responsibilities or business logic introduced in the renderer. (_bmad-output/ux-design-specification.md; _bmad-output/architecture.md; src/renderer/src/features/dashboard/DashboardLayout.tsx)

### Security Notes

- Signal preview operates purely on normalized `ArbitrageOpportunity` data from the feed store and provider metadata; it does not handle credentials or secrets and does not introduce new IPC or storage surfaces. (shared/types.ts; src/renderer/src/features/dashboard/SignalPreview.tsx)

### Best-Practices and References

- UX and formatting behavior are consistent with `_bmad-output/ux-design-specification.md` (sections 4.1, 5.1, 6.2) and dashboard patterns from Stories 3.3–3.5. (_bmad-output/ux-design-specification.md; _bmad-output/epics.md)
- State management aligns with the Zustand-based stores and virtualized feed design in `_bmad-output/architecture.md` and existing Epic 3 renderer tests. (_bmad-output/architecture.md; tests/3.3-visual-staleness-logic.test.cjs; tests/3.4-filters-controls.test.cjs; tests/3.5-provider-system-status-indicators.test.cjs)

### Action Items

**Code Changes Required:**

- None. All previously identified action items for Story 4.1 have been implemented and verified.

**Advisory Notes:**

- Note: Consider adding an explicit preview-level empty state message that references active filters when the feed shows the `feed-empty-filters` state, so users are less likely to misinterpret an empty or stale preview when filters are very restrictive.
