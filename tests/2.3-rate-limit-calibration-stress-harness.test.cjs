'use strict';

const test = require('node:test');
const assert = require('node:assert');

const poller = require('../out-tests/src/main/services/poller.js');
const calibration = require('../out-tests/src/main/services/calibration.js');
const { BaseArbitrageAdapter } = require('../out-tests/src/main/adapters/base.js');
const credentials = require('../out-tests/src/main/credentials.js');

function createCollectingLogger() {
  const entries = [];
  const logger = {
    info: (event, payload) => {
      entries.push({ level: 'info', event, payload });
    },
    warn: (event, payload) => {
      entries.push({ level: 'warn', event, payload });
    },
    error: (event, payload) => {
      entries.push({ level: 'error', event, payload });
    }
  };

  return { logger, entries };
}

test('[P0][2.3-CALIBRATION-001] calibration harness uses central poller and returns metrics', async () => {
  poller.__test.resetLimiterState();

  const { logger, entries } = createCollectingLogger();

  const result = await calibration.runCalibration({
    providers: ['odds-api-io', 'the-odds-api'],
    durationMs: 200,
    maxIterationsPerProvider: 2,
    minLoopIntervalMs: 0,
    logger
  });

  assert.ok(result.providerSummaries.length >= 1, 'expected at least one provider summary');

  const providerIds = result.providerSummaries.map((s) => s.providerId);
  assert.ok(providerIds.includes('odds-api-io'), 'includes odds-api-io');
  assert.ok(providerIds.includes('the-odds-api'), 'includes the-odds-api');

  for (const summary of result.providerSummaries) {
    assert.ok(summary.samples.totalRequests >= 0, 'totalRequests present');
    assert.ok(
      summary.theoreticalRequestsPerHour > 0,
      'theoreticalRequestsPerHour should be computed from RateLimiterConfig'
    );
    assert.ok(
      summary.config.minTime >= 700 && summary.config.minTime <= 800,
      'minTime should reflect PRD-derived spacing (~720ms)'
    );
  }

  const metricsEvents = entries.filter((e) => e.event === 'calibration.metrics');
  assert.ok(
    metricsEvents.length >= result.providerSummaries.length,
    'structured calibration.metrics log entries should exist per provider'
  );
});

test('[P0][2.3-CALIBRATION-QUOTA-001] configuration above PRD quota is flagged as unsafe', async () => {
  poller.__test.resetLimiterState();

  const originalGetConfig = poller.getRateLimiterConfig;

  try {
    poller.getRateLimiterConfig = (providerId) => {
      const base = originalGetConfig(providerId);
      return {
        ...base,
        minTime: Math.max(1, Math.floor(base.minTime / 2)),
        reservoir: base.reservoir * 2
      };
    };

    const { logger } = createCollectingLogger();
    const result = await calibration.runCalibration({
      providers: ['odds-api-io'],
      durationMs: 0,
      maxIterationsPerProvider: 0,
      minLoopIntervalMs: 0,
      logger
    });

    assert.strictEqual(result.overallPass, false, 'overallPass should be false when quotas are unsafe');

    assert.ok(result.providerSummaries.length === 1, 'expected a single provider summary');
    const summary = result.providerSummaries[0];

    assert.strictEqual(summary.quotaSafe, false, 'quotaSafe must be false when config exceeds PRD limits');
    assert.ok(
      summary.theoreticalRequestsPerHour > 5000 || summary.config.reservoir > 5000,
      'test should simulate a configuration above the 5,000 req/hour quota'
    );
  } finally {
    poller.getRateLimiterConfig = originalGetConfig;
  }
});

test('[P0][2.3-ADAPTER-429-CONTRACT-001] BaseArbitrageAdapter surfaces 429 errors with status metadata', async () => {
  poller.__test.resetLimiterState();

  const providerId = 'odds-api-io';

  const originalGetApiKeyForAdapter =
    typeof credentials.getApiKeyForAdapter === 'function'
      ? credentials.getApiKeyForAdapter
      : null;

  if (originalGetApiKeyForAdapter) {
    credentials.getApiKeyForAdapter = async () => 'test-key';
  }

  class RateLimitedAdapter extends BaseArbitrageAdapter {
    constructor() {
      super();
      this.id = providerId;
    }

    async fetchWithApiKey() {
      const error = new Error('Too Many Requests');
      error.status = 429;
      throw error;
    }
  }

  const adapter = new RateLimitedAdapter();

  try {
    await assert.rejects(
      adapter.fetchOpportunities(),
      (error) =>
        error &&
        typeof error === 'object' &&
        error.status === 429 &&
        typeof error.message === 'string' &&
        error.message.toLowerCase().includes('too many requests'),
      '429 errors from adapters should propagate with status metadata'
    );

    const status = poller.getProviderQuotaStatus(providerId);
    assert.ok(
      status === 'QuotaLimited' || status === 'Degraded',
      '429 from adapters should drive ProviderQuotaStatus away from OK'
    );
  } finally {
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    }
  }
});
