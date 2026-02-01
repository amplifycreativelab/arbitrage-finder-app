'use strict';

const test = require('node:test');
const assert = require('node:assert');
const ElectronStore = require('electron-store');

// eslint-disable-next-line import/no-dynamic-require, global-require
const storage = require('../out-tests/src/main/services/storage.js');

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
});

// ============================================================================
// Storage Layer Tests
// ============================================================================

test('[P0][1.5-UNIT-001] getBookmakerCardRule returns default (standard) for unconfigured bookmaker', () => {
  const rule = storage.getBookmakerCardRule('UnknownBookmaker');
  assert.strictEqual(rule, 'standard', 'Expected default rule to be "standard"');
});

test('[P0][1.5-UNIT-002] setBookmakerCardRule persists rule for bookmaker', () => {
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  
  const rule = storage.getBookmakerCardRule('Sportsbet');
  assert.strictEqual(rule, 'conservative', 'Expected rule to be "conservative"');
});

test('[P0][1.5-UNIT-003] getBookmakerCardRules returns all configured rules', () => {
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Bet365', 'standard');
  storage.setBookmakerCardRule('Betfair', 'conservative');
  
  const rules = storage.getBookmakerCardRules();
  
  assert.deepStrictEqual(rules, {
    Sportsbet: 'conservative',
    Bet365: 'standard',
    Betfair: 'conservative'
  });
});

test('[P0][1.5-UNIT-004] removeBookmakerCardRule removes rule for bookmaker', () => {
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Bet365', 'standard');
  
  storage.removeBookmakerCardRule('Sportsbet');
  
  const rules = storage.getBookmakerCardRules();
  assert.strictEqual(rules.Sportsbet, undefined, 'Expected Sportsbet rule to be removed');
  assert.strictEqual(rules.Bet365, 'standard', 'Expected Bet365 rule to remain');
});

test('[P0][1.5-UNIT-005] removed bookmaker returns to default rule', () => {
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.removeBookmakerCardRule('Sportsbet');
  
  const rule = storage.getBookmakerCardRule('Sportsbet');
  assert.strictEqual(rule, 'standard', 'Expected removed bookmaker to use default rule');
});

test('[P1][1.5-UNIT-006] getConfiguredBookmakers returns only explicitly configured bookmakers', () => {
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Bet365', 'standard');
  
  const configured = storage.getConfiguredBookmakers();
  
  assert.strictEqual(configured.length, 2);
  assert.ok(configured.includes('Sportsbet'));
  assert.ok(configured.includes('Bet365'));
});

test('[P1][1.5-UNIT-007] updating existing bookmaker rule replaces old value', () => {
  storage.setBookmakerCardRule('Sportsbet', 'conservative');
  storage.setBookmakerCardRule('Sportsbet', 'standard');
  
  const rule = storage.getBookmakerCardRule('Sportsbet');
  assert.strictEqual(rule, 'standard', 'Expected rule to be updated to "standard"');
});

test('[P1][1.5-UNIT-008] empty rules object when no bookmakers configured', () => {
  const rules = storage.getBookmakerCardRules();
  assert.deepStrictEqual(rules, {}, 'Expected empty object when no rules configured');
});

test('[P1][1.5-UNIT-009] rules persist across multiple storage operations', () => {
  storage.setBookmakerCardRule('BookmakerA', 'conservative');
  storage.setBookmakerCardRule('BookmakerB', 'standard');
  storage.setBookmakerCardRule('BookmakerC', 'conservative');
  
  // Remove middle one
  storage.removeBookmakerCardRule('BookmakerB');
  
  // Add another
  storage.setBookmakerCardRule('BookmakerD', 'standard');
  
  const rules = storage.getBookmakerCardRules();
  assert.strictEqual(Object.keys(rules).length, 3);
  assert.strictEqual(rules.BookmakerA, 'conservative');
  assert.strictEqual(rules.BookmakerB, undefined);
  assert.strictEqual(rules.BookmakerC, 'conservative');
  assert.strictEqual(rules.BookmakerD, 'standard');
});

test('[P1][1.5-UNIT-010] bookmaker identifiers match feed data format', () => {
  // Test with realistic bookmaker names that might come from feed data
  const bookmakers = [
    { name: 'Sportsbet', rule: 'conservative' },
    { name: 'Bet365 AU', rule: 'standard' },
    { name: 'Betfair', rule: 'standard' },
    { name: 'Ladbrokes', rule: 'conservative' }
  ];
  
  for (const bm of bookmakers) {
    storage.setBookmakerCardRule(bm.name, bm.rule);
  }
  
  const rules = storage.getBookmakerCardRules();
  
  for (const bm of bookmakers) {
    assert.strictEqual(rules[bm.name], bm.rule, `Expected ${bm.name} to have rule ${bm.rule}`);
  }
});
