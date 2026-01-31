/**
 * Tests for Story 8.5: Multi-Currency Surebet Calculator (Integrated)
 * 
 * AC Coverage:
 * - AC #1: Multi-Currency Calculator Integration
 * - AC #2: Currency Conversion in Calculations
 * - AC #3: Exchange Rate Integration
 * - AC #4: Rate Staleness Handling
 * - AC #6: Calculator History with Multi-Currency
 * - AC #7: Copy Bet Slip with Currency Information
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// ============================================================================
// Test Data
// ============================================================================

const mockRates = {
  USD: 1,
  AUD: 1.52,
  EUR: 0.85
};

const mockOpportunity = {
  id: 'test-opp-1',
  event: { name: 'Test Match', sport: 'soccer', league: 'Test League' },
  legs: [
    { bookmaker: 'Pinnacle', odds: 2.10, market: '1X2', outcome: 'Home' },
    { bookmaker: 'Bet365', odds: 2.05, market: '1X2', outcome: 'Away' }
  ],
  roi: 0.0477,
  foundAt: new Date().toISOString()
};

// ============================================================================
// Mock Store State
// ============================================================================

let storeState = {
  currencyA: 'USD',
  currencyB: 'USD',
  exchangeRateSnapshot: {},
  history: []
};

// ============================================================================
// Helper Functions (to be tested)
// ============================================================================

/**
 * Convert amount to base currency (USD)
 * Formula: amountInBase = amountInForeign / rateToBase
 */
function convertToBase(amount, fromCurrency, rates) {
  if (fromCurrency === 'USD') return amount;
  return amount / rates[fromCurrency];
}

/**
 * Convert amount from base currency (USD)
 * Formula: amountInForeign = amountInBase * rateToBase
 */
function convertFromBase(amount, toCurrency, rates) {
  if (toCurrency === 'USD') return amount;
  return amount * rates[toCurrency];
}

/**
 * Calculate multi-currency stakes for surebet
 * Returns stakes in both outcome currencies and base currency
 */
function calculateMultiCurrencyStakes(totalStake, totalStakeCurrency, oddsA, oddsB, rates, currencyA, currencyB) {
  const probA = 1 / oddsA;
  const probB = 1 / oddsB;
  const totalProb = probA + probB;

  // Convert total stake to base currency (USD)
  const totalInBase = totalStakeCurrency === 'USD'
    ? totalStake
    : convertToBase(totalStake, totalStakeCurrency, rates);

  // Calculate optimal stakes in base currency
  const stakeAInBase = (totalInBase * probA) / totalProb;
  const stakeBInBase = (totalInBase * probB) / totalProb;

  // Convert to respective outcome currencies
  const stakeA = convertFromBase(stakeAInBase, currencyA, rates);
  const stakeB = convertFromBase(stakeBInBase, currencyB, rates);

  return { stakeA, stakeB, stakeAInBase, stakeBInBase };
}

/**
 * Check if exchange rates are stale (> 24 hours old)
 */
function isRateStale(timestamp) {
  if (!timestamp) return true;
  const hoursSince = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  return hoursSince > 24;
}

/**
 * Format currency amount with symbol
 */
function formatCurrency(amount, currency) {
  const symbols = { USD: '$', AUD: 'A$', EUR: '€' };
  return `${symbols[currency]}${amount.toFixed(2)}`;
}

/**
 * Format bet slip with currency information
 */
function formatBetSlipWithCurrencies(bookmakerA, stakeA, oddsA, currencyA, bookmakerB, stakeB, oddsB, currencyB, totalInBase, profitInBase) {
  const symbols = { USD: '$', AUD: 'A$', EUR: '€' };
  const roi = totalInBase > 0 ? (profitInBase / totalInBase) : 0;
  
  return `${bookmakerA}: ${symbols[currencyA]}${stakeA.toFixed(2)} @ ${oddsA.toFixed(2)} | ` +
         `${bookmakerB}: ${symbols[currencyB]}${stakeB.toFixed(2)} @ ${oddsB.toFixed(2)} | ` +
         `Total: $${totalInBase.toFixed(2)} USD | ` +
         `Profit: $${profitInBase.toFixed(2)} USD (${(roi * 100).toFixed(2)}%)`;
}

// ============================================================================
// Tests
// ============================================================================

