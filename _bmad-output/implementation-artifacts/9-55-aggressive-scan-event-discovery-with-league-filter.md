# Story 9.55: Wire Aggressive Scan Event Discovery with League Filtering

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want aggressive scan to discover and poll only events from my selected leagues,
so that the scan respects my filter preferences and doesn't waste quota on unwanted leagues.

## Acceptance Criteria

1. [ ] Aggressive scan fetches events from the API on startup (AC: 1)
2. [ ] Events are filtered by the enabled leagues from `enabledLeaguesFilter` (AC: 2)
3. [ ] Discovered events are populated into the tier cache based on kickoff time (AC: 3)
4. [ ] Event discovery runs periodically (configurable interval, default 10 minutes) (AC: 4)
5. [ ] When league filter changes, tier cache is refreshed with new selection (AC: 5)
6. [ ] Aggressive scan only polls events from user-selected leagues (AC: 6)

## Tasks / Subtasks

- [ ] Task 1: Add event discovery to aggressive scan startup (AC: 1, 3)
  - [ ] Import `discoverEvents()` from `deepScan.ts`
  - [ ] Call discovery on `startAggressiveScan()`
  - [ ] Populate tier cache using `upsertTieredEvent()` for each discovered event
  - [ ] Log discovery results (event count, tier distribution)
- [ ] Task 2: Integrate league filtering with aggressive scan (AC: 2, 6)
  - [ ] Import `getEnabledLeaguesFilter()` from `deepScan.ts`
  - [ ] Filter discovered events by enabled leagues before populating tier cache
  - [ ] Handle empty filter (no leagues enabled) gracefully - skip discovery
- [ ] Task 3: Implement periodic event re-discovery (AC: 4)
  - [ ] Add `EVENT_DISCOVERY_INTERVAL_MS` constant (default 10 minutes)
  - [ ] Create `eventDiscoveryTimer` interval in `startAggressiveScan()`
  - [ ] Clear timer in `stopAggressiveScan()`
  - [ ] Re-discover events and update tier cache on each interval
- [ ] Task 4: Handle league filter changes (AC: 5)
  - [ ] Export `refreshAggressiveScanEvents()` function
  - [ ] Call from router when `setEnabledLeaguesFilter()` is invoked during active scan
  - [ ] Clear tier cache and re-populate with new league selection
- [ ] Task 5: Testing (AC: 1-6)
  - [ ] Test: Discovery populates tier cache on startup
  - [ ] Test: Only events from enabled leagues are added to tier cache
  - [ ] Test: Periodic re-discovery updates tier cache
  - [ ] Test: League filter change triggers cache refresh

## Dev Notes

### Background

The aggressive scan infrastructure (tiering, polling, odds fetching) was implemented in Story 8.7 and 9.5, but **event discovery was never wired**. The tier cache starts empty and stays empty because nothing populates it.

This story connects aggressive scan to the existing event discovery infrastructure in `deepScan.ts` and ensures the league filter is respected.

### Architecture Context

**⚠️ CRITICAL: The Gap Being Fixed**

```
┌─────────────────────────────────────────────────────────────────────┐
│  BEFORE (Broken)                                                    │
│  ├── startAggressiveScan() → Initializes empty tier cache           │
│  ├── pollTier() → Tries to poll events from empty cache             │
│  └── Result: No events ever polled, aggressive scan does nothing    │
├─────────────────────────────────────────────────────────────────────┤
│  AFTER (Fixed)                                                      │
│  ├── startAggressiveScan() → Calls discoverEvents()                 │
│  ├── Filter by enabledLeaguesFilter → Only selected leagues         │
│  ├── Populate tier cache with upsertTieredEvent()                   │
│  ├── pollTier() → Polls actual events from populated cache          │
│  └── Result: Aggressive scan polls user-selected leagues only       │
└─────────────────────────────────────────────────────────────────────┘
```

**Target File:** `src/main/services/aggressiveScan.ts`

