# Story 9.1: Fix Arbitrage Endpoint Host Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **User**,
I want the arbitrage endpoint to use the correct API host with safe fallback,
so that arbitrage opportunities are reliably retrieved without endpoint failures.

## Background

The code currently uses `https://api.odds-api.io` for arbitrage, but internal guidance and API documentation indicate that `/v3/arbitrage-bets` should be served from `https://api2.odds-api.io`. This discrepancy may cause the endpoint to fail or return wrong/empty responses.

**Critical API Contract Details (from AGENTS.md and docs.odds-api.io):**
- Arbitrage endpoint: `GET /v3/arbitrage-bets` is served from `https://api2.odds-api.io` (per docs examples)
- Bookmakers endpoints: `GET/PUT /v3/bookmakers/*` are served from `https://api.odds-api.io`
- Query params for arbitrage calls must include: `apiKey`, `bookmakers` (comma-separated), `includeEventDetails` (`true|false`), `limit`
- Never log API keys or secrets

## Acceptance Criteria

- [x] **AC1:** Add separate configurable host for arbitrage: `ODDS_API_IO_ARBS_HOST` (default: `https://api2.odds-api.io`)
- [x] **AC2:** Implement safe fallback to `https://api.odds-api.io` **only** on network error, 404, or selected 5xx responses
- [x] **AC3:** **Do not** fallback on 400/401/403/429 errors
- [x] **AC4:** All fallback events are logged with clear context
- [x] **AC5:** Arbitrage endpoint works reliably on the configured host

## Tasks / Subtasks

