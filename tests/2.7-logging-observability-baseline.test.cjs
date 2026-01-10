'use strict';

const test = require('node:test');
const assert = require('node:assert');

const logger = require('../out-tests/src/main/services/logger.js');
const poller = require('../out-tests/src/main/services/poller.js');
const credentials = require('../out-tests/src/main/credentials.js');

const {
  OddsApiIoAdapter
} = require('../out-tests/src/main/adapters/odds-api-io.js');

const {
  TheOddsApiAdapter
} = require('../out-tests/src/main/adapters/the-odds-api.js');

const {
  buildOddsApiIoArbitrageBets,
  buildTheOddsApiRawEvents
} = require('./helpers/golden-dataset.js');

function createCollectingBackend() {
  const entries = [];

  /** @type {import('../out-tests/src/main/services/logger.js').StructuredLoggerBackend} */
  const backend = {
    info(event, payload) {
      entries.push({ level: 'info', event, payload });
    },
    warn(event, payload) {
      entries.push({ level: 'warn', event, payload });
    },
    error(event, payload) {
      entries.push({ level: 'error', event, payload });
    }
  };

  return { backend, entries };
}

function payloadContainsValue(payload, needle) {
  if (payload === needle) return true;

  if (Array.isArray(payload)) {
    return payload.some((item) => payloadContainsValue(item, needle));
  }

  if (payload && typeof payload === 'object') {
    return Object.values(payload).some((value) => payloadContainsValue(value, needle));
  }

  return false;
}

test('[P0][2.7-LOG-REDACTION-001] logger redacts explicit secret fields', () => {
  const originalBackend = logger.getStructuredLoggerBackend();
  const { backend, entries } = createCollectingBackend();

  logger.setStructuredLoggerBackend(backend);

  try {
    const secretValue = 'test-super-secret-key';

    logger.logInfo('test.secret', {
      context: 'test:logger',
      operation: 'log-secret',
      providerId: 'odds-api-io',
      correlationId: 'corr-123',
      durationMs: 5,
      errorCategory: 'SystemError',
      apiKey: secretValue,
      token: secretValue,
      nested: {
        secret: secretValue,
        authToken: secretValue
      },
      markedSecret: logger.secret(secretValue)
    });

    assert.strictEqual(entries.length, 1, 'expected a single log entry');
    const { payload } = entries[0];

    assert.strictEqual(
      payloadContainsValue(payload, secretValue),
      false,
      'secret value must not appear anywhere in logged payload'
    );

    assert.strictEqual(payload.apiKey, '***REDACTED***');
    assert.strictEqual(payload.token, '***REDACTED***');
    assert.strictEqual(
      payload.nested && payload.nested.secret,
      '***REDACTED***',
      'nested secret key should be redacted'
    );
  } finally {
    logger.setStructuredLoggerBackend(originalBackend);
  }
});

test('[P0][2.7-LOG-REDACTION-002] adapter and poller logs never include API keys', async () => {
  poller.__test.resetLimiterState();

  const originalBackend = logger.getStructuredLoggerBackend();
  const { backend, entries } = createCollectingBackend();

  const originalFetch = global.fetch;
  const originalGetApiKeyForAdapter =
    typeof credentials.getApiKeyForAdapter === 'function'
      ? credentials.getApiKeyForAdapter
      : null;

  logger.setStructuredLoggerBackend(backend);

  try {
    const apiKeyOdds = 'test-api-key-odds-api-io-SECRET';
    const apiKeyTheOdds = 'test-api-key-the-odds-api-SECRET';

    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = async (providerId) => {
        if (providerId === 'odds-api-io') return apiKeyOdds;
        if (providerId === 'the-odds-api') return apiKeyTheOdds;
        return null;
      };
    }

    const [rawOddsBet] = buildOddsApiIoArbitrageBets();
    const rawEvents = buildTheOddsApiRawEvents();

    global.fetch = async (url) => {
      const asString = String(url);

      if (asString.includes('api.odds-api.io')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { data: [rawOddsBet] };
          },
          async text() {
            return JSON.stringify({ data: [rawOddsBet] });
          }
        };
      }

      if (asString.includes('api.the-odds-api.com')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return rawEvents;
          },
          async text() {
            return JSON.stringify(rawEvents);
          }
        };
      }

      return {
        ok: true,
        status: 200,
        async json() {
          return [];
        },
        async text() {
          return '[]';
        }
      };
    };

    poller.registerAdapters([new OddsApiIoAdapter(), new TheOddsApiAdapter()]);

    // Exercise both providers in multi-provider mode
    poller.notifyEnabledProvidersChanged(['odds-api-io', 'the-odds-api']);
    await poller.pollOnceForEnabledProviders();

    const serialized = entries.map((e) => JSON.stringify(e));

    for (const payload of serialized) {
      assert.ok(
        !payload.includes(apiKeyOdds),
        'Odds-API.io API key must never appear in logs'
      );
      assert.ok(
        !payload.includes(apiKeyTheOdds),
        'The-Odds-API.com API key must never appear in logs'
      );
    }
  } finally {
    logger.setStructuredLoggerBackend(originalBackend);
    global.fetch = originalFetch;
    if (originalGetApiKeyForAdapter) {
      credentials.getApiKeyForAdapter = originalGetApiKeyForAdapter;
    }
    poller.__test.resetLimiterState();
  }
});
