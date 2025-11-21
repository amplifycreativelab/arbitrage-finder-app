'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poller = require('../out-tests/src/main/services/poller.js');
const { BaseArbitrageAdapter } = require('../out-tests/src/main/adapters/base.js');
const credentials = require('../out-tests/src/main/credentials.js');

test('[P0][2.2-RATE-CONFIG-001] rate limiter derives spacing from PRD quotas and is centralized', () => {
  poller.__test.resetLimiterState();

  const config = poller.getRateLimiterConfig('odds-api-io');
  assert.ok(config.minTime >= 700 && config.minTime <= 800, 'minTime should be ~720ms (FR8)');
  assert.strictEqual(config.maxConcurrent, 1, 'Only one concurrent request allowed per provider');
  assert.strictEqual(config.reservoir, 5000, 'Hourly reservoir matches 5,000 req/hr quota');
  assert.strictEqual(
    config.reservoirRefreshInterval,
    60 * 60 * 1000,
    'Reservoir refreshes hourly per architecture R-001'
  );
});

test('[P0][2.2-RATE-ENFORCE-001] limiter enforces minTime spacing and adapters route through scheduler', async () => {
  poller.__test.resetLimiterState();

  const providerId = 'odds-api-io';
  const cfg = poller.getRateLimiterConfig(providerId);

  const start = Date.now();
  await Promise.all([
    poller.scheduleProviderRequest(providerId, async () => 'a'),
    poller.scheduleProviderRequest(providerId, async () => 'b'),
    poller.scheduleProviderRequest(providerId, async () => 'c')
  ]);
  const elapsed = Date.now() - start;
  const expectedMinimum = cfg.minTime * 2; // three jobs => at least two enforced gaps

  assert.ok(
    elapsed >= expectedMinimum - 50,
    `Limiter should enforce ~${expectedMinimum}ms+, saw ${elapsed}ms`
  );

  class LimitedAdapter extends BaseArbitrageAdapter {
    constructor() {
      super();
      this.id = providerId;
    }

    async fetchWithApiKey() {
      return [];
    }
  }

  await credentials.saveApiKey(providerId, 'test-key');
  const adapter = new LimitedAdapter();
  const adapterStart = Date.now();
  await Promise.all([adapter.fetchOpportunities(), adapter.fetchOpportunities()]);
  const adapterElapsed = Date.now() - adapterStart;

  assert.ok(
    adapterElapsed >= cfg.minTime - 50,
    `Adapter fetches should be throttled by limiter (~${cfg.minTime}ms), saw ${adapterElapsed}ms`
  );
});

test('[P0][2.2-RATE-429-001] synthetic 429 triggers backoff, logging state, and recovery clears status', async () => {
  poller.__test.resetLimiterState();
  const providerId = 'the-odds-api';

  const rateLimitError = new Error('Too Many Requests');
  rateLimitError.status = 429;

  await assert.rejects(
    poller.scheduleProviderRequest(providerId, async () => {
      throw rateLimitError;
    })
  );

  assert.strictEqual(
    poller.getProviderQuotaStatus(providerId),
    'QuotaLimited',
    '429 should mark provider as quota limited'
  );

  const cooldownMs = poller.__test.getBackoffState(providerId).lastBackoffMs;
  const start = Date.now();
  await poller.scheduleProviderRequest(providerId, async () => 'ok');
  const elapsed = Date.now() - start;

  assert.ok(
    elapsed >= cooldownMs - 25,
    `Next request should honor backoff of ~${cooldownMs}ms (observed ${elapsed}ms)`
  );

  assert.strictEqual(poller.getProviderQuotaStatus(providerId), 'OK', 'Successful retry clears status');
});

test('[P0][2.2-RATE-429-002] 429-style response objects also trigger backoff and error', async () => {
  poller.__test.resetLimiterState();
  const providerId = 'odds-api-io';

  const rateLimitResponse = { status: 429, message: 'Too Many Requests' };

  await assert.rejects(
    poller.scheduleProviderRequest(providerId, async () => rateLimitResponse),
    (error) => {
      return (
        error &&
        typeof error === 'object' &&
        (error.status === 429 ||
          (typeof error.message === 'string' && error.message.toLowerCase().includes('rate limit')))
      );
    }
  );

  assert.strictEqual(
    poller.getProviderQuotaStatus(providerId),
    'QuotaLimited',
    '429-like response should mark provider as quota limited'
  );

  const cooldownMs = poller.__test.getBackoffState(providerId).lastBackoffMs;
  const start = Date.now();
  await poller.scheduleProviderRequest(providerId, async () => 'ok');
  const elapsed = Date.now() - start;

  assert.ok(
    elapsed >= cooldownMs - 25,
    `Next request should honor backoff of ~${cooldownMs}ms after response signal (observed ${elapsed}ms)`
  );
});

test('[P1][2.2-RATE-QUEUE-001] rate-limit backoff drops queued jobs after first 429', async () => {
  poller.__test.resetLimiterState();
  const providerId = 'odds-api-io';

  const rateLimitError = new Error('Too Many Requests');
  rateLimitError.status = 429;

  const executionOrder = [];

  const tasks = [
    poller.scheduleProviderRequest(providerId, async () => {
      executionOrder.push('first');
      throw rateLimitError;
    }),
    poller.scheduleProviderRequest(providerId, async () => {
      executionOrder.push('second');
      return 'second';
    }),
    poller.scheduleProviderRequest(providerId, async () => {
      executionOrder.push('third');
      return 'third';
    })
  ];

  await assert.rejects(Promise.all(tasks));

  assert.deepStrictEqual(
    executionOrder,
    ['first'],
    'Queued jobs after the first 429 should be dropped when backoff engages'
  );
});
