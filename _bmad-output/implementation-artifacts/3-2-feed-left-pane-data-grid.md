# Story 3.2: Feed (Left Pane Data Grid)

Status: done

## Story

As a User,  
I want a sortable, scrollable grid of opportunities,  
so that I can scan many surebets efficiently.

## Acceptance Criteria

1. The dashboard left pane renders a `FeedTable` (or equivalent) component under `renderer/src/features/dashboard/` inside the existing `DashboardLayout`, showing one row per `ArbitrageOpportunity` with at least Time, Event, and ROI columns, without breaking the split-pane structure or Orange Terminal theme established in Story 3.1.
2. ROI values in the grid are highlighted using the primary accent color `#F97316` in line with `_bmad-output/ux-design-specification.md`, while other text respects the dark background (`#0F172A`) and off-white body text, and the grid exposes stable identifiers or test IDs so tests can assert column presence and formatting.
3. The feed supports sorting by at least Time and ROI via accessible column headers or controls, with the current sort applied consistently to the in-memory `ArbitrageOpportunity[]` collection so that repeated renders and state updates preserve the expected order.
4. The feed is vertically scrollable and uses a virtualization strategy (for example react-window or an equivalent pattern) whenever there are more than approximately 50 visible rows, keeping scroll performance acceptable without dropping keyboard selection or future copy/preview behavior.
5. Component or integration tests (for example under `tests/3.2-feed-left-pane-data-grid.test.cjs` or `renderer/src/features/dashboard/__tests__/3-2-feed-left-pane-data-grid.test.tsx`) render the dashboard or feed grid at 900px or wider and assert: (a) presence of Time/Event/ROI columns, (b) ROI accent color, (c) sort behavior for Time and ROI, and (d) that virtualization or windowing is active for large result sets, improving on Story 3.1’s current string-based layout tests.

## Tasks / Subtasks

