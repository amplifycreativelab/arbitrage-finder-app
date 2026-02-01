# Story 8.6: Dedicated Settings Tab

Status: review

## Story

As a User,
I want all configuration settings consolidated in a dedicated Settings tab,
so that the Arbitrage Feed and Odds Browser remain focused on data while settings are organized in one place.

## Background

Currently, settings are mixed into the right pane of the Arbitrage Feed tab:
- Provider settings (API keys, enable/disable) share space with Signal Preview
- Bookmaker selection is nested under provider config
- Currency settings appear below provider settings
- Deep Scan configuration lives in a dialog triggered from the feed pane
- Auto-refresh controls are scattered within provider settings

This creates a cluttered UX where operational data (surebet opportunities) competes with configuration UI for screen space.

## Acceptance Criteria

### AC1: Settings Tab Navigation
- [x] A third tab "Settings" appears in the main tab navigation after "Odds Browser"
- [x] Tab order: Arbitrage Feed | Odds Browser | Settings
- [x] Settings tab uses a gear icon alongside the label
- [x] Tab selection persists across app restarts (via localStorage)

### AC2: Settings Tab Layout
- [x] Settings tab displays a full-width settings page (no split pane)
- [x] Settings are organized in collapsible sections/cards:
  - **API Providers** (top)
  - **Bookmaker Selection**
  - **Deep Scan Configuration**
  - **Currency & Display**
  - **Auto-Refresh & Polling**
- [x] Sections can be expanded/collapsed independently
- [x] Section expand/collapse state persists across sessions

### AC3: API Providers Section
- [x] Lists all supported providers (Odds-API.io, The-Odds-API.com)
- [x] Each provider shows:
  - Enable/disable toggle
  - API key input (password field with reveal toggle)
  - Status badge (Configured / No Key / Error)
  - "Test Connection" button with loading state
- [x] Provider order matches existing ProviderSettings component
- [x] Fallback storage warning displays when safeStorage unavailable

### AC4: Bookmaker Selection Section
- [x] Bookmaker selection UI moved from nested provider config
- [x] Displays bookmaker list with:
  - Region filter dropdown (AU, UK, IT, RO, etc.)
  - Sort direction toggle (A→Z, Z→A)
  - Search/filter input
  - Active-only checkbox
  - Scrollable bookmaker list with checkboxes
- [x] "Select All" / "Deselect All" buttons
- [x] Selected bookmaker count displayed
- [x] Reset to defaults button

### AC5: Deep Scan Configuration Section
- [x] Continuous Deep Scan toggle (default: ON)
- [x] Scan Interval input (minutes, default: 5)
- [x] Event Cache TTL input (minutes, default: 5)
- [x] Max Events Per Cycle input (default: 50, max: 200)
- [x] Concurrent Requests input (default: 5, max: 10)
- [x] Scan Mode dropdown (All Events / Live Only / Upcoming Only)
- [x] Scan Horizon dropdown (1h, 2h, 4h, 8h, 24h, All)
- [x] Sport/League filter configuration (link to existing SportLeagueFilter)
- [x] Warning banner if settings exceed 5,000 req/hour budget

### AC6: Currency & Display Section
- [x] Base currency selector (USD, AUD, EUR)
- [x] Manual "Fetch Rates" button with loading state
- [x] Rate age indicator (Fresh/Stale/Expired)
- [x] Exchange rates display (1 USD = X AUD, etc.)
- [x] Last updated timestamp

### AC7: Auto-Refresh & Polling Section
- [x] Auto-refresh toggle
- [x] Refresh interval dropdown (15s, 30s, 1m, 5m)
- [x] Status indicator showing next refresh time
- [x] Manual "Refresh Now" button

### AC8: Right Pane Cleanup (Arbitrage Feed)
- [x] Provider Settings component removed from right pane
- [x] Currency Settings component removed from right pane
- [x] Right pane now shows only:
  - Signal Preview (default)
  - Best Odds view
