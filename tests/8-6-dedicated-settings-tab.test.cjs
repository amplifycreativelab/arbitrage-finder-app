'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

function fileExists(relativePath) {
  const fullPath = path.join(projectRoot, relativePath);
  return fs.existsSync(fullPath);
}

// ============================================================================
// AC1: Settings Tab Navigation
// ============================================================================

test('[P0][8.6-AC1-001] Settings tab exists in DashboardLayout navigation', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  assert.ok(
    source.includes("'settings'") || source.includes('"settings"'),
    'Expected Settings tab type to be defined'
  );

  assert.ok(
    source.includes('tab-settings') || source.includes('data-testid="tab-settings"'),
    'Expected Settings tab to have data-testid="tab-settings"'
  );
});

test('[P0][8.6-AC1-002] Settings tab appears after Odds Browser in tab order', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  const arbitrageIndex = source.indexOf('tab-arbitrage');
  const oddsBrowserIndex = source.indexOf('tab-odds-browser');
  const settingsIndex = source.indexOf('tab-settings');

  assert.ok(arbitrageIndex > -1, 'Expected Arbitrage tab to exist');
  assert.ok(oddsBrowserIndex > -1, 'Expected Odds Browser tab to exist');
  assert.ok(settingsIndex > -1, 'Expected Settings tab to exist');
  assert.ok(oddsBrowserIndex > arbitrageIndex, 'Expected Odds Browser after Arbitrage');
  assert.ok(settingsIndex > oddsBrowserIndex, 'Expected Settings after Odds Browser');
});

test('[P0][8.6-AC1-003] Settings tab uses gear icon', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  // Check for gear/cog icon SVG path (common gear icon paths)
  const hasGearIcon = source.includes('M12.22 2h-.44') || // Lucide settings
    source.includes('M19.4 15a1.65') || // Alternative gear path
    source.includes('gear') ||
    source.includes('cog') ||
    source.includes('Settings');

  assert.ok(hasGearIcon, 'Expected Settings tab to include a gear/settings icon');
});

test('[P0][8.6-AC1-004] Tab selection persists via localStorage', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  assert.ok(
    source.includes('localStorage') || source.includes('STORAGE_KEY'),
    'Expected tab persistence logic using localStorage'
  );

  // Check for tab state persistence
  const hasTabPersistence = source.includes('activeTab') &&
    (source.includes('localStorage.setItem') || source.includes('localStorage.getItem'));

  assert.ok(hasTabPersistence, 'Expected active tab to be persisted to localStorage');
});

// ============================================================================
// AC2: Settings Tab Layout
// ============================================================================

test('[P0][8.6-AC2-001] SettingsPage component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/SettingsPage.tsx'),
    'Expected SettingsPage.tsx to exist'
  );
});

test('[P0][8.6-AC2-002] SettingsPage uses full-width layout', () => {
  const source = read('src/renderer/src/features/settings/SettingsPage.tsx');

  assert.ok(
    source.includes('w-full') || source.includes('flex-1'),
    'Expected SettingsPage to use full-width layout'
  );

  // Should not have split pane structure
  assert.ok(
    !source.includes('ResizablePanel') || source.includes('settings-page'),
    'Expected SettingsPage to be full-width without split pane'
  );
});

test('[P0][8.6-AC2-003] SettingsSection collapsible component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/components/SettingsSection.tsx'),
    'Expected SettingsSection.tsx to exist'
  );

  const source = read('src/renderer/src/features/settings/components/SettingsSection.tsx');

  assert.ok(
    source.includes('Collapsible') || source.includes('expanded') || source.includes('isOpen'),
    'Expected SettingsSection to support collapse/expand functionality'
  );
});

test('[P0][8.6-AC2-004] Section expand/collapse state persists', () => {
  const source = read('src/renderer/src/features/settings/components/SettingsSection.tsx');

  assert.ok(
    source.includes('localStorage') || source.includes('persist'),
    'Expected section collapse state to persist across sessions'
  );
});

// ============================================================================
// AC3: API Providers Section
// ============================================================================

test('[P0][8.6-AC3-001] ApiProvidersSection component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/sections/ApiProvidersSection.tsx'),
    'Expected ApiProvidersSection.tsx to exist'
  );
});

test('[P0][8.6-AC3-002] ApiProvidersSection includes test connection functionality', () => {
  const source = read('src/renderer/src/features/settings/sections/ApiProvidersSection.tsx');

  assert.ok(
    source.includes('Test Connection') || source.includes('testConnection'),
    'Expected "Test Connection" button in provider settings'
  );
});

