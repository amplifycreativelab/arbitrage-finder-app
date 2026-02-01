'use strict';

const test = require('node:test');
const assert = require('node:assert');
const ElectronStore = require('electron-store');

// eslint-disable-next-line import/no-dynamic-require, global-require
const storage = require('../out-tests/src/main/services/storage.js');
// eslint-disable-next-line import/no-dynamic-require, global-require
const calculator = require('../out-tests/src/main/services/calculator.js');
// eslint-disable-next-line import/no-dynamic-require, global-require
const crossProviderCalculator = require('../out-tests/src/main/services/crossProviderCalculator.js');

const CredentialsStore = ElectronStore.default || ElectronStore;

const credentialsStore = new CredentialsStore({
  name: 'credentials',
  defaults: {
    providerSecrets: {},
    bookmakerCardRules: {}
  },
  projectName: 'arbitrage-finder'
});

test.beforeEach(() => {
  // Clear card rules before each test
  credentialsStore.set('bookmakerCardRules', {});
  // Clear the cache
  calculator.clearCardRulesCache();
});

// ============================================================================
// Story 6.5: Card Rules Mismatch Detection Tests
// ============================================================================

test('[P0][6.5-UNIT-001] detectCardRulesMismatch returns null for non-cards market groups', () => {
  // Configure bookmakers with different rules
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Bet365', 'standard');
  
  // Test with 'goals' market group
  const result = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'goals');
  
  assert.strictEqual(result, null, 'Expected null for non-cards market group');
});

test('[P0][6.5-UNIT-002] detectCardRulesMismatch returns mismatch=true when rules differ for cards market', () => {
  // Configure bookmakers with different rules
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Bet365', 'standard');
  
  // Test with 'cards' market group
  const result = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  assert.notStrictEqual(result, null, 'Expected non-null result for cards market');
  assert.strictEqual(result.mismatch, true, 'Expected mismatch to be true');
  assert.strictEqual(result.bookmakerA.name, 'Sportsbet');
  assert.strictEqual(result.bookmakerA.rule, 'conservative');
  assert.strictEqual(result.bookmakerB.name, 'Bet365');
  assert.strictEqual(result.bookmakerB.rule, 'standard');
});

test('[P0][6.5-UNIT-003] detectCardRulesMismatch returns mismatch=false when rules match', () => {
  // Configure both bookmakers with same rule
  storage.setBookmakerCardRule('Sportsbet', 'standard');
  storage.setBookmakerCardRule('Bet365', 'standard');
  
  const result = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  assert.notStrictEqual(result, null, 'Expected non-null result');
  assert.strictEqual(result.mismatch, false, 'Expected mismatch to be false when rules match');
});

test('[P0][6.5-UNIT-004] detectCardRulesMismatch uses default (standard) for unconfigured bookmakers', () => {
  // Don't configure any rules - both should default to 'standard'
  const result = calculator.detectCardRulesMismatch('UnknownBookmakerA', 'UnknownBookmakerB', 'cards');
  
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.mismatch, false, 'Expected no mismatch when both use default');
  assert.strictEqual(result.bookmakerA.rule, 'standard', 'Expected default rule for bookmakerA');
  assert.strictEqual(result.bookmakerB.rule, 'standard', 'Expected default rule for bookmakerB');
});

test('[P0][6.5-UNIT-005] detectCardRulesMismatch detects mixed configured/unconfigured bookmakers', () => {
  // Configure only one bookmaker
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  // Bet365 not configured - should default to 'standard'
  
  const result = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.mismatch, true, 'Expected mismatch when one is conservative and other is default standard');
  assert.strictEqual(result.bookmakerA.rule, 'conservative');
  assert.strictEqual(result.bookmakerB.rule, 'standard');
});

test('[P0][6.5-UNIT-006] Card rules cache is used across multiple calls', () => {
  // Configure bookmakers
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Bet365', 'standard');
  
  // First call should populate cache
  const result1 = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  // Second call should use cache (we can't directly verify cache usage, but we verify consistency)
  const result2 = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  assert.deepStrictEqual(result1, result2, 'Cached results should be consistent');
});

test('[P0][6.5-UNIT-007] clearCardRulesCache resets the cache', () => {
  // Configure and make a call to populate cache
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  // Clear cache
  calculator.clearCardRulesCache();
  
  // After clearing, changing rules should reflect immediately (no stale cache)
  storage.setBookmakerCardRule('Sportsbet', 'standard');
  const result = calculator.detectCardRulesMismatch('Sportsbet', 'Bet365', 'cards');
  
  assert.strictEqual(result.mismatch, false, 'After cache clear, new rules should be used');
});

// ============================================================================
// Format Helper Tests
// ============================================================================

test('[P1][6.5-UNIT-008] formatCardRuleDescription returns correct description for conservative', () => {
  const description = calculator.formatCardRuleDescription('conservative');
  
  assert.ok(description.includes('2 cards'), 'Should mention 2 cards');
  assert.ok(description.includes('YY+R') || description.includes('red'), 'Should mention red card scenario');
});

test('[P1][6.5-UNIT-009] formatCardRuleDescription returns correct description for standard', () => {
  const description = calculator.formatCardRuleDescription('standard');
  
  assert.ok(description.includes('3 cards'), 'Should mention 3 cards');
  assert.ok(description.includes('YY+R') || description.includes('each'), 'Should mention counting each card');
});

test('[P1][6.5-UNIT-010] getCardRuleLabel returns correct labels', () => {
  assert.strictEqual(calculator.getCardRuleLabel('conservative'), 'Conservative');
  assert.strictEqual(calculator.getCardRuleLabel('standard'), 'Standard');
  assert.strictEqual(calculator.getCardRuleLabel('unknown'), 'Unknown');
});

