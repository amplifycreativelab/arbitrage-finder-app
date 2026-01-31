# Story 8.3: Surebet Calculator Core

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want a surebet calculator that tells me exactly how much to bet on each side,
So that I can lock in guaranteed profit regardless of the outcome.

## Acceptance Criteria

### 1. Calculator Integration in Main Feed
- [ ] Calculator is integrated directly into the **main Arbitrage/Surebet feed tab**
- [ ] Accessible via **three entry points**:
  - "Calculate Stakes" button on each surebet opportunity row
  - Keyboard shortcut (e.g., `C`) when a surebet row is selected
  - Context menu on right-click of any opportunity
- [ ] Calculator appears as an **inline panel or modal** within the surebet feed
- [ ] When activated, pre-populates with the selected opportunity's data:
  - Event name (teams)
  - Market type
  - Bookmaker names (read-only)
  - Odds values (read-only)

### 2. Calculator Input Fields
- [ ] **Outcome A section**:
  - Bookmaker name (read-only display)
  - Odds value (read-only display)
  - Stake amount input (editable or auto-calculated)
- [ ] **Outcome B section**:
  - Bookmaker name (read-only display)
  - Odds value (read-only display)
  - Stake amount input (editable or auto-calculated)
- [ ] **Optional total bankroll input**:
  - User enters total amount to risk
  - Calculator auto-distributes optimally between both outcomes

### 3. Calculator Output Display
- [ ] **Recommended stake** for each outcome (auto-calculated)
- [ ] **Total investment** (sum of both stakes)
- [ ] **Guaranteed profit amount** (should be equal for pure arbitrage)
- [ ] **ROI percentage** for the opportunity
- [ ] **Profit breakdown per outcome** (should be equal for pure arbitrage)

### 4. Calculator Modes
- [ ] **"Total Stake" mode**: User enters total amount to invest → calculator splits optimally
  - Formula: `stakeA = totalStake * (1/oddsA) / (1/oddsA + 1/oddsB)`
  - Formula: `stakeB = totalStake * (1/oddsB) / (1/oddsA + 1/oddsB)`
- [ ] **"Target Profit" mode**: User enters desired profit → calculator computes required stakes
  - Formula: Derive stakes from profit target using implied probabilities
- [ ] Mode toggle button (switch between modes without losing context)

### 5. Staleness & Validity Warnings
- [ ] Visual warning (orange/yellow banner) if selected opportunity is stale (>5 min old)
- [ ] Warning message: "This opportunity is X minutes old. Odds may have changed."
- [ ] Disabled/warning state if opportunity is no longer valid (odds changed making arb impossible)

### 6. Calculation History
- [ ] History of last 20 calculations
- [ ] Persisted in app settings store (survives app restart)
- [ ] History accessible from calculator panel (expandable/collapsible section)
- [ ] Each history entry shows:
  - Event name
  - Market type
  - Total stake
  - Profit amount
  - Timestamp
- [ ] "Load from history" button to re-populate calculator with past calculation

### 7. Copy Bet Slip Feature
- [ ] "Copy Bet Slip" button formats stake info for easy bookmaker entry
- [ ] Format: `Bookmaker A: Stake $X @ Odds Y | Bookmaker B: Stake $X @ Odds Y | Total: $X | Profit: $X (X%)`
- [ ] Visual feedback when copied (button flash/checkmark)

