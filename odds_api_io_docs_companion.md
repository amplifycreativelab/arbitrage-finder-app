# odds_api_io_docs_companion.md — Offline-friendly docs pack (summary + links)

## Important note about “all docs”
I can’t package or redistribute **the entire Odds-API.io documentation site verbatim** in a downloadable file (that would be a full reproduction of copyrighted content).

What I *can* give you here is:
1) A **complete offline-ready companion**: endpoint map, parameters, constraints, and best-practice guidance distilled from the official docs.
2) A **link index** to the official pages, plus the official **Swagger UI** and **OpenAPI spec** locations so you can download/keep them locally.

---

## Official docs entry points (bookmark these)

- Docs home: https://docs.odds-api.io/
- Best Practices: https://docs.odds-api.io/guides/best-practices
- Authentication: https://docs.odds-api.io/authentication
- API Reference (OpenAPI): https://docs.odds-api.io/api-reference/openapi.json
- Swagger UI: https://api.odds-api.io/v3/docs/index.html
- Odds-API.io site (quick examples): https://odds-api.io/

---

## Authentication & security

- Auth is via **apiKey** on requests.
- **Do not expose apiKey in frontend**. Proxy via backend (server route / function).

Recommended pattern:
- Client → your backend → Odds-API.io
- Store apiKey only server-side (env vars / secrets store).

---

## Core API surface (v3) — endpoint map

### Catalog / discovery
- `GET /v3/sports`
  - Purpose: list sports and their slugs/keys.

- `GET /v3/leagues?sport={sportSlug}`
  - Purpose: list leagues for a sport (includes league slug).
  - Use league slug for identity (dedupe/matching), league name for display.

- `GET /v3/bookmakers`
  - Purpose: list bookmakers.

- Selected bookmakers management
  - `GET /v3/bookmakers/selected`
  - `PUT /v3/bookmakers/selected/select`
  - `PUT /v3/bookmakers/selected/clear` (note: limited frequency per docs)

### Events
- `GET /v3/events?sport={sportSlug}`
  - Filters typically include:
    - `league={leagueSlug}` (prefer API-side filtering over client-side)
    - date range (`from`, `to`) if supported
    - `status` where supported
    - optional bookmaker filter (only events with odds at that bookmaker)

- `GET /v3/events/live` (optionally filter by sport)
  - Purpose: live events list.

- `GET /v3/events/{eventId}`
  - Purpose: single event details.

- `GET /v3/events/search?query=...`
  - Purpose: search (min length constraints apply).

### Odds
- `GET /v3/odds?eventId={eventId}&bookmakers={csv}`
  - Purpose: odds for a single event across specified bookmakers.

- `GET /v3/odds/multi?eventIds={csv}&bookmakers={csv}`
  - Purpose: batch odds for up to **10** events in a single request.
  - Use this as your **default polling** mechanism, especially for multi-sport concurrent scanning.

- `GET /v3/odds/updated?since={unix}&bookmaker={one}&sport={sportSlug}`
  - Purpose: incremental updates since last cursor.
  - Constraints:
    - `since` must be **UNIX timestamp integer** (seconds; confirm with a single real call).
    - `since` must be **recent** (docs indicate ~≤ 1 minute window).
    - `bookmaker` is **singular**.
    - `sport` is **required**.
  - In multi-sport mode this multiplies calls: (sports × bookmakers). Use only if profiling proves it helps.

- `GET /v3/odds/movements?eventId=...&bookmaker=...&market=...`
  - Purpose: odds movement history (where available).

### Computed opportunities
- `GET /v3/arbitrage-bets?bookmakers={csv}&limit={n}&includeEventDetails={bool}`
  - Purpose: precomputed arbitrage opportunities.
  - Note: host for this endpoint may be `api.odds-api.io` or `api2.odds-api.io` depending on account/config;
    make it configurable and implement safe fallback only for network/404/5xx.

- `GET /v3/value-bets?...`
  - Purpose: precomputed value bets.

---

## Hard limits & constraints you must enforce

- `/odds/multi`: **max 10** eventIds per request.
- Odds requests: **max 30** bookmakers per request (CSV).
- `/odds/updated`: requires recent UNIX cursor and is scoped to **(sport, bookmaker)**.

---

## Recommended architecture (multi-sport, strict correctness)

### A) Default: polling with `/odds/multi`
1) Discover events (API-side league filtering).
2) Store canonical identity fields:
   - `sportSlug`, `leagueSlug`, `kickoffEpochMs`, normalized teams.
3) Tier events by kickoff time (imminent/soon/today/later).
4) Poll tiers with `/odds/multi` batching (10 events/call).
5) Compute arbs using strict joins only:
   - require `sportSlug` + `leagueSlug`
   - require minute-level kickoff
   - require normalized team pair exact match
   - require market identity match including line/period

### B) Optional: incremental polling with `/odds/updated`
Only if profiling shows it reduces cost/latency.
- Cursor map: `(sportSlug, bookmaker) -> sinceUnixSeconds`
- Stale detection: if `nowSec - since > 55`, do snapshot resync via `/odds/multi` and reset cursor.
- Cursor advancement: set to `requestStartSec - 1` for safe overlap.
- Filter incremental results to tracked eventIds.

---

## Rate limiting, caching, and 429 handling

- Implement a limiter per provider adapter, and a shared queue across scan modes.
- On 429:
  - Respect `Retry-After` (seconds OR HTTP-date).
  - Otherwise exponential backoff with jitter.
- Caching TTLs (guidance from docs):
  - Sports/leagues: long TTL (>= 1h).
  - Pre-match events: 5–10 min.
  - Pre-match odds: 30–60 sec.
  - Live events: 10–30 sec.
  - Live odds: 5–10 sec.

---

## Strict correctness rules (avoid false arbs)

- Do NOT join across providers if any are missing:
  - `sportSlug` or `leagueSlug` or kickoff time.
- Event key (strict):
  - `sportSlug|leagueSlug|teamA_norm|teamB_norm|kickoffMin`
- Market identity must include:
  - market key + line + period + side
- Do not match totals/handicaps with different lines.

---

## How to make a personal local copy (your own machine)

If you want a truly offline, complete copy of the docs for your own use, do it locally:

### Option 1: Save OpenAPI spec
- Download: https://docs.odds-api.io/api-reference/openapi.json
- Then you can render it with Swagger UI or any OpenAPI viewer offline.

### Option 2: Mirror the docs site (personal use)
Using `wget` (Linux/macOS/WSL):
```bash
wget --mirror --convert-links --adjust-extension --page-requisites --no-parent https://docs.odds-api.io/
```

Or use a browser “Save all pages” extension / HTTrack.

---

## Quick checklist (API compliance)

- [ ] All odds polling uses `/v3/odds/multi` with <= 10 eventIds.
- [ ] Bookmakers param never exceeds 30 values.
- [ ] If using `/v3/odds/updated`: pass `sport` + singular `bookmaker` + unix `since`.
- [ ] 429 handler respects `Retry-After`.
- [ ] Strict join requires slugs and minute kickoff; never uses `'unknown'` placeholders.

