/**
 * Story 9.3: Fix Event Extraction Priority (Slug-First)
 * Unit tests for extractLeagueInfo and extractSportInfo helpers
 */

const assert = require('node:assert');
const path = require('node:path');

// Load the compiled deepScan module
const deepScan = require('../out-tests/src/main/services/deepScan.js');

// Helper to access internal functions via __test exports
const getExtractLeagueInfo = () => deepScan.__test.extractLeagueInfo;
const getExtractSportInfo = () => deepScan.__test.extractSportInfo;

console.log('=== Story 9.3: Slug-First Extraction Tests ===\n');

// Test 1: Object with name + slug (IDEAL CASE)
test('[AC1] Object with {name, slug} → league=name, leagueSlug=slug', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueData = { name: 'Premier League', slug: 'england-premier-league' };
  const sportData = { name: 'Football', slug: 'football' };
  
  const leagueInfo = extractLeagueInfo(leagueData);
  const sportInfo = extractSportInfo(sportData);
  
  assert.strictEqual(leagueInfo.name, 'Premier League', 'league name should be display name');
  assert.strictEqual(leagueInfo.slug, 'england-premier-league', 'league slug should be canonical slug');
  assert.strictEqual(sportInfo.name, 'Football', 'sport name should be display name');
  assert.strictEqual(sportInfo.slug, 'football', 'sport slug should be canonical slug');
});

// Test 2: Object with slug only
test('[AC1] Object with {slug} only → league=slug(fallback), leagueSlug=slug', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueData = { slug: 'some-league-slug' };
  const sportData = { slug: 'soccer' };
  
  const leagueInfo = extractLeagueInfo(leagueData);
  const sportInfo = extractSportInfo(sportData);
  
  // When name is missing, slug becomes display fallback
  assert.strictEqual(leagueInfo.name, 'some-league-slug', 'league name should fallback to slug');
  assert.strictEqual(leagueInfo.slug, 'some-league-slug', 'league slug should be canonical slug');
  assert.strictEqual(sportInfo.name, 'soccer', 'sport name should fallback to slug');
  assert.strictEqual(sportInfo.slug, 'soccer', 'sport slug should be canonical slug');
});

// Test 3: String-only league/sport
test('[AC2] String-only league/sport → display only, no slug', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueData = 'Some League';
  const sportData = 'Soccer';
  
  const leagueInfo = extractLeagueInfo(leagueData);
  const sportInfo = extractSportInfo(sportData);
  
  assert.strictEqual(leagueInfo.name, 'Some League', 'league name should be the string value');
  assert.strictEqual(leagueInfo.slug, undefined, 'league slug should be undefined for string input');
  assert.strictEqual(sportInfo.name, 'Soccer', 'sport name should be the string value');
  assert.strictEqual(sportInfo.slug, undefined, 'sport slug should be undefined for string input');
});

// Test 4: Object with name only (NO slug)
test('[AC3,AC4] Object with {name} only → display=name, slug=undefined (NO guessing)', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueData = { name: 'Premier League' };  // No slug!
  const sportData = { name: 'Football' };         // No slug!
  
  const leagueInfo = extractLeagueInfo(leagueData);
  const sportInfo = extractSportInfo(sportData);
  
  // AC3, AC4: Never guess slug - undefined is correct
  assert.strictEqual(leagueInfo.name, 'Premier League', 'league name should be display name');
  assert.strictEqual(leagueInfo.slug, undefined, 'league slug should be undefined when not provided');
  assert.strictEqual(sportInfo.name, 'Football', 'sport name should be display name');
  assert.strictEqual(sportInfo.slug, undefined, 'sport slug should be undefined when not provided');
});

// Test 5: Undefined input
test('Undefined input → returns empty object', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueInfo = extractLeagueInfo(undefined);
  const sportInfo = extractSportInfo(undefined);
  
  assert.deepStrictEqual(leagueInfo, {}, 'undefined should return empty object');
  assert.deepStrictEqual(sportInfo, {}, 'undefined should return empty object');
});

// Test 6: Empty object input
test('Empty object {} → returns empty object (no slug, no name)', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueInfo = extractLeagueInfo({});
  const sportInfo = extractSportInfo({});
  
  assert.deepStrictEqual(leagueInfo, {}, 'empty object should return empty object');
  assert.deepStrictEqual(sportInfo, {}, 'empty object should return empty object');
});

// Test 7: Object with empty string name and valid slug
test('Object with {name: "", slug} → name falls back to slug', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueData = { name: '', slug: 'england-premier-league' };
  const sportData = { name: '', slug: 'football' };
  
  const leagueInfo = extractLeagueInfo(leagueData);
  const sportInfo = extractSportInfo(sportData);
  
  // Empty string name should fallback to slug
  assert.strictEqual(leagueInfo.name, 'england-premier-league', 'empty name should fallback to slug');
  assert.strictEqual(leagueInfo.slug, 'england-premier-league', 'slug should be preserved');
  assert.strictEqual(sportInfo.name, 'football', 'empty name should fallback to slug');
  assert.strictEqual(sportInfo.slug, 'football', 'slug should be preserved');
});

// Test 8: Object with null/undefined fields
test('Object with {name: null, slug: undefined} → returns empty object', () => {
  const extractLeagueInfo = getExtractLeagueInfo();
  const extractSportInfo = getExtractSportInfo();
  
  const leagueData = { name: null, slug: undefined };
  const sportData = { name: undefined, slug: null };
  
  const leagueInfo = extractLeagueInfo(leagueData);
  const sportInfo = extractSportInfo(sportData);
  
  assert.deepStrictEqual(leagueInfo, {}, 'null/undefined fields should return empty object');
  assert.deepStrictEqual(sportInfo, {}, 'null/undefined fields should return empty object');
});

// Test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.log(`❌ ${name}`);
    console.error(`   ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n=== Test Summary ===');
console.log('All tests completed.');
