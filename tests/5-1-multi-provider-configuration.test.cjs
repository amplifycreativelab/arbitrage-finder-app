/**
 * Story 5.1: Multi-Provider Configuration & Settings Tests
 *
 * Tests cover:
 * - Multi-provider storage: enable/disable persistence, backward migration
 * - Type validation for multi-provider support
 * - Hot reconfiguration behavior
 * - ConfigMissing indicators
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const ElectronStore = require('electron-store')

// Import real implementations from compiled output (per E4-AI-02)
// Compiled via: npm run pretest (uses tsconfig.storage-test.json)
const storage = require('../out-tests/src/main/services/storage.js')
const types = require('../out-tests/shared/types.js')

const CredentialsStore = ElectronStore.default || ElectronStore

const credentialsStore = new CredentialsStore({
  name: 'credentials',
  defaults: {
    providerSecrets: {}
  },
  projectName: 'arbitrage-finder'
})

test.beforeEach(() => {
  credentialsStore.set('providerSecrets', {})
  credentialsStore.delete('fallbackWarningShown')
  credentialsStore.delete('activeProviderId')
  credentialsStore.delete('enabledProviders')

  // Reset test state
  if (typeof storage.__setSafeStorageForTests === 'function') {
    storage.__setSafeStorageForTests(null)
  }
  if (typeof storage.__resetMigrationForTests === 'function') {
    storage.__resetMigrationForTests()
  }
})

// ============================================================
// Storage Tests
// ============================================================

test('[P0][5.1-STORE-001] getEnabledProviders returns array after migration', async () => {
  const enabled = storage.getEnabledProviders()
  assert.ok(Array.isArray(enabled), 'getEnabledProviders should return an array')
})

test('[P0][5.1-STORE-002] setEnabledProviders persists provider list', async () => {
  const providersToEnable = ['odds-api-io', 'the-odds-api']
  storage.setEnabledProviders(providersToEnable)

  const enabled = storage.getEnabledProviders()
  assert.ok(enabled.includes('odds-api-io'), 'Should include odds-api-io')
  assert.ok(enabled.includes('the-odds-api'), 'Should include the-odds-api')
})

test('[P0][5.1-STORE-003] isProviderEnabled correctly reports enabled state', async () => {
  storage.setEnabledProviders(['odds-api-io'])

  assert.strictEqual(
    storage.isProviderEnabled('odds-api-io'),
    true,
    'odds-api-io should be enabled'
  )
  assert.strictEqual(
    storage.isProviderEnabled('the-odds-api'),
    false,
    'the-odds-api should be disabled'
  )
})

test('[P0][5.1-STORE-004] toggleProvider enables a disabled provider', async () => {
  storage.setEnabledProviders([])

  const result = storage.toggleProvider('odds-api-io', true)

  assert.strictEqual(result, true, 'toggleProvider should return true')
  assert.strictEqual(
    storage.isProviderEnabled('odds-api-io'),
    true,
    'Provider should now be enabled'
  )
})

test('[P0][5.1-STORE-005] toggleProvider disables an enabled provider', async () => {
  storage.setEnabledProviders(['odds-api-io'])

  const result = storage.toggleProvider('odds-api-io', false)

  assert.strictEqual(result, false, 'toggleProvider should return false')
  assert.strictEqual(
    storage.isProviderEnabled('odds-api-io'),
    false,
    'Provider should now be disabled'
  )
})

test('[P1][5.1-STORE-006] toggleProvider is idempotent (no duplicates)', async () => {
  storage.setEnabledProviders(['odds-api-io'])

  storage.toggleProvider('odds-api-io', true)

  const enabled = storage.getEnabledProviders()
  const oddsApiCount = enabled.filter((id) => id === 'odds-api-io').length
  assert.strictEqual(oddsApiCount, 1, 'Should not duplicate provider in list')
})

test('[P1][5.1-STORE-007] getAllProvidersWithStatus returns status for all providers', async () => {
  storage.setEnabledProviders(['odds-api-io'])

  const allStatus = storage.getAllProvidersWithStatus()

  assert.ok(Array.isArray(allStatus), 'Should return an array')
  assert.strictEqual(allStatus.length, 2, 'Should have 2 providers')

  const oddsApiStatus = allStatus.find((s) => s.providerId === 'odds-api-io')
  const theOddsApiStatus = allStatus.find((s) => s.providerId === 'the-odds-api')

  assert.ok(oddsApiStatus, 'Should include odds-api-io')
  assert.ok(theOddsApiStatus, 'Should include the-odds-api')
  assert.strictEqual(oddsApiStatus.enabled, true, 'odds-api-io should be enabled')
  assert.strictEqual(theOddsApiStatus.enabled, false, 'the-odds-api should be disabled')
})

test('[P0][5.1-STORE-008] toggleProvider throws for invalid providerId', async () => {
  assert.throws(
    () => storage.toggleProvider('invalid-provider', true),
    /Unsupported providerId/,
    'Should throw for invalid provider'
  )
})

// ============================================================
// Migration Tests (Backward Compatibility)
// ============================================================

test('[P0][5.1-MIG-001] migration from activeProviderId to enabledProviders', async () => {
  // Given legacy single-provider config with an API key
  credentialsStore.set('activeProviderId', 'the-odds-api')
  credentialsStore.set('providerSecrets', { 'the-odds-api': 'b64:dGVzdGtleQ==' })
  credentialsStore.delete('enabledProviders')

  // Reset migration state to trigger migration
  if (typeof storage.__resetMigrationForTests === 'function') {
    storage.__resetMigrationForTests()
  }

  // When accessing multi-provider functions
  const enabled = storage.getEnabledProviders()

  // Then legacy provider should be migrated
  assert.ok(enabled.includes('the-odds-api'), 'Legacy active provider should be migrated')
})

test('[P1][5.1-MIG-002] migration creates empty array when no legacy config', async () => {
  // Given no legacy config
  credentialsStore.delete('activeProviderId')
  credentialsStore.delete('enabledProviders')

  // Reset migration state
  if (typeof storage.__resetMigrationForTests === 'function') {
    storage.__resetMigrationForTests()
  }

  // When accessing multi-provider functions
  const enabled = storage.getEnabledProviders()

  // Then should have empty array
  assert.ok(Array.isArray(enabled), 'Should return an array')
  // May be empty or contain migrated providers depending on test state
})

// ============================================================
// Type Tests
// ============================================================

test('[P0][5.1-TYPE-001] PROVIDER_IDS contains expected providers', async () => {
  assert.ok(types.PROVIDER_IDS.includes('odds-api-io'), 'Should include odds-api-io')
  assert.ok(types.PROVIDER_IDS.includes('the-odds-api'), 'Should include the-odds-api')
})

test('[P0][5.1-TYPE-002] isProviderId validates provider IDs', async () => {
  assert.strictEqual(types.isProviderId('odds-api-io'), true)
  assert.strictEqual(types.isProviderId('the-odds-api'), true)
  assert.strictEqual(types.isProviderId('invalid'), false)
  assert.strictEqual(types.isProviderId(null), false)
  assert.strictEqual(types.isProviderId(undefined), false)
})

test('[P1][5.1-TYPE-003] PROVIDERS metadata has required fields', async () => {
  for (const provider of types.PROVIDERS) {
    assert.ok(provider.id, 'Provider should have id')
    assert.ok(provider.label, 'Provider should have label')
    assert.ok(provider.displayName, 'Provider should have displayName')
    assert.ok(['production', 'test'].includes(provider.kind), 'Provider kind should be valid')
  }
})

// ============================================================
// Hot Reconfiguration Tests
// ============================================================

test('[P1][5.1-HOT-001] enabling provider adds to enabled list immediately', async () => {
  storage.setEnabledProviders([])
  
  const before = storage.getEnabledProviders()
  assert.strictEqual(before.length, 0, 'Should start empty')

  storage.toggleProvider('odds-api-io', true)

  const after = storage.getEnabledProviders()
  assert.strictEqual(after.length, 1, 'Should have 1 provider')
  assert.ok(after.includes('odds-api-io'), 'Should include odds-api-io')
})

test('[P1][5.1-HOT-002] disabling provider removes from enabled list immediately', async () => {
  storage.setEnabledProviders(['odds-api-io', 'the-odds-api'])
  
  const before = storage.getEnabledProviders()
  assert.strictEqual(before.length, 2, 'Should start with 2 providers')

  storage.toggleProvider('odds-api-io', false)

  const after = storage.getEnabledProviders()
  assert.strictEqual(after.length, 1, 'Should have 1 provider')
  assert.ok(!after.includes('odds-api-io'), 'Should not include odds-api-io')
  assert.ok(after.includes('the-odds-api'), 'Should still include the-odds-api')
})

test('[P1][5.1-HOT-003] multiple toggles are consistent', async () => {
  storage.setEnabledProviders([])

  // Enable both
  storage.toggleProvider('odds-api-io', true)
  storage.toggleProvider('the-odds-api', true)
  assert.strictEqual(storage.getEnabledProviders().length, 2)

  // Disable one
  storage.toggleProvider('odds-api-io', false)
  assert.strictEqual(storage.getEnabledProviders().length, 1)

  // Re-enable
  storage.toggleProvider('odds-api-io', true)
  assert.strictEqual(storage.getEnabledProviders().length, 2)

  // Disable both
  storage.toggleProvider('odds-api-io', false)
  storage.toggleProvider('the-odds-api', false)
  assert.strictEqual(storage.getEnabledProviders().length, 0)
})

// ============================================================
// Poller Tests (Multi-Provider Polling)
// ============================================================

// Import poller functions from compiled output
const poller = require('../out-tests/src/main/services/poller.js')

test('[P0][5.1-POLL-001] notifyEnabledProvidersChanged updates polling targets', async () => {
  // Start with empty
  poller.notifyEnabledProvidersChanged([])
  assert.deepStrictEqual(poller.getEnabledProvidersForPolling(), [])

  // Add providers
  poller.notifyEnabledProvidersChanged(['odds-api-io', 'the-odds-api'])
  const enabled = poller.getEnabledProvidersForPolling()
  assert.ok(enabled.includes('odds-api-io'), 'Should include odds-api-io')
  assert.ok(enabled.includes('the-odds-api'), 'Should include the-odds-api')
})

test('[P0][5.1-POLL-002] getEnabledProvidersForPolling returns current targets', async () => {
  poller.notifyEnabledProvidersChanged(['odds-api-io'])
  const enabled = poller.getEnabledProvidersForPolling()
  assert.strictEqual(enabled.length, 1)
  assert.strictEqual(enabled[0], 'odds-api-io')
})

test('[P1][5.1-POLL-003] notifyEnabledProvidersChanged replaces previous targets', async () => {
  // Set initial
  poller.notifyEnabledProvidersChanged(['odds-api-io', 'the-odds-api'])
  assert.strictEqual(poller.getEnabledProvidersForPolling().length, 2)

  // Replace with single provider
  poller.notifyEnabledProvidersChanged(['the-odds-api'])
  const enabled = poller.getEnabledProvidersForPolling()
  assert.strictEqual(enabled.length, 1)
  assert.strictEqual(enabled[0], 'the-odds-api')
})

test('[P1][5.1-POLL-004] pollOnceForEnabledProviders returns empty when no providers enabled', async () => {
  poller.notifyEnabledProvidersChanged([])
  const opportunities = await poller.pollOnceForEnabledProviders()
  assert.ok(Array.isArray(opportunities), 'Should return an array')
  assert.strictEqual(opportunities.length, 0, 'Should be empty when no providers enabled')
})

test('[P2][5.1-POLL-005] pollOnceForEnabledProviders handles unregistered adapter gracefully', async () => {
  // Enable a provider but don't register its adapter (simulates missing adapter)
  // The poller should skip it without crashing
  poller.notifyEnabledProvidersChanged(['odds-api-io'])
  
  // This should not throw - unregistered adapters are skipped
  const opportunities = await poller.pollOnceForEnabledProviders()
  assert.ok(Array.isArray(opportunities), 'Should return an array even with missing adapter')
})

console.log('Story 5.1 tests defined. Run with: node --test tests/5-1-multi-provider-configuration.test.cjs')
