"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSignalPayload = formatSignalPayload;
const date_fns_1 = require("date-fns");
function formatDisplayDate(source) {
    if (!source) {
        return '';
    }
    try {
        const date = (0, date_fns_1.parseISO)(source);
        return (0, date_fns_1.format)(date, 'dd/MM');
    }
    catch {
        return source;
    }
}
function formatDisplayTime(source) {
    if (!source) {
        return '';
    }
    try {
        const date = (0, date_fns_1.parseISO)(source);
        return (0, date_fns_1.format)(date, 'HH:mm');
    }
    catch {
        return source;
    }
}
function formatSportLabel(raw) {
    const value = raw.trim().toLowerCase();
    if (value === 'soccer' || value === 'football') {
        return 'Calcio';
    }
    if (value === 'tennis') {
        return 'Tennis';
    }
    return raw;
}
function formatMarketLabel(raw) {
    const value = raw.trim().toLowerCase();
    if (value === 'moneyline') {
        return 'Moneyline';
    }
    if (value === 'draw-no-bet') {
        return 'Draw No Bet';
    }
    if (value === 'totals') {
        return 'Totals';
    }
    return raw;
}
function formatOutcomeLabel(raw) {
    const value = raw.trim().toLowerCase();
    if (value === 'home') {
        return 'Home';
    }
    if (value === 'away') {
        return 'Away';
    }
    if (value === 'yes') {
        return 'Yes';
    }
    if (value === 'no') {
        return 'No';
    }
    return raw;
}
function formatSignalPayload(opportunity, provider) {
    const lines = [];
    const eventDateSource = opportunity.event.date || opportunity.foundAt;
    const dateLabel = formatDisplayDate(eventDateSource);
    const timeLabel = formatDisplayTime(eventDateSource);
    const sportLabel = formatSportLabel(opportunity.sport);
    const providerLabel = provider?.displayName ?? provider?.label ?? '';
    if (providerLabel) {
        lines.push(providerLabel);
        lines.push('');
    }
    const [firstLeg, secondLeg] = opportunity.legs;
    const formatLeg = (leg) => {
        const bookmakerLabel = leg.bookmaker;
        const marketLabel = formatMarketLabel(leg.market);
        const outcomeLabel = formatOutcomeLabel(leg.outcome);
        const leaguePrefix = opportunity.event.league ? `${opportunity.event.league} ` : '';
        return [
            bookmakerLabel,
            `${sportLabel} ${dateLabel}`.trim(),
            `${timeLabel} ${opportunity.event.name}`.trim(),
            `${leaguePrefix}${marketLabel}: ${outcomeLabel}`.trim(),
            leg.odds.toFixed(2)
        ];
    };
    lines.push(...formatLeg(firstLeg));
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(...formatLeg(secondLeg));
    const roiPercent = (opportunity.roi * 100).toFixed(1);
    lines.push('');
    lines.push(`ROI: ${roiPercent}%`);
    return lines.join('\n').trim();
}
