# Story 8.4: Currency Exchange Rate Service

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want to see exchange rates for USD, AUD, and EUR,
So that I can calculate stakes and profits in my preferred currency.
Different bookmakers use different currencies.
When placing bets, I need to calculate the correct stake amounts in different currencies.

## Acceptance Criteria

### 1. Settings Panel Currency Section
- [x] Settings panel includes new "Currency" section with:
  - Base currency selector (USD, AUD, EUR - default: USD)
  - "Fetch Rates" button for manual rate update
  - Display of last fetch timestamp and next scheduled fetch
  - Visual indicator showing rate age (green: <24h, yellow: 24-48h, red: >48h)
- [x] Currency section is clearly separated from Provider Settings
- [x] Settings persist across app restarts

### 2. Exchange Rate Fetching (Frankfurter API)
- [x] Exchange rates fetched from **Frankfurter API** (api.frankfurter.app):
  - Endpoint: `https://api.frankfurter.app/latest?from=USD&to=AUD,EUR`
  - Free, no API key required
  - Updated manually via button (no auto-poll to respect rate limits)
- [x] Supported currencies:
  - USD (US Dollar) - base/reference
  - AUD (Australian Dollar)
  - EUR (Euro)
- [x] Rate fetching shows loading state during API call
- [x] Success/error feedback after fetch attempt

### 3. Rate Display and Storage
- [x] Rates are persisted locally in settings store with timestamp
- [x] Rate display in settings shows:
  - 1 USD = X AUD
  - 1 USD = X EUR
  - Inverse rates (1 AUD = X USD, etc.)
- [x] Store structure: `{ rates: { USD: 1, AUD: x, EUR: y }, lastFetched: ISO8601, baseCurrency: 'USD' }`

### 4. Offline and Error Handling
- [x] Offline handling: Use last fetched rates with clear "stale data" warning
- [x] Error handling: User-friendly message if API unreachable
- [x] Visual indicator when rates are stale (>24h old)
- [x] "Retry" button available after failed fetch

### 5. Currency Conversion Utilities
- [x] Create conversion utility functions:
  - `convert(amount: number, from: Currency, to: Currency): number`
  - `getRate(from: Currency, to: Currency): number`
  - `formatCurrency(amount: number, currency: Currency): string`
- [x] Currency symbols and formatting per locale:
  - USD: `$1,234.56`
  - AUD: `A$1,234.56` or `$1,234.56 AUD`
  - EUR: `€1.234,56` or `€1,234.56`

### 6. TRPC API Endpoints
- [x] Main process exposes TRPC endpoints:
  - `currency.fetchRates()` - Fetches fresh rates from Frankfurter API
  - `currency.getRates()` - Returns cached rates
  - `currency.getLastFetchTime()` - Returns ISO timestamp of last fetch
  - `currency.convert({ amount, from, to })` - Server-side conversion

### 7. Integration with Existing Settings
- [x] Currency settings integrate with existing `appSettingsStore.ts`
- [x] Base currency setting available throughout app via store
- [x] Settings UI follows existing shadcn/ui patterns

## Tasks / Subtasks

