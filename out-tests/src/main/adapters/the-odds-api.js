"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheOddsApiAdapter = void 0;
exports.normalizeTheOddsApiMarket = normalizeTheOddsApiMarket;
const base_1 = require("./base");
const calculator_1 = require("../services/calculator");
const logger_1 = require("../services/logger");
function isFinitePositive(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
function mapRawEventToMarkets(event) {
    if (!Array.isArray(event.bookmakers) || !event.bookmakers.length) {
        return [];
    }
    const homeCandidates = [];
    const awayCandidates = [];
    const sportKey = event.sport_key;
    const sportTitle = event.sport_title;
    let sport = '';
    if (typeof sportKey === 'string') {
        const lower = sportKey.toLowerCase();
        if (lower.startsWith('soccer')) {
            sport = 'soccer';
        }
        else if (lower.startsWith('tennis')) {
            sport = 'tennis';
        }
        else {
            sport = sportKey;
        }
    }
    else if (typeof sportTitle === 'string') {
        sport = sportTitle;
    }
    for (const bookmaker of event.bookmakers) {
        if (!Array.isArray(bookmaker.markets))
            continue;
        const headToHeadMarket = bookmaker.markets.find((market) => market.key === 'h2h');
        if (!headToHeadMarket || !Array.isArray(headToHeadMarket.outcomes))
            continue;
        for (const outcome of headToHeadMarket.outcomes) {
            if (!isFinitePositive(outcome.price))
                continue;
            const bookmakerLabel = bookmaker.title || bookmaker.key;
            if (outcome.name === event.home_team) {
                homeCandidates.push({ bookmaker: bookmakerLabel, odds: outcome.price });
            }
            else if (outcome.name === event.away_team) {
                awayCandidates.push({ bookmaker: bookmakerLabel, odds: outcome.price });
            }
        }
    }
    const markets = [];
    for (const home of homeCandidates) {
        for (const away of awayCandidates) {
            if (home.bookmaker === away.bookmaker)
                continue;
            markets.push({
                id: `${event.id}:${home.bookmaker}:${away.bookmaker}`,
                sport,
                eventName: `${event.home_team} vs ${event.away_team}`,
                eventDate: event.commence_time,
                league: event.sport_title ?? '',
                market: 'match-winner',
                homeBookmaker: home.bookmaker,
                homeOdds: home.odds,
                awayBookmaker: away.bookmaker,
                awayOdds: away.odds
            });
        }
    }
    return markets;
}
function parseRawOddsResponse(body) {
    const items = Array.isArray(body)
        ? body
        : Array.isArray(body.data)
            ? body.data
            : [];
    const markets = [];
    for (const item of items) {
        if (!item || typeof item !== 'object')
            continue;
        const event = item;
        if (typeof event.id !== 'string' ||
            typeof event.commence_time !== 'string' ||
            typeof event.home_team !== 'string' ||
            typeof event.away_team !== 'string') {
            continue;
        }
        const bookmakersArray = Array.isArray(event.bookmakers)
            ? event.bookmakers
            : [];
        const typedEvent = {
            id: event.id,
            sport_key: typeof event.sport_key === 'string' ? event.sport_key : undefined,
            sport_title: typeof event.sport_title === 'string' ? event.sport_title : undefined,
            commence_time: event.commence_time,
            home_team: event.home_team,
            away_team: event.away_team,
            bookmakers: bookmakersArray
        };
        markets.push(...mapRawEventToMarkets(typedEvent));
    }
    return markets;
}
function normalizeTheOddsApiMarket(raw, foundAt = new Date().toISOString()) {
    const roi = (0, calculator_1.calculateTwoLegArbitrageRoi)(raw.homeOdds, raw.awayOdds);
    if (roi <= 0) {
        return null;
    }
    return {
        id: raw.id,
        sport: raw.sport,
        event: {
            name: raw.eventName,
            date: raw.eventDate,
            league: raw.league
        },
        legs: [
            {
                bookmaker: raw.homeBookmaker,
                market: raw.market,
                odds: raw.homeOdds,
                outcome: 'home'
            },
            {
                bookmaker: raw.awayBookmaker,
                market: raw.market,
                odds: raw.awayOdds,
                outcome: 'away'
            }
        ],
        roi,
        foundAt
    };
}
const THE_ODDS_API_BASE_URL = 'https://api.the-odds-api.com';
const THE_ODDS_API_ODDS_PATH = '/v4/sports/soccer/odds';
const THE_ODDS_API_MARKETS = ['h2h'];
const THE_ODDS_API_REGIONS = ['eu'];
const THE_ODDS_API_PROVIDER_ID = 'the-odds-api';
class TheOddsApiAdapter extends base_1.BaseArbitrageAdapter {
    id = THE_ODDS_API_PROVIDER_ID;
    async fetchWithApiKey(apiKey, context) {
        const httpFetch = globalThis.fetch;
        const correlationId = context?.correlationId ?? (0, logger_1.createCorrelationId)();
        const startedAt = Date.now();
        let responseStatus;
        if (typeof httpFetch !== 'function') {
            const error = new Error('Global fetch is not available for The-Odds-API.com adapter');
            (0, logger_1.logError)('adapter.call', {
                context: 'adapter:the-odds-api',
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
            const url = new URL(THE_ODDS_API_ODDS_PATH, THE_ODDS_API_BASE_URL);
            url.searchParams.set('apiKey', apiKey);
            url.searchParams.set('regions', THE_ODDS_API_REGIONS.join(','));
            url.searchParams.set('markets', THE_ODDS_API_MARKETS.join(','));
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
                    .then((text) => text || `The-Odds-API.com request failed with status ${response.status}`)
                    .catch(() => `The-Odds-API.com request failed with status ${response.status}`);
                const error = new Error(message);
                error.status = response.status;
                throw error;
            }
            const body = await response.json();
            const markets = parseRawOddsResponse(body);
            const nowIso = new Date().toISOString();
            const opportunities = markets
                .map((market) => normalizeTheOddsApiMarket(market, nowIso))
                .filter((opportunity) => opportunity !== null);
            const durationMs = Date.now() - startedAt;
            (0, logger_1.logInfo)('adapter.call', {
                context: 'adapter:the-odds-api',
                operation: 'fetchOpportunities',
                providerId: this.id,
                correlationId,
                durationMs,
                errorCategory: null,
                success: true,
                httpStatus: responseStatus,
                opportunitiesCount: opportunities.length,
                endpoint: THE_ODDS_API_ODDS_PATH
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
                context: 'adapter:the-odds-api',
                operation: 'fetchOpportunities',
                providerId: this.id,
                correlationId,
                durationMs,
                errorCategory: typeof status === 'number' && status >= 400 ? 'ProviderError' : 'SystemError',
                success: false,
                httpStatus: status,
                message: error?.message ?? 'The-Odds-API.com adapter error',
                endpoint: THE_ODDS_API_ODDS_PATH
            });
            throw error;
        }
    }
}
exports.TheOddsApiAdapter = TheOddsApiAdapter;
