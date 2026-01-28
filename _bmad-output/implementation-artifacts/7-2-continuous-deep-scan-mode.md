# Story 7.2: Continuous Deep Scan Mode (Event Discovery)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a User,
I want Deep Scan to run automatically and continuously,
so that I never miss arbitrage opportunities across any market without manual intervention.

## Acceptance Criteria

1. **Continuous Deep Scan toggle** - A "Continuous Deep Scan" toggle exists in Settings (default: **ON**)

2. **Automatic triggering** - When enabled, Deep Scan runs automatically after each regular poll cycle completes

3. **Automatic event discovery** - The system automatically discovers all upcoming events from enabled sports/leagues via `/events` endpoint

4. **Zero-configuration scanning** - No manual scope selection required - scans all available events by default

5. **Seamless feed integration** - Deep Scan results merge seamlessly into the main feed in real-time

6. **Status visibility** - The UI displays continuous scan status (events scanned, opportunities found, last scan time)

7. **Manual scan preservation** - Users can still trigger manual Deep Scans for targeted searches when needed (existing Story 7.1 functionality preserved)

## Tasks / Subtasks

- [x] **Task 1: Add continuous deep scan settings** (AC: #1)
  - [x] 1.1 Add `continuousDeepScanEnabled: boolean` to `feedFiltersStore.ts`:
    ```typescript
    continuousDeepScanEnabled: boolean  // default: true
    setContinuousDeepScanEnabled: (enabled: boolean) => void
    ```
  - [x] 1.2 Persist setting via existing Zustand persist middleware
  - [x] 1.3 Add UI toggle in Settings or DeepScanPanel:
    - Label: "Continuous Deep Scan"
    - Subtitle: "Automatically scan all events after each poll"
    - Position: Above or within DeepScanPanel in DashboardLayout
  - [x] 1.4 Ensure toggle is keyboard accessible (Tab, Enter/Space)

- [x] **Task 2: Implement event discovery service** (AC: #3)
  - [x] 2.1 Add `discoverAllEvents()` function to `deepScan.ts`:
    ```typescript
    async function discoverAllEvents(args: {
      apiKey: string
      signal: AbortSignal
      correlationId: string
      sports?: string[]  // optional filter
    }): Promise<DeepScanEvent[]>
    ```
  - [x] 2.2 Call Odds-API.io `/v3/events` endpoint:
    - URL: `${ODDS_API_IO_BASE_URL}/v3/events?apiKey=${apiKey}`
    - Parse response into `DeepScanEvent[]`
    - Handle pagination if API supports it
  - [x] 2.3 Sort events by start time (ascending) - soonest first
  - [x] 2.4 Filter to upcoming events only (exclude past events)
  - [x] 2.5 Respect rate limiter via existing `scheduleProviderRequest()`
  - [x] 2.6 Log discovery results: event count, sports covered, date range

- [x] **Task 3: Implement event scan cache (TTL-based deduplication)** (AC: #2, #3)
  - [x] 3.1 Add in-memory scan cache to `deepScan.ts`:
    ```typescript
    interface ScanCacheEntry {
      scannedAt: number  // timestamp
      bookmakerHash: string
    }
    const scanCache = new Map<string, ScanCacheEntry>()  // keyed by eventId
    ```
  - [x] 3.2 Add configurable TTL constant: `SCAN_CACHE_TTL_MS = 5 * 60 * 1000` (5 minutes)
  - [x] 3.3 Implement `shouldScanEvent(eventId, bookmakers)`:
    - Return `true` if not in cache or cache expired
    - Return `true` if bookmaker selection changed (hash mismatch)
    - Return `false` if recently scanned with same bookmakers
  - [x] 3.4 Update cache after successful event scan
  - [x] 3.5 Clear cache on settings change (bookmaker selection, regions)
  - [x] 3.6 Log cache hit/miss statistics per scan cycle

- [x] **Task 4: Implement continuous scan scheduler** (AC: #2)
  - [x] 4.1 Add `startContinuousDeepScan()` function to `deepScan.ts`:
    - Triggered after `pollOnceForEnabledProviders()` completes
    - Only runs if `continuousDeepScanEnabled === true`
    - Only runs if no manual scan is in progress
  - [x] 4.2 Implement scan loop in `runContinuousScanCycle()`:
    ```typescript
    async function runContinuousScanCycle(): Promise<void> {
      const events = await discoverAllEvents(...)
      const eventsToScan = events.filter(e => shouldScanEvent(e.id, bookmakers))
      // Process in batches, respecting rate limits
      for (const batch of chunk(eventsToScan, BATCH_SIZE)) {
        await scanEventBatch(batch)
      }
    }
    ```
  - [x] 4.3 Use bounded concurrency from Story 7.1 (default: 2 concurrent)
  - [x] 4.4 Add `isContinuousScanActive: boolean` state for UI
  - [x] 4.5 Ensure graceful cancellation on manual scan start or toggle disable

- [x] **Task 5: Integrate with poller lifecycle** (AC: #2)
  - [x] 5.1 Modify `poller.ts` to emit event after `pollOnceForEnabledProviders()`:
    - Option A: Add callback parameter
    - Option B: Export a promise/signal that resolves on poll complete
  - [x] 5.2 In `router.ts`, wire up continuous scan trigger:
    ```typescript
    // After poll completes
    if (getContinuousDeepScanEnabled()) {
      startContinuousDeepScan().catch(logError)
    }
    ```
  - [x] 5.3 Prevent concurrent continuous scans (debounce/lock)
  - [x] 5.4 Handle edge case: poll interval shorter than scan duration

- [x] **Task 6: Update Deep Scan progress tracking** (AC: #6)
  - [x] 6.1 Extend `DeepScanProgress` type in `shared/types.ts`:
    ```typescript
    interface DeepScanProgress {
      // existing fields...
      mode: 'manual' | 'continuous'  // NEW
      lastContinuousScanAt?: string  // NEW - ISO timestamp
    }
    ```
  - [x] 6.2 Update Zod schema in `shared/schemas.ts`
  - [x] 6.3 Track continuous scan separately from manual scan:
    - Continuous scan uses same progress state but sets `mode: 'continuous'`
    - Manual scan interrupts continuous and sets `mode: 'manual'`
  - [x] 6.4 Track `lastContinuousScanAt` timestamp for UI display

- [x] **Task 7: Update UI for continuous scan status** (AC: #6, #7)
  - [x] 7.1 Update `DeepScanPanel.tsx`:
    - Show "Continuous" badge when `mode === 'continuous'`
    - Display "Last scan: Xm ago" based on `lastContinuousScanAt`
    - Show running totals: "Today: X arbs found"
  - [x] 7.2 Update `StatusBar.tsx` (if exists) or add status indicator:
    - Subtle animation when continuous scan is active
    - Text: "Scanning..." or "Idle - Last: 2m ago"
  - [x] 7.3 Ensure manual scan button remains accessible:
    - "Start Deep Scan" opens config dialog for targeted manual scans
    - Continuous scan pauses during manual scan, resumes after
  - [x] 7.4 Add visual distinction between manual and continuous results:
    - Both use `source: 'deepScan'` (no change to existing tagging)
    - UI can optionally show scan timestamp in SignalPreview

- [x] **Task 8: Add TRPC procedures for continuous scan** (AC: #1, #6)
  - [x] 8.1 Add `deepScan.getContinuousEnabled` query:
    ```typescript
    deepScanGetContinuousEnabled: t.procedure.query(() => {
      return { enabled: getContinuousDeepScanEnabled() }
    })
    ```
  - [x] 8.2 Add `deepScan.setContinuousEnabled` mutation:
    ```typescript
    deepScanSetContinuousEnabled: t.procedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ input }) => {
        setContinuousDeepScanEnabled(input.enabled)
        return { ok: true }
      })
    ```
  - [x] 8.3 Add `deepScan.getContinuousStatus` query:
    - Returns last scan time, events scanned today, opportunities found today
  - [x] 8.4 Update preload types in `src/preload/index.d.ts`

- [x] **Task 9: Implement scan budget and guardrails** (AC: #2, #3)
  - [x] 9.1 Add `CONTINUOUS_SCAN_MAX_EVENTS_PER_CYCLE` constant (default: 50)
  - [x] 9.2 Add `CONTINUOUS_SCAN_MIN_INTERVAL_MS` constant (default: 60000 = 1 minute)
  - [x] 9.3 Implement budget tracking:
    - Count API requests per hour
    - Warn user when approaching 5,000 req/hour limit
    - Auto-throttle if approaching limit
  - [x] 9.4 Add setting: "Max events per scan cycle" (optional, advanced)
  - [x] 9.5 Log quota usage after each cycle

- [x] **Task 10: Logging and observability** (AC: #2, #3, #6)
  - [x] 10.1 Add structured logging for continuous scan:
    - `continuousScan.cycle.start`: timestamp, eventCount, cacheHits, cacheMisses
    - `continuousScan.cycle.complete`: duration, eventsScanned, arbsFound, requestsMade
    - `continuousScan.event`: per-event success/failure (debug level)
  - [x] 10.2 Track daily statistics:
    - Total events scanned today
    - Total opportunities found today
    - Total API requests today
  - [x] 10.3 Emit metrics for quota monitoring

- [x] **Task 11: Create tests** (AC: #1-#7)
  - [x] 11.1 Unit tests for event discovery:
    - Parse `/events` response correctly
    - Sort by start time
    - Filter past events
  - [x] 11.2 Unit tests for scan cache:
    - TTL expiration
    - Bookmaker hash invalidation
    - Cache hit/miss counting
  - [x] 11.3 Unit tests for continuous scan scheduler:
    - Triggers after poll
    - Respects enabled toggle
    - Does not run during manual scan
  - [x] 11.4 Integration tests:
    - Full continuous scan cycle with mock API
    - Results merge into feed correctly
    - Manual scan interrupts continuous
  - [x] 11.5 Create test file: `tests/7-2-continuous-deep-scan.test.cjs`

## Dev Notes

### Architecture Compliance

This story extends the Deep Scan infrastructure from Story 7.1:

| Component | File | Pattern |
|-----------|------|---------|
| Continuous Scan Logic | `src/main/services/deepScan.ts` | Extend existing service |
| Settings | `src/renderer/src/features/dashboard/stores/feedFiltersStore.ts` | Extend existing store |
| TRPC Procedures | `src/main/services/router.ts` | Add to existing router |
| UI Components | `src/renderer/src/features/dashboard/DeepScanPanel.tsx` | Extend existing component |
| Types | `shared/types.ts` | Extend `DeepScanProgress` |
| Tests | `tests/7-2-continuous-deep-scan.test.cjs` | Follow story test naming |

### Technical Implementation Notes

**Odds-API.io `/events` Endpoint:**
```http
GET https://api.odds-api.io/v3/events?apiKey={key}

Response:
{
  "events": [
    {
      "id": "abc123",
      "name": "Manchester United vs Liverpool",
      "date": "2026-01-28T15:00:00Z",
      "league": "English Premier League",
      "sport": "soccer"
    },
    ...
  ]
}
```

**Rate Limiting Budget:**
- 5,000 requests/hour = ~1.4 requests/second
- `/events` call: 1 request
- `/odds` call: 1 request per event
- With 50 events per cycle and 5-minute TTL: ~600 requests/hour for `/odds`
- Leaves headroom for manual scans and regular `/arbitrage-bets` polling

**Scan Cycle Flow:**
```
Poll Complete → Check continuousDeepScanEnabled
                        ↓
              discoverAllEvents() → Get all upcoming events
                        ↓
              Filter by scan cache (TTL + bookmaker hash)
                        ↓
              Batch process events (2 concurrent)
                        ↓
              Calculate arbitrage (reuse Story 7.1 logic)
                        ↓
              Merge results into feed
                        ↓
              Update lastContinuousScanAt
```

**Event Prioritization:**
1. Events starting within 1 hour (highest priority)
2. Events starting today
3. Events starting tomorrow
4. Future events (lowest priority)

Within each tier, sort by start time ascending.

### Key Design Decisions

1. **Default ON**: Continuous Deep Scan is enabled by default to maximize opportunity discovery. Users can disable if they prefer manual control or want to conserve API quota.

2. **TTL-based Caching**: Events are cached for 5 minutes to avoid redundant scans while ensuring odds freshness. Cache is invalidated on bookmaker selection change.

3. **Non-blocking**: Continuous scan runs in background after poll. If poll completes before continuous scan finishes, the next continuous scan is queued (debounced).

4. **Manual Takes Priority**: Starting a manual Deep Scan cancels any in-progress continuous scan. Continuous scan resumes after manual scan completes.

5. **Bounded Concurrency**: Reuses Story 7.1's bounded concurrency (default: 2) to respect rate limits.

### Dependencies

- Story 7.1 (Deep Scan Mode) - provides core scan infrastructure
- Story 5.2 (Merged Multi-Provider Feed) - feed merging patterns
- Story 6.1 (Expanded Two-Way Market Types) - market normalization

### Previous Story Intelligence (Story 7.1)

From Story 7.1 implementation:
- Deep Scan service is in `src/main/services/deepScan.ts`
- Uses `AbortController` for cancellation
- TRPC procedures: `deepScanStart`, `deepScanCancel`, `deepScanStatus`, `deepScanResults`
- UI components: `DeepScanPanel`, `DeepScanButton`, `DeepScanConfigDialog`
- Results merge with feed using `source: 'deepScan'` tag
- Line-aware market splitting for correct arbitrage detection

**Story 7.1 Review Fixes Applied:**
- Multi-line markets now split by line-aware keys
- Per-market ROI overrides don't zero out global threshold
- Preload exposes `window.api.deepScan`
- Console logging replaced with structured logs

### Git Intelligence

Recent commits:
- `bc318eb` - story 7.1 (Deep Scan implementation)
- `7492916` - auto-refresh and dropdown accessibility
- `d80b6ad` - Swiss Clarity Ultra Light theme

Files likely to be modified:
- `src/main/services/deepScan.ts` - main implementation
- `src/main/services/router.ts` - TRPC procedures
- `src/main/services/poller.ts` - poll lifecycle hook
- `src/renderer/src/features/dashboard/stores/feedFiltersStore.ts` - settings
- `src/renderer/src/features/dashboard/DeepScanPanel.tsx` - UI
- `shared/types.ts` - type extensions
- `shared/schemas.ts` - schema extensions

### Out of Scope for Story 7.2

- Sport/league filtering in continuous scan (use full event discovery)
- Configurable scan interval (use fixed 5-minute TTL)
- Per-sport priority weighting
- Historical scan analytics
- Scan scheduling (time-of-day based)

### Risk Assessment

**R-001 (Rate Limiting):**
- Continuous scanning increases API usage significantly
- Mitigation: Bounded concurrency, TTL cache, max events per cycle, auto-throttle

**R-002 (Stale Data):**
- 5-minute cache may miss fast-moving odds
- Mitigation: TTL is configurable; users can manually scan specific events

**R-003 (Performance):**
- Continuous scanning may impact UI responsiveness
- Mitigation: Background processing, debounced updates, bounded concurrency

### Testing Strategy

**Unit Tests:**
- Event discovery parsing and sorting
- Cache TTL and invalidation
- Scheduler trigger conditions

**Integration Tests:**
- Full scan cycle with mocked API
- Feed merging and deduplication
- Manual/continuous scan interaction

**Golden Fixtures:**
- Reuse Story 7.1 fixtures for arbitrage calculation
- Add `/events` response fixture

### References

- [Source: _bmad-output/epics.md#Story 7.2 – Continuous Deep Scan Mode]
- [Source: _bmad-output/architecture.md#High-Risk Domain Patterns – Rate Limiting (R-001)]
- [Source: _bmad-output/implementation-artifacts/7-1-deep-scan-mode-hybrid-feed.md]
- [Odds-API.io Documentation](https://docs.odds-api.io/)

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npx tsc -p tsconfig.storage-test.json`
- `npx eslint --quiet src/main/services/deepScan.ts src/main/services/poller.ts src/main/services/router.ts src/main/services/storage.ts src/preload/index.ts src/preload/index.d.ts src/renderer/src/features/dashboard/DeepScanPanel.tsx src/renderer/src/features/dashboard/StatusBar.tsx src/renderer/src/features/dashboard/stores/deepScanStore.ts src/renderer/src/features/dashboard/stores/feedFiltersStore.ts shared/types.ts shared/schemas.ts`
- `$env:NODE_ENV='test'; node --test --test-concurrency=1 tests/7-1-deep-scan-mode.test.cjs tests/7-2-continuous-deep-scan.test.cjs`

### Completion Notes List

- Implemented continuous deep scan discovery, caching, scheduling, and guardrails in `src/main/services/deepScan.ts`.
- Added poll completion listeners in `src/main/services/poller.ts` and wired continuous scan triggers in `src/main/services/router.ts`.
- Extended shared types and schemas for continuous mode progress fields.
- Added TRPC and preload APIs for continuous status, toggling, cache clearing, and max events per cycle.
- Updated dashboard UI and stores to show continuous status, toggle controls, and max events per cycle.
- Added Story 7.2 tests in `tests/7-2-continuous-deep-scan.test.cjs`, including max-events guardrail coverage.
- Added quota usage payloads to completion logs for both manual and continuous scan completion events.
- Added odds payload diagnostics (`deepScan.odds.payload.summary`, `deepScan.odds.payload.sample`, `deepScan.odds.payload.dropped`) with event metadata to validate bookmaker odds coverage during continuous scans.
- Updated Deep Scan numeric controls to accept typing and commit on blur/Enter for batch size/TTL/max events inputs.

### File List

- `src/main/services/deepScan.ts`
- `src/main/services/poller.ts`
- `src/main/services/router.ts`
- `src/main/services/storage.ts`
- `shared/types.ts`
- `shared/schemas.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/renderer/src/features/dashboard/stores/feedFiltersStore.ts`
- `src/renderer/src/features/dashboard/stores/deepScanStore.ts`
- `src/renderer/src/features/dashboard/DeepScanPanel.tsx`
- `src/renderer/src/features/dashboard/StatusBar.tsx`
- `tests/7-1-deep-scan-mode.test.cjs`
- `tests/7-2-continuous-deep-scan.test.cjs`

### Code Review Fixes Applied

**Code Review Date:** 2026-01-27
**Reviewer:** Claude Opus 4.5 (Amelia, Developer Agent)

**HIGH-001: Missing maxEventsPerCycle in preload type declarations**
- Added `maxEventsPerCycle: number` to `DeepScanContinuousStatus` in both `src/preload/index.ts` and `src/preload/index.d.ts`

**HIGH-002: Missing setMaxEventsPerCycle and clearCache APIs in preload**
- Added `setMaxEventsPerCycle(maxEvents: number): Promise<void>` to DeepScanAPI
- Added `clearCache(reason?: string): Promise<void>` to DeepScanAPI
- Implemented both methods in preload to call corresponding TRPC procedures

**HIGH-003: continuousDeepScanMaxEventsPerCycle not synced to main process on startup**
- Added `syncPersistedSettingsToMain()` function in `deepScanStore.ts`
- Syncs `continuousDeepScanEnabled`, `continuousDeepScanMaxEventsPerCycle`, and ROI thresholds on first `refreshContinuousStatus()` call

**MED-003: Continuous scan doesn't respect minRoi thresholds from UI**
- Added `setContinuousScanDefaultThresholds()` function in `deepScan.ts`
- Added `deepScanSetDefaultThresholds` TRPC procedure in `router.ts`
- Startup sync now sends ROI thresholds from `feedFiltersStore.deepScanRoiThresholds` to main process

**New Tests Added:**
- `[P2][7.2-DISCOVERY-002]` - handles events with invalid or missing dates
- `[P2][7.2-DISCOVERY-003]` - handles exactly 1-hour boundary events
- `[P2][7.2-STATS-001]` - daily stats reset when UTC day changes
- `[P2][7.2-THRESHOLDS-001]` - default thresholds can be set for continuous scan
- `[P2][7.2-PRELOAD-001]` - preload exposes setMaxEventsPerCycle and clearCache APIs

**Total Tests:** 14 (9 P1 + 5 P2), all passing

