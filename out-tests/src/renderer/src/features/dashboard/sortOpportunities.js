"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortOpportunities = sortOpportunities;
function getTimeValue(opportunity) {
    const source = opportunity.event.date || opportunity.foundAt;
    const value = Date.parse(source);
    return Number.isNaN(value) ? 0 : value;
}
function sortOpportunities(opportunities, sortBy, direction) {
    if (!Array.isArray(opportunities)) {
        return [];
    }
    const factor = direction === 'asc' ? 1 : -1;
    return [...opportunities].sort((a, b) => {
        if (sortBy === 'roi') {
            return (a.roi - b.roi) * factor;
        }
        return (getTimeValue(a) - getTimeValue(b)) * factor;
    });
}
