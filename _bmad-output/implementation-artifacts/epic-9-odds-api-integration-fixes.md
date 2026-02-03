# Epic 9: Odds-API.io Integration Fixes & Compliance

**Goal:** Ensure the app implements Odds-API.io correctly (endpoints, parameters, limits, rate limiting), improves correctness (no false arbs), and improves efficiency (fewer wasted requests).

**Author:** John (Product Manager)  
**Date:** February 2, 2026  
**Priority:** P0 - Critical  
**Estimated Duration:** 3 weeks

**Non-goals (for now):**
- Implementing 3-way (1X2) arbitrage (optional later).
- WebSocket streaming (optional later).

------------------------------------------------------------------------

## Overview

This epic addresses critical correctness blockers and API compliance gaps identified in the current Odds-API.io integration. These fixes are essential to prevent false arbitrage signals, ensure API contract compliance, and maximize scanning efficiency within rate limits.

Refer to: [text](../../odds_api_io_docs_companion.md)
### Key Odds-API.io Constraints (from docs)

- `/v3/odds/multi`: up to **10** eventIds per request; `bookmakers` supports up to **30** comma-separated entries.
- `/v3/odds/updated`: requires **UNIX timestamp** `since` (max ~**1 minute** old), **singular** `bookmaker`, and **required** `sport`.
- `/v3/arbitrage-bets`: supports `bookmakers` filtering; use a curated list of bookmakers instead of "all".
- Handle HTTP **429** with `Retry-After` when provided and backoff otherwise.
- Never expose `apiKey` in browser code; proxy via backend.

### Context

The current implementation has several issues that threaten the app's core value proposition:
1. **False arbitrage opportunities** due to event key collisions (same teams, different leagues)
2. **API endpoint misconfiguration** (wrong host for arbitrage endpoint)
3. **Inefficient API usage** leading to quota waste
4. **Missing rate limit handling** causing prolonged degraded states

------------------------------------------------------------------------

## FR Coverage

| Epic | Covers |
|------|--------|
| Epic 9 — Odds-API.io Integration Fixes | FR5, FR6, FR7, FR8 |

## Architecture Touchpoints

- **Main:** `src/main/adapters/odds-api-io.ts`, `src/main/services/deepScan.ts`, `src/main/services/eventMatcher.ts`, `src/main/services/poller.ts`
- **Shared:** `shared/types.ts` (`DeepScanEvent`, `ArbitrageOpportunity`)
- **Architecture refs:** "High-Risk Domain Patterns – Rate Limiting (R-001)", "High-Risk Domain Patterns – Arbitrage Correctness (R-002)"

------------------------------------------------------------------------

# Story 9.1: Fix Arbitrage Endpoint Host Configuration

**As a** User  
**I want** the arbitrage endpoint to use the correct API host with safe fallback  
**So that** arbitrage opportunities are reliably retrieved without endpoint failures.

## Background

The code currently uses `https://api.odds-api.io` for arbitrage, but internal guidance and API documentation indicate that `/v3/arbitrage-bets` should be served from `https://api2.odds-api.io`. This discrepancy may cause the endpoint to fail or return wrong/empty responses.

## Acceptance Criteria

- [ ] Add separate configurable host for arbitrage: `ODDS_API_IO_ARBS_HOST` (default: `https://api2.odds-api.io`)
- [ ] Implement safe fallback to `https://api.odds-api.io` **only** on network error, 404, or selected 5xx responses
- [ ] **Do not** fallback on 400/401/403/429 errors
- [ ] All fallback events are logged with clear context
- [ ] Arbitrage endpoint works reliably on the configured host

## Technical Notes

**Files to modify:**
- `src/main/adapters/odds-api-io.ts`

