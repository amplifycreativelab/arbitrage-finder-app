"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCalculatorStore = void 0;
exports.calculateStakesFromTotal = calculateStakesFromTotal;
exports.calculateStakesFromTargetProfit = calculateStakesFromTargetProfit;
exports.calculateProfit = calculateProfit;
exports.calculateRoi = calculateRoi;
exports.isValidArbitrage = isValidArbitrage;
exports.calculateArbitrageMargin = calculateArbitrageMargin;
exports.isOpportunityStale = isOpportunityStale;
exports.getStalenessMinutes = getStalenessMinutes;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const MAX_HISTORY_ENTRIES = 20;
function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function calculateStakesFromTotal(totalStake, oddsA, oddsB) {
    const probA = 1 / oddsA;
    const probB = 1 / oddsB;
    const totalProb = probA + probB;
    return {
        stakeA: (totalStake * probA) / totalProb,
        stakeB: (totalStake * probB) / totalProb
    };
}
function calculateStakesFromTargetProfit(targetProfit, oddsA, oddsB) {
    // Guard: Check for valid arbitrage first
    if (!isValidArbitrage(oddsA, oddsB)) {
        return null;
    }
    // For pure arbitrage: stakeA * oddsA - totalStake = targetProfit
    // stakeA * oddsA - (stakeA + stakeB) = targetProfit
    // stakeA * (oddsA - 1) - stakeB = targetProfit
    // stakeB = stakeA * (oddsB - 1) - targetProfit
    //
    // Using proportional allocation:
    // stakeA / stakeB = (1/oddsA) / (1/oddsB) = oddsB / oddsA
    // stakeB = stakeA * oddsA / oddsB
    //
    // Substituting:
    // stakeA * (oddsA - 1) - stakeA * oddsA / oddsB = targetProfit
    // stakeA * [(oddsA - 1) - oddsA / oddsB] = targetProfit
    const termA = oddsA - 1 - oddsA / oddsB;
    // Guard: Check for division by zero or negative denominator
    if (termA <= 0) {
        return null;
    }
    const stakeA = targetProfit / termA;
    const stakeB = stakeA * (oddsA / oddsB);
    const totalStake = stakeA + stakeB;
    // Guard: Ensure positive stakes
    if (stakeA <= 0 || stakeB <= 0) {
        return null;
    }
    return { stakeA, stakeB, totalStake };
}
function calculateProfit(stakeA, stakeB, oddsA, oddsB) {
    const totalStake = stakeA + stakeB;
    const returnA = stakeA * oddsA;
    const returnB = stakeB * oddsB;
    // Both should be equal in pure arbitrage, but take average for safety
    const profitA = returnA - totalStake;
    const profitB = returnB - totalStake;
    return (profitA + profitB) / 2;
}
function calculateRoi(profit, totalStake) {
    if (totalStake === 0)
        return 0;
    return profit / totalStake;
}
/**
 * Checks if the given odds still form a valid arbitrage opportunity.
 * Valid arbitrage: sum of implied probabilities < 1
 */
function isValidArbitrage(oddsA, oddsB) {
    const probA = 1 / oddsA;
    const probB = 1 / oddsB;
    return probA + probB < 1;
}
/**
 * Calculates the arbitrage margin (how far below 1 the implied probability sum is)
 * Positive margin = profitable arbitrage
 */
