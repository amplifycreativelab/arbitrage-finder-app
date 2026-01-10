'use strict';

const test = require('node:test');
const assert = require('node:assert');
const ElectronStore = require('electron-store');

// Compiled main-process modules for tests
// eslint-disable-next-line import/no-dynamic-require, global-require
const storage = require('../out-tests/src/main/services/storage.js');
// eslint-disable-next-line import/no-dynamic-require, global-require
const router = require('../out-tests/src/main/services/router.js');
// eslint-disable-next-line import/no-dynamic-require, global-require
const poller = require('../out-tests/src/main/services/poller.js');

const CredentialsStore = ElectronStore.default || ElectronStore;

const credentialsStore = new CredentialsStore({
  name: 'credentials',
  defaults: {
    providerSecrets: {}
  },
  projectName: 'arbitrage-finder'
});

test.beforeEach(() => {
  credentialsStore.set('providerSecrets', {});
  credentialsStore.delete('fallbackWarningShown');
  credentialsStore.delete('activeProviderId');
  credentialsStore.delete('enabledProviders'); // Clear multi-provider state

  if (typeof storage.__setSafeStorageForTests === 'function') {
    storage.__setSafeStorageForTests(null);
  }

  // Reset migration flag to allow fresh migration on each test
  if (typeof storage.__resetMigrationForTests === 'function') {
    storage.__resetMigrationForTests();
  }
});

test('[P1][1.3-INT-001] active provider persists via storage helpers', () => {
  const defaultProvider = storage.getActiveProviderId();
  assert.strictEqual(
    defaultProvider,
    'the-odds-api',
    'Expected default active provider to be the-odds-api'
  );

  storage.setActiveProviderId('odds-api-io');
  const updated = storage.getActiveProviderId();
  assert.strictEqual(
    updated,
    'odds-api-io',
    'Expected active provider to update to odds-api-io'
  );

  const raw = credentialsStore.get('activeProviderId');
  assert.strictEqual(
    raw,
    'odds-api-io',
    'Expected activeProviderId to be persisted in electron-store'
  );
});

test('[P1][1.3-INT-002] TRPC getEnabledProviders/setProviderEnabled round-trip', async () => {
  const caller = router.appRouter.createCaller({});

  // Get initial enabled providers
  const initial = await caller.getEnabledProviders();
  assert.ok(
    Array.isArray(initial.enabledProviders),
    'Expected enabledProviders to be an array'
  );

  // Toggle a provider on
  await caller.setProviderEnabled({ providerId: 'odds-api-io', enabled: true });
  const afterEnable = await caller.getEnabledProviders();

  assert.ok(
    afterEnable.enabledProviders.includes('odds-api-io'),
    'Expected odds-api-io to be enabled after setProviderEnabled(true)'
  );
});

test('[P1][1.3-INT-003] TRPC storage status toggles fallback warning flag', async () => {
  const caller = router.appRouter.createCaller({});

  // Store a secret to ensure fallback storage is active in this environment.
  const providerId = 'test-provider-fallback-1-3';
  await storage.saveApiKey(providerId, 'secret-key-for-fallback');

  const before = await caller.getStorageStatus();

  assert.strictEqual(
    before.isUsingFallbackStorage,
    true,
    'Expected fallback storage to be active for test credentials'
  );
  assert.strictEqual(
    before.fallbackWarningShown,
    false,
    'Expected fallbackWarningShown to be false before acknowledgment'
  );

  await caller.acknowledgeFallbackWarning();

  const after = await caller.getStorageStatus();

  assert.strictEqual(
    after.isUsingFallbackStorage,
    true,
    'Expected fallback storage to remain active after acknowledgment'
  );
  assert.strictEqual(
    after.fallbackWarningShown,
    true,
    'Expected fallbackWarningShown to be true after acknowledgment'
  );
});

test('[P2][1.3-INT-004] poller sees updated enabled providers after TRPC change', async () => {
  const caller = router.appRouter.createCaller({});

  await caller.setProviderEnabled({ providerId: 'odds-api-io', enabled: true });

  const enabledForPolling = poller.getEnabledProvidersForPolling();
  assert.ok(
    enabledForPolling.includes('odds-api-io'),
    'Expected poller enabled providers to include odds-api-io after TRPC enable'
  );
});