**Implementation sketch:**
```typescript
const ARB_HOST = process.env.ODDS_API_IO_ARBS_HOST || 'https://api2.odds-api.io'
const FALLBACK_HOST = 'https://api.odds-api.io'

async function fetchArbitrageBets(bookmakers: string[]): Promise<ArbitrageOpportunity[]> {
  const primaryUrl = `${ARB_HOST}/v3/arbitrage-bets?bookmakers=${bookmakers.join(',')}`
  try {
    return await fetchWithAuth(primaryUrl)
  } catch (error) {
    if (isSafeToFallback(error)) {
      log.warn(`Arbitrage host failed, falling back to ${FALLBACK_HOST}`, { error: error.message })
      const fallbackUrl = `${FALLBACK_HOST}/v3/arbitrage-bets?bookmakers=${bookmakers.join(',')}`
      return await fetchWithAuth(fallbackUrl)
    }
    throw error
  }
}

function isSafeToFallback(error: ApiError): boolean {
  // Safe: network errors, 404, 502, 503, 504
  // NOT safe: 400, 401, 403, 429
  if (!error.statusCode) return true // Network error
  return [404, 502, 503, 504].includes(error.statusCode)
}
```

## Links

- FR5 (Retrieve pre-calculated bets)
- FR7 (Normalize responses)
- P0 Issue: Arbitrage base URL discrepancy

------------------------------------------------------------------------

# Story 9.2: Add Canonical Fields to Event Model

**As a** Developer  
**I want** events to store canonical identity fields (slugs, epoch timestamps)  
**So that** cross-provider matching is reliable and collision-resistant.

## Background

The current `extractEvents()` function prefers `league.name` over `league.slug`. This causes deduplication and cross-provider matching to be unreliable, as display names vary (e.g., "EPL" vs "Premier League"). Additionally, the current event key uses hour-truncated dates which causes collisions for cup vs league matches with the same teams.

## Acceptance Criteria

- [ ] Extend `DeepScanEvent` type with:
  - `leagueSlug?: string` - canonical league identifier
  - `league?: string` - display name (human-readable)
  - `sportSlug?: string` - canonical sport identifier
  - `sport?: string` - display name (human-readable)
  - `kickoffEpochMs?: number` - canonical numeric timestamp (milliseconds)
- [ ] All discovered events have `sportSlug` and `leagueSlug` when the API returns them
- [ ] `kickoffEpochMs` is populated for valid kickoff timestamps
- [ ] Invalid dates result in `undefined` `kickoffEpochMs` but event remains processable

## Technical Notes

**Files to modify:**
- `src/main/services/deepScan.ts` (extend `DeepScanEvent` interface)
- `shared/types.ts` (if type is defined there)

**Interface extension:**
```typescript
interface DeepScanEvent {
  // ... existing fields ...
  
  // Canonical identity fields
  leagueSlug?: string
  league?: string
  sportSlug?: string
  sport?: string
  kickoffEpochMs?: number
}
```

**Extraction logic:**
```typescript
function extractCanonicalFields(apiEvent: ApiEvent): Partial<DeepScanEvent> {
  return {
    leagueSlug: apiEvent.league?.slug,
    league: apiEvent.league?.name,
    sportSlug: apiEvent.sport?.slug,
    sport: apiEvent.sport?.name,
    kickoffEpochMs: apiEvent.kickoff ? Date.parse(apiEvent.kickoff) : undefined
  }
}
```

## Tests

- Unit: Parse `league` object with `{name, slug}` → both stored; slug is used for identity
- Unit: Invalid date → `kickoffEpochMs` undefined and event remains processable

## Links

- FR7 (Normalize responses)
- P0 Issue: League identity stored as display name only
- P0 Issue: Event key collisions

------------------------------------------------------------------------

# Story 9.3: Fix Event Extraction Priority (Slug-First)

**As a** Developer  
**I want** slug fields to take priority over display names for identity  
**So that** league and sport matching is deterministic across providers.

## Background

When league/sport candidates are objects from the API, the slug should become the canonical identity while the name becomes the display value. When only a string exists, store it as display and do not guess the slug unless a deterministic mapping exists.

## Acceptance Criteria