**Key Imports to Add:**
```typescript
// From deepScan.ts
import {
  discoverEvents,
  getEnabledLeaguesFilter,
  type DeepScanEvent
} from './deepScan'
```

**Existing Functions to Use:**
```typescript
// Already in aggressiveScan.ts
export function upsertTieredEvent(event: DeepScanEvent, now: number = Date.now()): TieredEvent
export function createTieredEvent(event: DeepScanEvent, now: number = Date.now()): TieredEvent
export function isPreMatchEvent(event: DeepScanEvent, now: number = Date.now()): boolean
```

### Implementation Requirements

**Event Discovery on Startup:**
```typescript
// Add to startAggressiveScan() after initTierCache()
async function discoverAndPopulateEvents(): Promise<number> {
  const apiKey = await getApiKeyForAdapter('odds-api-io')
  if (!apiKey) {
    logWarn('aggressiveScan.discovery.noApiKey', { ... })
    return 0
  }

  // Get enabled leagues filter
  const enabledLeagues = getEnabledLeaguesFilter()
  if (enabledLeagues.length === 0) {
    logInfo('aggressiveScan.discovery.noLeaguesEnabled', { ... })
    return 0
  }

  // Discover events from API
  const allEvents = await discoverEvents({
    apiKey,
    signal: abortController!.signal,
    correlationId: correlationId!
  })

  // Filter by enabled leagues
  const leagueSet = new Set(enabledLeagues.map(l => l.toLowerCase()))
  const filteredEvents = allEvents.filter(event => {
    const eventLeague = (event.leagueSlug || event.league || '').toLowerCase()
    return leagueSet.has(eventLeague)
  })

  // Filter to pre-match events only
  const now = Date.now()
  const preMatchEvents = filteredEvents.filter(e => isPreMatchEvent(e, now))

  // Populate tier cache
  for (const event of preMatchEvents) {
    upsertTieredEvent(event, now)
  }

  logInfo('aggressiveScan.discovery.complete', {
    context: 'service:aggressiveScan',
    operation: 'discoverAndPopulateEvents',
    providerId: 'odds-api-io',
    correlationId,
    durationMs: null,
    errorCategory: null,
    totalDiscovered: allEvents.length,
    afterLeagueFilter: filteredEvents.length,
    afterPreMatchFilter: preMatchEvents.length,
    tierDistribution: getEventCountsByTier()
  })

  return preMatchEvents.length
}
```

**Periodic Re-Discovery:**
```typescript
// Add constant
const EVENT_DISCOVERY_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

// Add state
let eventDiscoveryTimer: ReturnType<typeof setInterval> | null = null

// In startAggressiveScan():
eventDiscoveryTimer = setInterval(async () => {
  if (!isRunning) return
  await discoverAndPopulateEvents()
}, EVENT_DISCOVERY_INTERVAL_MS)

// In stopAggressiveScan():
if (eventDiscoveryTimer) {
  clearInterval(eventDiscoveryTimer)
  eventDiscoveryTimer = null
}
```

**League Filter Change Handler:**
```typescript
export async function refreshAggressiveScanEvents(): Promise<void> {
  if (!isRunning) return

  // Clear existing tier cache
  initTierCache()

  // Re-discover with new filter
  await discoverAndPopulateEvents()

  // Re-initialize quota budget with new event counts
  initQuotaBudget()

  logInfo('aggressiveScan.events.refreshed', { ... })
}
```

**Router Integration:**
```typescript
// In router.ts setEnabledLeaguesFilter handler
setEnabledLeaguesFilter: t.procedure
  .input(z.object({ leagues: z.array(z.string()) }))
  .mutation(async ({ input }) => {
    setEnabledLeaguesFilter(input.leagues)

    // Refresh aggressive scan if running
    if (isAggressiveScanRunning()) {
      await refreshAggressiveScanEvents()
    }

    return { ok: true }
  })
```

### Cross-Story Dependencies

