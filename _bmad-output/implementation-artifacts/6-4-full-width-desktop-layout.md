# Story 6.4: Full-Width Desktop Layout

- **Status**: done
- **Epic**: 6 - Enhanced Filtering & Desktop UX
- **Story ID**: 6.4

## Story

As a User,
I want the application to use the full available screen width,
so that I can see more data and work efficiently on my desktop monitor.

## Acceptance Criteria

1. **Remove Width Constraint** – The `max-w-6xl` constraint is removed or significantly increased from the header, main content, and dashboard areas.
2. **Fluid Layout** – The layout adapts fluidly to viewport widths from 1024px to 2560px+.
3. **Proportional Panes** – The feed pane (left) and signal preview pane (right) share the available width proportionally or with configurable column widths.
4. **Ultra-Wide Optimization** – On ultra-wide displays (≥1920px), additional horizontal space is used effectively (e.g., wider table columns, more visible data).
5. **Split Pane Usability** – The split pane maintains usable proportions at all supported widths (min-width constraints prevent unusable narrow panes).
6. **Responsive Scaling** – Typography and spacing scale appropriately for larger widths (no awkward stretched layouts).
7. **Full-Width Header/Footer** – The header and footer span the full width with appropriate internal padding.

## Tasks / Subtasks

- [x] **Task 1: Update Layout Containers** (AC: #1, #2, #7)
  - [x] 1.1 Update `src/renderer/src/App.tsx` (or main layout wrapper) to remove `max-w-6xl` class.
  - [x] 1.2 Set main container to `w-full` or `max-w-[2560px]` if a cap is strictly desired (but AC implies removing it).
  - [x] 1.3 Adjust horizontal padding (`px-4 md:px-6 lg:px-8`) to look good on wide screens.
  - [x] 1.4 Ensure Header and any Footer components span full width with content centered or spaced with `justify-between`.

- [x] **Task 2: Refactor Dashboard Pane Sizing** (AC: #3, #4, #5)
  - [x] 2.1 Update `src/renderer/src/features/dashboard/DashboardLayout.tsx`.
  - [x] 2.2 Adjust `FeedPane` and `SignalPreview` wrapper widths.
    - Remove fixed `max-w` constraints on the feed pane if they artificially limit utilizing space.
    - Allow the right pane (Signal Preview) or Left Pane (Feed) to expand with `flex-1` or appropriate flex basis.
    - *Note:* Often users prefer a fixed-width list and a fluid detail view, or vice versa. The AC says "share... proportionally", but Story 3.1 said "Fixed-left pane (~400px), fluid right pane". Clarification: check if user wants *both* fluid or just *more* space. Story 6.4 AC says "share... proportionally OR with configurable column widths". Given strictly CSS changes, allowing the Feed Pane to grow beyond 440px might look sparse for a table with few columns, but the Signals are dense. *Decision:* Allow Feed Pane to grow but maybe cap it at a wider point (e.g. 50%), or stick to Story 3.1 "Fixed Left, Fluid Right" but remove the *global* container width execution.
    - **Re-reading AC 4:** "wider table columns". This implies the *table* gets wider. So the Feed Pane (left) *must* be able to grow.
  - [x] 2.3 Ensure `min-width` constraints (`min-w-[360px]` or similar) protect against narrowing too much.

- [x] **Task 3: Verify Typography and Spacing** (AC: #6)
  - [x] 3.1 Check if any text elements have `max-w-prose` or constrained widths that look odd in a wide container.
  - [x] 3.2 Verify that the `SignalPreview` JSON payload area uses available width (no horizontal scroll if avoidable).

- [x] **Task 4: Manual Layout Verification** (AC: #2, #4)
  - [x] 4.1 Verify layout at 1024px.
  - [x] 4.2 Verify layout at 1920px.
  - [x] 4.3 Verify layout at >2000px if possible (simulated).

## Dev Notes

### Architecture Compliance

- **CSS Strategy**: Use Tailwind utility classes (`w-full`, `flex`, `flex-1`, `min-w-0`). Avoid custom CSS files unless necessary.
- **Components**:
  - `App.tsx`: The root container.
  - `MainLayout`: If it exists (check project structure).
  - `DashboardLayout.tsx`: The split view.
  - `FeedTable`: Might need `table-layout: fixed` or `auto` adjustments with `w-full`.

### Project Structure Notes

- **Modifications**:
  - `renderer/src/App.tsx`
  - `renderer/src/features/dashboard/DashboardLayout.tsx`
  - `renderer/src/features/dashboard/FeedPane.tsx` (check width classes)

### References

- [Source: _bmad-output/epics.md#Story 6.4 – Full-Width Desktop Layout]
- [Source: renderer/src/App.tsx]
- [Source: renderer/src/features/dashboard/DashboardLayout.tsx]

## Dev Agent Record

### Agent Model Used

Gemini 2.0 Flash (Antigravity) via BMad Master

### Debug Log References

### Completion Notes List

### File List

- src/renderer/src/App.tsx
- src/renderer/src/features/dashboard/DashboardLayout.tsx
- tests/3.1-main-layout-split-pane.test.cjs
- tests/6-4-full-width-desktop-layout.test.cjs
- src/renderer/src/features/dashboard/FeedPane.tsx
