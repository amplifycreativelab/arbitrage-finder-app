"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatBetSlip = formatBetSlip;
exports.createBetSlipData = createBetSlipData;
exports.copyBetSlipToClipboard = copyBetSlipToClipboard;
exports.copyOpportunityBetSlip = copyOpportunityBetSlip;
const currency_1 = require("../../../../../../shared/lib/currency");
/**
 * Formats bet slip data into a readable string for copying.
 * Format: "Bookmaker A: Stake $X @ Odds Y | Bookmaker B: Stake $X @ Odds Y | Total: $X | Profit: $X (X%)"
 * NEW (Story 8.5): Includes currency symbols for each stake
 */
function formatBetSlip(data) {
    const { bookmakerA, stakeA, oddsA, bookmakerB, stakeB, oddsB, totalStake, profit, roi, currencyA, currencyB, baseCurrency } = data;
    const symbolA = currency_1.CURRENCY_DETAILS[currencyA]?.symbol || '$';
    const symbolB = currency_1.CURRENCY_DETAILS[currencyB]?.symbol || '$';
    const baseSymbol = currency_1.CURRENCY_DETAILS[baseCurrency]?.symbol || '$';
    return (`${bookmakerA}: ${symbolA}${stakeA.toFixed(2)} @ ${oddsA.toFixed(2)} | ` +
        `${bookmakerB}: ${symbolB}${stakeB.toFixed(2)} @ ${oddsB.toFixed(2)} | ` +
        `Total: ${baseSymbol}${totalStake.toFixed(2)} ${baseCurrency} | ` +
        `Profit: ${baseSymbol}${profit.toFixed(2)} ${baseCurrency} (${(roi * 100).toFixed(2)}%)`);
}
/**
 * Creates bet slip data from an opportunity and calculated stakes.
 * NEW (Story 8.5): Includes currency information
 */
function createBetSlipData(opportunity, stakeA, stakeB, profit, currencyA = 'USD', currencyB = 'USD', baseCurrency = 'USD') {
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
        roi: totalStake > 0 ? profit / totalStake : 0,
        currencyA,
        currencyB,
        baseCurrency
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
