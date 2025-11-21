"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheOddsApiAdapter = void 0;
exports.normalizeTheOddsApiMarket = normalizeTheOddsApiMarket;
const base_1 = require("./base");
const calculator_1 = require("../services/calculator");
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
const THE_ODDS_API_PROVIDER_ID = 'the-odds-api';
class TheOddsApiAdapter extends base_1.BaseArbitrageAdapter {
    id = THE_ODDS_API_PROVIDER_ID;
    // Real HTTP integration is implemented in later Epic 2 stories.
    async fetchWithApiKey(_apiKey) {
        return [];
    }
}
exports.TheOddsApiAdapter = TheOddsApiAdapter;
