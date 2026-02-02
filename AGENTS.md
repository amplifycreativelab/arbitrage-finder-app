<INSTRUCTIONS>
Codex: when reviewing PRs for this repo, prioritize correctness, safety, and API-contract adherence.

## How to validate changes (run these in CI / locally)
- `npm ci` (or `npm install` if already pinned)
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Odds-API.io contract checks (must stay aligned with docs.odds-api.io)

### Base URL / hosts
- Default REST base URL for v3 endpoints is:
  - `https://api.odds-api.io/v3`
- Some examples/legacy references may mention `api2.odds-api.io`. Treat the arbitrage host as **configurable**:
  - Default arbitrage host: `https://api.odds-api.io`
  - Allow override: `ODDS_API_IO_ARBS_HOST=https://api2.odds-api.io`
- Do **not** automatically “fallback” across hosts on auth/rate-limit responses (401/403/429).
  - If implementing a host fallback, restrict it to network errors + 404/5xx only.

### Arbitrage opportunities
- Endpoint: `GET /v3/arbitrage-bets`
- Required query params:
  - `apiKey`
  - `bookmakers` (comma-separated list)
- Optional query params:
  - `includeEventDetails` (`true|false`)
  - `limit` (default 50, max 500)

### Odds polling
- Prefer batch odds polling:
  - `GET /v3/odds/multi` (max **10** event IDs per request)
- Keep bookmaker lists within documented limits (the app currently clamps to 30).

### Incremental odds updates (optional optimization)
- Endpoint: `GET /v3/odds/updated`
- Requirements:
  - `apiKey` (required)
  - `since` (required) **UNIX timestamp integer** and must be **recent** (docs: max ~1 minute old)
  - `bookmaker` (required) **singular**
  - `sport` (required)
- If the app supports multi-sport scanning, `/odds/updated` becomes (sports × bookmakers) calls; default to `/odds/multi` unless profiling proves `/updated` is beneficial.

### Events / discovery efficiency
- Prefer API-side filtering over client-side filtering where supported.
  - Example: use the `bookmaker` filter on `/v3/events` when you only care about events available at a specific bookmaker (reduces payload and avoids over-fetching).

### Rate limiting & error handling
- All provider calls must go through the central scheduler in `src/main/services/poller`.
- On HTTP 429:
  - Respect `Retry-After` when present (seconds OR HTTP-date).
  - Otherwise use exponential backoff + jitter.
- Do not log API keys or secrets.

## Review focus areas
- Networking: ensure Electron main process uses a reliable fetch (`electron.net.fetch` preferred where applicable) and errors are surfaced with actionable messages.
- Data mapping: validate normalization keeps schema guarantees (e.g., 2 legs where expected, numeric odds > 0, ROI semantics).
- Matching/dedup correctness: event identity should use canonical slugs (`sportSlug`, `leagueSlug`) and minute-level kickoff time; avoid weak keys (e.g., hour-truncated without league).
- Test coverage: update or add tests in `tests/` when API shapes, params, or host logic changes.
</INSTRUCTIONS>