- [x] Implement the feed data grid component for the left pane (AC: #1, #2).
  - [x] Create `FeedTable` (or an equivalent, clearly named component) under `renderer/src/features/dashboard/` that renders a row per `ArbitrageOpportunity` with Time, Event, and ROI, using shadcn/ui and Tailwind in line with Story 3.1’s layout and `_bmad-output/ux-design-specification.md`.
  - [x] Integrate the component into the left pane of `DashboardLayout` using the existing stable identifiers (for example `data-testid="feed-pane"`) so the grid can be rendered without changing the split-pane contract.
  - [x] Ensure ROI cells apply the Orange Terminal accent color (`#F97316`) and that base text colors and backgrounds match the established theme.
- [x] Wire the feed to the opportunities data source and sorting behavior (AC: #1, #3).
  - [x] Consume opportunities from the existing state/selector surface (for example a Zustand store or TRPC hook) so the feed is provider-agnostic and operates purely on `ArbitrageOpportunity[]` as defined in `shared/types.ts` and `shared/schemas.ts`.
  - [x] Implement sort controls (e.g. clickable column headers) for Time and ROI that update a single source of truth for sort order and are safe for future extensions (e.g. additional sort keys).
  - [x] Confirm that sorting works correctly when new opportunities arrive or existing ones are updated, without breaking keyboard selection or the right-pane preview.
- [x] Add virtualization/windowing for large result sets (AC: #4).
  - [x] Introduce a virtualization strategy (for example react-window, react-virtual, or an equivalent pattern) that activates when the visible row count exceeds approximately 50 entries, while keeping rendering straightforward for smaller lists.
  - [x] Ensure virtualization respects the layout constraints from Story 3.1 and maintains smooth scrolling and selection behavior.
- [x] Add component/integration tests for the feed grid (AC: #2, #3, #4, #5).
  - [x] Add tests that exercise the feed grid at representative dashboard widths, assert presence of the Time/Event/ROI columns, and verify ROI accent color and theme alignment.
  - [x] Add tests that seed a list of opportunities, exercise sorting by Time and ROI, and assert that the rendered order matches the configured sort.
  - [x] Add tests that simulate a large number of rows (e.g. 100+) and confirm that virtualization/windowing is active (for example by asserting that only a subset of rows are present in the rendered output at any given time).

## Dev Notes

- This story builds on Story 3.1’s split-pane layout by filling the left pane with a concrete data grid for `ArbitrageOpportunity[]`, wired to the existing data engine from Epic 2 (adapters, poller, and filters) and following the Orange Terminal UX spec.
- The data grid models opportunities using the canonical `ArbitrageOpportunity` shape from `shared/types.ts`, with any filtering or provider-specific concerns handled upstream (poller, filters, or state stores) to keep the feed focused on presentation, sorting, and lightweight client-side behavior.
- Follow `_bmad-output/ux-design-specification.md` for typography, layout, and density, ensuring that the feed works well with the planned copy-and-advance workflows in Epic 4 without reworking the layout or theming.
- Sorting is implemented in a way that composes cleanly with future staleness indicators (Story 3.3), filters (Story 3.4), and provider/system status badges (Story 3.5), avoiding bespoke state flags that diverge from the architecture patterns in `_bmad-output/architecture.md`.
- Tests and component boundaries are structured so that Story 3.3 can layer staleness visuals (e.g. opacity changes and “Xm ago” labels) onto the same rows without changing how the grid is rendered or how tests target the feed.

### Learnings from Previous Story

- Story 3.1 established `DashboardLayout` and the Orange Terminal theme, with stable identifiers for the feed and signal preview panes; this story reuses that layout rather than introducing a new dashboard shell.  
  [Source: _bmad-output/implementation-artifacts/3-1-main-layout-split-pane.md#Dev-Notes]
- Senior Developer Review for Story 3.1 highlighted that existing layout tests are string-based and do not render the layout at runtime; tests for this story strengthen coverage by rendering the actual feed grid and asserting behavior over a rich `ArbitrageOpportunity[]` fixture set.  
  [Source: _bmad-output/implementation-artifacts/3-1-main-layout-split-pane.md#Senior-Developer-Review-(AI)]
- Files and components introduced in Story 3.1 (`DashboardLayout.tsx`, dashboard route wiring, and layout-focused tests) remain the single source of truth for the dashboard shell; the feed grid plugs into the existing feed pane rather than duplicating layout logic.

### Project Structure Notes

- The main feed grid component lives under `src/renderer/src/features/dashboard/FeedTable.tsx`, with layout responsibilities staying in `DashboardLayout` so that future stories can reuse the same feed component without altering the split-pane shell.
- Opportunity-fetching, provider selection, and polling concerns remain in the main/poller/adapter layer (`src/main/services/poller.ts`, adapter modules) and in shared state stores; the feed subscribes to already-normalized data rather than calling providers directly.
- Tests for this story live under `tests/3.2-feed-left-pane-data-grid.test.cjs` alongside existing Epic 3 tests, making feed behavior coverage easy to discover and extend.

### References

- PRD: `_bmad-output/PRD.md` (FR9: Sortable Data Grid, FR12: Highlight ROI).
- Architecture: `_bmad-output/architecture.md` (“Data Architecture”, “Implementation Patterns — Lifecycle/Consistency”, “UX Error and Degraded States”).
- UX: `_bmad-output/ux-design-specification.md` (Hybrid Dashboard layout, Orange Terminal theme, keyboard-centric workflow).
- Epics: `_bmad-output/epics.md` (Epic 3, Story 3.2 — Feed (Left Pane Data Grid)).
- Prior Stories: `_bmad-output/implementation-artifacts/2-4-production-adapter-odds-api-io.md`, `_bmad-output/implementation-artifacts/2-5-test-adapter-the-odds-api-com.md`, `_bmad-output/implementation-artifacts/3-1-main-layout-split-pane.md`.

## Dev Agent Record

### Context Reference

- _bmad-output/implementation-artifacts/3-2-feed-left-pane-data-grid.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex CLI / GPT-5.1)

### Debug Log References

- [3.2-FEED-STRUCTURE-001] Dashboard layout and feed pane from Story 3.1 are reused as the container for the feed grid, preserving min-width and split-pane behavior while adding a concrete data grid for opportunities.
- [3.2-FEED-SORTING-001] Sorting behavior for Time and ROI operates on `ArbitrageOpportunity[]` in memory, consistent with the architecture’s separation between data engine and visualization.
- [3.2-FEED-VIRTUALIZATION-001] Virtualization/windowing strategy is active for large result sets to maintain responsiveness in line with PRD performance expectations.

### Completion Notes List

- Story 3.2 implemented with a `FeedTable` grid in the left dashboard pane, wired to normalized `ArbitrageOpportunity[]` data via a TRPC-backed feed store with Time/Event/ROI columns, Orange Terminal theming, sorting by Time and ROI, virtualization for large result sets, and new P1 tests under `tests/3.2-feed-left-pane-data-grid.test.cjs` covering columns, ROI styling, sort behavior, and virtualization.

### File List

- _bmad-output/PRD.md
- _bmad-output/architecture.md
- _bmad-output/ux-design-specification.md
- _bmad-output/epics.md
- _bmad-output/backlog.md
- _bmad-output/implementation-artifacts/3-1-main-layout-split-pane.md
- _bmad-output/implementation-artifacts/3-2-feed-left-pane-data-grid.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/main/services/router.ts
- src/renderer/src/lib/trpc.ts
- src/renderer/src/components/ui/button.tsx
- src/renderer/src/components/ui/input.tsx
- src/renderer/src/components/ui/select.tsx
- src/renderer/src/features/dashboard/DashboardLayout.tsx
- src/renderer/src/features/dashboard/FeedTable.tsx
- src/renderer/src/features/dashboard/FeedPane.tsx
- src/renderer/src/features/dashboard/stores/feedStore.ts
- src/renderer/src/global.d.ts
- tests/3.2-feed-left-pane-data-grid.test.cjs
- tsconfig.storage-test.json
- package.json
- package-lock.json

### Change Log

- Implemented `FeedTable` under `src/renderer/src/features/dashboard/FeedTable.tsx` with Time/Event/ROI columns and Orange Terminal theming, rendered inside the existing `DashboardLayout` feed pane.
- Added `FeedPane` and a Zustand-backed feed store (`src/renderer/src/features/dashboard/stores/feedStore.ts`) wired to TRPC feed snapshot procedures in `src/main/services/router.ts` and `src/renderer/src/lib/trpc.ts`.
- Updated shared UI components (`button.tsx`, `input.tsx`, `select.tsx`) to use the local Tailwind utility helper and align styling with the Orange Terminal theme.
- Extended the storage test TypeScript configuration to compile renderer code for tests (`tsconfig.storage-test.json`) and added Story 3.2 P1 tests in `tests/3.2-feed-left-pane-data-grid.test.cjs` covering column rendering, ROI accent styling, sorting, and virtualization behavior.
- Updated sprint tracking (`_bmad-output/implementation-artifacts/sprint-status.yaml`) and story status to mark Story 3.2 as ready for review.
