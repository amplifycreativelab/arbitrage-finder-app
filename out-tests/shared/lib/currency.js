"use strict";
/**
 * Shared Currency Utilities
 * Client-safe currency conversion and formatting functions
 * Story 8.4: Currency Exchange Rate Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RATES = exports.CURRENCY_DETAILS = exports.CURRENCIES = void 0;
exports.convert = convert;
exports.getRate = getRate;
exports.getInverseRates = getInverseRates;
exports.formatCurrency = formatCurrency;
exports.formatCurrencyNumber = formatCurrencyNumber;
exports.formatRelativeTime = formatRelativeTime;
exports.getRateAgeStatus = getRateAgeStatus;
exports.isRateStale = isRateStale;
exports.getRateStatusColor = getRateStatusColor;
exports.getRateStatusLabel = getRateStatusLabel;
// ============================================================================
// Constants
// ============================================================================
exports.CURRENCIES = ['USD', 'AUD', 'EUR'];
exports.CURRENCY_DETAILS = {
    USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
    AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
    EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' }
};
// Default rates for initial render / offline fallback
exports.DEFAULT_RATES = {
    USD: 1,
    AUD: 1.52,
    EUR: 0.85
};
// ============================================================================
// Conversion Functions
// ============================================================================
/**
 * Convert amount from one currency to another using provided rates
 */
function convert(amount, from, to, rates = exports.DEFAULT_RATES) {
    if (from === to)
        return amount;
    // Convert to USD base first, then to target
    const inUSD = from === 'USD' ? amount : amount / rates[from];
    const result = to === 'USD' ? inUSD : inUSD * rates[to];
    return Number(result.toFixed(2));
}
/**
 * Get exchange rate between two currencies
 */
function getRate(from, to, rates = exports.DEFAULT_RATES) {
    if (from === to)
        return 1;
    // Rate from A to B = (1 / rate[A]) * rate[B]
    return to === 'USD' ? 1 / rates[from] : rates[to] / rates[from];
}
/**
 * Get inverse rates (1 AUD = X USD, etc.)
 */
function getInverseRates(rates = exports.DEFAULT_RATES) {
    return {
        USD: 1 / rates.USD,
        AUD: 1 / rates.AUD,
        EUR: 1 / rates.EUR
    };
}
// ============================================================================
// Formatting Functions
// ============================================================================
/**
 * Format currency amount with symbol
 */
function formatCurrency(amount, currency, locale = exports.CURRENCY_DETAILS[currency].locale) {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }
    catch {
        // Fallback formatting
        const symbol = exports.CURRENCY_DETAILS[currency].symbol;
        return `${symbol}${amount.toFixed(2)}`;
    }
}
/**
 * Format currency amount without symbol (just the number)
 */
function formatCurrencyNumber(amount) {
    return amount.toFixed(2);
}
/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp) {
    if (!timestamp)
        return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1)
        return 'just now';
    if (diffMins < 60)
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7)
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
}
/**
 * Get the age status of the current rates
 * - fresh: < 24 hours
 * - stale: 24-48 hours
 * - expired: > 48 hours or never fetched
 */
function getRateAgeStatus(timestamp) {
    if (!timestamp) {
        return { status: 'expired', hoursSince: null };
    }
    const hoursSince = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
        return { status: 'fresh', hoursSince };
    }
    else if (hoursSince < 48) {
        return { status: 'stale', hoursSince };
    }
    else {
        return { status: 'expired', hoursSince };
    }
}
/**
 * Check if rates are considered stale (> 24 hours old)
 */
function isRateStale(timestamp) {
    const { status } = getRateAgeStatus(timestamp);
    return status === 'stale' || status === 'expired';
}
/**
 * Get color for rate status
 */
function getRateStatusColor(status) {
    switch (status) {
        case 'fresh':
            return 'bg-green-500';
        case 'stale':
            return 'bg-yellow-500';
        case 'expired':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
}
/**
 * Get label for rate status
 */
function getRateStatusLabel(status) {
    switch (status) {
        case 'fresh':
            return 'Fresh';
        case 'stale':
            return 'Stale';
        case 'expired':
            return 'Expired';
        default:
            return 'Unknown';
    }
}
