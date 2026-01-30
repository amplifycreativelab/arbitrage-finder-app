"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBetSlip = formatBetSlip;
exports.createBetSlipData = createBetSlipData;
exports.copyBetSlipToClipboard = copyBetSlipToClipboard;
exports.copyOpportunityBetSlip = copyOpportunityBetSlip;
/**
 * Formats bet slip data into a readable string for copying.
 * Format: "Bookmaker A: Stake $X @ Odds Y | Bookmaker B: Stake $X @ Odds Y | Total: $X | Profit: $X (X%)"
 */
function formatBetSlip(data) {
    const { bookmakerA, stakeA, oddsA, bookmakerB, stakeB, oddsB, totalStake, profit, roi } = data;
    return (`${bookmakerA}: $${stakeA.toFixed(2)} @ ${oddsA.toFixed(2)} | ` +
        `${bookmakerB}: $${stakeB.toFixed(2)} @ ${oddsB.toFixed(2)} | ` +
        `Total: $${totalStake.toFixed(2)} | ` +
        `Profit: $${profit.toFixed(2)} (${(roi * 100).toFixed(2)}%)`);
}
/**
 * Creates bet slip data from an opportunity and calculated stakes.
 */
function createBetSlipData(opportunity, stakeA, stakeB, profit) {
    const legA = opportunity.legs[0];
    const legB = opportunity.legs[1];
    const totalStake = stakeA + stakeB;
    return {
        bookmakerA: legA.bookmaker,
        stakeA,
        oddsA: legA.odds,
        bookmakerB: legB.bookmaker,
        stakeB,
        oddsB: legB.odds,
        totalStake,
        profit,
        roi: totalStake > 0 ? profit / totalStake : 0
    };
}
/**
 * Copies formatted bet slip to clipboard.
 * Returns true if successful, false otherwise.
 */
async function copyBetSlipToClipboard(data) {
    try {
        const text = formatBetSlip(data);
        await navigator.clipboard.writeText(text);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Creates and copies bet slip from opportunity and stakes in one call.
 */
async function copyOpportunityBetSlip(opportunity, stakeA, stakeB, profit) {
    const data = createBetSlipData(opportunity, stakeA, stakeB, profit);
    return copyBetSlipToClipboard(data);
}