- [x] **Task 1:** Add environment variable support for `ODDS_API_IO_ARBS_HOST` (AC: #1)
  - [x] Define default value `https://api2.odds-api.io`
  - [x] Define fallback host constant `https://api.odds-api.io`
  - [x] Document in code comments
- [x] **Task 2:** Implement `fetchArbitrageBets()` with dual-host logic (AC: #2, #3, #4)
  - [x] Create `isSafeToFallback()` helper function
  - [x] Implement primary request to `api2.odds-api.io`
  - [x] Implement fallback logic for safe error codes only
  - [x] Add structured logging for fallback events
- [x] **Task 3:** Update existing adapter code (AC: #5)
  - [x] Refactor `src/main/adapters/odds-api-io.ts`
  - [x] Ensure all `/v3/arbitrage-bets` calls use new function
  - [x] Preserve existing bookmakers endpoints on `api.odds-api.io`
- [x] **Task 4:** Add unit tests (AC: #2, #3, #4)
  - [x] Test fallback triggers on network error, 404, 502, 503, 504
  - [x] Test NO fallback on 400, 401, 403, 429, 500
  - [x] Test logging output contains expected context

## Dev Notes

### Architecture Context

**Primary File to Modify:** `src/main/adapters/odds-api-io.ts`

This adapter is the **sole entry point** for Odds-API.io production data. It implements the `ArbitrageAdapter` interface defined in `src/main/adapters/base.ts` and is responsible for:
- Fetching pre-calculated arbitrage opportunities via `/v3/arbitrage-bets`
- Managing bookmaker selection via `/v3/bookmakers/*` endpoints
- Normalizing API responses into `ArbitrageOpportunity` objects

**Critical Architecture Patterns:**
- **Adapter Pattern:** All provider adapters implement `ArbitrageAdapter` interface [Source: `src/main/adapters/base.ts`]
- **Rate Limiting:** All HTTP calls go through `bottleneck` limiter in `poller.ts` [Source: architecture.md "High-Risk Domain Patterns – Rate Limiting (R-001)"]
- **Error Handling:** Use discriminated result shape: `{ok: true, data: T}` or `{ok: false, error: {category, code, message, correlationId}}` [Source: architecture.md "Error Handling"]
- **Security:** API keys never logged; use `credentials.getApiKey()` token provider [Source: architecture.md "Security and API Credential Handling"]

### Implementation Sketch

```typescript
// src/main/adapters/odds-api-io.ts

const ARB_HOST = process.env.ODDS_API_IO_ARBS_HOST || 'https://api2.odds-api.io'
const FALLBACK_HOST = 'https://api.odds-api.io'

interface ApiError {
  statusCode?: number
  message: string
  code?: string
}

async function fetchArbitrageBets(
  bookmakers: string[],
  apiKey: string
): Promise<ArbitrageOpportunity[]> {
  const primaryUrl = buildArbitrageUrl(ARB_HOST, bookmakers, apiKey)
  
  try {
    const response = await fetchWithRateLimit(primaryUrl)
    return normalizeArbitrageResponse(response)
  } catch (error) {
    if (isSafeToFallback(error)) {
      log.warn('Arbitrage host failed, falling back to fallback host', {
        error: error.message,
        primaryHost: ARB_HOST,
        fallbackHost: FALLBACK_HOST,
        statusCode: error.statusCode,
        correlationId: generateCorrelationId()
      })
      
      const fallbackUrl = buildArbitrageUrl(FALLBACK_HOST, bookmakers, apiKey)
      const fallbackResponse = await fetchWithRateLimit(fallbackUrl)
      return normalizeArbitrageResponse(fallbackResponse)
    }
    
    // Not safe to fallback - rethrow original error
    throw error
  }
}

function isSafeToFallback(error: ApiError): boolean {
  // Safe: network errors (no status code), 404, 502, 503, 504
  // NOT safe: 400, 401, 403, 429
  if (!error.statusCode) return true // Network error
  return [404, 502, 503, 504].includes(error.statusCode)
}

function buildArbitrageUrl(
  host: string,
  bookmakers: string[],
  apiKey: string
): string {
  const params = new URLSearchParams({
    apiKey,
    bookmakers: bookmakers.join(','),
    includeEventDetails: 'true'
  })
  return `${host}/v3/arbitrage-bets?${params.toString()}`
}
```

### Endpoint Host Mapping

| Endpoint | Correct Host | Notes |
|----------|--------------|-------|
| `GET /v3/arbitrage-bets` | `https://api2.odds-api.io` | **NEW** - Primary with fallback |
| `GET /v3/bookmakers` | `https://api.odds-api.io` | Unchanged |
| `GET /v3/bookmakers/selected` | `https://api.odds-api.io` | Unchanged |
| `PUT /v3/bookmakers/selected/select` | `https://api.odds-api.io` | Unchanged |
| `GET /v3/events` | `https://api.odds-api.io` | Unchanged |
| `GET /v3/odds` | `https://api.odds-api.io` | Unchanged |
| `GET /v3/odds/multi` | `https://api.odds-api.io` | Unchanged |

### Fallback Decision Matrix

| Status Code | Fallback? | Reason |
|-------------|-----------|--------|
| Network Error | ✅ YES | Host unreachable, try fallback |
| 404 Not Found | ✅ YES | Endpoint not on primary host |
| 502 Bad Gateway | ✅ YES | Temporary server error |
| 503 Service Unavailable | ✅ YES | Temporary server error |
| 504 Gateway Timeout | ✅ YES | Temporary server error |
| 400 Bad Request | ❌ NO | Client error, fallback won't help |
| 401 Unauthorized | ❌ NO | Auth error, fallback won't help |
| 403 Forbidden | ❌ NO | Permission error, fallback won't help |
| 429 Too Many Requests | ❌ NO | Rate limit, fallback would compound issue |
| 500 Internal Server Error | ⚠️ CONSIDER | May be transient, but could indicate real bug |

### Project Structure Notes

**Target File:** `src/main/adapters/odds-api-io.ts`

Existing structure should be maintained:
```
src/main/adapters/
├── base.ts                    # Adapter interface (read-only)
├── odds-api-io.ts            # MODIFY THIS FILE
└── the-odds-api.ts           # Test adapter (unaffected)
```

**No new files required** - implement within existing adapter.

### Testing Requirements

**Unit Test Location:** Co-located as `src/main/adapters/odds-api-io.test.ts`

**Test Scenarios:**
1. Primary host succeeds → returns normalized opportunities
2. Primary host returns 404 → falls back, returns fallback results
3. Primary host returns 429 → NO fallback, throws rate limit error
4. Primary host returns 401 → NO fallback, throws auth error
5. Network error → falls back, returns fallback results
6. Both hosts fail → throws primary error (not fallback error)

**Golden Dataset:** No new golden fixtures needed - use existing arb fixtures if available.

### Risk Mitigation

**Risk:** Fallback logic could mask real API issues
- **Mitigation:** Always log fallback events with full context
- **Mitigation:** Emit provider status updates for dashboard visibility

**Risk:** Fallback on 429 could compound rate limiting
- **Mitigation:** Explicitly exclude 429 from fallback conditions
- **Mitigation:** Document rationale in code comments

**Risk:** Environment variable not set in production
- **Mitigation:** Hardcoded default to `https://api2.odds-api.io`
- **Mitigation:** Add startup validation warning if using default

### References

- **Epic 9:** `_bmad-output/implementation-artifacts/epic-9-odds-api-integration-fixes.md`
- **FR5:** Retrieve pre-calculated bets (`_bmad-output/prd.md`)
- **FR7:** Normalize responses (`_bmad-output/prd.md`)
- **FR8:** API rate limiting (`_bmad-output/prd.md`)
- **Architecture - Security:** `architecture.md` section "Security and API Credential Handling"
- **Architecture - Error Handling:** `architecture.md` section "Error Handling, Logging, and Observability"
- **Architecture - Rate Limiting:** `architecture.md` section "High-Risk Domain Patterns – Rate Limiting (R-001)"
- **AGENTS.md:** Odds-API.io contract checks (base URL requirements)

### Related Stories

- **Story 9.2** (Add Canonical Fields to Event Model) - Independent, can be done in parallel
- **Story 9.3** (Fix Event Extraction Priority) - Independent, can be done in parallel  
- **Story 9.4** (Implement Strict Event Key Generation) - Independent, can be done in parallel
- **Story 9.5** (Wire Aggressive Scan to /v3/odds/multi Batching) - Uses same adapter file, coordinate changes

---

## Dev Agent Record

### Agent Model Used

Claude (Developer Agent)

### Debug Log References

- `adapter.fallback` structured log events contain correlationId, primaryHost, fallbackHost, statusCode
- Test coverage: 14 test cases covering all fallback scenarios (including 500)

### Completion Notes List

- [x] Implemented `ODDS_API_IO_ARBS_HOST` environment variable support with default `https://api2.odds-api.io`
- [x] Created `isSafeToFallback()` helper with strict status code checking (404, 502, 503, 504 = safe; 400, 401, 403, 429 = not safe)
- [x] Implemented dual-host `fetchArbitrageBets()` function with primary→fallback retry logic
- [x] Added structured logging via `logWarn()` for all fallback events with full context
- [x] Updated `OddsApiIoAdapter.fetchWithApiKey()` to use new dual-host logic
- [x] Created comprehensive test suite (13 tests) in `tests/9.1-arbitrage-endpoint-host-fallback.test.cjs`
- [x] Updated existing test `2.4-production-adapter-odds-api-io.test.cjs` to expect new api2 host
- [x] TypeScript type-check passes
- [x] All tests pass

### File List

- `src/main/adapters/odds-api-io.ts` - Modified: Added dual-host logic, fallback handling, structured logging
- `tests/9.1-arbitrage-endpoint-host-fallback.test.cjs` - Created: Comprehensive unit tests for fallback scenarios
- `tests/2.4-production-adapter-odds-api-io.test.cjs` - Modified: Updated to expect new api2.odds-api.io host

### Change Log

- 2026-02-02: Story 9.1 implementation complete - Fixed arbitrage endpoint host configuration with safe fallback logic
- 2026-02-02: Code review fixes applied - Added 500 status code test, updated JSDoc comment
