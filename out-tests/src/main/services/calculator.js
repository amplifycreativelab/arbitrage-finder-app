"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTwoLegArbitrageRoi = calculateTwoLegArbitrageRoi;
exports.mergeProviderOpportunities = mergeProviderOpportunities;
const schemas_1 = require("../../../shared/schemas");
function calculateTwoLegArbitrageRoi(oddsA, oddsB) {
    if (!Number.isFinite(oddsA) || !Number.isFinite(oddsB)) {
        return 0;
    }
    if (oddsA <= 0 || oddsB <= 0) {
        return 0;
    }
    const inverseSum = 1 / oddsA + 1 / oddsB;
    if (inverseSum <= 0) {
        return 0;
    }
    const roi = 1 - inverseSum;
    return roi < 0 ? 0 : roi;
}
function mergeProviderOpportunities(snapshots) {
    const validated = schemas_1.arbitrageOpportunityListSchema.parse(snapshots.flat());
    const seenIds = new Set();
    const result = [];
    for (const opportunity of validated) {
        if (seenIds.has(opportunity.id))
            continue;
        seenIds.add(opportunity.id);
        result.push(opportunity);
    }
    return result;
}
