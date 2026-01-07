# Story 3.1: Main Layout & Split Pane

Status: review

## Story

As a User,
I want to see signals on the left and details on the right,
so that I can scan and inspect opportunities quickly.

## Acceptance Criteria

1. The dashboard view renders a split-pane layout with a fixed-width left pane of approximately 400px (allowing a small responsive range, e.g. 360–440px) and a right pane that expands to fill the remaining width, and the layout remains stable when the window is resized at widths ≥ 900px.
2. The main dashboard background uses the "Orange Terminal" theme foundation: background `#0F172A`, off-white primary text, and orange accent reserved for key actions/value indicators, consistent with `_bmad-output/ux-design-specification.md` and Epic 1 styling.
3. The Electron window and/or root dashboard container enforces a minimum effective width of 900px for the dashboard route so that the two-pane structure never collapses into overlapping content when the user resizes the window narrower than 900px.
4. The left pane hosts a clearly labeled "Feed" container and the right pane hosts a clearly labeled "Signal Preview" container, each addressable via stable identifiers (for example `data-testid="feed-pane"` and `data-testid="signal-preview-pane"`) so future stories (3.2–3.5, 4.x) can plug in functionality without changing the layout contract.
5. Component and/or integration tests exercise the dashboard layout, asserting: (a) presence of left/right panes with expected identifiers, (b) background colour and min-width constraints, and (c) preservation of the split-pane structure at or above 900px width.

## Tasks / Subtasks

