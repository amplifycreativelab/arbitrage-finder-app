# Story 8.2: Odds Selection & Comparison Integration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to select any odd in the browser and immediately see the odds comparison view,
So that I can compare prices across all bookmakers for that specific market.

## Acceptance Criteria

1. **Odds Selection in Browser**
   - Clicking any odd in the Odds Browser opens the **Odds Comparison Panel**
   - Selection state is visually indicated (highlighted row or cell)
   - Keyboard shortcut (Space or Enter) opens comparison for selected row

2. **Odds Comparison Panel**
   - Panel shows selected event and market context
   - All bookmakers offering that market displayed, sorted by odds (best first)
   - Best price per outcome highlighted with accent color (#F97316)
   - Visual indicator showing selected odd's rank (e.g., "3rd best")
   - Panel can be docked (side view) or floating (modal)
   - "Pin" feature to keep comparison visible while browsing other odds

3. **Integration Features**
   - Copy odds info to clipboard from comparison panel
   - Real-time updates as new odds arrive from Deep Scan
   - Smooth transition between different selections
   - Previous comparison closes when new odd is selected (unless pinned)

4. **UI/UX Requirements**
   - Panel opens smoothly without jank (animation < 300ms)
   - Clear "Close" button or ESC key to dismiss
   - Empty state if selected odd's data becomes stale/unavailable
   - Responsive layout works at all dashboard widths

5. **Data Integration**
   - Uses existing `BestOddsView` component from Story 7.7
   - Leverages `deepScanGetBestOdds` TRPC endpoint
   - Reuses cached odds data (no additional API calls)
   - Works with existing `RawOddsPayload` structure
   - Note: Best odds comparison currently focuses on **two-way markets**; selecting a three-way market may show an empty/unsupported state until 3-way support is added.

## Tasks / Subtasks

- [x] **Task 1: Enhance OddsBrowserTable with selection** (AC: #1)
  - [x] 1.1 Add `selectedOddId` state to `oddsBrowserStore`
  - [x] 1.2 Add click handler on odd cells to select and open comparison
  - [x] 1.3 Add visual selection indicator (border, background, or ring)
  - [x] 1.4 Implement keyboard shortcut (Enter/Space) for selection
  - [x] 1.5 Add `onOddSelect` callback prop to table component

- [x] **Task 2: Create OddsComparisonPanel component** (AC: #2, #4)
  - [x] 2.1 Create `OddsComparisonPanel.tsx` in `odds-browser/components/`
  - [x] 2.2 Add event context header (teams, league, market)
  - [x] 2.3 Integrate odds comparison from `deepScanGetBestOdds` endpoint
  - [x] 2.4 Add "Pin" toggle button with state
  - [x] 2.5 Add close button (X) with ESC key support
  - [x] 2.6 Add rank indicator showing selected odd's position

- [x] **Task 3: Implement docked vs floating modes** (AC: #2)
  - [x] 3.1 Add `displayMode: 'docked' | 'floating'` state
  - [x] 3.2 Docked mode: Slide-out panel from right edge
  - [x] 3.3 Floating mode: Modal overlay centered on screen
  - [x] 3.4 Mode toggle button in panel header
  - [x] 3.5 Persist mode preference in `oddsBrowserStore`

- [x] **Task 4: Integrate panel into OddsBrowser layout** (AC: #3, #4)
  - [x] 4.1 Modify `OddsBrowser.tsx` to conditionally render panel
  - [x] 4.2 Handle auto-close on new selection (unless pinned)
  - [x] 4.3 Animate panel open/close (CSS transition)
  - [x] 4.4 Ensure panel doesn't obstruct table interaction when docked
  - [x] 4.5 Handle empty/stale data state gracefully

- [x] **Task 5: Add copy functionality** (AC: #3)
  - [x] 5.1 Add "Copy Best Odds" button in panel header
  - [x] 5.2 Format: "{Event} - {Market}: Best {OutcomeA} @ {BookmakerA} ({OddsA}), Best {OutcomeB} @ {BookmakerB} ({OddsB})"
  - [x] 5.3 Add visual feedback (inline confirmation)
  - [x] 5.4 Reuse existing `copySignalToClipboard` pattern

- [x] **Task 6: Implement real-time updates** (AC: #3)
  - [x] 6.1 Subscribe to updates via 5-second polling
  - [x] 6.2 Refresh comparison data when stale
  - [x] 6.3 Show "Updating..." indicator during refresh
  - [x] 6.4 Maintain selection stability across updates

- [x] **Task 7: Add empty and stale states** (AC: #4)
  - [x] 7.1 Empty state: "No comparison data available"
  - [x] 7.2 Stale state: "Data is stale (>5 min old). Waiting for refresh..."
  - [x] 7.3 Loading state: Spinner while fetching
  - [x] 7.4 Error state: "Failed to load comparison" with retry button

- [x] **Task 8: Create unit tests** (AC: #1-#5)

## Review Follow-ups (AI-Review)

### Fixed Issues
- [x] [AI-Review][HIGH] Fixed accent color from #EA580C to #F97316 per AC #2 (`src/renderer/src/index.css:15`)
- [x] [AI-Review][MEDIUM] Removed dead code (_selectedOutcomeData unused variable) (`OddsComparisonPanel.tsx`)
- [x] [AI-Review][MEDIUM] Reduced animation duration from 300ms to 200ms per AC #4 (`OddsBrowser.tsx`)
- [x] [AI-Review][MEDIUM] Updated TODO comment to clarify emoji icon usage (`OddsComparisonPanel.tsx:1`)
- [x] [AI-Review][MEDIUM] Made `isBest` property required in type definition (`OddsComparisonPanel.tsx:39`)
  - [x] 8.1 Test selection logic (click, keyboard)
  - [x] 8.2 Test panel state (pinned, docked, floating)
  - [x] 8.3 Test copy functionality
  - [x] 8.4 Test real-time update handling
  - [x] 8.5 Create test file: `tests/8-2-odds-selection-comparison.test.cjs`

## Dev Notes

### Architecture Compliance

This story extends the Odds Browser feature with comparison panel integration:

| Component | File | Pattern |
|-----------|------|---------|
| Table Enhancement | `src/renderer/src/features/odds-browser/components/OddsBrowserTable.tsx` | MODIFY - add selection |
| Comparison Panel | `src/renderer/src/features/odds-browser/components/OddsComparisonPanel.tsx` | NEW - panel component |
| BestOddsView | `src/renderer/src/features/dashboard/BestOddsView.tsx` | REUSE - existing component |
| Store Updates | `src/renderer/src/features/odds-browser/stores/oddsBrowserStore.ts` | MODIFY - add selection state |
| Main Container | `src/renderer/src/features/odds-browser/OddsBrowser.tsx` | MODIFY - integrate panel |

### Current State (from Story 8.1)

**Already Implemented (reused by this story):**
- Odds Browser tab and navigation ✅
- `OddsBrowserTable` with virtualization ✅
- `oddsBrowserStore` with filter/sort state ✅
- `RawOddsPayload` to `OddsBrowserRow` transformation ✅
- Deep Scan data integration via `useDeepScanOdds` ✅

**Already Implemented (from Story 7.7):**
- `BestOddsView` component with market comparison ✅
- `deepScanGetBestOdds` TRPC endpoint ✅
- Best odds cache with 5-minute TTL ✅
- Market group filtering ✅
- Copy-to-clipboard functionality ✅

**What Story 8.2 Adds:**
1. Selection capability in Odds Browser table
2. `OddsComparisonPanel` container component
3. Docked/floating display modes
4. Pin functionality for persistent comparison
5. Integration between selection and comparison view

### Key Data Structures

```typescript
// Add to oddsBrowserStore.ts
interface OddsBrowserState {
  // ... existing filters ...
  
  // Selection state
  selectedOddId: string | null;
  isComparisonPinned: boolean;
  comparisonDisplayMode: 'docked' | 'floating';
  
  // Actions
  selectOdd: (id: string | null) => void;
  togglePin: () => void;
  setComparisonMode: (mode: 'docked' | 'floating') => void;
  closeComparison: () => void;
}

// From Story 8.1 (existing)
interface OddsBrowserRow {
  id: string; // composite: eventId + marketKey + bookmaker
  sport: string;
  league: string;
  event: { home: string; away: string; startTime: string };
  marketType: string;
  marketKey: string;
  bookmaker: string;
  odds: number;
  outcome: string;
  lastUpdated: string;
}

// From Story 7.7 (reused)
interface BestOddsComparison {
  eventId: string;
  marketKey: string;
  marketGroup: MarketGroup;
  marketLabel: string;
  outcomes: {
    name: string;
    bestOdds: { bookmaker: string; odds: number };
    allBookmakers: { bookmaker: string; odds: number; isBest: boolean }[];
  }[];
}
```

### Technical Implementation Notes

**Selection Flow:**
```
User clicks odd in table
       │
       ▼
oddsBrowserStore.selectOdd(id)
       │
       ▼
OddsComparisonPanel opens
       │
       ▼
TRPC: deepScanGetBestOdds(eventId)
       │
       ▼
BestOddsView renders comparison
```

**Panel Positioning (Docked Mode):**
```typescript
// Slide-out panel from right
<div className="relative">
  <OddsBrowserTable />
  <div className={cn(
    "absolute right-0 top-0 h-full w-[400px] bg-slate-900 border-l",
    "transition-transform duration-300",
    isOpen ? "translate-x-0" : "translate-x-full"
  )}>
    <OddsComparisonPanel />
  </div>
</div>
```

**Panel Positioning (Floating Mode):**
```typescript
// Modal overlay
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div className="w-[600px] max-h-[80vh] bg-slate-900 rounded-lg shadow-xl">
    <OddsComparisonPanel />
  </div>
</div>
```

**Finding Selected Odd's Rank:**
```typescript
function getOddRank(
  comparison: BestOddsComparison,
  selectedBookmaker: string,
  outcomeName: string
): number {
  const outcome = comparison.outcomes.find(o => o.name === outcomeName);
  if (!outcome) return -1;
  
  const sorted = outcome.allBookmakers.sort((a, b) => b.odds - a.odds);
  return sorted.findIndex(b => b.bookmaker === selectedBookmaker) + 1;
}

// Display: "3rd best out of 12 bookmakers"
```

**Pin Behavior:**
```typescript
// If pinned, new selection opens in new panel or replaces
// If not pinned, new selection closes existing panel first
function handleOddSelect(newOddId: string) {
  if (!isComparisonPinned && selectedOddId) {
    closeComparison();
    // Small delay for animation
    setTimeout(() => selectOdd(newOddId), 150);
  } else {
    selectOdd(newOddId);
  }
}
```

### Key Design Decisions

1. **Reuse BestOddsView:** Story 7.7 already built the comparison view. We wrap it in a panel container rather than rebuilding.

2. **Dual Display Modes:** Docked for quick comparison while browsing, floating for focused analysis.

3. **Pin State:** Users can keep a comparison open while browsing other odds - useful for comparing multiple markets side-by-side.

4. **Auto-Close:** Unpinned panels close on new selection to prevent clutter. Pinning overrides this.

5. **Zero API Calls:** All data comes from existing Deep Scan cache and `deepScanGetBestOdds` endpoint.

### Dependencies

- **Story 8.1 (Odds Browser Tab & Grid View)** - provides table, store, and data
- **Story 7.7 (Odds Comparison View)** - provides `BestOddsView` component and TRPC endpoint
- **Epic 6 (Enhanced Filtering)** - provides `MarketGroup` types

### Previous Story Intelligence (Story 8.1)

From Story 8.1 implementation:
- `OddsBrowserTable` uses custom virtualization (FeedTable pattern)
- `oddsBrowserStore` has filter state and computed selectors
- Row selection pattern exists but is basic (highlight only)
- Deep Scan data flows through `useDeepScanOdds` hook

**Patterns to Reuse:**
- Store action pattern from `oddsBrowserStore.ts`
- Row highlighting pattern from table
- Modal/dialog pattern from shadcn/ui
- Copy-to-clipboard from `BestOddsView.tsx`
- Slide-out panel animation pattern

### UI/UX Design Notes

**Layout (Docked Mode):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [Arbitrage Feed] [Odds Browser]                                  │
├──────────────────────────────────────────────────────────┬───────┤
│ Filters:                                                 │       │
│ [Sport ▼] [League ▼] [Search... 🔍]                     │ ODDS  │
├──────────────────────────────────────────────────────────│ COMP  │
│ Soccer ▼                                                 │ ───── │
│   Premier League ▼                                       │ Event:│
│     Event          Market    Bookmaker  Odds   Time     │ MUN   │
│     ─────────────────────────────────────────────────    │ vs    │
│     Man U vs Che   Over 2.5  Bet365    [1.95]  2m   ◄───│ CHE   │
│     Man U vs Che   Under 2.5 Pinnacle   2.05   2m      │       │
│     Liv vs Ars     Moneyline Betfair    2.10   5m      │ Best: │
│   La Liga ▶                                              │ 1.95  │
│ Tennis ▶                                                 │ @Bet3 │
│                                                          │ ───── │
│                                                          │ All:  │
│                                                          │ Pin 1.93
└──────────────────────────────────────────────────────────┴───────┘
```

**Layout (Floating Mode):**
```
┌────────────────────────────────────────┐
│  ⚡ Odds Comparison          [Dock] [X] │
├────────────────────────────────────────┤
│  Event: Man United vs Chelsea          │
│  Market: Over/Under 2.5 Goals          │
│  Rank: 2nd best out of 8 bookmakers    │
├────────────────────────────────────────┤
│  Over 2.5 Goals                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Best: 1.95 @ Bet365        [Copy]     │
│  You selected: 1.95 @ Bet365 ✓         │
│  ───────────────────────────────────── │
│  Pinnacle    1.93                      │
│  Betfair     1.92                      │
├────────────────────────────────────────┤
│  Under 2.5 Goals                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Best: 2.05 @ Pinnacle      [Copy]     │
│  ───────────────────────────────────── │
│  Bet365      2.02                      │
│  ...                                   │
└────────────────────────────────────────┘
```

**Styling Notes:**
- Selected odd: Accent border (#F97316) or ring
- Pin icon: `Pin` from lucide-react, filled when active
- Dock/float toggle: `PanelLeft` / `Maximize2` icons
- Rank badge: Small chip showing "#1", "#2", etc.
- Animation: CSS transition or Framer Motion for smooth panel

### Risk Assessment

**R-001 (Z-Index/Overlay):**
- Risk: Panel may be obscured by other UI elements
- Mitigation: Use appropriate z-index, test with both docked and floating modes

**R-002 (Performance):**
- Risk: Opening panel triggers expensive re-renders
- Mitigation: Memoize `BestOddsView`, use React.memo for panel

**R-003 (Selection State):**
- Risk: Selection lost when data refreshes
- Mitigation: Store selection by stable ID (eventId + marketKey + bookmaker)

**R-004 (Mobile/Small Screens):**
- Risk: Docked panel takes too much space on small viewports
- Mitigation: Force floating mode below certain breakpoint (e.g., 1280px)

### Testing Strategy

**Unit Tests:**
- Selection logic (click, keyboard, clear)
- Pin state toggling
- Display mode switching
- Rank calculation
- Copy formatting

**Integration Tests:**
- Panel opens on selection
- Panel closes on unpin + new selection
- Real-time updates refresh panel
- Data staleness detection

**Manual Tests:**
- Smooth animation between states
- Keyboard navigation (Tab, Enter, ESC)
- Copy functionality works
- Visual rank indicator accuracy

### References

- [Source: _bmad-output/epics.md#Story 8.2 – Odds Selection & Comparison Integration]
- [Source: _bmad-output/implementation-artifacts/8-1-odds-browser-tab-grid-view.md]
- [Source: _bmad-output/implementation-artifacts/7-7-odds-comparison-view.md]
- [Source: src/renderer/src/features/odds-browser/stores/oddsBrowserStore.ts]
- [Source: src/renderer/src/features/dashboard/BestOddsView.tsx]
- [Source: shared/types.ts - BestOddsComparison]

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (kimi-code-cli)

### Debug Log References

- Story 8.2: Odds Selection & Comparison Integration
- All 8 tasks completed with red-green-refactor cycle
- 45 unit tests created and passing

### Completion Notes List

- **Task 1**: Enhanced OddsBrowserTable with selection state (ring-1 ring-inset ring-ot-accent), keyboard shortcuts (Enter/Space), and improved visual indicators
- **Task 2**: Created OddsComparisonPanel component with event context header, rank indicator, pin toggle, close button, and ESC key support
- **Task 3**: Implemented docked mode (slide-out sidebar, 350px width) and floating mode (centered modal overlay) with mode toggle button
- **Task 4**: Integrated panel into OddsBrowser layout with conditional rendering, auto-close behavior (unless pinned), and smooth CSS transitions
- **Task 5**: Added "Copy Best Odds" button with formatted output: "{Event} - {Market}: Best {Outcome} @ {Bookmaker} ({Odds})" pattern
- **Task 6**: Implemented real-time updates via 5-second polling when data is stale, with "Updating..." indicator and selection stability
- **Task 7**: Added empty state ("No comparison data available"), stale state (>5 min warning), loading state (skeleton), and error state with retry
- **Task 8**: Created comprehensive unit tests covering selection logic, panel state, copy functionality, and real-time updates

### File List

**Files Created:**
- `src/renderer/src/features/odds-browser/components/OddsComparisonPanel.tsx` - Panel component with comparison view, pin toggle, docked/floating modes, copy functionality

**Files Modified:**
- `src/renderer/src/features/odds-browser/components/OddsBrowserTable.tsx` - Added visual selection indicator (ring-ot-accent), keyboard shortcuts (Enter/Space)
- `src/renderer/src/features/odds-browser/stores/oddsBrowserStore.ts` - Added isComparisonPinned, comparisonDisplayMode state and actions (toggleComparisonPin, setComparisonDisplayMode, closeComparison)
- `src/renderer/src/features/odds-browser/OddsBrowser.tsx` - Integrated panel with docked/floating rendering, auto-close behavior, smooth animations
- `src/renderer/src/features/odds-browser/types.ts` - Added ComparisonDisplayMode type and extended OddsBrowserState/OddsBrowserStore interfaces

**Test File:**
- `tests/8-2-odds-selection-comparison.test.cjs` - 45 comprehensive unit tests covering all ACs

**Status Updated:**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Changed 8-2-odds-selection-comparison-integration from ready-for-dev to in-progress

---

## Change Log

- 2026-01-30: Story 8.2 implementation complete - All 8 tasks finished, 45 unit tests passing (Status: review)

---

*Story created by BMAD Method - comprehensive developer guide*
*Dependencies: Story 8.1 (complete), Story 7.7 (partial - core functionality)*