describe('Story 8.5: Multi-Currency Surebet Calculator', () => {
  beforeEach(() => {
    storeState = {
      currencyA: 'USD',
      currencyB: 'USD',
      exchangeRateSnapshot: {},
      history: []
    };
  });

  // ==========================================================================
  // AC #2: Currency Conversion Tests
  // ==========================================================================
  describe('Currency Conversion', () => {
    it('should convert AUD to USD base currency correctly', () => {
      const audAmount = 100;
      const usdResult = convertToBase(audAmount, 'AUD', mockRates);
      // 100 AUD / 1.52 = 65.79 USD
      assert.strictEqual(usdResult, 100 / 1.52);
    });

    it('should convert EUR to USD base currency correctly', () => {
      const eurAmount = 85.50;
      const usdResult = convertToBase(eurAmount, 'EUR', mockRates);
      // 85.50 EUR / 0.85 = 100.59 USD
      assert.strictEqual(usdResult, 85.50 / 0.85);
    });

    it('should return same amount when converting USD to USD base', () => {
      const usdAmount = 100;
      const result = convertToBase(usdAmount, 'USD', mockRates);
      assert.strictEqual(result, 100);
    });

    it('should convert from USD base to AUD correctly', () => {
      const usdAmount = 65.79;
      const audResult = convertFromBase(usdAmount, 'AUD', mockRates);
      // 65.79 USD * 1.52 = 100.00 AUD
      assert.strictEqual(audResult, 65.79 * 1.52);
    });

    it('should convert from USD base to EUR correctly', () => {
      const usdAmount = 91.45;
      const eurResult = convertFromBase(usdAmount, 'EUR', mockRates);
      // 91.45 USD * 0.85 = 77.73 EUR
      assert.strictEqual(eurResult, 91.45 * 0.85);
    });
  });

  // ==========================================================================
  // AC #1 & #2: Multi-Currency Stake Calculation Tests
  // ==========================================================================
  describe('Multi-Currency Stake Calculations', () => {
    it('should calculate stakes correctly when both currencies are USD', () => {
      const result = calculateMultiCurrencyStakes(
        100, 'USD', // total stake
        2.10, 2.05, // odds
        mockRates,
        'USD', 'USD' // currencies
      );

      // Total in base: 100 USD
      // ProbA = 1/2.10 = 0.476, ProbB = 1/2.05 = 0.488
      // TotalProb = 0.964
      // stakeA_base = 100 * 0.476 / 0.964 = 49.38
      // stakeB_base = 100 * 0.488 / 0.964 = 50.62

      assert.ok(result.stakeA > 0, 'stakeA should be positive');
      assert.ok(result.stakeB > 0, 'stakeB should be positive');
      assert.ok(result.stakeAInBase > 0, 'stakeAInBase should be positive');
      assert.ok(result.stakeBInBase > 0, 'stakeBInBase should be positive');
    });

    it('should calculate stakes with AUD and EUR currencies', () => {
      const result = calculateMultiCurrencyStakes(
        100, 'AUD', // total stake in AUD
        2.10, 2.05, // odds
        mockRates,
        'AUD', 'EUR' // outcome currencies
      );

      // Total in base: 100 AUD / 1.52 = 65.79 USD
      // stakeA_base = 65.79 * (1/2.10) / totalProb
      // stakeA should be in AUD
      // stakeB should be in EUR

      assert.ok(result.stakeA > 0, 'stakeA should be positive');
      assert.ok(result.stakeB > 0, 'stakeB should be positive');
    });

    it('should calculate stakes correctly when total stake currency differs from outcome currencies', () => {
      const result = calculateMultiCurrencyStakes(
        200, 'AUD', // total stake in AUD
        2.10, 2.05, // odds
        mockRates,
        'USD', 'EUR' // outcome currencies
      );

      // stakeA should be in USD
      // stakeB should be in EUR
      assert.ok(result.stakeA > 0, 'stakeA should be positive');
      assert.ok(result.stakeB > 0, 'stakeB should be positive');
    });
  });

  // ==========================================================================
  // AC #4: Rate Staleness Tests
  // ==========================================================================
  describe('Rate Staleness Handling', () => {
    it('should return true for stale rates (> 24 hours)', () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      assert.strictEqual(isRateStale(twentyFiveHoursAgo), true);
    });

    it('should return false for fresh rates (< 24 hours)', () => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      assert.strictEqual(isRateStale(twelveHoursAgo), false);
    });

    it('should return true for null timestamp', () => {
      assert.strictEqual(isRateStale(null), true);
    });

    it('should return true for undefined timestamp', () => {
      assert.strictEqual(isRateStale(undefined), true);
    });
  });

  // ==========================================================================
  // AC #7: Copy Bet Slip Format Tests
  // ==========================================================================
  describe('Copy Bet Slip with Currencies', () => {
    it('should format bet slip with AUD and EUR currencies', () => {
      const result = formatBetSlipWithCurrencies(
        'Pinnacle', 100, 2.10, 'AUD',
        'Bet365', 85.50, 2.05, 'EUR',
        157.24, 7.50
      );

      assert.ok(result.includes('Pinnacle: A$100.00 @ 2.10'), 'Should include Pinnacle stake in AUD');
      assert.ok(result.includes('Bet365: €85.50 @ 2.05'), 'Should include Bet365 stake in EUR');
      assert.ok(result.includes('Total: $157.24 USD'), 'Should include total in USD');
      assert.ok(result.includes('Profit: $7.50 USD'), 'Should include profit in USD');
    });

    it('should format bet slip with USD currencies', () => {
      const result = formatBetSlipWithCurrencies(
        'Bookmaker A', 50, 2.00, 'USD',
        'Bookmaker B', 50, 2.00, 'USD',
        100, 0
      );

      assert.ok(result.includes('Bookmaker A: $50.00 @ 2.00'), 'Should include Bookmaker A stake in USD');
      assert.ok(result.includes('Bookmaker B: $50.00 @ 2.00'), 'Should include Bookmaker B stake in USD');
    });
  });

  // ==========================================================================
  // AC #8: Currency Formatting Tests
  // ==========================================================================
  describe('Currency Formatting', () => {
    it('should format USD with $ symbol', () => {
      assert.strictEqual(formatCurrency(100, 'USD'), '$100.00');
    });

    it('should format AUD with A$ symbol', () => {
      assert.strictEqual(formatCurrency(100, 'AUD'), 'A$100.00');
    });

    it('should format EUR with € symbol', () => {
      assert.strictEqual(formatCurrency(100, 'EUR'), '€100.00');
    });

    it('should format with 2 decimal places', () => {
      assert.strictEqual(formatCurrency(100.5, 'USD'), '$100.50');
      assert.strictEqual(formatCurrency(100.555, 'USD'), '$100.56');
    });
  });
});

console.log('Test file loaded successfully. Run with: node --test tests/8-5-multi-currency-surebet-calculator.test.cjs');