// ============================================================================
// Cross-Provider Calculator Integration Tests
// ============================================================================

test('[P0][6.5-UNIT-011] findCrossProviderArbitrages includes cardRulesWarning for cards markets', () => {
  // Configure bookmakers with different rules
  storage.setBookmakerCardRule('BookmakerA', 'conservative');
  storage.setBookmakerCardRule('BookmakerB', 'standard');
  
  // Create quotes that will generate a cards market opportunity
  // Using h2h market (cards_h2h pattern maps to cards group) with home/away outcomes
  // ROI formula: 1 - (1/oddsA + 1/oddsB) > 0 means arbitrage
  // 1/2.5 + 1/1.7 = 0.4 + 0.588 = 0.988 (positive ROI ~1.2%)
  const quotes = [
    {
      eventKey: 'test-event-1',
      providerId: 'odds-api-io',
      bookmaker: 'BookmakerA',
      market: 'cards', // MARKET_PATTERNS maps 'cards' to group 'cards'
      outcome: 'home',
      odds: 2.5,
      originalEventName: 'Test Event',
      originalEventDate: '2026-02-01T12:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2026-02-01T10:00:00Z'
    },
    {
      eventKey: 'test-event-1',
      providerId: 'odds-api-io',
      bookmaker: 'BookmakerB',
      market: 'cards',
      outcome: 'away',
      odds: 1.7,
      originalEventName: 'Test Event',
      originalEventDate: '2026-02-01T12:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2026-02-01T10:00:00Z'
    }
  ];
  
  const opportunities = crossProviderCalculator.findCrossProviderArbitrages(quotes);
  
  assert.strictEqual(opportunities.length, 1, 'Expected one arbitrage opportunity');
  assert.ok(opportunities[0].cardRulesWarning, 'Expected cardRulesWarning to be present');
  assert.strictEqual(opportunities[0].cardRulesWarning.mismatch, true, 'Expected mismatch to be true');
});

test('[P0][6.5-UNIT-012] findCrossProviderArbitrages omits cardRulesWarning for non-cards markets', () => {
  // Configure bookmakers with different rules
  storage.setBookmakerCardRule('BookmakerA', 'conservative');
  storage.setBookmakerCardRule('BookmakerB', 'standard');
  
  // Create quotes for goals market (non-cards)
  const quotes = [
    {
      eventKey: 'test-event-2',
      providerId: 'odds-api-io',
      bookmaker: 'BookmakerA',
      market: 'totals', // goals market
      outcome: 'over',
      odds: 2.1,
      originalEventName: 'Test Event 2',
      originalEventDate: '2026-02-01T12:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2026-02-01T10:00:00Z'
    },
    {
      eventKey: 'test-event-2',
      providerId: 'odds-api-io',
      bookmaker: 'BookmakerB',
      market: 'totals', // goals market
      outcome: 'under',
      odds: 2.05,
      originalEventName: 'Test Event 2',
      originalEventDate: '2026-02-01T12:00:00Z',
      originalLeague: 'Premier League',
      foundAt: '2026-02-01T10:00:00Z'
    }
  ];
  
  const opportunities = crossProviderCalculator.findCrossProviderArbitrages(quotes);
  
  if (opportunities.length > 0) {
    assert.strictEqual(opportunities[0].cardRulesWarning, undefined, 'Expected no cardRulesWarning for goals market');
  }
});

test('[P0][6.5-UNIT-013] Arbitrage opportunity schema validates with cardRulesWarning', () => {
  const { arbitrageOpportunitySchema } = require('../out-tests/shared/schemas.js');
  
  const opportunity = {
    id: 'test-123',
    sport: 'soccer',
    event: {
      name: 'Test Event',
      date: '2026-02-01T12:00:00Z',
      league: 'Premier League'
    },
    legs: [
      { bookmaker: 'BookmakerA', market: 'cards', odds: 2.1, outcome: 'over' },
      { bookmaker: 'BookmakerB', market: 'cards', odds: 2.05, outcome: 'under' }
    ],
    roi: 0.05,
    foundAt: '2026-02-01T10:00:00Z',
    cardRulesWarning: {
      bookmakerA: { name: 'BookmakerA', rule: 'conservative' },
      bookmakerB: { name: 'BookmakerB', rule: 'standard' },
      mismatch: true
    }
  };
  
  const result = arbitrageOpportunitySchema.safeParse(opportunity);
  
  assert.strictEqual(result.success, true, 'Schema should validate opportunity with cardRulesWarning');
});

test('[P0][6.5-UNIT-014] Arbitrage opportunity schema validates without cardRulesWarning (backward compat)', () => {
  const { arbitrageOpportunitySchema } = require('../out-tests/shared/schemas.js');
  
  const opportunity = {
    id: 'test-124',
    sport: 'soccer',
    event: {
      name: 'Test Event',
      date: '2026-02-01T12:00:00Z',
      league: 'Premier League'
    },
    legs: [
      { bookmaker: 'BookmakerA', market: 'totals', odds: 2.1, outcome: 'over' },
      { bookmaker: 'BookmakerB', market: 'totals', odds: 2.05, outcome: 'under' }
    ],
    roi: 0.05,
    foundAt: '2026-02-01T10:00:00Z'
    // No cardRulesWarning field
  };
  
  const result = arbitrageOpportunitySchema.safeParse(opportunity);
  
  assert.strictEqual(result.success, true, 'Schema should validate opportunity without cardRulesWarning');
});
