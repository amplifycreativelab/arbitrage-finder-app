# Story 9.6: Implement API-Side League Filtering for Event Discovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a System,
I want to filter events by league at the API level,
so that discovery traffic is reduced proportionally with league filters.

## Acceptance Criteria

1. [x] Instead of fetching all events for a sport, call `/v3/events?sport=...&league=...` per enabled `leagueSlug` (AC: 1)
2. [x] Use best supported filter pattern from API docs (AC: 2)
3. [x] Keep pagination handling (numeric `nextPage`) but reduce total pages fetched (AC: 3)
4. [x] Discovery traffic drops proportionally with league filters (AC: 4)
5. [x] Returned events are already within enabled leagues (AC: 5)

## Tasks / Subtasks

- [x] Task 1: Implement per-league event discovery function (AC: 1, 2)
  - [x] Create `discoverEventsForEnabledLeagues()` function in `deepScan.ts`
  - [x] Iterate over enabled leagues and fetch events per league
  - [x] Build URL with `sport` and `league` query params
  - [x] Handle both single-league and multi-league configurations
- [x] Task 2: Integrate with existing pagination logic (AC: 3)
  - [x] Reuse existing `nextPage` pagination handling
  - [x] Aggregate events from all league queries
  - [x] Ensure deduplication across league boundaries (if any)
- [x] Task 3: Replace sport-level discovery with league-level discovery (AC: 4, 5)
  - [x] Identify current sport-level fetch location in deep scan
  - [x] Replace with per-league fetch calls
  - [x] Ensure events returned match enabled league configuration
- [x] Task 4: Testing (AC: 4, 5)
  - [x] Unit: League filtering params correctly constructed
  - [x] Integration: Discovery traffic reduction with league filters applied
  - [x] Test: Events returned are within enabled leagues only

## Dev Notes

### Background

Currently, the app fetches `/v3/events` by sport and filters leagues client-side. This causes higher quota usage, slower discovery, and more events in tiers than needed.

The Odds-API.io supports filtering events by league at the API level using the `league` query parameter. This story implements API-side filtering to reduce discovery traffic proportionally with the number of enabled leagues.

### Architecture Context

**⚠️ CRITICAL: API-Side vs Client-Side Filtering**

```
┌─────────────────────────────────────────────────────────────────────┐
│  CURRENT (Client-Side Filtering) - INEFFICIENT                      │
│  ├── Fetch: /v3/events?sport=soccer (ALL leagues)                   │
│  ├── Receive: 500 events across 20 leagues                          │
│  ├── Filter: Keep only 50 events from 2 enabled leagues             │
│  └── Waste: 90% of API quota spent on disabled leagues              │
├─────────────────────────────────────────────────────────────────────┤
│  TARGET (API-Side Filtering) - EFFICIENT                            │
│  ├── Fetch: /v3/events?sport=soccer&league=epl ( League 1 )         │
│  ├── Fetch: /v3/events?sport=soccer&league=laliga ( League 2 )      │
│  ├── Receive: 50 events total (only enabled leagues)                │
│  └── Save: 90% reduction in API quota usage                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Target File:** `src/main/services/deepScan.ts`

**Key Function to Modify/Create:**
```typescript
// Current approach (to be replaced/modified):
// - Fetches all events for a sport
// - Client-side filtering by league

// New approach:
async function discoverEventsForEnabledLeagues(
  enabledLeagues: LeagueConfig[],
  apiKey: string
): Promise<DeepScanEvent[]> {
  // Fetch per league, aggregate results
}
```

**API Endpoint Pattern:**
```typescript
// From Odds-API.io docs:
// GET /v3/events?sport={sportSlug}&league={leagueSlug}&page={page}

// Example URLs:
// /v3/events?sport=soccer&league=epl&page=1
// /v3/events?sport=soccer&league=laliga&page=1
// /v3/events?sport=tennis&league=atp&page=1
```

**Existing Pagination Pattern (from deepScan.ts):**
```typescript
// Current pagination handling (preserve this):
let nextPage: number | null = 1
while (nextPage) {
  const url = new URL('/v3/events', baseUrl)
  url.searchParams.set('sport', sportSlug)
  url.searchParams.set('page', nextPage.toString())
  // ... add league param here for per-league fetching
  
  const response = await trackedRequest(url.toString(), ...)
  const body = await response.json()
  
  events.push(...extractEvents(body))
  nextPage = body.nextPage ?? null
}
```

**League Configuration Structure:**
```typescript
// From settings/stores - LeagueConfig interface
interface LeagueConfig {
  sportSlug: string      // e.g., "soccer"
  leagueSlug: string     // e.g., "epl"
  name: string           // e.g., "Premier League"
  enabled: boolean       // Whether user has enabled this league
}