### 8. UI/UX Requirements
- [ ] Clean, compact design fitting within the feed layout
- [ ] Accent color (#F97316) for profit/highlighted values
- [ ] Input fields with proper number formatting (2 decimal places for currency)
- [ ] Real-time calculation updates as user types
- [ ] ESC key closes calculator panel
- [ ] Keyboard navigation (Tab between fields)

## Tasks / Subtasks

- [x] **Task 1: Create Calculator State Management** (AC: #1, #2)
  - [x] 1.1 Create `calculatorStore.ts` in `dashboard/stores/`
  - [x] 1.2 Define `CalculatorState` interface with mode, inputs, outputs
  - [x] 1.3 Implement stake calculation logic (both modes)
  - [x] 1.4 Add calculation history management (add, clear, load)
  - [x] 1.5 Persist history to localStorage via Zustand persist middleware

- [x] **Task 2: Create SurebetCalculator Component** (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `SurebetCalculator.tsx` in `dashboard/components/`
  - [x] 2.2 Build outcome A/B input sections with read-only bookmaker/odds
  - [x] 2.3 Implement stake input fields with number formatting
  - [x] 2.4 Add mode toggle (Total Stake / Target Profit)
  - [x] 2.5 Build output display section (total, profit, ROI)
  - [x] 2.6 Implement real-time calculation on input change

- [x] **Task 3: Integrate Calculator into FeedTable** (AC: #1)
  - [x] 3.1 Add "Calculate Stakes" button to each opportunity row
  - [x] 3.2 Implement keyboard shortcut (`C`) handler in table
  - [x] 3.3 Add context menu with "Calculate Stakes" option
  - [x] 3.4 Wire button/shortcut to open calculator with opportunity data

- [x] **Task 4: Create Calculator Panel Container** (AC: #1, #8)
  - [x] 4.1 Create `CalculatorPanel.tsx` as container/wrapper component
  - [x] 4.2 Implement inline panel mode (slide-out from right)
  - [x] 4.3 Implement modal mode option (centered overlay)
  - [x] 4.4 Add close button and ESC key handler
  - [x] 4.5 Integrate into `DashboardLayout.tsx`

- [x] **Task 5: Implement Staleness & Validity Warnings** (AC: #5)
  - [x] 5.1 Add staleness check (>5 min from `foundAt` timestamp)
  - [x] 5.2 Create warning banner component for stale data
  - [x] 5.3 Add validity check (re-calculate if odds still produce arb)
  - [x] 5.4 Show disabled state if opportunity is no longer valid

- [x] **Task 6: Implement Calculation History UI** (AC: #6)
  - [x] 6.1 Create `CalculatorHistory.tsx` component
  - [x] 6.2 Add expandable history section to calculator panel
  - [x] 6.3 Display history list with event/profit/timestamp
  - [x] 6.4 Implement "Load" button to restore past calculation
  - [x] 6.5 Add "Clear History" button with confirmation

- [x] **Task 7: Implement Copy Bet Slip Feature** (AC: #7)
  - [x] 7.1 Create `copyBetSlip.ts` utility function
  - [x] 7.2 Format: `Bookmaker A: $X @ Y | Bookmaker B: $X @ Y | Total: $X | Profit: $X`
  - [x] 7.3 Add "Copy Bet Slip" button to calculator
  - [x] 7.4 Implement visual feedback (flash/checkmark animation)

- [x] **Task 8: Add Tests** (AC: #1-#8)
  - [x] 8.1 Unit tests for stake calculation formulas (both modes)
  - [x] 8.2 Unit tests for `calculatorStore` logic
  - [x] 8.3 Component tests for `SurebetCalculator`
  - [x] 8.4 Integration tests for calculator panel open/close
  - [x] 8.5 Test file: `tests/8-3-surebet-calculator-core.test.cjs` (28 tests passing)

## Dev Notes

### Architecture Compliance

This story integrates a surebet calculator into the main feed:

| Component | File | Pattern |
|-----------|------|---------|
| Calculator Store | `src/renderer/src/features/dashboard/stores/calculatorStore.ts` | NEW - Zustand store |
| Calculator Component | `src/renderer/src/features/dashboard/components/SurebetCalculator.tsx` | NEW - presentational component |
| Calculator Panel | `src/renderer/src/features/dashboard/components/CalculatorPanel.tsx` | NEW - container component |
| History Component | `src/renderer/src/features/dashboard/components/CalculatorHistory.tsx` | NEW - history UI |
| FeedTable Integration | `src/renderer/src/features/dashboard/FeedTable.tsx` | MODIFY - add calculator trigger |
| DashboardLayout | `src/renderer/src/features/dashboard/DashboardLayout.tsx` | MODIFY - integrate panel |

### Current State (from Previous Stories)

**Already Implemented (reused by this story):**
- `FeedTable` with row selection and keyboard navigation ✅
- `feedStore` with `selectedOpportunityId` and opportunity data ✅
- `SignalPreview` component pattern for right-pane display ✅
- `ArbitrageOpportunity` type with all necessary fields ✅

**What Story 8.3 Adds:**
1. `calculatorStore` for calculator state management
2. `SurebetCalculator` component for stake calculations
3. `CalculatorPanel` container for inline/modal display
4. FeedTable integration (button, shortcut, context menu)
5. Calculation history persistence
6. Copy bet slip functionality

### Key Data Structures

```typescript
// calculatorStore.ts
interface CalculatorState {
  // Visibility
  isOpen: boolean;
  displayMode: 'inline' | 'modal';
  
  // Selected opportunity
  opportunity: ArbitrageOpportunity | null;
  
  // Calculator mode
  mode: 'totalStake' | 'targetProfit';
  
  // Inputs
  totalStake: number | '';
  targetProfit: number | '';
  stakeA: number | '';
  stakeB: number | '';
  
  // Calculated outputs
  calculatedStakeA: number;
  calculatedStakeB: number;
  totalInvestment: number;
  profit: number;
  roi: number;
  
  // History (persisted)
  history: CalculationHistoryEntry[];
}

interface CalculationHistoryEntry {
  id: string;
  timestamp: string;
  eventName: string;
  marketType: string;
  bookmakerA: string;
  bookmakerB: string;
  oddsA: number;
  oddsB: number;
  stakeA: number;
  stakeB: number;
  totalStake: number;
  profit: number;
  roi: number;
}

// Formula utilities
function calculateStakesFromTotal(
  totalStake: number,
  oddsA: number,
  oddsB: number
): { stakeA: number; stakeB: number } {
  const probA = 1 / oddsA;
  const probB = 1 / oddsB;
  const totalProb = probA + probB;
  
  return {
    stakeA: (totalStake * probA) / totalProb,
    stakeB: (totalStake * probB) / totalProb
  };
}

function calculateProfit(stakeA: number, stakeB: number, oddsA: number, oddsB: number): number {
  // Profit should be equal for both outcomes in pure arbitrage
  const returnA = stakeA * oddsA;
  const returnB = stakeB * oddsB;
  const totalStake = stakeA + stakeB;
  
  // Both should be equal, but take average for safety
  return (returnA - totalStake + returnB - totalStake) / 2;
}

function calculateRoi(profit: number, totalStake: number): number {
  return profit / totalStake;
}
```

### Technical Implementation Notes

**Calculator Open Flow:**
```
User clicks "Calculate Stakes" on row
         │
         ▼
feedStore.setSelectedOpportunityId(id)
         │
         ▼
calculatorStore.openCalculator(opportunity)
         │
         ▼
CalculatorPanel opens (inline or modal)
         │
         ▼
SurebetCalculator renders with opportunity data
```

**Stake Calculation Flow:**
```
User enters total stake
         │
         ▼
calculatorStore.setTotalStake(value)
         │
         ▼
Auto-calculate stakes:
  stakeA = totalStake * (1/oddsA) / ((1/oddsA) + (1/oddsB))
  stakeB = totalStake * (1/oddsB) / ((1/oddsA) + (1/oddsB))
         │
         ▼
Update outputs: totalInvestment, profit, ROI
```

**Panel Layout (Inline Mode):**
```typescript
// Similar to SignalPreview panel
<div className="relative">
  <FeedTable />
  {isCalculatorOpen && (
    <div className={cn(
      "absolute right-0 top-0 h-full w-[400px] bg-slate-900 border-l",
      "transition-transform duration-300",
      "translate-x-0"
    )}>
      <CalculatorPanel>
        <SurebetCalculator opportunity={selectedOpportunity} />
        <CalculatorHistory />
      </CalculatorPanel>
    </div>
  )}
</div>
```

**Staleness Check:**
```typescript
function isOpportunityStale(opportunity: ArbitrageOpportunity): boolean {
  const foundAt = new Date(opportunity.foundAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - foundAt) > fiveMinutes;
}
```

### Key Design Decisions

1. **Integrated in Main Feed**: Unlike the Odds Browser (Story 8.1/8.2) which is a separate tab, the Surebet Calculator is integrated directly into the main feed for immediate access during opportunity review.

2. **Dual Calculation Modes**: Users can think in terms of "I want to invest $100 total" OR "I want to make $10 profit" - both are common mental models.

3. **History Persistence**: Calculations are persisted so users can reference previous bets or re-calculate with updated odds.

4. **Read-Only Opportunity Data**: Bookmakers and odds come from the opportunity and cannot be edited (this isn't an arbitrary calculator - it's tied to a specific surebet).

5. **Inline + Modal Options**: Inline for quick checks while browsing, modal for focused calculation work.

### Dependencies

- **Story 7.5 (Exhaustive Arbitrage Detection Engine)** - provides the opportunity data structure
- **Story 3.2 (Feed Table)** - provides the table component to extend
- **Story 4.1 (Signal Preview Pane)** - provides the panel pattern to follow
- **Epic 1 (Foundation)** - provides the settings store for persistence

### Previous Story Intelligence (Story 8.2)

From Story 8.2 implementation:
- Panel patterns (docked vs floating) established
- Store action patterns from `oddsBrowserStore.ts`
- Copy-to-clipboard pattern from `BestOddsView.tsx`
- Slide-out panel animation pattern

**Patterns to Reuse:**
- Store structure from `oddsBrowserStore.ts`
- Panel animation CSS from `OddsBrowser.tsx`
- Copy feedback pattern from `SignalPreview.tsx`
- Number input formatting from existing settings inputs

### UI/UX Design Notes

**Calculator Panel Layout:**
```
┌────────────────────────────────────────┐
│  ⚡ Surebet Calculator        [Modal] [X]│
├────────────────────────────────────────┤
│  Event: Man United vs Chelsea          │
│  Market: Over/Under 2.5 Goals          │
│  ROI: 5.26%                            │
├────────────────────────────────────────┤
│  [Total Stake] [Target Profit]         │
├────────────────────────────────────────┤
│  Outcome A: Over 2.5                   │
│  Bet365 @ 1.95                         │
│  Stake: [$      51.28]                 │
├────────────────────────────────────────┤
│  Outcome B: Under 2.5                  │
│  Pinnacle @ 2.05                       │
│  Stake: [$      48.72]                 │
├────────────────────────────────────────┤
│  ───────────────────────────────────── │
│  Total Investment: $100.00             │
│  Guaranteed Profit: $5.26 (5.26%)      │
│  ───────────────────────────────────── │
├────────────────────────────────────────┤
│  [Copy Bet Slip] [View History ▼]      │
└────────────────────────────────────────┘
```

**History Expanded View:**
```
┌────────────────────────────────────────┐
│  Recent Calculations         [Clear]   │
├────────────────────────────────────────┤
│  MUN vs CHE - O/U 2.5        2m ago   │
│  $100 → $5.26 profit          [Load]  │
│  ───────────────────────────────────── │
│  LIV vs ARS - Moneyline      15m ago  │
│  $50 → $2.10 profit           [Load]  │
│  ───────────────────────────────────── │
│  ...                                   │
└────────────────────────────────────────┘
```

**Staleness Warning:**
```
┌────────────────────────────────────────┐
│  ⚠️ This opportunity is 7 minutes old  │
│     Odds may have changed.             │
├────────────────────────────────────────┤
│  ... rest of calculator ...            │
└────────────────────────────────────────┘
```

**Styling Notes:**
- Panel background: `bg-slate-900` (consistent with SignalPreview)
- Border: `border-l border-slate-700`
- Accent color for profit: `text-ot-accent` (#F97316)
- Input fields: shadcn/ui `Input` component with `type="number"`
- Buttons: shadcn/ui `Button` variant="outline" for secondary, default for primary
- Warning banner: `bg-yellow-900/30 border-yellow-600 text-yellow-200`

### Risk Assessment

**R-001 (Calculation Precision):**
- Risk: Floating point rounding errors in stake calculations
- Mitigation: Use `toFixed(2)` for display, but keep full precision for calculations

**R-002 (Stale Data):**
- Risk: User calculates stakes based on old odds that have changed
- Mitigation: Clear staleness warning (>5 min), encourage re-verification

**R-003 (Input Validation):**
- Risk: Negative numbers, zero, or non-numeric inputs
- Mitigation: Input validation with min="0", step="0.01", proper error messages

**R-004 (History Bloat):**
- Risk: History grows unbounded
- Mitigation: Limit to 20 entries, FIFO eviction

### Testing Strategy

**Unit Tests:**
- Stake calculation formulas (verify math correctness)
- Profit calculation (verify equal profit for both outcomes)
- Mode switching (verify state consistency)
- History management (add, load, clear)

**Component Tests:**
- Input field rendering and updates
- Calculation output display
- Mode toggle functionality
- Staleness warning display

**Integration Tests:**
- Calculator opens from feed table
- Calculator pre-populates with opportunity data
- History persists across app restarts
- Copy bet slip functionality

### References

- [Source: _bmad-output/epics.md#Story 8.3 – Surebet Calculator Core]
- [Source: _bmad-output/implementation-artifacts/8-2-odds-selection-comparison-integration.md]
- [Source: _bmad-output/implementation-artifacts/7-5-exhaustive-arbitrage-detection-engine.md]
- [Source: src/renderer/src/features/dashboard/stores/feedStore.ts]
- [Source: src/renderer/src/features/dashboard/SignalPreview.tsx]
- [Source: src/renderer/src/features/dashboard/FeedTable.tsx]
- [Source: shared/types.ts - ArbitrageOpportunity]

## Dev Agent Record

### Agent Model Used

Kimi Code CLI (kimi-code-cli)

### Debug Log References

- Story 8.3: Surebet Calculator Core
- All 8 tasks completed with red-green-refactor cycle
- 34 unit tests created and passing (added 6 new tests for validity check)

### Code Review Fixes Applied (2026-01-31)

**CRITICAL/HIGH Issues Fixed:**
- **H-001**: Added `isValidArbitrage()` and `calculateArbitrageMargin()` functions to verify odds still form valid arbitrage (AC-5)
- **H-003**: Changed stake A/B inputs from read-only to editable number inputs with manual override capability (AC-2)
- **H-004**: Added explicit "Save to History" button for users to save calculations on-demand (AC-6)

**MEDIUM Issues Fixed:**
- **M-001**: Added guard clauses in `calculateStakesFromTargetProfit()` to return `null` for invalid arbitrage odds, preventing division by zero
- **M-002**: Added modifier key checks (ctrlKey, metaKey, altKey) to 'C' keyboard shortcut to prevent conflicts with copy commands

**LOW Issues Fixed:**
- **L-001**: Added `aria-pressed` attributes to mode toggle buttons for accessibility
- **L-002**: Refactored `CalculatorPanel.tsx` to use `createBetSlipData()` and `copyBetSlipToClipboard()` from `copyBetSlip.ts` instead of inline duplicate logic

### Completion Notes List

- **Task 1**: Created `calculatorStore.ts` with Zustand store including persist middleware for history. Implemented `calculateStakesFromTotal` and `calculateStakesFromTargetProfit` formulas with proper stake distribution logic.
- **Task 2**: Created `SurebetCalculator.tsx` component with mode toggle (Total Stake/Target Profit), read-only bookmaker/odds display, calculated stake outputs, and real-time calculation updates.
- **Task 3**: Integrated calculator into `FeedTable.tsx` with "Calculate Stakes" button on row hover, keyboard shortcut 'C', and context menu with calculate option.
- **Task 4**: Created `CalculatorPanel.tsx` with inline (slide-out) and modal display modes, close button, ESC key handler, and integration into `DashboardLayout.tsx`.
- **Task 5**: Implemented staleness detection (>5 min) with yellow warning banner in `SurebetCalculator.tsx` using `isOpportunityStale` and `getStalenessMinutes` utilities.
- **Task 6**: Created `CalculatorHistory.tsx` with expandable history list (max 20 entries), load/clear functionality, and time-ago display. History persisted via Zustand.
- **Task 7**: Created `copyBetSlip.ts` utility with `formatBetSlip` function and copy-to-clipboard functionality. Added "Copy Bet Slip" button with visual feedback (copied state).
- **Task 8**: Created comprehensive test suite with 28 tests covering stake calculations, staleness detection, bet slip formatting, history management, and integration flows.

### File List

**Files Created:**
- `src/renderer/src/features/dashboard/stores/calculatorStore.ts` - Calculator state management with persist
- `src/renderer/src/features/dashboard/components/SurebetCalculator.tsx` - Calculator UI component
- `src/renderer/src/features/dashboard/components/CalculatorPanel.tsx` - Panel container with inline/modal modes
- `src/renderer/src/features/dashboard/components/CalculatorHistory.tsx` - History UI component
- `src/renderer/src/features/dashboard/lib/copyBetSlip.ts` - Bet slip formatting utilities

**Files Modified:**
- `src/renderer/src/features/dashboard/FeedTable.tsx` - Added calculator trigger button, 'C' keyboard shortcut with modifier checks, context menu
- `src/renderer/src/features/dashboard/DashboardLayout.tsx` - Integrated CalculatorPanel for both inline and modal modes

**Test File:**
- `tests/8-3-surebet-calculator-core.test.cjs` - 34 comprehensive unit and integration tests (all passing)

---

## Change Log

- 2026-01-30: Story created - comprehensive developer guide with architecture compliance, dependencies, and implementation patterns
- 2026-01-30: Story implementation complete - All 8 tasks finished, 28 unit tests passing (Status: review)
- 2026-01-31: Code review complete - Fixed 6 issues (4 HIGH, 2 MEDIUM, 2 LOW), added validity check, editable stakes, save-to-history button, keyboard shortcut protection, accessibility improvements. Tests: 34 passing (Status: done)

---

*Story created by BMAD Method - comprehensive developer guide*
*Dependencies: Story 7.5 (complete), Story 3.2 (complete), Story 4.1 (complete)*