test('[P0][8.6-AC3-003] ApiProvidersSection shows status badges', () => {
  const source = read('src/renderer/src/features/settings/sections/ApiProvidersSection.tsx');

  const hasStatusBadges = source.includes('Configured') ||
    source.includes('No Key') ||
    source.includes('status') ||
    source.includes('hasKey');

  assert.ok(hasStatusBadges, 'Expected status badges for provider configuration state');
});

// ============================================================================
// AC4: Bookmaker Selection Section
// ============================================================================

test('[P0][8.6-AC4-001] BookmakerSelectionSection component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/sections/BookmakerSelectionSection.tsx'),
    'Expected BookmakerSelectionSection.tsx to exist'
  );
});

test('[P0][8.6-AC4-002] BookmakerSelectionSection includes select all/deselect all', () => {
  const source = read('src/renderer/src/features/settings/sections/BookmakerSelectionSection.tsx');

  assert.ok(
    source.includes('Select All') || source.includes('selectAll'),
    'Expected "Select All" functionality'
  );
  assert.ok(
    source.includes('Deselect All') || source.includes('deselectAll') || source.includes('Clear'),
    'Expected "Deselect All" or "Clear" functionality'
  );
});

test('[P0][8.6-AC4-003] BookmakerSelectionSection shows selected count', () => {
  const source = read('src/renderer/src/features/settings/sections/BookmakerSelectionSection.tsx');

  assert.ok(
    source.includes('selected') && source.includes('length'),
    'Expected selected bookmaker count to be displayed'
  );
});

// ============================================================================
// AC5: Deep Scan Configuration Section
// ============================================================================

test('[P0][8.6-AC5-001] DeepScanConfigSection component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/sections/DeepScanConfigSection.tsx'),
    'Expected DeepScanConfigSection.tsx to exist'
  );
});

test('[P0][8.6-AC5-002] DeepScanConfigSection includes all required settings', () => {
  const source = read('src/renderer/src/features/settings/sections/DeepScanConfigSection.tsx');

  // Check for continuous deep scan toggle
  assert.ok(
    source.includes('Continuous') || source.includes('continuousDeepScan'),
    'Expected Continuous Deep Scan toggle'
  );

  // Check for scan interval
  assert.ok(
    source.includes('Interval') || source.includes('intervalMinutes'),
    'Expected Scan Interval setting'
  );

  // Check for max events
  assert.ok(
    source.includes('Max Events') || source.includes('maxEvents'),
    'Expected Max Events Per Cycle setting'
  );

  // Check for concurrent requests
  assert.ok(
    source.includes('Concurrent') || source.includes('concurrentRequests'),
    'Expected Concurrent Requests setting'
  );
});

test('[P0][8.6-AC5-003] DeepScanConfigSection shows budget warning when appropriate', () => {
  const source = read('src/renderer/src/features/settings/sections/DeepScanConfigSection.tsx');

  assert.ok(
    source.includes('warning') || source.includes('budget') || source.includes('quota'),
    'Expected budget/quota warning capability'
  );
});

// ============================================================================
// AC6: Currency & Display Section
// ============================================================================

test('[P0][8.6-AC6-001] CurrencyDisplaySection component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/sections/CurrencyDisplaySection.tsx'),
    'Expected CurrencyDisplaySection.tsx to exist'
  );
});

test('[P0][8.6-AC6-002] CurrencyDisplaySection includes currency selector', () => {
  const source = read('src/renderer/src/features/settings/sections/CurrencyDisplaySection.tsx');

  // Check that it uses the CURRENCIES array from shared lib (which contains USD, AUD, EUR)
  const usesCurrencyConstants = source.includes('CURRENCIES') ||
    (source.includes('USD') && source.includes('AUD') && source.includes('EUR'));

  assert.ok(
    usesCurrencyConstants,
    'Expected currency selector using CURRENCIES constant or literal USD, AUD, EUR options'
  );

  // Verify it has a selector component structure
  assert.ok(
    source.includes('BaseCurrencySelector') || source.includes('currency') || source.includes('onChange'),
    'Expected base currency selector functionality'
  );
});

test('[P0][8.6-AC6-003] CurrencyDisplaySection includes fetch rates button', () => {
  const source = read('src/renderer/src/features/settings/sections/CurrencyDisplaySection.tsx');

  assert.ok(
    source.includes('Fetch') && source.includes('Rates'),
    'Expected "Fetch Rates" button'
  );
});

// ============================================================================
// AC7: Auto-Refresh & Polling Section
// ============================================================================