- [ ] When league/sport candidates are objects:
  - `slug` becomes identity field
  - `name` becomes display field
- [ ] When only a string exists:
  - Store as display field
  - Do not guess slug unless deterministic mapping available from `/leagues` endpoint
- [ ] League slug is never overwritten by display name
- [ ] Sport slug is never overwritten by display name

## Technical Notes

**Files to modify:**
- `src/main/services/deepScan.ts` (`extractEvents()` function)

**Implementation sketch:**
```typescript
function extractLeagueInfo(leagueData: string | { name: string; slug: string } | undefined): { slug?: string; name?: string } {
  if (!leagueData) return {}
  
  if (typeof leagueData === 'string') {
    return { name: leagueData } // No slug unless mapped
  }
  
  return {
    slug: leagueData.slug,  // Identity
    name: leagueData.name   // Display
  }
}
```

## Links

- FR7 (Normalize responses)
- Story 9.2 (Add Canonical Fields to Event Model)
- P0 Issue: League identity stored as display name only

------------------------------------------------------------------------

# Story 9.4: Implement Strict Event Key Generation

**As a** Developer  
**I want** collision-resistant event keys using slugs and minute precision  
**So that** cup vs league matches with the same teams do not produce false joins.

## Background

The current event key format `teamA|teamB|hour` causes collisions when:
- Same teams play in different competitions on the same day
- Matches are rescheduled within the same hour
- Multi-competition fixtures overlap

This leads to **false arbitrage opportunities** that could result in financial losses.

## Acceptance Criteria

- [ ] New strict key format: `sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin`
- [ ] Minute precision: `kickoffMin = floor(kickoffEpochMs / 60000)`
- [ ] **Strict mode requirement:** If `sportSlug` or `leagueSlug` is missing → return `null` (event not joinable across providers)
- [ ] No `'unknown'` placeholders are used in strict key generation
- [ ] Cup vs league matches with same teams/time produce different keys
- [ ] Normalized team names (lowercase, trimmed) for consistent matching

## Technical Notes

**Files to modify:**
- `src/main/services/eventMatcher.ts`

**Implementation sketch:**
```typescript
const STRICT_MODE = true // Configurable

function generateStrictEventKey(event: DeepScanEvent): string | null {
  if (STRICT_MODE) {
    if (!event.sportSlug || !event.leagueSlug) {
      return null // Not joinable across providers
    }
  }
  
  const teamA = normalizeTeamName(event.homeTeam)
  const teamB = normalizeTeamName(event.awayTeam)
  const [t1, t2] = [teamA, teamB].sort() // Deterministic ordering
  
  const kickoffMin = event.kickoffEpochMs 
    ? Math.floor(event.kickoffEpochMs / 60000)
    : 'unknown'
  
  if (kickoffMin === 'unknown' && STRICT_MODE) {
    return null
  }
  
  return `${event.sportSlug}|${event.leagueSlug}|${t1}|${t2}|${kickoffMin}`
}

function normalizeTeamName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}
```

## Tests

- Unit: Two different `leagueSlug` values produce different keys
- Unit: Same match with kickoff time within the same minute produces same key
- Regression: Previously colliding fixtures no longer collide
- Unit: Missing sportSlug/leagueSlug in strict mode returns null

## Links

- FR7 (Normalize responses)
- Story 9.2 (Add Canonical Fields to Event Model)
- P0 Issue: Event key collisions
- Risk: R-002 (Arbitrage Correctness)

------------------------------------------------------------------------

# Story 9.5: Wire Aggressive Scan to /v3/odds/multi Batching

**As a** User  
**I want** aggressive scan to use batch odds fetching  
**So that** scanning is 10x more efficient within API rate limits.

## Background

The aggressive scan tiering exists but odds fetching was previously a placeholder. This story wires the aggressive scan to use `/v3/odds/multi` with proper batching (10 events per request) and keeps real `DeepScanEvent` objects (not `{name: id}` placeholders).

