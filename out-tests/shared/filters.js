"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterOpportunitiesByRegionAndSport = filterOpportunitiesByRegionAndSport;
function filterOpportunitiesByRegionAndSport(opportunities, filters, resolveRegion) {
    const sports = filters.sports ?? [];
    const regions = filters.regions ?? [];
    return opportunities.filter((opportunity) => {
        if (sports.length > 0 && !sports.includes(opportunity.sport)) {
            return false;
        }
        if (regions.length > 0) {
            const region = resolveRegion ? resolveRegion(opportunity) : null;
            if (!region || !regions.includes(region)) {
                return false;
            }
        }
        return true;
    });
}