// Usage pattern:
const enabledLeagues = leagueConfigs.filter(l => l.enabled)
// Pass these to discoverEventsForEnabledLeagues()
```

**Existing Event Extraction Pattern:**
```typescript
// From deepScan.ts - extractEvents() function (lines ~450-520)
// Already handles canonical fields from Stories 9.2, 9.3
function extractEvents(apiResponse: ApiEventResponse): DeepScanEvent[] {
  return apiResponse.events.map(event => ({
    id: event.id,
    name: event.name,
    // ... other fields
    sportSlug: event.sport?.slug,
    leagueSlug: event.league?.slug,
    kickoffEpochMs: event.kickoff ? Date.parse(event.kickoff) : undefined
  }))
}
```

### Implementation Requirements

**Function to implement:**
```typescript
/**
 * Discover events by fetching per enabled league instead of per sport.
 * This reduces API quota usage proportionally with league filters.
 */
async function discoverEventsForEnabledLeagues(
  enabledLeagues: LeagueConfig[],
  apiKey: string,
  signal?: AbortSignal
): Promise<DeepScanEvent[]> {
  const allEvents: DeepScanEvent[] = []
  
  for (const league of enabledLeagues) {
    let nextPage: number | null = 1
    
    while (nextPage) {
      const url = new URL('/v3/events', ODDS_API_IO_BASE_URL)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('sport', league.sportSlug)
      url.searchParams.set('league', league.leagueSlug)
      url.searchParams.set('page', nextPage.toString())
      
      const response = await trackedRequest(url.toString(), { signal })
      const body = await response.json()
      
      const events = extractEvents(body)
      allEvents.push(...events)
      
      nextPage = body.nextPage ?? null
    }
  }
  
  return allEvents
}
```

**Integration Point - Event Discovery:**
Replace the current sport-level event discovery with the new per-league approach:

```typescript
// Before (sport-level):
// const events = await fetchEventsForSport('soccer', apiKey)
// const filteredEvents = events.filter(e => enabledLeagueSlugs.includes(e.leagueSlug))

// After (league-level):
const events = await discoverEventsForEnabledLeagues(enabledLeagues, apiKey)
// Events are already filtered by API - no client-side filtering needed
```

**Quota Efficiency Tracking:**
```typescript
// Add metrics to track efficiency gains:
interface DiscoveryMetrics {
  requestsSaved: number        // Requests avoided by API-side filtering
  eventsFiltered: number       // Events that would have been fetched but skipped
  leaguesEnabled: number       // Number of leagues being scanned
  totalLeaguesAvailable: number // Total leagues available for the sport
}
```

### Cross-Story Dependencies

**Previous stories that must be complete:**
- Story 9.2: Add Canonical Fields to Event Model - `sportSlug` and `leagueSlug` fields
- Story 9.3: Fix Event Extraction Priority - Slug-first extraction logic
- Story 9.4: Implement Strict Event Key Generation - Event identification
- Story 7.9: Sport/League Filter Configuration - League enablement UI and config

**Integration Points:**
- Uses `extractEvents()` from `deepScan.ts` (enhanced in Stories 9.2, 9.3)
- Uses `trackedRequest()` for API calls with rate limiting
- Uses `LeagueConfig` from settings store (from Story 7.9)
- Integrates with deep scan event discovery flow

**Configuration Access:**
```typescript
// Access enabled leagues from settings
// Location: src/main/store/settings.ts or similar
import { getEnabledLeagues } from '../store/settings'

const enabledLeagues = await getEnabledLeagues()
// Returns: [{ sportSlug: 'soccer', leagueSlug: 'epl', name: 'Premier League', enabled: true }, ...]
```

### Testing Requirements

**Unit Tests:**
```typescript
// Test: League filtering params correctly constructed
test('should include league param in event discovery URL', () => {
  const league = { sportSlug: 'soccer', leagueSlug: 'epl', enabled: true }
  const url = buildEventsUrl(league, 1)
  
  expect(url.searchParams.get('sport')).toBe('soccer')
  expect(url.searchParams.get('league')).toBe('epl')
  expect(url.searchParams.get('page')).toBe('1')
})

// Test: Multiple leagues result in multiple API calls
test('should fetch events for each enabled league', async () => {
  const leagues = [
    { sportSlug: 'soccer', leagueSlug: 'epl', enabled: true },
    { sportSlug: 'soccer', leagueSlug: 'laliga', enabled: true }
  ]
  const fetchSpy = vi.spyOn(global, 'fetch')
  
  await discoverEventsForEnabledLeagues(leagues, 'test-api-key')
  
  expect(fetchSpy).toHaveBeenCalledTimes(2)
  expect(fetchSpy).toHaveBeenCalledWith(
    expect.stringContaining('league=epl')
  )
  expect(fetchSpy).toHaveBeenCalledWith(
    expect.stringContaining('league=laliga')
  )
})
```

**Integration Tests:**
```typescript
// Test: Discovery traffic reduction with league filters
test('should reduce API calls when only subset of leagues enabled', async () => {
  // Mock: 5 leagues available, only 2 enabled
  const allLeagues = ['epl', 'laliga', 'bundesliga', 'seriea', 'ligue1']
  const enabledLeagues = ['epl', 'laliga']
  
  const beforeEvents = await fetchAllEventsForSport('soccer') // Fetches all 5 leagues
  const afterEvents = await discoverEventsForEnabledLeagues(enabledLeagues)
  
  // Verify: API calls reduced proportionally
  expect(apiCallCount).toBeLessThan(allLeagues.length)
})

