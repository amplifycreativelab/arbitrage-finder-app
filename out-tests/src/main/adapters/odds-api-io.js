"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OddsApiIoAdapter = void 0;
exports.normalizeOddsApiIoOpportunity = normalizeOddsApiIoOpportunity;
const types_1 = require("../../../shared/types");
const base_1 = require("./base");
const logger_1 = require("../services/logger");
const odds_api_io_bookmakers_1 = require("../services/odds-api-io-bookmakers");
/**
 * Normalizes a raw Odds-API.io opportunity to the standard ArbitrageOpportunity format.
 * Market strings are normalized using inferMarketMetadata for consistent filtering (Story 6.1).
 */
function normalizeOddsApiIoOpportunity(raw, foundAt = new Date().toISOString()) {
    // Validate required fields
    if (!raw || !raw.id || !Array.isArray(raw.legs) || raw.legs.length < 2) {
        return null;
    }
    // Extract market name, with fallback
    const marketName = raw.market?.name ?? 'h2h';
    const metadata = (0, types_1.inferMarketMetadata)(marketName);
    // Build event info from the event object if available
    // API returns home/away team names, not homeTeam/awayTeam
    const eventName = raw.event?.name ??
        (raw.event?.home && raw.event?.away
            ? `${raw.event.home} vs ${raw.event.away}`
            : `Event ${raw.eventId}`);
    const eventDate = raw.event?.date ?? new Date().toISOString();
    const eventLeague = raw.event?.league ?? '';
    const sport = raw.event?.sport ?? raw.sport ?? 'soccer';
    // Normalize legs - map 'side' to 'outcome' and convert odds string to number
    const normalizedLegs = raw.legs.slice(0, 2).map((leg) => ({
        bookmaker: leg.bookmaker ?? 'Unknown',
        market: metadata.key,
        odds: typeof leg.odds === 'string' ? parseFloat(leg.odds) : (leg.odds ?? 0),
        outcome: leg.side ?? 'unknown'
    }));
    // Validate odds are valid numbers
    if (!normalizedLegs.every((leg) => Number.isFinite(leg.odds) && leg.odds > 0)) {
        return null;
    }
    // profitMargin from API is a percentage value (e.g., 2.04 means 2.04%)
    // Internal ROI format is decimal (e.g., 0.0204 for 2.04%), so divide by 100
    const roi = typeof raw.profitMargin === 'number'
        ? raw.profitMargin / 100
        : typeof raw.roi === 'number'
            ? raw.roi
            : 0;
    return {
        id: raw.id,
        sport,
        event: {
            name: eventName,
            date: eventDate,
            league: eventLeague
        },
        legs: normalizedLegs,
        roi,
        foundAt
    };
}
const ODDS_API_IO_BASE_URL = 'https://api.odds-api.io';
const ODDS_API_IO_ARBS_PATH = '/v3/arbitrage-bets';
const ODDS_API_IO_PROVIDER_ID = 'odds-api-io';
const SELECTED_BOOKMAKERS_TTL_MS = 5 * 60 * 1000;
let cachedSelectedBookmakers = null;
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
            let selectedBookmakers = cachedSelectedBookmakers?.bookmakers ?? [];
            const cacheAgeMs = cachedSelectedBookmakers ? Date.now() - cachedSelectedBookmakers.fetchedAtMs : Infinity;
            if (!selectedBookmakers.length || cacheAgeMs > SELECTED_BOOKMAKERS_TTL_MS) {
                selectedBookmakers = await (0, odds_api_io_bookmakers_1.getSelectedBookmakers)(apiKey);
                cachedSelectedBookmakers = { fetchedAtMs: Date.now(), bookmakers: selectedBookmakers };
            }
            if (!selectedBookmakers.length) {
                throw new Error('No selected bookmakers configured. Select bookmakers in Settings (Odds-API.io bookmaker selection) and try again.');
            }
            const url = new URL(ODDS_API_IO_ARBS_PATH, ODDS_API_IO_BASE_URL);
            url.searchParams.set('apiKey', apiKey);
            url.searchParams.set('bookmakers', selectedBookmakers.join(','));
            url.searchParams.set('includeEventDetails', 'true');
            url.searchParams.set('limit', '500'); // Max limit to get all available opportunities
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
            (0, logger_1.logInfo)('adapter.debug', {
                context: 'adapter:odds-api-io',
                operation: 'fetchOpportunities',
                providerId: this.id,
                correlationId,
                durationMs: null,
                errorCategory: null,
                selectedBookmakersCount: selectedBookmakers.length,
                rawBetsCount: rawBets.length
            });
            const nowIso = new Date().toISOString();
            const opportunities = rawBets
                .map((item) => normalizeOddsApiIoOpportunity(item, nowIso))
                .filter((opportunity) => opportunity !== null && opportunity.roi >= 0);
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