## Acceptance Criteria

- [ ] Aggressive scan uses `/v3/odds/multi` endpoint
- [ ] Batch size limited to **10** events per request (API maximum)
- [ ] `bookmakers` list is cached with TTL (>= 1 minute, recommend 5-10 minutes)
- [ ] Events passed to fetcher are real `DeepScanEvent` objects, not placeholders
- [ ] Aggressive scan produces odds requests and updates caches/arbs for tiered events
- [ ] Requests are batched at 10 events wherever possible

## Technical Notes

**Files to modify:**
- `src/main/services/aggressiveScan.ts`

**Implementation sketch:**
```typescript
const BATCH_SIZE = 10
const BOOKMAKER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function fetchOddsForEvents(events: DeepScanEvent[]): Promise<RawOddsPayload[]> {
  const results: RawOddsPayload[] = []
  
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE)
    const eventIds = batch.map(e => e.id).join(',')
    const bookmakers = await getCachedBookmakers()
    
    const response = await fetch(`/v3/odds/multi?eventIds=${eventIds}&bookmakers=${bookmakers}`)
    results.push(...normalizeMultiOddsResponse(response))
  }
  
  return results
}
```

## Tests

- Integration: With 23 events in a tier → exactly 3 multi calls (10/10/3)
- Functional: Arbs are computed and surfaced from aggressive scan results

## Links

- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)
- P0 Issue: Aggressive scan partially wired

------------------------------------------------------------------------

# Story 9-5.5: Wire Aggressive Scan Event Discovery with League Filtering

**As a** User  
**I want** aggressive scan to discover and poll only events from my selected leagues  
**So that** the scan respects my filter preferences and doesn't waste quota on unwanted leagues and sports.

## Background

The aggressive scan infrastructure (tiering, polling, odds fetching) was implemented in Story 8.7 and 9.5, but **event discovery was never wired**. The tier cache starts empty and stays empty because nothing populates it.

This story connects aggressive scan to the existing event discovery infrastructure in `deepScan.ts` and ensures the league filter is respected.

## Acceptance Criteria

- [ ] Aggressive scan fetches events from the API on startup
- [ ] Events are filtered by the enabled leagues from `enabledLeaguesFilter`
- [ ] Discovered events are populated into the tier cache based on kickoff time
- [ ] Event discovery runs periodically (configurable interval, default 10 minutes)
- [ ] When league filter changes, tier cache is refreshed with new selection
- [ ] Aggressive scan only polls events from user-selected sports and leagues

## Technical Notes

**Target File:** `src/main/services/aggressiveScan.ts`

**Key Functions:**
- Import `discoverEvents()`, `getEnabledLeaguesFilter()` from `deepScan.ts`
- Use existing `upsertTieredEvent()` to populate tier cache
- Export `refreshAggressiveScanEvents()` for filter change handling

**Implementation Highlights:**
```typescript
// On startup: discover → filter by enabled leagues → populate tier cache
// Periodic: Re-discover every 10 minutes (configurable)
// On filter change: Clear cache, re-discover with new filter
```

## Tests

- Unit: Discovery populates tier cache on startup
- Unit: Only events from enabled leagues are added
- Unit: Periodic re-discovery updates tier cache
- Unit: League filter change triggers cache refresh

## Links

- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)
- Story 9.5 (Aggressive scan batching - prerequisite)
- Story 9.6 (API-side filtering - future optimization)
- P0 Issue: Aggressive scan tier cache never populated

------------------------------------------------------------------------

# Story 9.6: Implement API-Side League Filtering for Event Discovery

**As a** System  
**I want** to filter events by league at the API level  
**So that** discovery traffic is reduced proportionally with league filters.

## Background

Currently, the app fetches `/v3/events` by sport and filters leagues client-side. This causes higher quota usage, slower discovery, and more events in tiers than needed.

## Acceptance Criteria