- [x] Tab selector between Signal Preview and Best Odds remains
- [x] Right pane has more vertical space for signal content

### AC9: Filter Bar Adjustments (Arbitrage Feed)
- [x] Filter bar remains in feed pane (region, sport, ROI, source filters)
- [x] "Settings" shortcut link/button added to filter bar for quick access
- [x] Bookmaker filter in FilterBar reads from settings store (no longer inline config)

### AC10: Responsiveness & Polish
- [x] Settings page scrollable for smaller viewports
- [x] Section cards have consistent spacing and styling
- [x] All inputs validate immediately with inline error messages
- [x] Success toasts on save (e.g., "API key saved", "Bookmakers updated")
- [x] "Unsaved changes" warning if navigating away with pending edits

## Tasks / Subtasks

- [x] Task 1: Create Settings Tab Infrastructure (AC: 1)
  - [x] Add Settings tab to DashboardLayout.tsx tab navigation
  - [x] Create SettingsPage.tsx component scaffold
  - [x] Implement tab persistence via localStorage
  - [x] Add gear icon to tab label

- [x] Task 2: Design Settings Page Layout (AC: 2)
  - [x] Create collapsible SettingsSection component
  - [x] Implement section expand/collapse with persistence
  - [x] Layout sections in responsive grid/stack

- [x] Task 3: Migrate API Providers Section (AC: 3)
  - [x] Extract provider config from ProviderSettings.tsx
  - [x] Create ApiProvidersSection.tsx component
  - [x] Add "Test Connection" functionality
  - [x] Maintain existing API key save/load logic

- [x] Task 4: Migrate Bookmaker Selection (AC: 4)
  - [x] Extract bookmaker UI from OddsApiIoBookmakerSettings.tsx
  - [x] Create BookmakerSelectionSection.tsx component
  - [x] Add bulk select/deselect functionality
  - [x] Add reset to defaults button

- [x] Task 5: Migrate Deep Scan Configuration (AC: 5)
  - [x] Extract settings from DeepScanConfigDialog
  - [x] Create DeepScanConfigSection.tsx component
  - [x] Integrate SportLeagueFilter component
  - [x] Add budget warning calculation

- [x] Task 6: Migrate Currency Settings (AC: 6)
  - [x] Extract from CurrencySettings.tsx
  - [x] Create CurrencyDisplaySection.tsx component
  - [x] Maintain rate fetching functionality

- [x] Task 7: Migrate Auto-Refresh Settings (AC: 7)
  - [x] Extract from ProviderSettings.tsx
  - [x] Create AutoRefreshSection.tsx component
  - [x] Add next refresh countdown

- [x] Task 8: Clean Up Arbitrage Feed Right Pane (AC: 8)
  - [x] Remove ProviderSettings from right pane
  - [x] Remove CurrencySettings from right pane
  - [x] Verify Signal Preview and Best Odds work correctly

- [x] Task 9: Update Filter Bar (AC: 9)
  - [x] Add Settings shortcut link to FilterBar
  - [x] Ensure bookmaker filter reads from settings store

- [x] Task 10: Polish & Validation (AC: 10)
  - [x] Add input validation with inline errors
  - [x] Add success/error toasts
  - [x] Add unsaved changes warning
  - [x] Test scrolling and responsiveness

## Dev Notes

### Architecture Touchpoints