- [x] **Task 1: Create Currency Service** (AC: #1, #2, #6)
  - [x] 1.1 Create `currencyService.ts` in `src/main/services/`
  - [x] 1.2 Implement `fetchRatesFromAPI()` function for Frankfurter API
  - [x] 1.3 Add rate caching with timestamp tracking
  - [x] 1.4 Add error handling for network failures
  - [x] 1.5 Export `Currency` type: `'USD' | 'AUD' | 'EUR'`

- [x] **Task 2: Add TRPC Currency Router** (AC: #6)
  - [x] 2.1 Create TRPC procedures in `src/main/services/router.ts`
  - [x] 2.2 Implement `currencyFetchRates` mutation procedure
  - [x] 2.3 Implement `currencyGetRates` query procedure
  - [x] 2.4 Implement `currencyGetLastFetchTime` query procedure
  - [x] 2.5 Implement `currencyConvert` query procedure
  - [x] 2.6 Update TRPC client with new procedures

- [x] **Task 3: Extend App Settings Store** (AC: #1, #3, #7)
  - [x] 3.1 Add currency state to `appSettingsStore.ts`:
    - `baseCurrency: Currency`
    - `exchangeRates: Record<Currency, number>`
    - `ratesLastFetched: string | null`
  - [x] 3.2 Add Zustand persist middleware for currency settings
  - [x] 3.3 Add `setBaseCurrency()` action
  - [x] 3.4 Add `setExchangeRates()` action

- [x] **Task 4: Create Currency Conversion Utilities** (AC: #5)
  - [x] 4.1 Create `currency.ts` in `shared/lib/`
  - [x] 4.2 Implement `convert(amount, from, to, rates)` function
  - [x] 4.3 Implement `getRate(from, to, rates)` function
  - [x] 4.4 Implement `formatCurrency(amount, currency, locale)` function
  - [x] 4.5 Add currency symbols map: `{ USD: '$', AUD: 'A$', EUR: '€' }`
  - [x] 4.6 Add unit tests for conversion functions

- [x] **Task 5: Create Currency Settings UI** (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `CurrencySettings.tsx` component in `settings/components/`
  - [x] 5.2 Add base currency selector (button group)
  - [x] 5.3 Add "Fetch Rates" button with loading state
  - [x] 5.4 Display current rates table (USD→AUD, USD→EUR, inverse)
  - [x] 5.5 Display last fetch timestamp
  - [x] 5.6 Add rate age indicator (color-coded badge)
  - [x] 5.7 Add stale data warning when >24h old
  - [x] 5.8 Add error message display for failed fetches

- [x] **Task 6: Integrate Currency Settings into Settings Panel** (AC: #1, #7)
  - [x] 6.1 Add Currency section alongside ProviderSettings
  - [x] 6.2 Integrate `CurrencySettings` component into DashboardLayout
  - [x] 6.3 Ensure settings layout accommodates new section
  - [x] 6.4 Test navigation between Provider and Currency settings

- [x] **Task 7: Add React Hooks for Currency** (AC: #5, #7)
  - [x] 7.1 Create `useCurrency()` hook for accessing currency settings
  - [x] 7.2 Create `useExchangeRates()` hook for rate data
  - [x] 7.3 Create `useCurrencyConversion()` hook for conversion operations
  - [x] 7.4 Create `useCurrencyWithConversion()` combined hook

- [x] **Task 8: Add Tests** (AC: #1-#7)
  - [x] 8.1 Unit tests for `currencyService.ts` (API mocking)
  - [x] 8.2 Unit tests for conversion utilities
  - [x] 8.3 Component tests for `CurrencySettings`
  - [x] 8.4 Integration tests for TRPC endpoints
  - [x] 8.5 Test file: `tests/8-4-currency-exchange-rate-service.test.cjs`

## Dev Notes

### Architecture Compliance

This story adds currency exchange capabilities to the app:

| Component | File | Pattern |
|-----------|------|---------|
| Currency Service | `src/main/services/currencyService.ts` | NEW - Main process service |
| Currency Router | `src/main/routers/currencyRouter.ts` | NEW - TRPC router |
| App Settings Store | `src/renderer/src/stores/appSettingsStore.ts` | MODIFY - Add currency state |
| Conversion Utils | `src/shared/lib/currency.ts` | NEW - Shared utilities |
| Currency Settings | `src/renderer/src/features/settings/components/CurrencySettings.tsx` | NEW - Settings UI |
| Currency Hooks | `src/renderer/src/hooks/useCurrency.ts` | NEW - React hooks |

### Current State (from Previous Stories)

**Already Implemented (reused by this story):**
- `appSettingsStore.ts` with Zustand and persist middleware ✅
- TRPC router structure and patterns ✅
- Settings UI with shadcn/ui components ✅
- Error handling patterns for API calls ✅

**What Story 8.4 Adds:**
1. `currencyService.ts` for Frankfurter API integration
2. `currencyRouter.ts` for TRPC endpoints
3. Extended `appSettingsStore` with currency state
4. Currency conversion utilities
5. `CurrencySettings` component for UI
6. React hooks for currency operations

### Key Data Structures

```typescript
// currencyService.ts
interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  date: string; // ISO date from API
}

type Currency = 'USD' | 'AUD' | 'EUR';

const CURRENCY_DETAILS: Record<Currency, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
};

// appSettingsStore.ts (extended)
interface AppSettingsState {
  // ... existing settings ...
  
  // Currency settings (NEW)
  baseCurrency: Currency;
  exchangeRates: Record<Currency, number>;
  ratesLastFetched: string | null; // ISO timestamp
  
  // Actions
  setBaseCurrency: (currency: Currency) => void;
  setExchangeRates: (rates: Record<Currency, number>, timestamp: string) => void;
}

// currencyRouter.ts
const currencyRouter = router({
  fetchRates: publicProcedure
    .mutation(async () => {
      // Fetch from Frankfurter API
      // Return rates or throw TRPCError
    }),
  
  getRates: publicProcedure
    .query(() => {
      // Return cached rates from store
    }),
  
  getLastFetchTime: publicProcedure
    .query(() => {
      // Return timestamp or null
    }),
  
  convert: publicProcedure
    .input(z.object({
      amount: z.number().positive(),
      from: z.enum(['USD', 'AUD', 'EUR']),
      to: z.enum(['USD', 'AUD', 'EUR']),
    }))
    .query(({ input }) => {
      // Perform conversion using cached rates
      // Return converted amount
    }),
});
```

### Technical Implementation Notes

**Frankfurter API Integration:**
```typescript
// currencyService.ts
const FRANKFURTER_API_BASE = 'https://api.frankfurter.app';

async function fetchRatesFromAPI(): Promise<ExchangeRates> {
  const response = await fetch(
    `${FRANKFURTER_API_BASE}/latest?from=USD&to=AUD,EUR`
  );
  
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    base: 'USD',
    rates: {
      USD: 1,
      AUD: data.rates.AUD,
      EUR: data.rates.EUR,
    },
    date: data.date,
  };
}
```

**Conversion Formula:**
```typescript
// currency.ts utility
function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  
  // Convert to USD base first, then to target
  const inUSD = from === 'USD' ? amount : amount / rates[from];
  const result = to === 'USD' ? inUSD : inUSD * rates[to];
  
  return Number(result.toFixed(2));
}

function getRate(from: Currency, to: Currency, rates: Record<Currency, number>): number {
  if (from === to) return 1;
  return to === 'USD' ? 1 / rates[from] : rates[to] / rates[from];
}
```

**Rate Age Indicator:**
```typescript
function getRateAgeStatus(lastFetched: string | null): 'fresh' | 'stale' | 'expired' {
  if (!lastFetched) return 'expired';
  
  const hoursSince = (Date.now() - new Date(lastFetched).getTime()) / (1000 * 60 * 60);
  
  if (hoursSince < 24) return 'fresh';
  if (hoursSince < 48) return 'stale';
  return 'expired';
}

// Color mapping
const statusColors = {
  fresh: 'bg-green-500',
  stale: 'bg-yellow-500',
  expired: 'bg-red-500',
};
```

**Settings UI Layout:**
```typescript
// CurrencySettings.tsx structure
<div className="space-y-6">
  {/* Base Currency Selector */}
  <div>
    <Label>Base Currency</Label>
    <Select value={baseCurrency} onValueChange={setBaseCurrency}>
      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
      <SelectItem value="AUD">AUD (A$) - Australian Dollar</SelectItem>
      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
    </Select>
  </div>
  
  {/* Fetch Rates Button + Status */}
  <div className="flex items-center gap-4">
    <Button onClick={handleFetchRates} disabled={isLoading}>
      {isLoading ? <Spinner /> : 'Fetch Rates'}
    </Button>
    <RateAgeBadge lastFetched={ratesLastFetched} />
  </div>
  
  {/* Rates Display Table */}
  <RatesTable rates={exchangeRates} />
  
  {/* Last Fetch Info */}
  <div className="text-sm text-slate-400">
    Last updated: {ratesLastFetched ? formatRelativeTime(ratesLastFetched) : 'Never'}
  </div>
  
  {/* Stale Warning */}
  {isStale && (
    <Alert variant="warning">
      Rates are more than 24 hours old. Consider refreshing.
    </Alert>
  )}
</div>
```

### Key Design Decisions

1. **Manual Fetch Only**: No auto-polling to respect Frankfurter API rate limits. Users fetch manually when needed.

2. **USD as Base**: Frankfurter uses EUR as default base, but we request USD as base for simpler mental math (most users think in USD terms).

3. **Client-Side Conversion**: All conversions use cached rates for instant feedback. No server round-trip needed for calculations.

4. **Three-Currency Support**: Limited to USD, AUD, EUR as primary betting currencies. Easy to extend later.

5. **Stale Data Warning**: 24-hour threshold aligns with daily rate update pattern. Betting decisions need fresh data.

6. **AUD as Priority**: Per requirements, AUD is treated as main currency for the user's workflow (user is Australian-based).

### Dependencies

- **Story 1.3 (Settings Interface)** - provides settings store and UI patterns
- **Story 8.3 (Surebet Calculator Core)** - the calculator will use currency conversion (Story 8.5)
- **Architecture** - IPC patterns, TRPC router structure

### Previous Story Intelligence (Story 8.3)

From Story 8.3 implementation:
- Store patterns from `calculatorStore.ts` and `appSettingsStore.ts`
- Settings UI patterns with shadcn/ui
- TRPC procedure patterns
- Number formatting patterns from calculator inputs

**Patterns to Reuse:**
- Store structure with Zustand persist middleware
- Settings section layout pattern
- Loading state handling from API calls
- Number formatting with 2 decimal places
- Error alert component pattern

### UI/UX Design Notes

**Currency Settings Panel:**
```
┌────────────────────────────────────────┐
│  💱 Currency Settings                  │
├────────────────────────────────────────┤
│                                        │
│  Base Currency                         │
│  [USD ▼]                               │
│                                        │
│  ┌────────────────────────────────┐   │
│  │  [Fetch Rates]    [● Fresh]    │   │
│  └────────────────────────────────┘   │
│                                        │
│  Current Rates (1 USD =)               │
│  ┌────────────────────────────────┐   │
│  │  AUD      A$1.52               │   │
│  │  EUR      €0.85                │   │
│  ├────────────────────────────────┤   │
│  │  Inverse Rates:                │   │
│  │  1 AUD = $0.66 USD             │   │
│  │  1 EUR = $1.18 USD             │   │
│  └────────────────────────────────┘   │
│                                        │
│  Last updated: 2 hours ago             │
│                                        │
└────────────────────────────────────────┘
```

**Stale Data Warning:**
```
┌────────────────────────────────────────┐
│  ⚠️ Exchange rates are 26 hours old    │
│     Consider refreshing for accuracy.  │
├────────────────────────────────────────┤
│  ... rest of settings ...              │
└────────────────────────────────────────┘
```

**Rate Age Badge States:**
- **Fresh** (< 24h): Green dot + "Fresh"
- **Stale** (24-48h): Yellow dot + "Stale"
- **Expired** (> 48h): Red dot + "Expired"

**Styling Notes:**
- Panel background: `bg-slate-900`
- Section borders: `border-slate-700`
- Accent color for active states: `text-ot-accent` (#F97316)
- Input fields: shadcn/ui `Select` and `Button` components
- Warning banner: `bg-yellow-900/30 border-yellow-600 text-yellow-200`
- Success indicator: `bg-green-900/30 border-green-600 text-green-200`

### Risk Assessment

**R-001 (API Availability):**
- Risk: Frankfurter API may be down or rate-limited
- Mitigation: Graceful error handling, use cached rates, clear error messages

**R-002 (Rate Staleness):**
- Risk: User makes decisions based on old exchange rates
- Mitigation: Visual staleness indicators, warnings after 24h, force refresh prompt

**R-003 (Floating Point Precision):**
- Risk: Currency conversion rounding errors
- Mitigation: Use `toFixed(2)` for display, keep precision for calculations

**R-004 (Offline Usage):**
- Risk: App used without internet, no rate data available
- Mitigation: Allow offline with clear "offline mode" indicator, use last known rates

### Testing Strategy

**Unit Tests:**
- Conversion formulas (verify math correctness)
- Rate age calculation
- Currency formatting
- Offline detection

**Component Tests:**
- Currency selector rendering
- Fetch button states (loading, success, error)
- Rate display table
- Staleness warning display

**Integration Tests:**
- Full fetch flow (mock API)
- Settings persistence
- TRPC endpoint responses

**API Mock for Tests:**
```typescript
const mockFrankfurterResponse = {
  base: 'USD',
  date: '2026-01-31',
  rates: {
    AUD: 1.52,
    EUR: 0.85,
  },
};
```

### References

- [Source: _bmad-output/epics.md#Story 8.4 – Currency Exchange Rate Service]
- [Source: _bmad-output/implementation-artifacts/8-3-surebet-calculator-core.md]
- [Source: src/renderer/src/stores/appSettingsStore.ts]
- [Frankfurter API Docs: https://api.frankfurter.app/]
- [Source: src/main/routers/_template.ts - TRPC router pattern]

## Dev Agent Record

### Agent Model Used

Claude Code CLI (Sonnet 4.5)

### Debug Log References

- TypeScript compilation errors resolved for cross-module imports
- Fixed pre-existing calculatorStore.ts null handling bug
- Fixed pre-existing CalculatorPanel.tsx unused variable

### Completion Notes List

1. **Task 1 Complete**: Created `currencyService.ts` with Frankfurter API integration, caching, and error handling
2. **Task 2 Complete**: Added 4 TRPC procedures to router.ts: currencyFetchRates, currencyGetRates, currencyGetLastFetchTime, currencyConvert
3. **Task 3 Complete**: Extended appSettingsStore.ts with currency state and persist middleware
4. **Task 4 Complete**: Created shared/lib/currency.ts with conversion utilities and formatting functions
5. **Task 5 Complete**: Created CurrencySettings.tsx with full UI including rate age badge, rates table, and stale warnings
6. **Task 6 Complete**: Integrated CurrencySettings into DashboardLayout alongside ProviderSettings
7. **Task 7 Complete**: Created useCurrency.ts with 4 hooks: useCurrency, useExchangeRates, useCurrencyConversion, useCurrencyWithConversion
8. **Task 8 Complete**: Created comprehensive test suite with 59 tests covering all functionality

### Code Review Fixes (Post-Implementation)

**[H-001] Fixed:** Added "Retry" button after failed fetch in CurrencySettings.tsx
- Location: Error display section now includes retry button that re-triggers handleFetchRates

**[H-002] Fixed:** Added "Manual fetch only" indicator for missing "next scheduled fetch" display
- Location: Last fetch info section now shows "Next fetch: Manual only (auto-fetch disabled to respect API limits)"

**[M-001] Fixed:** Inconsistent default rates between service and shared lib
- Location: currencyService.ts now imports and uses DEFAULT_RATES from shared/lib/currency.ts

**[M-002] Fixed:** Unsafe type assertions in TRPC router
- Location: router.ts currencyConvert procedure now relies on Zod validation without type assertions

**[M-003] Fixed:** Missing error boundary for CurrencySettings
- Location: CurrencySettings.tsx now includes CurrencySettingsErrorBoundary component and exports wrapped version as default

### File List

**Files Created:**
- `src/main/services/currencyService.ts` - Frankfurter API integration (274 lines)
- `shared/lib/currency.ts` - Shared conversion utilities (206 lines)
- `src/renderer/src/features/settings/components/CurrencySettings.tsx` - Settings UI (395 lines)
- `src/renderer/src/hooks/useCurrency.ts` - React hooks (198 lines)
- `tests/8-4-currency-exchange-rate-service.test.cjs` - Comprehensive tests (687 lines)

**Files Modified:**
- `src/main/services/router.ts` - Added 4 TRPC currency procedures
- `src/renderer/src/lib/trpc.ts` - Added currency procedures to test client
- `src/renderer/src/features/settings/stores/appSettingsStore.ts` - Added currency state
- `src/renderer/src/features/dashboard/DashboardLayout.tsx` - Integrated CurrencySettings
- `src/renderer/src/features/dashboard/components/CalculatorPanel.tsx` - Removed unused 'roi' import
- `src/renderer/src/features/dashboard/stores/calculatorStore.ts` - Fixed null handling bug

**Files Modified (Code Review Fixes):**
- `src/main/services/currencyService.ts` - Fixed to use shared DEFAULT_RATES, removed unused Currency import
- `src/main/services/router.ts` - Removed unsafe type assertions in currencyConvert
- `src/renderer/src/features/settings/components/CurrencySettings.tsx` - Added retry button, manual fetch indicator, error boundary

---

## Change Log

- 2026-01-31: Story created - comprehensive developer guide with architecture compliance, dependencies, and implementation patterns (Status: ready-for-dev)
- 2026-01-31: Story implementation complete - all 8 tasks finished, 59 tests passing, Status: review
- 2026-01-31: Code review complete - 5 issues fixed (2 High, 3 Medium), all tests passing, Status: done

## Implementation Summary

### What Was Built

Story 8.4 adds a complete currency exchange rate service to the Arbitrage Finder app:

1. **Backend Service** (`currencyService.ts`):
   - Fetches live rates from Frankfurter API (free, no API key)
   - Implements caching with timestamp tracking
   - Provides conversion utilities with USD base currency
   - Includes comprehensive error handling and logging

2. **TRPC API** (added to `router.ts`):
   - `currencyFetchRates` - Fetch fresh rates from API
   - `currencyGetRates` - Get cached rates
   - `currencyGetLastFetchTime` - Get last update timestamp
   - `currencyConvert` - Server-side currency conversion

3. **Shared Utilities** (`shared/lib/currency.ts`):
   - Type-safe currency conversion functions
   - Currency formatting with locale support
   - Rate age status calculation (fresh/stale/expired)
   - Relative time formatting

4. **UI Component** (`CurrencySettings.tsx`):
   - Base currency selector (USD/AUD/EUR)
   - Fetch Rates button with loading state
   - Live rates display with inverse rates
   - Rate age indicator with color coding
   - Stale data warnings
   - Error message display

5. **React Hooks** (`useCurrency.ts`):
   - `useCurrency` - Access base currency setting
   - `useExchangeRates` - Access rates with fetch capability
   - `useCurrencyConversion` - Perform conversions
   - `useCurrencyWithConversion` - Combined functionality

6. **State Management** (extended `appSettingsStore.ts`):
   - Persistent currency settings via Zustand
   - Exchange rates stored with timestamp
   - Automatic hydration from localStorage

### Test Results

- **59 tests passing** across 8 test suites
- Coverage includes:
  - Currency conversion math
  - Rate age calculations
  - Formatting functions
  - TRPC API contracts
  - Store integration
  - Error handling
  - UI component behavior

### Bug Fixes (Pre-existing)

Fixed two pre-existing bugs discovered during implementation:
1. `CalculatorPanel.tsx` - Removed unused `roi` import causing TypeScript error
2. `calculatorStore.ts` - Fixed null handling in `calculateFromTargetProfit` causing potential runtime error

---

*Story created by BMAD Method - comprehensive developer guide*
*Dependencies: Story 1.3 (complete), Story 8.3 (complete)*
*Next Story: Story 8.5 (Multi-Currency Surebet Calculator)*
