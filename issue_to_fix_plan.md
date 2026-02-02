# issue_to_fix_plan.md — Odds-API.io integration fixes & upgrades

This plan lists the **current troubles** in the app and the **proper implementations** aligned with the Odds-API.io docs, with a priority-ordered roadmap, acceptance criteria, and suggested tests.

---

## Scope & goals

**Goal:** ensure the app implements Odds-API.io correctly (endpoints, parameters, limits, rate limiting), improves correctness (no false arbs), and improves efficiency (fewer wasted requests).

**Non-goals (for now):**
- Implementing 3-way (1X2) arbitrage (optional later).
- WebSocket streaming (optional later).

---

## Key Odds-API.io constraints (from docs)

- `/v3/odds/multi`: up to **10** eventIds per request; `bookmakers` supports up to **30** comma-separated entries.
- `/v3/odds/updated`: requires **UNIX timestamp** `since` (max ~**1 minute** old), **singular** `bookmaker`, and **required** `sport`.
- `/v3/arbitrage-bets`: supports `bookmakers` filtering; use a curated list of bookmakers instead of “all”.
- Handle HTTP **429** with `Retry-After` when provided and backoff otherwise.
- Never expose `apiKey` in browser code; proxy via backend.

---

## Current troubles (what’s broken / risky)

### P0 — Correctness blockers

1. **Arbitrage base URL discrepancy (`api` vs `api2`)**
   - Code uses `https://api.odds-api.io` for arbitrage, but internal guidance expects `https://api2.odds-api.io` for `/v3/arbitrage-bets`.
   - Risk: arbitrage endpoint may fail or silently return wrong/empty responses depending on host.

2. **League identity is stored as display name only; slugs are lost**
   - `extractEvents()` prefers `league.name` over `league.slug`.
   - Risk: dedupe and cross-provider matching becomes unreliable; duplicates slip through (e.g., “EPL” vs “Premier League”).

3. **Event key collisions**
   - Current key: `teamA|teamB|hour` (sorted teams + hour-truncated date).
   - Risk: collisions for cup vs league, reschedules, multi-competition same-day fixtures → false joins → **false arbs**.

4. **Aggressive scan is partially wired**
   - Tiering exists but odds fetching was previously a placeholder in aggressive scan.
   - Risk: “aggressive mode” doesn’t actually deliver its intended scanning behavior.

### P1 — API implementation gaps / inefficient behaviors

5. **`/v3/odds/updated` incorrect usage**
   - Uses ISO timestamps instead of UNIX.
   - Missing required `sport` parameter.
   - Previously accepted `bookmakers[]` instead of singular `bookmaker`.
   - Single global cursor instead of per-bookmaker (and per sport, if used).
   - Risk: incremental updates don’t work; can cause errors or empty updates.

6. **Event discovery over-fetching**
   - Fetches `/v3/events` by sport and filters leagues client-side.
   - Risk: higher quota usage; slower discovery; more events in tiers than needed.

7. **Rate limit handling does not fully respect `Retry-After`**
   - Exponential backoff exists but missing robust `Retry-After` support in all paths.
   - Risk: prolonged “degraded” states and wasted retries.

### P2 — Quality improvements (correctness/UX/data quality)

8. **ROI clamps negative values to 0**
   - Great for UI, but lossy for analytics/debugging “near arbs”.
9. **Odds format assumption**
   - Assumes decimal odds; American or other formats would break implied probability.
10. **League normalization uses display names**
   - Slug-based canonical identity needed for strict correctness.
11. **Cards rules mismatch detection relies only on per-bookmaker config**
   - OK for now but could be augmented later.

---

## Fix plan (priority-ordered)

### Phase 0 (P0) — Stop false joins and endpoint failures

#### 0.1 Add canonical fields to event model
**Files:** `src/main/services/deepScan.ts`