- [ ] Instead of fetching all events for a sport, call `/v3/events?sport=...&league=...` per enabled `leagueSlug`
- [ ] Use best supported filter pattern from API docs
- [ ] Keep pagination handling (numeric `nextPage`) but reduce total pages fetched
- [ ] Discovery traffic drops proportionally with league filters
- [ ] Returned events are already within enabled leagues

## Technical Notes

**Files to modify:**
- `src/main/services/deepScan.ts` (event discovery functions)

**Implementation sketch:**
```typescript
async function discoverEventsForEnabledLeagues(enabledLeagues: LeagueConfig[]): Promise<DeepScanEvent[]> {
  const allEvents: DeepScanEvent[] = []
  
  for (const league of enabledLeagues) {
    let nextPage: number | null = 1
    
    while (nextPage) {
      const response = await fetch(
        `/v3/events?sport=${league.sportSlug}&league=${league.leagueSlug}&page=${nextPage}`
      )
      
      const { events, nextPage: newNextPage } = await response.json()
      allEvents.push(...events.map(extractEvents))
      nextPage = newNextPage
    }
  }
  
  return allEvents
}
```

## Links

- FR7 (Normalize responses)
- FR8 (API rate limiting)
- P1 Issue: Event discovery over-fetching

------------------------------------------------------------------------

# Story 9.7: Implement Full Retry-After Rate Limit Handling

**As a** System  
**I want** to respect the `Retry-After` header on HTTP 429 responses  
**So that** rate limit recovery is optimal and retry bursts are avoided.

## Background

The current exponential backoff exists but is missing robust `Retry-After` support in all paths. This causes prolonged "degraded" states and wasted retries.

## Acceptance Criteria

- [ ] On HTTP 429:
  - Use `Retry-After` if present (supports both integer seconds and HTTP-date format)
  - Else use exponential backoff with jitter
- [ ] Applied where responses are handled (not just thrown exceptions)
- [ ] 429 triggers cooldown until the header/backoff expires
- [ ] No immediate re-burst after cooldown period

## Technical Notes

**Files to modify:**
- `src/main/services/poller.ts`

**Implementation sketch:**
```typescript
async function handleRateLimitedResponse(response: Response): Promise<number> {
  const retryAfter = response.headers.get('Retry-After')
  
  if (retryAfter) {
    // Try parsing as integer (seconds)
    const seconds = parseInt(retryAfter, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }
    
    // Try parsing as HTTP-date
    const date = new Date(retryAfter)
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now())
    }
  }
  
  // Fall back to exponential backoff
  return calculateExponentialBackoff(attemptCount)
}

function calculateExponentialBackoff(attempt: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 60000 // 1 minute
  const jitter = Math.random() * 1000
  
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay) + jitter
}
```

## Tests

- Unit: `Retry-After: 10` → cooldown 10s
- Unit: `Retry-After: Wed, 02 Feb 2026 10:00:00 GMT` → computed delta

## Links

- FR8 (API rate limiting)
- P1 Issue: Rate limit handling does not fully respect `Retry-After`

------------------------------------------------------------------------

# Story 9.8: Preserve Negative ROI for Analytics (Internal)

**As a** Developer  
**I want** to preserve negative ROI values internally  
**So that** "near arbs" can be analyzed for debugging and opportunity spotting.

## Background

Currently, ROI is clamped to 0 for negative values. This is good for UI display but lossy for analytics and debugging potential arbitrage opportunities that are close to profitable.

## Acceptance Criteria

- [ ] Arbitrage calculator returns true ROI (can be negative) for internal storage
- [ ] UI can display `max(0, roi)` if desired for user-facing views
- [ ] Internal analytics/logging include raw ROI values
- [ ] No breaking changes to existing positive ROI display logic

## Technical Notes

**Files to modify:**
- Arbitrage calculator (location TBD based on existing code)
- Output formatting layer

