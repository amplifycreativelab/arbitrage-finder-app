'use strict';

const test = require('node:test');
const assert = require('node:assert');
const ElectronStore = require('electron-store');

// Compiled main-process modules for tests
// eslint-disable-next-line import/no-dynamic-require, global-require
const storage = require('../out-tests/src/main/services/storage.js');
// eslint-disable-next-line import/no-dynamic-require, global-require
const router = require('../out-tests/src/main/services/router.js');

const CredentialsStore = ElectronStore.default || ElectronStore;

const credentialsStore = new CredentialsStore({
  name: 'credentials',
  defaults: {
    providerSecrets: {}
  },
  projectName: 'arbitrage-finder'
});

const SENTINEL_KEY = 'TEST-KEY-1-4-DO-NOT-LOG';

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

test('[P1][1.4-SEC-001] renderer-facing TRPC surface does not expose raw keys', async () => {
  const caller = router.appRouter.createCaller({});

  await caller.saveApiKey({ providerId: 'odds-api-io', apiKey: SENTINEL_KEY });

  const status = await caller.getStorageStatus();
  const enabled = await caller.getEnabledProviders();
  const allProviders = await caller.getAllProvidersStatus();
  const configured = await caller.isProviderConfigured({ providerId: 'odds-api-io' });

  const payloads = [
    JSON.stringify(status),
    JSON.stringify(enabled),
    JSON.stringify(allProviders),
    JSON.stringify(configured)
  ];

  for (const payload of payloads) {
    assert.strictEqual(
      payload.includes(SENTINEL_KEY),
      false,
      'Sentinel key must not appear in TRPC payloads'
    );
  }
});

test('[P1][1.4-SEC-002] sentinel key never appears in logs or plaintext storage', async () => {
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => {
    logs.push(args.join(' '));
  };
  console.warn = (...args) => {
    logs.push(args.join(' '));
  };
  console.error = (...args) => {
    logs.push(args.join(' '));
  };

  try {
    const caller = router.appRouter.createCaller({});

    await caller.saveApiKey({ providerId: 'odds-api-io', apiKey: SENTINEL_KEY });
    await caller.getStorageStatus();
    await caller.isProviderConfigured({ providerId: 'odds-api-io' });

    const secrets = credentialsStore.get('providerSecrets') || {};
    for (const value of Object.values(secrets)) {
      if (typeof value === 'string') {
        assert.strictEqual(
          value.includes(SENTINEL_KEY),
          false,
          'Sentinel key must not be stored in plaintext'
        );
      }
    }

    const joinedLogs = logs.join('\n');
    assert.strictEqual(
      joinedLogs.includes(SENTINEL_KEY),
      false,
      'Sentinel key must not appear in console logs'
    );
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

