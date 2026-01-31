"use strict";
/**
 * Currency React Hooks
 * Story 8.4: Currency Exchange Rate Service
 *
 * Provides convenient hooks for accessing and manipulating currency settings
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCurrency = useCurrency;
exports.useExchangeRates = useExchangeRates;
exports.useCurrencyConversion = useCurrencyConversion;
exports.useCurrencyWithConversion = useCurrencyWithConversion;
const React = __importStar(require("react"));
const appSettingsStore_1 = require("../features/settings/stores/appSettingsStore");
const trpc_1 = require("../lib/trpc");
const currency_1 = require("../../../../shared/lib/currency");
/**
 * Hook for accessing and modifying base currency setting
 */
function useCurrency() {
    const baseCurrency = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.baseCurrency);
    const setBaseCurrency = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.setBaseCurrency);
    return {
        baseCurrency,
        setBaseCurrency,
        currencies: ['USD', 'AUD', 'EUR']
    };
}
/**
 * Hook for accessing and refreshing exchange rates
 */
function useExchangeRates() {
    const exchangeRates = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.exchangeRates);
    const ratesLastFetched = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.ratesLastFetched);
    const setExchangeRates = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.setExchangeRates);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const isStale = (0, currency_1.isRateStale)(ratesLastFetched);
    const rateStatus = (0, currency_1.getRateAgeStatus)(ratesLastFetched);
    const lastFetchedRelative = (0, currency_1.formatRelativeTime)(ratesLastFetched);
    const fetchRates = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await trpc_1.trpcClient.currencyFetchRates.mutate();
            setExchangeRates(result.rates, result.fetchedAt);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch rates';
            setError(message);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [setExchangeRates]);
    const clearError = React.useCallback(() => {
        setError(null);
    }, []);
    return {
        rates: exchangeRates,
        lastFetched: ratesLastFetched,
        isStale,
        rateStatus,
        lastFetchedRelative,
        fetchRates,
        isLoading,
        error,
        clearError
    };
}
/**
 * Hook for performing currency conversions
 */
function useCurrencyConversion() {
    const exchangeRates = (0, appSettingsStore_1.useAppSettingsStore)((s) => s.exchangeRates);
    const convert = React.useCallback((amount, from, to) => {
        return (0, currency_1.convert)(amount, from, to, exchangeRates);
    }, [exchangeRates]);
    const getRate = React.useCallback((from, to) => {
        return (0, currency_1.getRate)(from, to, exchangeRates);
    }, [exchangeRates]);
    const formatCurrency = React.useCallback((amount, currency) => {
        return (0, currency_1.formatCurrency)(amount, currency);
    }, []);
    return {
        convert,
        getRate,
        formatCurrency
    };
}
/**
 * Combined hook for full currency functionality
 */
function useCurrencyWithConversion() {
    const { baseCurrency, setBaseCurrency, currencies } = useCurrency();
    const { rates } = useExchangeRates();
    const { convert, getRate, formatCurrency } = useCurrencyConversion();
    const convertFromBase = React.useCallback((amount, targetCurrency) => {
        return convert(amount, baseCurrency, targetCurrency);
    }, [convert, baseCurrency]);
    const convertToBase = React.useCallback((amount, sourceCurrency) => {
        return convert(amount, sourceCurrency, baseCurrency);
    }, [convert, baseCurrency]);
    return {
        baseCurrency,
        setBaseCurrency,
        currencies,
        rates,
        convert,
        getRate,
        formatCurrency,
        convertFromBase,
        convertToBase
    };
}