function calculateArbitrageMargin(oddsA, oddsB) {
    const probA = 1 / oddsA;
    const probB = 1 / oddsB;
    return 1 - (probA + probB);
}
function isOpportunityStale(opportunity) {
    const foundAt = new Date(opportunity.foundAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return now - foundAt > fiveMinutes;
}
function getStalenessMinutes(opportunity) {
    const foundAt = new Date(opportunity.foundAt).getTime();
    const now = Date.now();
    return Math.floor((now - foundAt) / (60 * 1000));
}
exports.useCalculatorStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    isOpen: false,
    displayMode: 'inline',
    opportunity: null,
    mode: 'totalStake',
    totalStake: '',
    targetProfit: '',
    stakeA: '',
    stakeB: '',
    calculatedStakeA: 0,
    calculatedStakeB: 0,
    totalInvestment: 0,
    profit: 0,
    roi: 0,
    history: [],
    // NEW: Default currencies (Story 8.5)
    currencyA: 'USD',
    currencyB: 'USD',
    openCalculator: (opportunity, baseCurrency = 'USD') => {
        set({
            isOpen: true,
            opportunity,
            totalStake: '',
            targetProfit: '',
            stakeA: '',
            stakeB: '',
            calculatedStakeA: 0,
            calculatedStakeB: 0,
            totalInvestment: 0,
            profit: 0,
            roi: opportunity.roi,
            // NEW: Initialize currencies from base currency (Story 8.5)
            currencyA: baseCurrency,
            currencyB: baseCurrency
        });
    },
    closeCalculator: () => {
        set({ isOpen: false });
    },
    setDisplayMode: (mode) => {
        set({ displayMode: mode });
    },
    setMode: (mode) => {
        set({ mode });
        // Recalculate based on new mode
        if (mode === 'totalStake') {
            get().calculateFromTotalStake();
        }
        else {
            get().calculateFromTargetProfit();
        }
    },
    setTotalStake: (value) => {
        set({ totalStake: value });
        get().calculateFromTotalStake();
    },
    setTargetProfit: (value) => {
        set({ targetProfit: value });
        get().calculateFromTargetProfit();
    },
    setStakeA: (value) => {
        set({ stakeA: value });
        get().calculateFromStakeA();
    },
    setStakeB: (value) => {
        set({ stakeB: value });
        get().calculateFromStakeB();
    },
    setCurrencyA: (currency) => {
        set({ currencyA: currency });
        // Recalculate when currency changes
        const { mode } = get();
        if (mode === 'totalStake') {
            get().calculateFromTotalStake();
        }
        else {
            get().calculateFromTargetProfit();
        }
    },
    setCurrencyB: (currency) => {
        set({ currencyB: currency });
        // Recalculate when currency changes
        const { mode } = get();
        if (mode === 'totalStake') {
            get().calculateFromTotalStake();
        }
        else {
            get().calculateFromTargetProfit();
        }
    },
    calculateFromTotalStake: () => {
        const { opportunity, totalStake, mode } = get();
        if (!opportunity || mode !== 'totalStake')
            return;
        const total = parseFloat(totalStake);
        if (isNaN(total) || total <= 0) {
            set({
                calculatedStakeA: 0,
                calculatedStakeB: 0,
                totalInvestment: 0,
                profit: 0
            });
            return;
        }
        const oddsA = opportunity.legs[0].odds;
        const oddsB = opportunity.legs[1].odds;
        const { stakeA, stakeB } = calculateStakesFromTotal(total, oddsA, oddsB);
        const profit = calculateProfit(stakeA, stakeB, oddsA, oddsB);
        const roi = calculateRoi(profit, total);
        set({
            calculatedStakeA: stakeA,
            calculatedStakeB: stakeB,
            totalInvestment: total,
            profit,
            roi
        });
    },
    calculateFromTargetProfit: () => {
        const { opportunity, targetProfit, mode } = get();
        if (!opportunity || mode !== 'targetProfit')
            return;
        const target = parseFloat(targetProfit);
        if (isNaN(target) || target <= 0) {
            set({
                calculatedStakeA: 0,
                calculatedStakeB: 0,
                totalInvestment: 0,
                profit: 0
            });
            return;
        }
        const oddsA = opportunity.legs[0].odds;
        const oddsB = opportunity.legs[1].odds;
        const result = calculateStakesFromTargetProfit(target, oddsA, oddsB);
        if (!result) {
            set({
                calculatedStakeA: 0,
                calculatedStakeB: 0,
                totalInvestment: 0,
                profit: 0,
                roi: 0
            });
            return;
        }
        const { stakeA, stakeB, totalStake } = result;
        const profit = calculateProfit(stakeA, stakeB, oddsA, oddsB);
        const roi = calculateRoi(profit, totalStake);
        set({
            calculatedStakeA: stakeA,
            calculatedStakeB: stakeB,
            totalInvestment: totalStake,
            profit,
            roi
        });
    },
    calculateFromStakeA: () => {
        const { opportunity, stakeA, mode } = get();
        if (!opportunity || mode !== 'totalStake')
            return;
        const stakeAValue = parseFloat(stakeA);
        if (isNaN(stakeAValue) || stakeAValue <= 0) {
            set({
                calculatedStakeA: 0,
                calculatedStakeB: 0,
                totalInvestment: 0,
                profit: 0
            });
            return;
        }
        const oddsA = opportunity.legs[0].odds;
        const oddsB = opportunity.legs[1].odds;
        // Calculate stakeB to ensure equal profit
        // stakeA * oddsA = stakeB * oddsB
        // stakeB = stakeA * oddsA / oddsB
        const stakeBValue = (stakeAValue * oddsA) / oddsB;
        const totalStake = stakeAValue + stakeBValue;
        const profit = calculateProfit(stakeAValue, stakeBValue, oddsA, oddsB);
        const roi = calculateRoi(profit, totalStake);
        set({
            calculatedStakeA: stakeAValue,
            calculatedStakeB: stakeBValue,
            totalInvestment: totalStake,
            profit,
            roi
        });
    },
    calculateFromStakeB: () => {
        const { opportunity, stakeB, mode } = get();
        if (!opportunity || mode !== 'totalStake')
            return;
        const stakeBValue = parseFloat(stakeB);
        if (isNaN(stakeBValue) || stakeBValue <= 0) {
            set({
                calculatedStakeA: 0,
                calculatedStakeB: 0,
                totalInvestment: 0,
                profit: 0
            });
            return;
        }
        const oddsA = opportunity.legs[0].odds;
        const oddsB = opportunity.legs[1].odds;
        // Calculate stakeA to ensure equal profit
        // stakeA * oddsA = stakeB * oddsB
        // stakeA = stakeB * oddsB / oddsA
        const stakeAValue = (stakeBValue * oddsB) / oddsA;
        const totalStake = stakeAValue + stakeBValue;
        const profit = calculateProfit(stakeAValue, stakeBValue, oddsA, oddsB);
        const roi = calculateRoi(profit, totalStake);
        set({
            calculatedStakeA: stakeAValue,
            calculatedStakeB: stakeBValue,
            totalInvestment: totalStake,
            profit,
            roi
        });
    },
    addToHistory: (exchangeRates, ratesTimestamp) => {
        const { opportunity, calculatedStakeA, calculatedStakeB, totalInvestment, profit, roi, currencyA, currencyB } = get();
        if (!opportunity || totalInvestment <= 0)
            return;
        const entry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            eventName: opportunity.event.name,
            marketType: opportunity.legs[0].market,
            bookmakerA: opportunity.legs[0].bookmaker,
            bookmakerB: opportunity.legs[1].bookmaker,
            oddsA: opportunity.legs[0].odds,
            oddsB: opportunity.legs[1].odds,
            stakeA: calculatedStakeA,
            stakeB: calculatedStakeB,
            totalStake: totalInvestment,
            profit,
            roi,
            // NEW: Multi-currency fields (Story 8.5)
            currencyA,
            currencyB,
            exchangeRateSnapshot: exchangeRates || { USD: 1, AUD: 1.52, EUR: 0.85 },
            exchangeRateTimestamp: ratesTimestamp || new Date().toISOString()
        };
        set((state) => {
            const newHistory = [entry, ...state.history].slice(0, MAX_HISTORY_ENTRIES);
            return { history: newHistory };
        });
    },
    clearHistory: () => {
        set({ history: [] });
    },
    loadFromHistory: (entry) => {
        set({
            totalStake: entry.totalStake.toFixed(2),
            targetProfit: entry.profit.toFixed(2),
            calculatedStakeA: entry.stakeA,
            calculatedStakeB: entry.stakeB,
            totalInvestment: entry.totalStake,
            profit: entry.profit,
            roi: entry.roi,
            // NEW: Restore currency selections (Story 8.5)
            currencyA: entry.currencyA || 'USD',
            currencyB: entry.currencyB || 'USD'
        });
    },
    removeHistoryEntry: (id) => {
        set((state) => ({
            history: state.history.filter((entry) => entry.id !== id)
        }));
    }
}), {
    name: 'calculator-storage',
    storage: (0, middleware_1.createJSONStorage)(() => localStorage),
    partialize: (state) => ({
        history: state.history,
        displayMode: state.displayMode,
        // NEW: Persist currency preferences (Story 8.5)
        currencyA: state.currencyA,
        currencyB: state.currencyB
    })
}));
