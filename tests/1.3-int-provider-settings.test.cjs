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

  if (typeof storage.__setSafeStorageForTests === 'function') {
    storage.__setSafeStorageForTests(null);
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

test('[P1][1.3-INT-002] TRPC getActiveProvider/setActiveProvider round-trip', async () => {
  const caller = router.appRouter.createCaller({});

  const initial = await caller.getActiveProvider();
  assert.strictEqual(
    initial.providerId,
    storage.getActiveProviderId(),
    'Expected TRPC getActiveProvider to reflect storage default'
  );

  await caller.setActiveProvider({ providerId: 'odds-api-io' });
  const updated = await caller.getActiveProvider();

  assert.strictEqual(
    updated.providerId,
    'odds-api-io',
    'Expected TRPC setActiveProvider to update active provider'
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

test('[P2][1.3-INT-004] poller sees updated active provider after TRPC change', async () => {
  const caller = router.appRouter.createCaller({});

  await caller.setActiveProvider({ providerId: 'odds-api-io' });

  const activeForPolling = poller.getActiveProviderForPolling();
  assert.strictEqual(
    activeForPolling,
    'odds-api-io',
    'Expected poller active provider to track TRPC selection without restart'
  );
});