**Implementation sketch:**
```typescript
interface ArbitrageCalculation {
  rawRoi: number // Can be negative
  displayRoi: number // max(0, rawRoi) for UI
  // ... other fields
}

function calculateArbitrage(legs: ArbitrageLeg[]): ArbitrageCalculation {
  const impliedProbability = legs.reduce((sum, leg) => sum + 1/leg.odds, 0)
  const rawRoi = (1 - impliedProbability) * 100
  
  return {
    rawRoi,
    displayRoi: Math.max(0, rawRoi),
    // ...
  }
}
```

## Links

- FR6 (Calculate local arbs)
- P2 Issue: ROI clamps negative values to 0

------------------------------------------------------------------------

# Story 9.9: Add Odds Format Guardrails

**As a** System  
**I want** to validate and flag unexpected odds formats  
**So that** American odds or malformed values don't break implied probability calculations.

## Background

The current implementation assumes decimal odds. American odds (e.g., +150, -200) or other formats would break the implied probability calculation.

## Acceptance Criteria

- [ ] Add sanity checks in odds parsing layer:
  - Reject odds < 1.01 (invalid for decimal format)
  - Warn/flag odds values that look like American odds (abs(odds) > 20 and integer-like)
- [ ] Mark unsupported formats as "unsupported format" unless explicitly normalized
- [ ] Invalid odds are logged and skipped, not used in arbitrage calculations
- [ ] System continues operating when encountering malformed odds

## Technical Notes

**Implementation sketch:**
```typescript
function validateOddsFormat(odds: number): { valid: boolean; warning?: string } {
  // Decimal odds must be >= 1.01
  if (odds < 1.01) {
    return { valid: false, warning: `Invalid decimal odds: ${odds} (< 1.01)` }
  }
  
  // American odds detection heuristic
  if (Math.abs(odds) > 20 && Number.isInteger(odds)) {
    return { 
      valid: false, 
      warning: `Possible American odds detected: ${odds}. Decimal odds required.` 
    }
  }
  
  return { valid: true }
}
```

## Links

- FR7 (Normalize responses)
- P2 Issue: Odds format assumption

------------------------------------------------------------------------

# Story 9.10: (Optional) Implement /v3/odds/updated Correctly

**As a** Developer  
**I want** to use incremental odds updates via `/v3/odds/updated`  
**So that** quota usage is minimized when tracking odds changes.

## Background

**Note:** This is optional and should only be implemented after `/v3/odds/multi` is stable. Multi-sport concurrent mode makes `/updated` N(bookmakers) × M(sports), which may not be efficient. Start with `/multi`.

If implemented, it must be doc-correct.

## Acceptance Criteria

- [ ] Params are correct:
  - `since` = UNIX integer (seconds), not ISO
  - `bookmaker` = singular (not array)
  - `sport` = required
- [ ] Cursor is tracked per **(sportSlug, bookmaker)** key
- [ ] Cursor set to `requestStartSec - 1` (small overlap)
- [ ] Stale detection: if `nowSec - since > 55`, fall back to snapshots (`/multi`) for that sport
- [ ] Incremental results are filtered to tracked eventIds for that sport/tier
- [ ] `/updated` requests never omit `sport` and never pass ISO timestamps

## Technical Notes

**Implementation sketch:**
```typescript
interface OddsUpdatedCursor {
  sportSlug: string
  bookmaker: string
  lastTimestampSec: number
}

async function fetchOddsUpdated(cursor: OddsUpdatedCursor): Promise<OddsUpdate[]> {
  const nowSec = Math.floor(Date.now() / 1000)
  
  // Check staleness
  if (nowSec - cursor.lastTimestampSec > 55) {
    // Fall back to full snapshot
    return fetchOddsMultiForSport(cursor.sportSlug)
  }
  
  const response = await fetch(
    `/v3/odds/updated?since=${cursor.lastTimestampSec}&bookmaker=${cursor.bookmaker}&sport=${cursor.sportSlug}`
  )
  
  // Update cursor with request start time minus 1 second overlap
  cursor.lastTimestampSec = nowSec - 1
  
  return response.json()
}
```

