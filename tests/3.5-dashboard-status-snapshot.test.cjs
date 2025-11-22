'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poller = require('../out-tests/src/main/services/poller.js');
const credentials = require('../out-tests/src/main/credentials.js');

test('[P1][3.5-STATUS-MODEL-001] SystemStatus and ProviderStatus reflect quota, configuration, errors, and staleness', async () => {
  poller.__test.resetLimiterState();

  // Ensure both providers are configured so they do not default to ConfigMissing.
  await credentials.saveApiKey('odds-api-io', 'test-key-odds');
  await credentials.saveApiKey('the-odds-api', 'test-key-the-odds');

  // Baseline: with no quota limits, recent errors, or stale data, status should be OK.
  let snapshot = await poller.getDashboardStatusSnapshot();

  assert.strictEqual(snapshot.systemStatus, 'OK', 'Expected baseline systemStatus to be OK');
  assert.ok(Array.isArray(snapshot.providers), 'Expected providers array in snapshot');
  assert.strictEqual(
    snapshot.providers.find((p) => p.providerId === 'odds-api-io')?.status,
    'OK',
    'Expected odds-api-io baseline provider status to be OK'
  );

  // Quota-limited provider should surface as QuotaLimited and drive systemStatus to Degraded.
  const rateLimitError = new Error('Too Many Requests');
  rateLimitError.status = 429;

  await assert.rejects(
    poller.scheduleProviderRequest('odds-api-io', async () => {
      throw rateLimitError;
    })
  );

  snapshot = await poller.getDashboardStatusSnapshot();

  const oddsStatus = snapshot.providers.find((p) => p.providerId === 'odds-api-io')?.status;

  assert.strictEqual(
    oddsStatus,
    'QuotaLimited',
    'Expected odds-api-io ProviderStatus to be QuotaLimited after 429'
  );

  assert.strictEqual(
    snapshot.systemStatus,
    'Degraded',
    'Expected systemStatus to be Degraded when any provider is quota limited or degraded'
  );
});

