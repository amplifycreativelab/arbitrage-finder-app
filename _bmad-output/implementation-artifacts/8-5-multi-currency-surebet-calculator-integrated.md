# Story 8.5: Multi-Currency Surebet Calculator (Integrated)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want the surebet calculator (in the main feed) to handle different currencies across bookmakers,
So that I can calculate stakes accurately when bookmakers use different account currencies.

## Acceptance Criteria

### 1. Multi-Currency Calculator Integration
- [x] Calculator integrated in the **main Arbitrage/Surebet feed** supports multi-currency calculations
- [x] Each stake input in the calculator has a **currency selector** (USD/AUD/EUR)
- [x] Currency selectors default to the app's base currency setting (from Story 8.4)
- [x] User can override currency per stake independently
- [x] Currency selection is persisted per calculation (in history)

### 2. Currency Conversion in Calculations
- [x] Calculator automatically converts all stakes to a **base currency** for profit calculation
- [x] Base currency is the app's configured base currency (default: USD)
- [x] Display shows:
  - Stake amounts in their original currency (as entered)
  - Converted values in base currency (for comparison)
  - Total investment in base currency
  - Guaranteed profit in base currency
  - Optional: profit converted to user's preferred display currency
- [x] Real-time conversion using latest fetched exchange rates from Story 8.4

### 3. Exchange Rate Integration
- [x] Uses existing `exchangeRates` from `appSettingsStore` (Story 8.4)
- [x] Uses `useCurrencyConversion()` hook for rate lookups
- [x] Conversion formula: `amountInBase = amountInForeign / rateToBase`
- [x] Bid/ask spread not implemented (uses mid-market rates)
- [x] Rates are cached; no additional API calls during calculation

### 4. Rate Staleness Handling
- [x] Visual indicator when exchange rates are stale (>24h old)
- [x] Warning banner: "Exchange rates are X hours old. Conversions may be inaccurate."
- [x] "Refresh Rates" button in calculator panel (calls manual fetch from Story 8.4)
- [x] Calculator remains functional with stale rates (with warning)

### 5. Multi-Currency Calculation Example Workflow
- [x] User clicks "Calculate Stakes" on a surebet in the main feed
- [x] Calculator opens with opportunity details pre-filled
- [x] User sets Bookmaker A currency to AUD, enters stake
- [x] Calculator auto-calculates Bookmaker B stake in base currency terms
- [x] User can optionally change Bookmaker B currency to EUR
- [x] Display shows total investment and profit in USD (base currency)
- [x] Example display:
  ```
  Outcome A: Pinnacle
    Stake: A$100.00
    Converted: $65.79 USD
    Odds: 2.10
  
  Outcome B: Bet365
    Stake: €85.50
    Converted: $91.45 USD
    Odds: 2.05
  
  Total Investment: $157.24 USD
  Guaranteed Profit: $7.50 USD (4.77%)
  ```

### 6. Calculator History with Multi-Currency
- [x] History shows original currencies used per calculation
- [x] History entries display:
  - Event name
  - Market type
  - Stake A with currency (e.g., "A$100")
  - Stake B with currency (e.g., "€85.50")
  - Total in base currency
  - Profit in base currency
  - Exchange rate snapshot timestamp
- [x] "Load from history" restores currency selections along with stakes

### 7. Copy Bet Slip with Currency Information
- [x] "Copy Bet Slip" includes currency indicators
- [x] Format: `Bookmaker A: A$X @ Y | Bookmaker B: €X @ Y | Total: $X USD | Profit: $X USD (X%)`
- [x] Visual feedback when copied (button flash/checkmark)