- Extend `DeepScanEvent`:
  - `leagueSlug?: string`, `league?: string` (display)
  - `sportSlug?: string`, `sport?: string` (display)
  - `kickoffEpochMs?: number` (canonical numeric time)

**Acceptance criteria**
- All discovered events have `sportSlug` and `leagueSlug` when the API returns them.
- `kickoffEpochMs` is populated for valid kickoff timestamps.

**Tests**
- Unit: parse `league` object with `{name, slug}` → both stored; slug is used for identity.
- Unit: invalid date → `kickoffEpochMs` undefined and event remains processable (but not joinable in strict mode).

#### 0.2 Fix event extraction priority (slug-first)
**Files:** `src/main/services/deepScan.ts` (`extractEvents()`)

- When league/sport candidates are objects:
  - `slug` becomes identity; `name` becomes display.
- When only a string exists:
  - store it as display; do not guess slug unless you can map deterministically from `/leagues`.

**Acceptance criteria**
- League slug is never overwritten by display name.

#### 0.3 Replace event key with strict, collision-resistant key
**Files:** `src/main/services/eventMatcher.ts`

- New strict key format:
  - `sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin`
- Minute precision:
  - `kickoffMin = floor(kickoffEpochMs / 60000)`
- **Strict mode requirement:**
  - if `sportSlug` or `leagueSlug` missing → return `null` (event not joinable across providers).

**Acceptance criteria**
- No `'unknown'` placeholders are used in strict key generation.
- Cup vs league matches with same teams/time do not collide.

**Tests**
- Unit: two different leagueSlug values produce different keys.
- Unit: same match with kickoff time within the same minute produces same key.
- Regression: previously colliding fixtures no longer collide.

#### 0.4 Host configuration + safe fallback for arbitrage endpoint
**Files:** `src/main/adapters/odds-api-io.ts`

- Add separate configurable host for arbitrage:
  - `ODDS_API_IO_ARBS_HOST` (default to `https://api2.odds-api.io` per internal guidance)
- Implement fallback to `https://api.odds-api.io` **only** on:
  - network error, 404, selected 5xx.
- **Do not** fallback on 400/401/403/429.

**Acceptance criteria**
- Arbitrage endpoint works on the configured host.
- Fallback only occurs on safe failure conditions and is logged.

---

### Phase 1 (P1) — Implement the API the “doc-correct” way & reduce quota waste

#### 1.1 Prefer `/v3/odds/multi` as the primary polling mechanism (multi-sport safe)
**Files:** `src/main/services/aggressiveScan.ts`

- Wire aggressive scan polling to use:
  - `/v3/odds/multi` with batch size **10** events.
  - `bookmakers` list cached with TTL (>= 1 minute; consider 5–10 minutes if stable).
- Keep events intact (use real `DeepScanEvent`, not `{name: id}` placeholders).

**Acceptance criteria**
- Aggressive scan produces odds requests and updates caches/arbs for tiered events.
- Requests are batched at 10 events wherever possible.

**Tests**
- Integration: with 23 events in a tier → exactly 3 multi calls (10/10/3).
- Functional: arbs are computed and surfaced from aggressive scan results.

#### 1.2 Fix event discovery to filter by league at API level
**Files:** `src/main/services/deepScan.ts`

- Instead of fetching all events for a sport and filtering leagues client-side, call:
  - `/v3/events?sport=...&league=...` per enabled leagueSlug (or best supported filter pattern).
- Keep pagination handling (numeric `nextPage`) but reduce total pages fetched.

**Acceptance criteria**
- Discovery traffic drops proportionally with league filters.
- Returned events are already within enabled leagues.

#### 1.3 Rate limit handling: full `Retry-After` support
**Files:** `src/main/services/poller.ts`

- On HTTP 429:
  - use `Retry-After` if present (supports both integer seconds and HTTP-date format)
  - else use exponential backoff
- Ensure it’s applied where responses are handled (not just thrown exceptions).