## Links

- FR8 (API rate limiting)
- P1 Issue: `/v3/odds/updated` incorrect usage

------------------------------------------------------------------------

## Implementation Order (Recommended)

### Week 1: P0 Correctness (Critical)
1. **Story 9.1** - Fix Arbitrage Endpoint Host Configuration
2. **Story 9.2** - Add Canonical Fields to Event Model
3. **Story 9.3** - Fix Event Extraction Priority (Slug-First)
4. **Story 9.4** - Implement Strict Event Key Generation
5. Add regression tests for collision scenarios

### Week 2: P1 Efficiency + Wiring (High Value)
6. **Story 9.5** - Wire Aggressive Scan to `/v3/odds/multi` Batching
7. **Story 9-5.5** - Wire Aggressive Scan Event Discovery with League Filtering
8. **Story 9.6** - Implement API-Side League Filtering
8. **Story 9.7** - Implement Full Retry-After Rate Limit Handling

### Week 3: P2 Quality Improvements (Nice to Have)
9. **Story 9.8** - Preserve Negative ROI for Analytics
10. **Story 9.9** - Add Odds Format Guardrails
11. **Story 9.10** - (Optional) Implement `/v3/odds/updated` Correctly

------------------------------------------------------------------------

## Acceptance Criteria Summary

### Correctness
- [ ] No false cross-provider joins due to league/time collisions
- [ ] Strict mode requires slugs; no placeholder "unknown" IDs used in joining
- [ ] Aggressive scan actually fetches and processes odds
- [ ] Arbitrage endpoint uses correct host with safe fallback

### API Compliance
- [ ] `/odds/multi` uses ≤10 eventIds per request and ≤30 bookmakers
- [ ] `/odds/updated` (if used) uses UNIX `since`, singular `bookmaker`, and required `sport`
- [ ] 429 respects `Retry-After`

### Efficiency
- [ ] Event discovery does not over-fetch across leagues
- [ ] Aggressive scan is quota-efficient via batching and caching

------------------------------------------------------------------------

## Test Coverage Requirements

| Story | Unit Tests | Integration Tests |
|-------|-----------|-------------------|
| 9.1 | Fallback logic, host config | Endpoint switching under failure |
| 9.2 | Field extraction, date parsing | End-to-end event creation |
| 9.3 | Slug priority, string fallback | Cross-provider matching |
| 9.4 | Key collision scenarios, strict mode | Regression: previously colliding fixtures |
| 9.5 | Batch construction | 23 events → 3 calls verification |
| 9-5.5 | Discovery filtering, cache refresh | Tier cache population, filter change handling |
| 9.6 | League filtering params | Discovery traffic reduction |
| 9.7 | Retry-After parsing (both formats) | Rate limit recovery behavior |
| 9.8 | ROI calculation preservation | Analytics data integrity |
| 9.9 | Odds validation, format detection | Malformed odds handling |

------------------------------------------------------------------------

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Strict mode breaks existing matching | High | Feature flag with gradual rollout |
| Batch API has different response shape | Medium | Extensive testing with real API responses |
| Retry-After format inconsistencies | Low | Defensive parsing with fallback |
| League filtering reduces coverage too much | Medium | Monitor event counts, allow "all leagues" fallback |

------------------------------------------------------------------------

## Notes for Future Enhancements

- Add 3-way (1X2) arbitrage calculator for soccer if needed
- Consider WebSocket updates if supported by plan and stable
- Dynamic rate limit tracking using `X-RateLimit-*` headers

------------------------------------------------------------------------

## FR Coverage Matrix

| Requirement | Story |
|-------------|-------|
| FR5 | 9.1, 9.5 |
| FR6 | 9.5, 9-5.5, 9.8 |
| FR7 | 9.2, 9.3, 9.4, 9.6, 9.9 |
| FR8 | 9.5, 9.7, 9.10 |
