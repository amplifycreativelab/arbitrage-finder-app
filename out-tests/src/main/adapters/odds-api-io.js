"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OddsApiIoAdapter = void 0;
exports.normalizeOddsApiIoOpportunity = normalizeOddsApiIoOpportunity;
const base_1 = require("./base");
function normalizeOddsApiIoOpportunity(raw, foundAt = new Date().toISOString()) {
    return {
        id: raw.id,
        sport: raw.sport,
        event: {
            name: raw.event.name,
            date: raw.event.date,
            league: raw.event.league
        },
        legs: raw.legs,
        roi: raw.roi,
        foundAt
    };
}
const ODDS_API_IO_PROVIDER_ID = 'odds-api-io';
class OddsApiIoAdapter extends base_1.BaseArbitrageAdapter {
    id = ODDS_API_IO_PROVIDER_ID;
    // Real HTTP integration is implemented in later Epic 2 stories.
    async fetchWithApiKey(_apiKey) {
        return [];
    }
}
exports.OddsApiIoAdapter = OddsApiIoAdapter;