### 8. UI/UX Requirements
- [x] Currency selectors use compact dropdown (shadcn `Select`)
- [x] Currency symbols display next to amounts (e.g., "A$", "€", "$")
- [x] Converted amounts shown in smaller, muted text below original amounts
- [x] Base currency indicator in calculator header
- [x] Clean, compact design fitting within the feed layout
- [x] Accent color (#F97316) for profit/highlighted values
- [x] ESC key closes calculator panel

## Tasks / Subtasks

- [x] **Task 1: Extend Calculator Store for Multi-Currency** (AC: #1, #2, #6)
  - [x] 1.1 Extend `CalculatorState` interface with currency fields:
    - `currencyA: Currency` (default from baseCurrency)
    - `currencyB: Currency` (default from baseCurrency)
  - [x] 1.2 Add actions: `setCurrencyA()`, `setCurrencyB()`
  - [x] 1.3 Update `CalculationHistoryEntry` to include currencies and rate snapshot
  - [x] 1.4 Modify `addToHistory()` to capture current exchange rates

- [x] **Task 2: Create Currency-Aware Calculator UI** (AC: #1, #2, #8)
  - [x] 2.1 Modify `SurebetCalculator.tsx` to add currency selectors
  - [x] 2.2 Add currency dropdown next to each stake input
  - [x] 2.3 Display converted amounts in base currency (muted text)
  - [x] 2.4 Show base currency indicator in calculator header
  - [x] 2.5 Add currency symbols to formatted amounts

- [x] **Task 3: Integrate Exchange Rate Service** (AC: #3, #4)
  - [x] 3.1 Import `useExchangeRates()` and `useCurrencyConversion()` hooks
  - [x] 3.2 Wire up real-time conversion using cached rates
  - [x] 3.3 Add rate staleness check (>24h)
  - [x] 3.4 Display staleness warning banner when applicable
  - [x] 3.5 Add "Refresh Rates" button that calls `currency.fetchRates()`

- [x] **Task 4: Update Calculator Panel** (AC: #4, #8)
  - [x] 4.1 Add rate status indicator to `CalculatorPanel.tsx` header
  - [x] 4.2 Integrate staleness warning banner
  - [x] 4.3 Ensure panel layout accommodates currency selectors

- [x] **Task 5: Update Calculation History UI** (AC: #6)
  - [x] 5.1 Modify `CalculatorHistory.tsx` to display currency codes
  - [x] 5.2 Show original stake currencies in history list
  - [x] 5.3 Display exchange rate timestamp for each history entry
  - [x] 5.4 Update "Load" button to restore currency selections

- [x] **Task 6: Update Copy Bet Slip Feature** (AC: #7)
  - [x] 6.1 Modify `copyBetSlip.ts` to include currency symbols
  - [x] 6.2 Format: include original currencies and base currency total
  - [x] 6.3 Example: `Pinnacle: A$100 @ 2.10 | Bet365: €85.50 @ 2.05 | Total: $157.24 USD | Profit: $7.50 USD (4.77%)`

- [x] **Task 7: Add Tests** (AC: #1-#8)
  - [x] 7.1 Unit tests for multi-currency stake calculations
  - [x] 7.2 Unit tests for currency conversion in calculator
  - [x] 7.3 Unit tests for rate staleness handling
  - [x] 7.4 Unit tests for bet slip with currencies
  - [x] 7.5 Test file: `tests/8-5-multi-currency-surebet-calculator.test.cjs`

## Dev Notes

### Architecture Compliance

This story extends the surebet calculator with multi-currency support:

| Component | File | Pattern |
|-----------|------|---------|
| Calculator Store | `src/renderer/src/features/dashboard/stores/calculatorStore.ts` | MODIFY - Add currency fields |
| Calculator Component | `src/renderer/src/features/dashboard/components/SurebetCalculator.tsx` | MODIFY - Add currency UI |
| Calculator Panel | `src/renderer/src/features/dashboard/components/CalculatorPanel.tsx` | MODIFY - Add rate status |
| History Component | `src/renderer/src/features/dashboard/components/CalculatorHistory.tsx` | MODIFY - Show currencies |
| Currency Hooks | `src/renderer/src/hooks/useCurrency.ts` | REUSE - From Story 8.4 |

### Current State (from Previous Stories)

**Already Implemented (reused by this story):**
- `calculatorStore.ts` with stake calculation logic ✅ (Story 8.3)
- `SurebetCalculator.tsx` component with outcome sections ✅ (Story 8.3)
- `CalculatorPanel.tsx` container component ✅ (Story 8.3)
- `CalculatorHistory.tsx` with history UI ✅ (Story 8.3)
- `currencyService.ts` with Frankfurter API integration ✅ (Story 8.4)
- `useCurrency.ts` hooks for conversion ✅ (Story 8.4)
- `appSettingsStore.ts` with currency state ✅ (Story 8.4)
- Exchange rates cached with timestamp ✅ (Story 8.4)

**What Story 8.5 Adds:**
1. Currency selectors in calculator UI
2. Multi-currency stake calculation logic
3. Currency conversion integration with Story 8.4
4. Rate staleness warnings in calculator
5. Multi-currency history entries
6. Currency-aware bet slip copy

### Key Data Structures

```typescript
// calculatorStore.ts (extensions)
interface CalculatorState {
  // ... existing fields from Story 8.3 ...
  
  // NEW: Currency fields
  currencyA: Currency;  // 'USD' | 'AUD' | 'EUR'
  currencyB: Currency;
  
  // NEW: Rate snapshot at calculation time
  exchangeRateSnapshot: Record<Currency, number>;
}

interface CalculationHistoryEntry {
  // ... existing fields from Story 8.3 ...
  
  // NEW: Currency fields
  currencyA: Currency;
  currencyB: Currency;
  exchangeRateSnapshot: Record<Currency, number>;
  exchangeRateTimestamp: string;
}

// Conversion in calculator
function calculateMultiCurrencyStakes(
  totalStake: number,
  totalStakeCurrency: Currency,
  oddsA: number,
  oddsB: number,
  rates: Record<Currency, number>
): { 
  stakeA: number; 
  stakeB: number;
  stakeAInBase: number;
  stakeBInBase: number;
} {
  // First, calculate optimal stakes in base currency
  const probA = 1 / oddsA;
  const probB = 1 / oddsB;
  const totalProb = probA + probB;
  
  // Convert total stake to base currency
  const totalInBase = totalStakeCurrency === baseCurrency 
    ? totalStake 
    : convertToBase(totalStake, totalStakeCurrency, rates);
  
  const stakeAInBase = (totalInBase * probA) / totalProb;
  const stakeBInBase = (totalInBase * probB) / totalProb;
  
  // Convert to respective outcome currencies
  const stakeA = convertFromBase(stakeAInBase, currencyA, rates);
  const stakeB = convertFromBase(stakeBInBase, currencyB, rates);
  
  return { stakeA, stakeB, stakeAInBase, stakeBInBase };
}

// Currency conversion utilities (from Story 8.4)
function convertToBase(
  amount: number, 
  from: Currency, 
  rates: Record<Currency, number>
): number {
  if (from === 'USD') return amount; // USD is base
  return amount / rates[from];
}

function convertFromBase(
  amount: number, 
  to: Currency, 
  rates: Record<Currency, number>
): number {
  if (to === 'USD') return amount;
  return amount * rates[to];
}
```

### Technical Implementation Notes

**Multi-Currency Calculation Flow:**
```
User enters total stake with currency
         │
         ▼
Convert total to base currency (USD)
         │
         ▼
Calculate optimal split in base currency
  stakeA_base = total_base * (1/oddsA) / totalProb
  stakeB_base = total_base * (1/oddsB) / totalProb
         │
         ▼
Convert stakes to outcome currencies
  stakeA = convertFromBase(stakeA_base, currencyA)
  stakeB = convertFromBase(stakeB_base, currencyB)
         │
         ▼
Display with conversions:
  "A$100 (=$65.79 USD)"
```

**Rate Staleness Check:**
```typescript
// In CalculatorPanel or SurebetCalculator
const { ratesLastFetched } = useExchangeRates();
const isStale = ratesLastFetched 
  ? (Date.now() - new Date(ratesLastFetched).getTime()) > (24 * 60 * 60 * 1000)
  : true;

// Show warning banner if stale
{isStale && (
  <Alert variant="warning">
    Exchange rates are {hoursOld} hours old. Consider refreshing.
    <Button onClick={refreshRates} size="sm">Refresh</Button>
  </Alert>
)}
```

**Currency Selector UI:**
```typescript
// Next to stake input
<div className="flex items-center gap-2">
  <Input 
    type="number" 
    value={stakeA} 
    onChange={(e) => setStakeA(e.target.value)}
    className="flex-1"
  />
  <Select value={currencyA} onValueChange={setCurrencyA}>
    <SelectTrigger className="w-24">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="USD">$ USD</SelectItem>
      <SelectItem value="AUD">A$ AUD</SelectItem>
      <SelectItem value="EUR">€ EUR</SelectItem>
    </SelectContent>
  </Select>
</div>

// Converted amount (muted)
<p className="text-sm text-slate-400">
  = {formatCurrency(stakeAInBase, 'USD')} USD
</p>
```

**History Entry with Currencies:**
```typescript
// CalculatorHistory.tsx list item
<div className="history-item">
  <div className="font-medium">{entry.eventName}</div>
  <div className="text-sm text-slate-400">
    {formatCurrency(entry.stakeA, entry.currencyA)} @ {entry.oddsA} | 
    {formatCurrency(entry.stakeB, entry.currencyB)} @ {entry.oddsB}
  </div>
  <div className="text-sm">
    Total: {formatCurrency(entry.totalStake, 'USD')} | 
    Profit: <span className="text-ot-accent">{formatCurrency(entry.profit, 'USD')}</span>
  </div>
  <div className="text-xs text-slate-500">
    Rates from {formatRelativeTime(entry.exchangeRateTimestamp)}
  </div>
</div>
```

### Key Design Decisions

1. **USD as Internal Base**: All calculations internally use USD as base currency, regardless of user's display preference. This simplifies conversion logic.

2. **Currency Per Outcome**: Each outcome (A/B) can have its own currency, reflecting real-world scenarios where bookmakers use different account currencies.

3. **Rate Snapshot in History**: History entries capture the exchange rate snapshot at calculation time, preserving accuracy for historical reference.

4. **Mid-Market Rates**: Uses mid-market rates from Frankfurter API. Bid/ask spread not implemented (future enhancement).

5. **Staleness Warning**: 24-hour threshold aligns with Story 8.4 and daily rate update pattern. Calculator remains functional but warns user.

6. **Reuses Story 8.4 Infrastructure**: Leverages existing hooks, store, and service - minimal new code required.

### Dependencies

- **Story 8.3 (Surebet Calculator Core)** - provides calculator UI and store structure
- **Story 8.4 (Currency Exchange Rate Service)** - provides rates, hooks, and conversion utilities

### Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/src/features/dashboard/stores/calculatorStore.ts` | Add currency fields, update calculations |
| `src/renderer/src/features/dashboard/components/SurebetCalculator.tsx` | Add currency selectors, show conversions |
| `src/renderer/src/features/dashboard/components/CalculatorPanel.tsx` | Add rate status, staleness warning |
| `src/renderer/src/features/dashboard/components/CalculatorHistory.tsx` | Show currencies in history |
| `src/renderer/src/features/dashboard/lib/copyBetSlip.ts` | Include currencies in copy format |

### Risk Assessment

**R-001 (Rate Accuracy):**
- Risk: Exchange rate fluctuations between calculation and bet placement
- Mitigation: Show rate timestamp, encourage frequent rate refreshes, display warnings for stale rates

**R-002 (Conversion Precision):**
- Risk: Floating-point errors in currency conversion
- Mitigation: Use toFixed(2) for display, maintain precision for calculations, round only at final display step

**R-003 (User Confusion):**
- Risk: Users confused by multiple currencies displayed
- Mitigation: Clear labeling, base currency prominently shown, muted text for converted amounts

### Testing Strategy

**Unit Tests:**
- Multi-currency stake calculations (verify math correctness)
- Currency conversion to/from base
- Rate staleness calculation
- History entry currency capture

**Component Tests:**
- Currency selector rendering
- Converted amount display
- Staleness warning display
- Rate refresh button behavior

**Integration Tests:**
- Full calculation flow with currencies
- History save/load with currencies
- Rate refresh integration

**Test Data:**
```typescript
const mockRates = {
  USD: 1,
  AUD: 1.52,
  EUR: 0.85,
};

const mockCalculation = {
  totalStake: 100,
  totalStakeCurrency: 'AUD',
  currencyA: 'AUD',
  currencyB: 'EUR',
  oddsA: 2.10,
  oddsB: 2.05,
};
```

### References

- [Source: _bmad-output/epics.md#Story 8.5 – Multi-Currency Surebet Calculator (Integrated)]
- [Source: _bmad-output/implementation-artifacts/8-3-surebet-calculator-core.md]
- [Source: _bmad-output/implementation-artifacts/8-4-currency-exchange-rate-service.md]
- [Frankfurter API Docs: https://api.frankfurter.app/]

## Dev Agent Record

### Agent Model Used

Claude (Dev Agent - Amelia)

### Debug Log References

- **Code Review Fix (H-01/H-02)**: Fixed `addToHistory()` calls to pass exchange rate data
  - `CalculatorPanel.tsx:97` - `handleClose()` now passes `rates` and `lastFetchedRelative`
  - `CalculatorHistory.tsx:29` - `handleSaveCurrent()` now passes `rates` and `lastFetchedRelative`
  - Added `useExchangeRates()` hook import to `CalculatorHistory.tsx`

### Completion Notes List

1. **Task 1 - Calculator Store Extensions**: Added `currencyA`, `currencyB` fields to CalculatorState and CalculationHistoryEntry. Added `setCurrencyA()`, `setCurrencyB()` actions. Updated `addToHistory()` to capture exchange rate snapshot and timestamp. Modified `loadFromHistory()` to restore currency selections.

2. **Task 2 - Currency-Aware UI**: Modified `SurebetCalculator.tsx` to include currency selectors (shadcn Select) next to each stake input. Added currency symbols to stake inputs and results. Shows converted amounts in muted text below original amounts when currencies differ from base.

3. **Task 3 - Exchange Rate Integration**: Integrated `useExchangeRates()` and `useCurrencyWithConversion()` hooks. Rate staleness check (>24h) with visual indicator (⚠/✓) in calculator header.

4. **Task 4 - Calculator Panel Updates**: Added base currency indicator badge and rate status indicator to header. Integrated staleness warning banner with "Refresh Rates" button calling `fetchRates()`.

5. **Task 5 - History UI**: Updated `CalculatorHistory.tsx` to display currency symbols with stakes. Shows exchange rate timestamp for each history entry. Load button restores currency selections.

6. **Task 6 - Copy Bet Slip**: Updated `copyBetSlip.ts` to include currency symbols in format: `Pinnacle: A$100 @ 2.10 | Bet365: €85.50 @ 2.05 | Total: $157.24 USD | Profit: $7.50 USD (4.77%)`

7. **Task 7 - Tests**: Created comprehensive test suite in `tests/8-5-multi-currency-surebet-calculator.test.cjs` with 18 tests covering currency conversion, multi-currency calculations, rate staleness, bet slip formatting, and currency formatting.

### File List

| File | Change Type | Description |
|------|-------------|-------------|
| `src/renderer/src/features/dashboard/stores/calculatorStore.ts` | Modified | Added currency fields, actions, and history capture |
| `src/renderer/src/features/dashboard/components/SurebetCalculator.tsx` | Modified | Added currency selectors and conversion display |
| `src/renderer/src/features/dashboard/components/CalculatorPanel.tsx` | Modified | Added rate status indicator and staleness banner |
| `src/renderer/src/features/dashboard/components/CalculatorHistory.tsx` | Modified | Show currencies and rate timestamps in history |
| `src/renderer/src/features/dashboard/lib/copyBetSlip.ts` | Modified | Include currency symbols in bet slip format |
| `tests/8-5-multi-currency-surebet-calculator.test.cjs` | Created | Comprehensive test suite (18 tests, all passing)

---

*Story created by BMAD Method - comprehensive developer guide*
*Dependencies: Story 8.3 (complete), Story 8.4 (complete)*
*Ultimate context engine analysis completed - comprehensive developer guide created*