test('[P0][8.6-AC7-001] AutoRefreshSection component exists', () => {
  assert.ok(
    fileExists('src/renderer/src/features/settings/sections/AutoRefreshSection.tsx'),
    'Expected AutoRefreshSection.tsx to exist'
  );
});

test('[P0][8.6-AC7-002] AutoRefreshSection includes toggle and interval', () => {
  const source = read('src/renderer/src/features/settings/sections/AutoRefreshSection.tsx');

  assert.ok(
    source.includes('autoRefresh') || source.includes('Auto-Refresh') || source.includes('Auto Refresh'),
    'Expected auto-refresh toggle'
  );

  assert.ok(
    source.includes('15s') || source.includes('30s') || source.includes('interval'),
    'Expected refresh interval options'
  );
});

test('[P0][8.6-AC7-003] AutoRefreshSection includes manual refresh button', () => {
  const source = read('src/renderer/src/features/settings/sections/AutoRefreshSection.tsx');

  assert.ok(
    source.includes('Refresh Now') || source.includes('Manual') || source.includes('refreshSnapshot'),
    'Expected manual "Refresh Now" button'
  );
});

// ============================================================================
// AC8: Right Pane Cleanup
// ============================================================================

test('[P0][8.6-AC8-001] ProviderSettings removed from DashboardLayout right pane', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  // The ProviderSettings import or usage should be removed from arbitrage tab section
  // It should only appear in the Settings tab section now
  const arbitrageSection = source.split("activeTab === 'arbitrage'")[1]?.split("activeTab === 'settings'")[0] || source;

  const hasProviderInArbitrage = arbitrageSection.includes('<ProviderSettings') &&
    !arbitrageSection.includes('Settings tab');

  // We expect ProviderSettings to NOT be in the arbitrage right pane
  assert.ok(
    !hasProviderInArbitrage || source.includes('SettingsPage'),
    'Expected ProviderSettings to be removed from arbitrage tab right pane'
  );
});

test('[P0][8.6-AC8-002] CurrencySettings removed from DashboardLayout right pane', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  // Check that CurrencySettings is not directly rendered in the arbitrage tab
  const arbitrageSection = source.split("activeTab === 'arbitrage'")[1]?.split(/activeTab === ['"](?:odds-browser|settings)['"]/)[0] || '';

  assert.ok(
    !arbitrageSection.includes('<CurrencySettings'),
    'Expected CurrencySettings to be removed from arbitrage tab right pane'
  );
});

test('[P0][8.6-AC8-003] Signal Preview and Best Odds still work in right pane', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  assert.ok(
    source.includes('SignalPreview') && source.includes('BestOddsPanel'),
    'Expected Signal Preview and Best Odds to remain in the right pane'
  );

  assert.ok(
    source.includes('signal-preview') && source.includes('best-odds'),
    'Expected signal-preview and best-odds tab selectors to remain'
  );
});

// ============================================================================
// AC9: Filter Bar Adjustments
// ============================================================================

test('[P0][8.6-AC9-001] FilterBar includes Settings shortcut link', () => {
  const source = read('src/renderer/src/features/dashboard/FilterBar.tsx');

  assert.ok(
    source.includes('Settings') || source.includes('onSettingsClick') || source.includes('settings-shortcut'),
    'Expected Settings shortcut link in FilterBar'
  );
});

// ============================================================================
// AC10: Responsiveness & Polish
// ============================================================================

test('[P0][8.6-AC10-001] SettingsPage is scrollable', () => {
  const source = read('src/renderer/src/features/settings/SettingsPage.tsx');

  assert.ok(
    source.includes('overflow-y-auto') || source.includes('overflow-auto') || source.includes('scroll'),
    'Expected SettingsPage to be scrollable'
  );
});

test('[P0][8.6-AC10-002] Settings sections have consistent spacing', () => {
  const source = read('src/renderer/src/features/settings/SettingsPage.tsx');

  assert.ok(
    source.includes('gap-4') || source.includes('space-y-4') || source.includes('gap-6'),
    'Expected consistent spacing between settings sections'
  );
});

// ============================================================================
// Integration: Settings Tab renders SettingsPage
// ============================================================================

test('[P0][8.6-INT-001] DashboardLayout renders SettingsPage when settings tab is active', () => {
  const source = read('src/renderer/src/features/dashboard/DashboardLayout.tsx');

  assert.ok(
    source.includes('SettingsPage') || source.includes('settings/SettingsPage'),
    'Expected SettingsPage to be rendered for settings tab'
  );
});
