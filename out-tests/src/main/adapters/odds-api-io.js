"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OddsApiIoAdapter = void 0;
exports.normalizeOddsApiIoOpportunity = normalizeOddsApiIoOpportunity;
const types_1 = require("../../../shared/types");
const base_1 = require("./base");
const logger_1 = require("../services/logger");
/**
 * Normalizes a raw Odds-API.io opportunity to the standard ArbitrageOpportunity format.
 * Market strings are normalized using inferMarketMetadata for consistent filtering (Story 6.1).
 */
function normalizeOddsApiIoOpportunity(raw, foundAt = new Date().toISOString()) {
    // Normalize market keys using the shared market metadata inference (Story 6.1)
    const normalizedLegs = raw.legs.map((leg) => {
        const metadata = (0, types_1.inferMarketMetadata)(leg.market);
        return {
            ...leg,
            // Use the canonical key from metadata for consistent filtering
            market: metadata.key
        };
    });
    return {
        id: raw.id,
        sport: raw.sport,
        event: {
            name: raw.event.name,
            date: raw.event.date,
            league: raw.event.league
        },
        legs: normalizedLegs,
        roi: raw.roi,
        foundAt
    };
}
const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io';
const ODDS_API_IO_ARBS_PATH = '/v3/arbitrage-bets';
const ODDS_API_IO_PROVIDER_ID = 'odds-api-io';
class OddsApiIoAdapter extends base_1.BaseArbitrageAdapter {
    id = ODDS_API_IO_PROVIDER_ID;
    async fetchWithApiKey(apiKey, context) {
        const httpFetch = globalThis.fetch;
        const correlationId = context?.correlationId ?? (0, logger_1.createCorrelationId)();
        const startedAt = Date.now();
        let responseStatus;
        if (typeof httpFetch !== 'function') {
            const error = new Error('Global fetch is not available for Odds-API.io adapter');
            (0, logger_1.logError)('adapter.call', {
                context: 'adapter:odds-api-io',
                operation: 'fetchOpportunities',
                providerId: this.id,
                correlationId,
                durationMs: Date.now() - startedAt,
                errorCategory: 'SystemError',
                success: false,
                message: error.message
            });
            throw error;
        }
        try {
            const url = new URL(ODDS_API_IO_ARBS_PATH, ODDS_API_IO_BASE_URL);
            url.searchParams.set('apiKey', apiKey);
            const response = await httpFetch(url.toString(), {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });
            responseStatus = response.status;
            if (!response.ok) {
                const message = await response
                    .text()
                    .then((text) => text || `Odds-API.io request failed with status ${response.status}`)
                    .catch(() => `Odds-API.io request failed with status ${response.status}`);
                const error = new Error(message);
                error.status = response.status;
                throw error;
            }
            const body = (await response.json());
            const rawBets = Array.isArray(body)
                ? body
                : Array.isArray(body.data)
                    ? body.data
                    : Array.isArray(body.bets)
                        ? body.bets
                        : [];
            const nowIso = new Date().toISOString();
            const opportunities = rawBets
                .map((item) => normalizeOddsApiIoOpportunity(item, nowIso))
                .filter((opportunity) => opportunity.roi >= 0);
            const durationMs = Date.now() - startedAt;
            (0, logger_1.logInfo)('adapter.call', {
                context: 'adapter:odds-api-io',
                operation: 'fetchOpportunities',
                providerId: this.id,
                correlationId,
                durationMs,
                errorCategory: null,
                success: true,
                httpStatus: responseStatus,
                opportunitiesCount: opportunities.length,
                endpoint: ODDS_API_IO_ARBS_PATH
            });
            return opportunities;
        }
        catch (error) {
            const durationMs = Date.now() - startedAt;
            const status = responseStatus ??
                error.status ??
                error.statusCode ??
                error.response?.status;
            (0, logger_1.logError)('adapter.call', {
                context: 'adapter:odds-api-io',
                operation: 'fetchOpportunities',
                providerId: this.id,
                correlationId,
                durationMs,
                errorCategory: typeof status === 'number' && status >= 400 ? 'ProviderError' : 'SystemError',
                success: false,
                httpStatus: status,
                message: error?.message ?? 'Odds-API.io adapter error',
                endpoint: ODDS_API_IO_ARBS_PATH
            });
            throw error;
        }
    }
}
exports.OddsApiIoAdapter = OddsApiIoAdapter;
