'use strict';

const test = require('node:test');
const assert = require('node:assert');
const ElectronStore = require('electron-store');

// eslint-disable-next-line import/no-dynamic-require, global-require
const storage = require('../out-tests/src/main/services/storage.js');

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

test('[P0][1.2-UNIT-001] saveApiKey/getApiKey round-trip per provider', async () => {
  const providerA = 'test-provider-a';
  const providerB = 'test-provider-b';

  await storage.saveApiKey(providerA, 'secret-key-a');
  await storage.saveApiKey(providerB, 'secret-key-b');

  const valueA = await storage.getApiKey(providerA);
  const valueB = await storage.getApiKey(providerB);

  assert.strictEqual(valueA, 'secret-key-a');
  assert.strictEqual(valueB, 'secret-key-b');
});

test('[P1][1.2-UNIT-002] storage fallback mode is detectable', async () => {
  const providerId = 'test-provider-fallback';
  const secret = 'raw-secret-value-123';

  await storage.saveApiKey(providerId, secret);

  const isFallback = storage.isUsingFallbackStorage();
  assert.ok(isFallback, 'Expected fallback storage to be active in tests');

  const roundTrip = await storage.getApiKey(providerId);
  assert.strictEqual(roundTrip, secret);
});

test('[P1][1.2-UNIT-003] safeStorage encryption path persists enc prefix and decrypts', async () => {
  if (typeof storage.__setSafeStorageForTests === 'function') {
    storage.__setSafeStorageForTests({
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(`encrypted:${value}`, 'utf8'),
      decryptString: (buffer) => {
        const str = buffer.toString('utf8');
        return str.startsWith('encrypted:') ? str.slice('encrypted:'.length) : str;
      }
    });
  }

  const providerId = 'test-provider-encrypted';
  const secret = 'super-secret-key-xyz';

  await storage.saveApiKey(providerId, secret);

  const storedSecrets = credentialsStore.get('providerSecrets') || {};
  const storedValue = storedSecrets[providerId];

  assert.ok(
    typeof storedValue === 'string' && storedValue.startsWith('enc:'),
    'Expected stored secret to use enc: prefix when safeStorage is available'
  );

  const roundTrip = await storage.getApiKey(providerId);
  assert.strictEqual(roundTrip, secret);
});