- [x] Implement dashboard split-pane layout shell (AC: #1, #2).
  - [x] Add a `DashboardLayout` (or equivalent) component under `renderer/src/features/dashboard/` that renders a fixed-width left pane and fluid right pane using shadcn/ui primitives and Tailwind utility classes.
  - [x] Ensure the layout behaves correctly at common desktop widths (e.g. 900px, 1280px, 1600px) and does not introduce horizontal scrollbars in the default Electron window configuration.
- [x] Wire layout into the renderer entry and routing (AC: #1, #3).
  - [x] Register the dashboard route (or main screen) so that the application loads the split-pane layout when the data engine is available, following existing routing patterns from Epic 1.
  - [x] Apply a min-width constraint (either via Electron `BrowserWindow` configuration or CSS `min-width` on the root dashboard container) that ensures the layout remains at least 900px wide in practice.
- [x] Create feed and signal preview containers with stable contracts (AC: #1, #4).
  - [x] Add a left-pane "Feed" container with a heading/label and placeholder content that will later be replaced by the actual data grid from Story 3.2.
  - [x] Add a right-pane "Signal Preview" container with a heading/label and placeholder content that will later be replaced by the preview card from Epic 4 stories.
  - [x] Expose stable identifiers and minimal props so that future stories can render `FeedTable` and `SignalPreview` components into these panes without reworking the layout.
- [x] Add layout-focused tests (AC: #2, #3, #5).
  - [x] Introduce component or integration tests (for example under `renderer/src/features/dashboard/__tests__/3-1-main-layout-split-pane.test.tsx`) that render the dashboard layout and assert the presence of the left/right panes, expected class names/styles, and min-width behaviour.
  - [x] Add a small visual-regression-safe assertion (e.g. checking computed styles or applied Tailwind classes) that verifies background colour is `#0F172A` and that the left pane width remains within the expected range at a representative viewport width.

## Dev Notes

- This story establishes the structural "shell" for Epic 3: a two-pane dashboard that will host the feed (3.2), staleness and status indicators (3.3, 3.5), and interaction workflows from Epic 4.
- Follow `_bmad-output/ux-design-specification.md` ("Hybrid Dashboard", "The Orange Terminal") for layout and visual decisions, and keep the scope limited to **layout and theming**, not data grid behaviour or interaction.
- Do not introduce provider, rate limiting, or arbitrage-specific logic in this story; the data engine from Epic 2 should be consumed in later stories via shared state and TRPC, keeping this story focused on view structure.
- Ensure that any layout primitives make it easy to surface system and provider status chips in later stories (for example a small header/footer area that can host status components without reworking the split-pane).

### Project Structure Notes

- Place new components under `renderer/src/features/dashboard/` and keep layout concerns separated from data-fetching concerns; future stories can introduce Zustand stores and TRPC integration alongside this layout.
- Reuse the existing Tailwind and shadcn/ui setup from Epic 1 rather than adding new styling systems; favour utility classes and composable components for the split-pane layout.
- Keep identifiers and component names stable and descriptive so later stories can target them from tests and higher-level components without brittle selectors.

### References

- UX: `_bmad-output/ux-design-specification.md` (Hybrid Dashboard layout, "The Orange Terminal" theme).
- Epics: `_bmad-output/epics.md` (Epic 3, Story 3.1 – Main Layout & Split Pane).
- Architecture: `_bmad-output/architecture.md` ("UX Error and Degraded States", "Implementation Patterns – Lifecycle/Consistency" for dashboard surfaces).
- Data Engine: `_bmad-output/implementation-artifacts/2-7-logging-observability-baseline.md` (heartbeat/logging groundwork that later dashboard stories will consume).

## Dev Agent Record

### Context Reference

- _bmad-output/implementation-artifacts/3-1-main-layout-split-pane.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex CLI / GPT-5.1)

### Debug Log References
- [x] `npm run test:p1` (node --test --test-name-pattern='[P1]' tests/**/*.test.cjs), including `tests/3.1-main-layout-split-pane.test.cjs` (AC: #5).
- [x] `npm test` (node --test tests/**/*.test.cjs), confirming updated runtime layout tests in `tests/3.1-main-layout-split-pane.test.cjs` (AC: #5, T4).

### Completion Notes List

- Implemented `src/renderer/src/features/dashboard/DashboardLayout.tsx` as the Story 3.1 dashboard shell with a fixed-width (~400px) feed pane, fluid right pane, stable `data-testid` hooks, and minimal `feed`/`signalPreview` props so future stories can plug in real components without reworking layout (AC: #1, #4).
- Updated `src/renderer/src/App.tsx` to use the new dashboard layout as the main renderer entry, preserving the Orange Terminal header and environment summary while focusing the main view on the split-pane dashboard (AC: #1, #2).
- Enforced a 900px minimum effective width for the dashboard via `minWidth: 900` in `src/main/index.ts` and a `min-w-[900px]` constraint on the renderer root container in `src/renderer/src/index.css`, keeping the two-pane structure stable at or above 900px window width (AC: #3).
- Added layout-focused tests in `tests/3.1-main-layout-split-pane.test.cjs` that assert presence of the feed and signal preview panes, left-pane width constraints, application of Orange Terminal theme tokens at the App root, and the combined Electron/CSS min-width configuration (AC: #2, #3, #5).
- Replaced non-ASCII placeholder sample text in the dashboard preview with ASCII-safe content to keep Vite/React builds parsing clean, then re-ran P1 tests for verification (AC: #2, #5).
- Strengthened layout tests in `tests/3.1-main-layout-split-pane.test.cjs` to render `DashboardLayout` via compiled out-tests and assert feed/signal panes and left-pane width constraints at runtime, addressing the AC5 gap raised in the Senior Developer Review (AC: #5, T4).

### File List

- src/renderer/src/features/dashboard/DashboardLayout.tsx
- src/renderer/src/App.tsx
- src/renderer/src/index.css
- src/main/index.ts
- tests/3.1-main-layout-split-pane.test.cjs

## Change Log

- Story 3.1 drafted and marked ready-for-dev by BMAD *create-story* workflow (Date: 2025-11-21).
- Implemented dashboard split-pane layout shell with fixed-width feed pane and fluid signal preview pane, wired into the main renderer entry and constrained to a 900px minimum effective width via Electron and CSS (Status: review, Date: 2025-11-21).
- Replaced non-ASCII preview placeholder strings with ASCII-safe text to resolve dev-server parse error (Date: 2025-11-21).
- Senior Developer Review (AI) - Changes requested for stronger layout tests (Date: 2025-11-21).
- Addressed code review findings - 1 item resolved (Date: 2025-11-21).

## Senior Developer Review (AI)

**Reviewer:** stefano  
**Date:** 2025-11-21  
**Outcome:** Changes Requested — strengthen layout tests to exercise runtime behaviour  
**Summary:** Core split-pane layout, theming, and 900px guardrails are in place with stable pane identifiers. However, the added tests only scan source text and never render the layout or exercise resize behaviour at or above 900px, so AC5 and Task T4 are only partially satisfied.

**Key Findings**
- MED: AC5 coverage is partial — tests are string checks, not component/integration assertions of layout stability or theme application at runtime (tests/3.1-main-layout-split-pane.test.cjs:15-69).
- LOW: No epic-3 tech spec found (searched _bmad-output/tech-spec-epic-3*.md); proceed without spec or add if available.

**Acceptance Criteria Coverage**

| AC | Description | Status | Evidence |
| --- | --- | --- | --- |
| AC1 | Split-pane layout with fixed ~400px left pane, fluid right pane, stable ≥900px | Implemented | src/renderer/src/features/dashboard/DashboardLayout.tsx:12-76 |
| AC2 | Orange Terminal theme (bg #0F172A, off-white text, orange accent) | Implemented | src/renderer/src/App.tsx:10-23; tailwind.config.cjs:10-12 |
| AC3 | Min effective width 900px for dashboard | Implemented | src/main/index.ts:37-65; src/renderer/src/index.css:10-16 |
| AC4 | Labeled “Feed” and “Signal Preview” panes with stable identifiers | Implemented | src/renderer/src/features/dashboard/DashboardLayout.tsx:16-47,55-75 |
| AC5 | Tests assert panes, background/min-width, layout stability ≥900px | Partial | tests/3.1-main-layout-split-pane.test.cjs:15-69 (string checks only; no rendered layout or resize assertions) |

AC coverage: 4 / 5 fully implemented.

**Task Completion Validation**

| Task | Marked As | Verified As | Evidence |
| --- | --- | --- | --- |
| T1: DashboardLayout with fixed feed pane, Orange Terminal theme | Complete | Verified | src/renderer/src/features/dashboard/DashboardLayout.tsx:12-76 |
| T2: Wire layout into renderer entry; enforce 900px min width | Complete | Verified | src/renderer/src/App.tsx:10-38; src/main/index.ts:37-65; src/renderer/src/index.css:10-16 |
| T3: Feed and Signal Preview containers with stable IDs/props | Complete | Verified | src/renderer/src/features/dashboard/DashboardLayout.tsx:16-47,55-75 |
| T4: Layout-focused tests for panes/theme/min-width/responsiveness | Complete | Questionable (string checks only; no runtime assertions) | tests/3.1-main-layout-split-pane.test.cjs:15-69 |

Task summary: 3 verified, 1 questionable.

**Test Coverage and Gaps**
- Existing P1 tests assert presence of class strings for panes, theme, and min-width (tests/3.1-main-layout-split-pane.test.cjs:15-69).
- Gap: No rendered component/integration test to confirm split-pane stability and sizing at ≥900px or to assert actual computed styles.

**Architectural Alignment**
- Layout lives under renderer/src/features/dashboard and uses shared Orange Terminal palette (tailwind.config.cjs:10-12); min-width enforced in both BrowserWindow and root container to prevent collapse.

**Security Notes**
- No security-affecting changes observed in this story scope.

**Best-Practices and References**
- Stack: Electron 38, React 19, Tailwind/shadcn with palette defined in tailwind.config.cjs:10-12. Continue to favor utility classes and stable data-testids for future Epic 3/4 work.

### Action Items

**Code Changes Required**
- [ ] [Medium] Add a rendered component/integration test (RTL/Playwright or jsdom) that mounts DashboardLayout at ≥900px, asserts feed/signal panes, verifies theme colors (#0F172A / #F97316), and checks left-pane width constraints and layout stability on resize [file: tests/3.1-main-layout-split-pane.test.cjs].

**Advisory Notes**
- Note: If an epic-3 tech spec exists, add it under _bmad-output/tech-spec-epic-3*.md and reference it from Dev Agent context.