**Previous stories that must be complete:**
- Story 8.7: Aggressive Pre-Match Scanning - Tier cache infrastructure
- Story 9.5: Wire Aggressive Scan to /v3/odds/multi - Odds fetching (DONE)
- Story 7.9: Sport/League Filter Configuration - League filter UI and storage

**Concurrent/Future stories:**
- Story 9.6: API-Side League Filtering - Will improve discovery efficiency
  - Note: This story uses client-side filtering. Story 9.6 will improve this to API-side filtering.
  - This story should work before and after 9.6 is implemented.

**Integration Points:**
- Uses `discoverEvents()` from `deepScan.ts`
- Uses `getEnabledLeaguesFilter()` from `deepScan.ts`
- Uses `upsertTieredEvent()` already in `aggressiveScan.ts`
- Modifies `startAggressiveScan()` in `aggressiveScan.ts`
- Modifies router to call `refreshAggressiveScanEvents()` on filter change

### Testing Requirements

**Unit Tests:**
```typescript
// Test: Discovery populates tier cache
test('should populate tier cache from discovered events', async () => {
  const mockEvents = createMockEvents(50)
  vi.spyOn(deepScan, 'discoverEvents').mockResolvedValue(mockEvents)
  vi.spyOn(deepScan, 'getEnabledLeaguesFilter').mockReturnValue(['test-league'])

  await startAggressiveScan()

  const totalEvents = getTotalEventCount()
  expect(totalEvents).toBeGreaterThan(0)
})

// Test: Only enabled leagues are added
test('should filter events by enabled leagues', async () => {
  const events = [
    { id: '1', leagueSlug: 'epl', ... },
    { id: '2', leagueSlug: 'laliga', ... },
    { id: '3', leagueSlug: 'bundesliga', ... }
  ]
  vi.spyOn(deepScan, 'discoverEvents').mockResolvedValue(events)
  vi.spyOn(deepScan, 'getEnabledLeaguesFilter').mockReturnValue(['epl'])

  await startAggressiveScan()

  const totalEvents = getTotalEventCount()
  expect(totalEvents).toBe(1) // Only EPL event
})

// Test: League filter change refreshes cache
test('should refresh tier cache when league filter changes', async () => {
  await startAggressiveScan()
  const initialCount = getTotalEventCount()

  // Change filter
  vi.spyOn(deepScan, 'getEnabledLeaguesFilter').mockReturnValue(['new-league'])
  await refreshAggressiveScanEvents()

  // Cache should be different
  // (exact assertion depends on mock data)
})
```

### Project Structure Notes

- **Source:** `src/main/services/aggressiveScan.ts`
- **Integration:** `src/main/services/router.ts`
- **Dependency:** `src/main/services/deepScan.ts` (discoverEvents, getEnabledLeaguesFilter)
- **Tests:** `tests/9.55-aggressive-scan-event-discovery.test.cjs`

### FAQ

**Q: What happens if no leagues are enabled?**

**A:** The aggressive scan will start but skip event discovery. The tier cache remains empty, and polling loops will have no events to poll. A log message indicates no leagues are enabled.

**Q: What happens when the user changes league selection mid-scan?**

**A:** The `refreshAggressiveScanEvents()` function is called from the router. It clears the tier cache, re-discovers events with the new filter, and re-initializes the quota budget.

**Q: Does this story need Story 9.6 (API-side filtering) first?**

**A:** No. This story uses client-side filtering (fetch all events, then filter by league). Story 9.6 will improve efficiency by filtering at the API level, but this story works independently.

---

### References

- [Source: `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md`]
- [Source: `src/main/services/aggressiveScan.ts` - startAggressiveScan(), upsertTieredEvent()]
- [Source: `src/main/services/deepScan.ts` - discoverEvents(), getEnabledLeaguesFilter()]
- FR6 (Calculate local arbs)
- FR8 (API rate limiting)
- FR15 (Deep Scan all markets)
- P0 Issue: Aggressive scan tier cache never populated

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-02-02: Story 9.55 created - Wire aggressive scan event discovery with league filtering