- **DashboardLayout.tsx**: Add third tab, modify tab navigation logic
- **SettingsPage.tsx**: New top-level component for Settings tab
- **features/settings/**: Refactor existing components into section components
- **stores/appSettingsStore.ts**: May need additional state for section collapse
- **stores/deepScanStore.ts**: Already has Deep Scan config
- **stores/feedFiltersStore.ts**: Bookmaker selections may need migration

### Component Extraction Strategy

1. **Don't delete existing components yet** - create new section components that wrap/replace them
2. **Reuse existing store logic** - appSettingsStore, deepScanStore, etc.
3. **Refactor incrementally** - get Settings tab working, then remove old right pane code

### Design Consistency

- Follow existing shadcn/ui patterns (Card, Collapsible, Input, Select, Switch)
- Match "The Orange Terminal" theme (#0F172A background, #F97316 accent)
- Use consistent spacing: gap-4 between sections, gap-2 within sections

### Files to Create

| File | Purpose |
|------|---------|
| `features/settings/SettingsPage.tsx` | Main Settings tab container |
| `features/settings/sections/ApiProvidersSection.tsx` | Provider config section |
| `features/settings/sections/BookmakerSelectionSection.tsx` | Bookmaker config |
| `features/settings/sections/DeepScanConfigSection.tsx` | Deep Scan settings |
| `features/settings/sections/CurrencyDisplaySection.tsx` | Currency config |
| `features/settings/sections/AutoRefreshSection.tsx` | Polling config |
| `features/settings/components/SettingsSection.tsx` | Collapsible section wrapper |

### Files to Modify

| File | Changes |
|------|---------|
| `features/dashboard/DashboardLayout.tsx` | Add Settings tab, remove settings from right pane |
| `features/dashboard/FilterBar.tsx` | Add Settings shortcut |
| `features/dashboard/RightPane.tsx` | Remove ProviderSettings, CurrencySettings |

### Testing Notes

- Verify all settings persist correctly after migration
- Test that existing functionality (API calls, bookmaker filtering) still works
- Ensure Deep Scan controls work from new location
- Check that tab navigation state persists

### References

- [Source: src/renderer/src/features/settings/ProviderSettings.tsx] - Current provider config
- [Source: src/renderer/src/features/settings/OddsApiIoBookmakerSettings.tsx] - Current bookmaker UI
- [Source: src/renderer/src/features/settings/components/CurrencySettings.tsx] - Current currency UI
- [Source: src/renderer/src/features/dashboard/DashboardLayout.tsx] - Current layout structure
- [Source: src/renderer/src/features/dashboard/DeepScanPanel.tsx] - Current Deep Scan controls

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Created dedicated Settings tab with full-width layout consolidating all configuration settings
- Implemented collapsible SettingsSection component with localStorage persistence for expand/collapse state
- Created 5 section components: ApiProvidersSection, BookmakerSelectionSection, DeepScanConfigSection, CurrencyDisplaySection, AutoRefreshSection
- Added Settings tab to DashboardLayout with gear icon and tab persistence via localStorage
- Removed ProviderSettings and CurrencySettings from Arbitrage Feed right pane
- Added Settings shortcut button to FilterBar for quick access
- All 30 story tests pass successfully
- Full test suite has 8 pre-existing failures (not caused by this story)

### File List

**Files Created:**
- `src/renderer/src/features/settings/SettingsPage.tsx` - Main Settings tab container with full-width layout
- `src/renderer/src/features/settings/components/SettingsSection.tsx` - Collapsible section wrapper with localStorage persistence
- `src/renderer/src/features/settings/sections/ApiProvidersSection.tsx` - Provider config with test connection functionality
- `src/renderer/src/features/settings/sections/BookmakerSelectionSection.tsx` - Bookmaker selection with select all/deselect all
- `src/renderer/src/features/settings/sections/DeepScanConfigSection.tsx` - Deep scan settings with budget warning
- `src/renderer/src/features/settings/sections/CurrencyDisplaySection.tsx` - Currency selector and exchange rates display
- `src/renderer/src/features/settings/sections/AutoRefreshSection.tsx` - Auto-refresh toggle and manual refresh button
- `tests/8-6-dedicated-settings-tab.test.cjs` - Story acceptance tests (30 tests)

**Files Modified:**
- `src/renderer/src/features/dashboard/DashboardLayout.tsx` - Added Settings tab, tab persistence, removed settings from right pane
- `src/renderer/src/features/dashboard/FilterBar.tsx` - Added Settings shortcut button with gear icon