**Acceptance criteria**
- 429 triggers cooldown until the header/backoff expires.
- No immediate re-burst after cooldown.

**Tests**
- Unit: `Retry-After: 10` → cooldown 10s.
- Unit: `Retry-After: Wed, ... GMT` → computed delta.

#### 1.4 Optional: Implement `/v3/odds/updated` correctly (only after `/multi` is stable)
**Rationale:** Multi-sport concurrent mode makes `/updated` N(bookmakers) × M(sports). Start with `/multi`.

If implemented later, it must be doc-correct:
- Params:
  - `since` = UNIX integer (seconds), not ISO.
  - `bookmaker` = singular.
  - `sport` = required.
- Cursor:
  - per **(sportSlug, bookmaker)** key.
  - set cursor to `requestStartSec - 1` (small overlap).
  - treat stale if `nowSec - since > 55` and fall back to snapshots (`/multi`) for that sport.
- Filter:
  - incremental results must be filtered to tracked eventIds for that sport/tier.

**Acceptance criteria**
- `/updated` requests never omit `sport` and never pass ISO timestamps.
- When stale/missed window, system resyncs via `/multi` and resets cursor safely.

---

### Phase 2 (P2) — Quality upgrades & safer outputs

#### 2.1 Keep negative ROI internally; clamp only in UI
**Files:** arbitrage calculator / output formatting

- Return true ROI (can be negative) for internal analytics and debugging.
- UI can display max(0, roi) if desired.

#### 2.2 Normalize odds format (guardrails)
**Files:** odds parsing layer

- Add sanity checks:
  - reject odds < 1.01
  - warn/flag odds values that look like American odds (e.g., abs(odds) > 20 and integer-like), or simply mark as “unsupported format” unless you explicitly normalize.

#### 2.3 Market identity model (line + period + key)
**Files:** market normalization / cross-provider calculator

- Normalize market identity into structured fields:
  - `marketKey`, `line`, `period`, `side`
- Enforce exact `line` matches (no bucketing) for arb computation.

#### 2.4 Make strictness explicit
- Add a config flag:
  - `strictMatching=true` default
- In strict mode:
  - if `sportSlug/leagueSlug` missing → not joinable across providers; no “strict arb” output.

---

## Suggested implementation order (checklist)

### Week 1: correctness
- [ ] Extend `DeepScanEvent` with slugs + kickoffEpochMs
- [ ] Fix `extractEvents()` slug-first logic
- [ ] Replace event key with strict key (minute precision + leagueSlug + sportSlug)
- [ ] Implement arbitrage host config + safe fallback
- [ ] Add regression tests for collision scenarios

### Week 2: efficiency + wiring
- [ ] Wire aggressive scan to `/v3/odds/multi` batching
- [ ] Ensure batch fetch uses real event objects (not `{name: id}`)
- [ ] Move league filtering to API-side event discovery
- [ ] Add `Retry-After` handling end-to-end

### Week 3+: optional optimizations
- [ ] Consider `/v3/odds/updated` for single-sport mode or small bookmaker/sport subsets
- [ ] Add negative ROI internal storage + UI clamp
- [ ] Odds-format guardrails
- [ ] Structured market identity (line/period)

---

## Acceptance criteria summary

**Correctness**
- No false cross-provider joins due to league/time collisions.
- Strict mode requires slugs; no placeholder “unknown” IDs used in joining.
- Aggressive scan actually fetches and processes odds.

**API compliance**
- `/odds/multi` uses ≤10 eventIds per request and ≤30 bookmakers.
- `/odds/updated` (if used) uses UNIX `since`, singular `bookmaker`, and required `sport`.
- 429 respects `Retry-After`.

**Efficiency**
- Event discovery does not over-fetch across leagues.
- Aggressive scan is quota-efficient via batching and caching.

---

## Notes for future enhancements
- Add 3-way (1X2) arbitrage calculator for soccer if needed.
- Consider WebSocket updates if supported by plan and stable.