// Test: Returned events are within enabled leagues only
test('should only return events from enabled leagues', async () => {
  const enabledLeagues = [{ sportSlug: 'soccer', leagueSlug: 'epl', enabled: true }]
  
  const events = await discoverEventsForEnabledLeagues(enabledLeagues, apiKey)
  
  for (const event of events) {
    expect(event.leagueSlug).toBe('epl')
  }
})
```

### Project Structure Notes

- **Source:** `src/main/services/deepScan.ts`
- **Settings Store:** `src/main/store/settings.ts` (or similar location for league config)
- **Types:** `shared/types.ts` (`DeepScanEvent`, `LeagueConfig`)
- **Tests:** `tests/9.6-api-side-league-filtering.test.cjs`

### API Documentation Reference

From `odds_api_io_docs_companion.md`:
- `/v3/events` endpoint supports `sport` and `league` query parameters
- `league` filter should use the canonical `leagueSlug` (not display name)
- Pagination uses numeric `nextPage` field in response

### Efficiency Gains Example

```
Scenario: User enables 2 out of 10 soccer leagues

Before (Client-Side):
- API Calls: 50 pages across all 10 leagues
- Events Received: 5,000
- Events After Filter: 1,000 (20% from enabled leagues)
- Efficiency: 20% (4,000 events wasted bandwidth)

After (API-Side):
- API Calls: 10 pages across 2 enabled leagues
- Events Received: 1,000
- Events After Filter: 1,000 (100% relevant)
- Efficiency: 100% (zero wasted bandwidth)
- Savings: 80% reduction in API quota usage
```

### References

- [Source: `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md#Story 9.6`]
- [Source: `src/main/services/deepScan.ts` - Event discovery functions]
- [Source: `odds_api_io_docs_companion.md` - API documentation]
- FR7 (Normalize responses)
- FR8 (API rate limiting)
- P1 Issue: Event discovery over-fetching

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Implemented `discoverEventsForEnabledLeagues()` in deepScan.ts with per-league API calls
- Added `league` parameter to `EventsFetcher` type and `defaultEventsFetcher` function
- Created `buildLeagueSportMap()` helper for mapping league slugs to sport slugs
- Code review: resolved league→sport mapping via `/v3/leagues?sport=...` (sports-filter aware); removed heuristic sport guessing
- Updated aggressiveScan.ts to use new API-side filtering instead of client-side filtering
- Removed TODO comment about Story 9.6 replacing client-side filtering
- Created comprehensive test suite with 9 test cases covering all acceptance criteria
- Validation (2026-02-03): `tsc -p tsconfig.storage-test.json` + `node --test tests/9.6-api-side-league-filtering.test.cjs`

### File List

- src/main/services/deepScan.ts (modified - per-league discovery; league→sport resolution via /v3/leagues; defensive leagueSlug filtering; test reset clears league caches)
- src/main/services/aggressiveScan.ts (modified - replaced client-side filtering with API-side filtering via discoverEventsForEnabledLeagues)
- tests/9.6-api-side-league-filtering.test.cjs (modified - updated /v3/leagues stub + mapping assertions)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified - story status synced)

## Change Log

- 2026-02-02: Story 9.6 created - Implement API-Side League Filtering for Event Discovery
- 2026-02-03: Story 9.6 implemented - API-side league filtering for event discovery
- 2026-02-03: Senior Developer Review (AI) - hardened league→sport resolution and corrected story record

## Senior Developer Review (AI)

Date: 2026-02-03

### Summary

- Removed heuristic sport guessing for league slugs; now resolves league→sport via `/v3/leagues?sport=...` using enabled sports context.
- Added defensive filtering to ensure returned events stay within enabled `leagueSlug` and have canonical `leagueSlug` populated.
- Fixed test harness to match `/v3/leagues` response shape (array) and made deep scan test reset clear cached leagues to avoid cross-test state bleed.
- Corrected story File List to match actual touched files (and included sprint-status sync).

### Validation

- `npm run typecheck`
- `tsc -p tsconfig.storage-test.json`
- `node --test tests/9.6-api-side-league-filtering.test.cjs`
