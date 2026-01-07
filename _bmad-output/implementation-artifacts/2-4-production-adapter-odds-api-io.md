# Story 2.4: Production Adapter (Odds-API.io)

Status: done

## Story

As a User,
I want to fetch pre-calculated arbs from the production provider,
so that I can see live surebet opportunities.

## Acceptance Criteria

1. The production adapter for Odds-API.io (for example `OddsApiIoAdapter` in `src/main/adapters/odds-api-io.ts`) calls the provider's pre-calculated arbitrage endpoint (e.g. `/v3/arbitrage-bets`) using the existing credentials boundary (`src/main/credentials.ts`) and centralized rate-limiting/poller infrastructure established in Stories 2.1 and 2.2, with no direct `fetch`/`axios` usage that bypasses the limiter.
2. Responses from the production endpoint are strictly mapped into the canonical `ArbitrageOpportunity` model defined in `shared/types.ts` (and validated via `shared/schemas.ts`), ensuring stable `id` generation, correct event metadata (sport, league, teams, start time), two normalized legs with bookmaker/market/odds/outcome, and non-negative `roi` values that align with the Data Architecture section of `_bmad-output/architecture.md`.
3. When the active provider is set to "Production" in settings, the polling pipeline (`src/main/services/poller.ts`) uses the production adapter as its source of opportunities, and the renderer-side state/Feed table shows only production-backed `ArbitrageOpportunity` rows; switching back to the Test provider routes traffic through the existing test adapter without requiring app restart.
4. Region and sport filters configured in the UI (FR3, FR4) are applied consistently to the production feed: only opportunities whose bookmaker region and sport match the selected filters are surfaced in the data grid, and this behavior matches the PRD requirements for supported regions/sports and typical usage patterns.
5. Focused tests (for example `tests/2.4-production-adapter-odds-api-io.test.cjs`) exercise production adapter mapping and integration by feeding representative Odds-API.io responses through the adapter and poller, asserting correct normalization into `ArbitrageOpportunity`, correct honoring of region/sport filters, and continued adherence to rate-limit and correctness invariants from Stories 2.1, 2.2, and 2.3.

## Tasks / Subtasks

- [x] Design and implement the production adapter for Odds-API.io (AC: #1, #2).
  - [x] Define or confirm the production provider configuration (base URL, pre-calculated arbs endpoint path, authentication headers/query parameters) in a single place, referencing the PRD and any provider docs used during implementation (AC: #1).
  - [x] Implement the adapter in `src/main/adapters/odds-api-io.ts` so that all outbound HTTP calls flow through the shared rate-limiter scheduling abstraction in `src/main/services/poller.ts`, and credentials are obtained exclusively via `src/main/credentials.ts` (AC: #1).
  - [x] Add or update mapping helpers that transform representative Odds-API.io pre-calculated arbitrage responses into `ArbitrageOpportunity[]`, including stable `id` generation and normalization of event/leg fields (AC: #2).
- [x] Integrate the production adapter into the polling and provider-selection pipeline (AC: #1, #3).
  - [x] Ensure `src/main/services/poller.ts` can select the correct adapter instance based on the active provider, reusing the shared adapter contract from Story 2.1 (AC: #3).
  - [x] Wire provider selection from settings (Epic 1 stories) so that toggling to Production causes the poller to fetch from Odds-API.io without code changes or restart, and toggling back to Test reuses the existing test adapter (AC: #3).
  - [x] Confirm that the renderer-facing data structures (e.g. TRPC responses, Zustand stores, and `FeedTable.tsx`) continue to consume only `ArbitrageOpportunity[]`, remaining agnostic to which provider is active (AC: #2, #3).
- [x] Apply region and sport filtering consistently for production opportunities (AC: #4).
  - [x] Reuse or extend existing filtering logic so that production-backed opportunities are filtered by region and sport according to the PRD (FR3, FR4), using the same semantics as the test adapter (AC: #4).
  - [x] Verify that region/sport filters are applied after normalization (on `ArbitrageOpportunity` fields), not on raw provider payloads, to keep filtering logic provider-agnostic (AC: #2, #4).
- [x] Add focused tests for production adapter mapping and integration (AC: #2, #4, #5).
  - [x] Introduce tests that feed representative Odds-API.io responses into the adapter mapping helpers and assert that resulting `ArbitrageOpportunity` objects satisfy the Data Architecture invariants from `_bmad-output/architecture.md` and PRD FR5–FR7 (AC: #2, #5).
  - [x] Add integration-style tests that exercise the poller + adapter + filters path (e.g. using a fake HTTP client or stubbed provider), asserting correct adapter selection for Production mode and correct application of region/sport filters (AC: #3, #4, #5).
  - [x] Reuse calibration and rate-limit test patterns from Stories 2.2 and 2.3 to ensure that the production adapter does not introduce new paths that bypass `RateLimiterConfig` or the centralized bottleneck configuration (AC: #1, #5).

## Dev Notes

- This story introduces the production adapter for Odds-API.io as the primary source of pre-calculated arbitrage opportunities, building directly on the shared adapter contract and `ArbitrageOpportunity` data model established in Story 2.1 and the rate-limiting and calibration behavior from Stories 2.2 and 2.3.
- The adapter must not duplicate rate-limiting or credential logic; it should treat the poller and `RateLimiterConfig` as the owners of quota enforcement and use the centralized credentials module for API keys, keeping all provider-specific HTTP details (paths, query parameters, headers) encapsulated within `src/main/adapters/odds-api-io.ts`.
- Normalization should preserve enough provider metadata (for example league, event identifiers, bookmaker names) to keep the `ArbitrageOpportunity` model expressive while avoiding leaking raw provider schema into the rest of the application; any additional attributes should be attached via well-defined extension fields if required by the architecture.
- Region and sport filtering should behave identically between production and test providers so that the dashboard experience and filter semantics do not depend on which provider is active; both adapters should surface opportunities with consistent region/sport values suitable for filtering.

### Learnings from Previous Story

- Story 2.3 (`_bmad-output/implementation-artifacts/2-3-rate-limit-calibration-stress-harness.md`) delivered a reusable calibration/stress harness (`src/main/services/calibration.ts`) and tightened the rate-limit contract around `RateLimiterConfig`, `poller.ts`, and provider adapters; the production adapter should reuse this infrastructure and rely on calibration runs (where appropriate) to validate quota-safe configurations rather than introducing ad-hoc throttling.
- Previous work reinforced that all provider HTTP calls must flow through the centralized `scheduleProviderRequest`/limiter path in `poller.ts`, with structured logging and metrics for rate-limit events; the production adapter must honor this invariant so that calibration, logging, and future observability stories can reason about provider behavior consistently.
- Calibration and test harnesses added in Story 2.3 (e.g. `tests/2.3-rate-limit-calibration-stress-harness.test.cjs` and the `calibrate:providers` / `test:calibrate` scripts) should be reused or extended to cover production adapter behavior where it is safe to do so (for example in lower-intensity or simulated scenarios), instead of building separate, one-off stress paths.

### Project Structure Notes

- Keep the production adapter implementation under `src/main/adapters/odds-api-io.ts`, using `src/main/adapters/base.ts` and shared contracts in `shared/types.ts` / `shared/schemas.ts` for common logic and validation.
- Ensure that polling and scheduling logic remains centralized in `src/main/services/poller.ts`, with any calibration-specific behaviors kept in `src/main/services/calibration.ts`; the production adapter should not own its own scheduler or long-running loops.
- Place new tests under `tests/` using a clear naming convention (for example `2.4-production-adapter-odds-api-io.test.cjs`), following patterns from `tests/2.1-adapter-pattern-shared-types.test.cjs`, `tests/2.2-rate-limiter-implementation.test.cjs`, and `tests/2.3-rate-limit-calibration-stress-harness.test.cjs`.

### References

- PRD: `_bmad-output/prd.md` (FR5–FR8: arbitrage engine, pre-calculated bets vs local calculation, and rate-limit expectations).
- Architecture: `_bmad-output/architecture.md` ("Data Architecture", "High-Risk Domain Patterns – Rate Limiting (R-001)", "High-Risk Domain Patterns – Arbitrage Correctness (R-002)", provider adapter structure, and poller/rate-limiter integration).
- Epics: `_bmad-output/epics.md` (Epic 2, Story 2.4 – Production Adapter (Odds-API.io)).
- Prior Stories: `_bmad-output/implementation-artifacts/2-1-adapter-pattern-shared-types.md`, `_bmad-output/implementation-artifacts/2-2-rate-limiter-implementation.md`, `_bmad-output/implementation-artifacts/2-3-rate-limit-calibration-stress-harness.md` (shared contracts, rate limiting, and calibration harness behavior to preserve).

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->
- _bmad-output/implementation-artifacts/2-4-production-adapter-odds-api-io.context.xml

### Agent Model Used

BMAD Scrum Master (*create-story* workflow via Codex CLI / GPT-5.1)

### Debug Log References

- [2.4-ADAPTER-HTTP-001] `src/main/adapters/odds-api-io.ts`: OddsApiIoAdapter uses BaseArbitrageAdapter with centralized `scheduleProviderRequest` and calls the `/v3/arbitrage-bets` endpoint using credentials from `src/main/credentials.ts` (AC: #1).
- [2.4-FILTERS-001] `shared/filters.ts`: `filterOpportunitiesByRegionAndSport` applies sport/region filters on normalized `ArbitrageOpportunity` values, keeping filtering provider-agnostic (AC: #2, #4).
- [2.4-TESTS-001] `tests/2.4-production-adapter-odds-api-io.test.cjs`: focused tests cover adapter HTTP wiring, mapping into `ArbitrageOpportunity`, and poller + adapter + filters integration, reusing rate-limit and calibration patterns (AC: #1, #2, #3, #4, #5).

### Completion Notes List

- Initial draft created from PRD, architecture, epics, and Story 2.3 calibration learnings for Epic 2, Story 2.4; at that stage no implementation work or tests had been performed yet.
- Story moved to ready-for-dev after generating and linking the story context XML for 2-4-production-adapter-odds-api-io.
- Implemented production Odds-API.io adapter HTTP integration, shared region/sport filtering utilities, and 2.4-specific tests, with all acceptance criteria verified via `npm test` and story status moved to review.
 - Senior Developer Review (AI) completed with outcome Approve; all ACs #1-#5 and checked tasks verified against code and tests, and story status moved to done.

### File List

- _bmad-output/implementation-artifacts/2-4-production-adapter-odds-api-io.md
- _bmad-output/implementation-artifacts/2-4-production-adapter-odds-api-io.context.xml
- _bmad-output/implementation-artifacts/sprint-status.yaml
- shared/filters.ts
- src/main/adapters/odds-api-io.ts
- src/main/services/router.ts
- tests/2.4-production-adapter-odds-api-io.test.cjs

## Change Log

- Initial draft created from PRD, architecture, epics, and previous Story 2.3 learnings (Epic 2, Story 2.4 – Production Adapter (Odds-API.io)); implementation and tests were not yet completed.
- Story context generated via *create-story-context* (BMAD Story Context Workflow) for 2-4-production-adapter-odds-api-io, linked under Dev Agent Record, and story status updated to ready-for-dev.
- Implemented production adapter HTTP integration, poller wiring, shared region/sport filtering utilities, and 2.4-specific tests; story status updated to review and all regression and story tests passing.

## Senior Developer Review (AI)

- Reviewer: stefano
- Date: 2025-11-21
- Outcome: Approve (all ACs #1-#5 implemented and all checked tasks verified against code and tests; no blocking issues identified).

### Summary

- Backend production adapter (`OddsApiIoAdapter`) uses centralized credentials and rate-limiter infrastructure and calls the pre-calculated arbitrage endpoint as specified (AC #1; src/main/adapters/base.ts:2,12,18; src/main/adapters/odds-api-io.ts:47-48,75-83; src/main/services/poller.ts:32-38,278-295; tests/2.4-production-adapter-odds-api-io.test.cjs:23-124).
- Normalization into `ArbitrageOpportunity` preserves canonical shape and non-negative ROI, with schema validation enforced in the poller pipeline (AC #2; src/main/adapters/odds-api-io.ts:1,29-41,105-110; shared/types.ts:1-20; shared/schemas.ts:32-53; src/main/services/poller.ts:4,292).
- Provider switching via settings drives adapter selection in the poller, keeping renderer contracts on `ArbitrageOpportunity[]` only (AC #3; shared/types.ts:22-40; src/main/services/storage.ts:49-65; src/main/services/router.ts:1-19,35-46; src/main/services/poller.ts:243-263,278-295; src/renderer/src/features/settings/ProviderSettings.tsx:88-107,121-136; tests/1.3-INT-001..004).
- Region/sport filtering is implemented as a provider-agnostic post-normalization filter with coverage for production opportunities via poller + adapter + filters tests (AC #4; shared/filters.ts:1-25; tests/2.4-production-adapter-odds-api-io.test.cjs:173-273).
- Focused tests cover adapter HTTP wiring, mapping, and poller + filters integration, reusing Epic 2 rate-limit and calibration patterns (AC #5; tests/2.4-production-adapter-odds-api-io.test.cjs:23-30,97-136,173-273; tests/2.2-rate-limiter-implementation.test.cjs; tests/2.3-rate-limit-calibration-stress-harness.test.cjs; npm test).

### Key Findings

- HIGH severity: None.
- MEDIUM severity: None.
- LOW severity / Advisory:
  - Note: Consider adding an explicit unit test that exercises production adapter behavior when the provider returns an empty or malformed response body to document expected resilience (tests/2.4-production-adapter-odds-api-io.test.cjs).

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
| --- | --- | --- | --- |
| #1 | Production adapter calls pre-calculated arbitrage endpoint via centralized credentials and rate-limiter without bypassing the scheduler. | IMPLEMENTED | src/main/adapters/base.ts:2,3,12,18; src/main/adapters/odds-api-io.ts:47-48,52,55-59,75-83,96-104; src/main/services/poller.ts:32-38,195-237,278-295; tests/2.4-production-adapter-odds-api-io.test.cjs:23-124. |
| #2 | Production responses normalize into canonical `ArbitrageOpportunity` with correct metadata, two legs, and non-negative ROI aligned with schemas. | IMPLEMENTED | src/main/adapters/odds-api-io.ts:1,4-22,29-41,105-110; shared/types.ts:1-20; shared/schemas.ts:32-53; src/main/services/poller.ts:4,292; tests/2.4-production-adapter-odds-api-io.test.cjs:137-171. |
| #3 | When provider is set to Production, poller uses the production adapter and renderer-visible data remains provider-agnostic `ArbitrageOpportunity[]`. | IMPLEMENTED | shared/types.ts:22-40; src/main/services/storage.ts:49-65; src/main/services/router.ts:1-19,35-46; src/main/services/poller.ts:243-263,278-295; src/renderer/src/features/settings/ProviderSettings.tsx:88-107,121-136; tests/1.3-INT-001..004; tests/2.1-PIPELINE-001. |
| #4 | Region and sport filters, as defined in FR3/FR4, are applied post-normalization to production opportunities using shared filter utilities. | IMPLEMENTED | shared/filters.ts:1-25; shared/types.ts:1-20; src/main/adapters/odds-api-io.ts:29-41; src/main/services/poller.ts:278-295; tests/2.4-production-adapter-odds-api-io.test.cjs:173-273. |
| #5 | Focused tests exercise production adapter HTTP wiring, mapping, and poller + filters integration, reusing Epic 2 rate-limit/calibration patterns. | IMPLEMENTED | tests/2.4-production-adapter-odds-api-io.test.cjs:23-30,97-136,173-273; tests/2.2-rate-limiter-implementation.test.cjs; tests/2.3-rate-limit-calibration-stress-harness.test.cjs; package.json:7-18. |

### Task Completion Validation

- All tasks and subtasks under "Tasks / Subtasks" are marked complete and verified against the implemented code and tests; no falsely completed or questionable tasks were found.
  - Production adapter design, provider configuration, and centralized credentials/limiter usage: src/main/adapters/odds-api-io.ts:1-22,47-83,96-110; src/main/adapters/base.ts:1-19; src/main/credentials.ts:1-24; src/main/services/poller.ts:32-38,195-237,278-295; tests/2.4-production-adapter-odds-api-io.test.cjs:23-124.
  - Poller/provider selection wiring and renderer-facing contracts: shared/types.ts:22-40; src/main/services/storage.ts:49-65; src/main/services/router.ts:1-19,35-46; src/main/services/poller.ts:243-263,278-295; src/preload/index.ts:4-37; src/renderer/src/lib/trpc.ts:1-8; src/renderer/src/features/settings/ProviderSettings.tsx:88-107,121-136; tests/1.3-INT-001..004.
  - Region/sport filtering behavior applied after normalization on `ArbitrageOpportunity` objects: shared/filters.ts:1-25; shared/types.ts:1-20; src/main/adapters/odds-api-io.ts:29-41; src/main/services/poller.ts:278-295; tests/2.4-production-adapter-odds-api-io.test.cjs:173-273.
  - Focused tests for mapping and integration, reusing rate-limit/calibration patterns: tests/2.4-production-adapter-odds-api-io.test.cjs:23-30,97-136,173-273; tests/2.2-rate-limiter-implementation.test.cjs; tests/2.3-rate-limit-calibration-stress-harness.test.cjs; package.json:7-18.

### Test Coverage and Gaps

- `npm test` executes all Node-based suites, including 2.4-focused tests; all pass with one expected P0 dev smoke test skipped (`ENABLE_DEV_SMOKE=1` not set).
- No significant coverage gaps identified for AC #1-#5; future hardening could add explicit malformed/empty-response scenarios for the production adapter as noted above.

### Architectural Alignment

- Rate-limiting and quota behavior: production adapter calls are funneled through `scheduleProviderRequest` and Bottleneck-based limiter configuration shared with other providers (src/main/adapters/base.ts:1-19; src/main/services/poller.ts:32-38,96-137,139-237; tests/2.2-*.test.cjs; tests/2.3-*.test.cjs).
- Data architecture and normalization: production mapping targets the canonical `ArbitrageOpportunity` model and is validated via Zod schemas before reaching downstream consumers (src/main/adapters/odds-api-io.ts:29-41,105-110; shared/types.ts:1-20; shared/schemas.ts:32-53; src/main/services/poller.ts:4,292; tests/2.1-DATA-001,2.4-ADAPTER-MAPPING-001).
- Security boundaries: credentials are exclusively obtained via `src/main/credentials.ts` and stored via `src/main/services/storage.ts` without exposing raw keys to the renderer; production adapter does not log or expose API keys (src/main/credentials.ts:1-27; src/main/services/storage.ts:1-96; src/main/index.ts:5-13; src/preload/index.ts:14-37; tests/1.2-*,1.4-*).

### Security Notes

- No new high-risk security issues identified in Story 2.4 changes; API keys remain confined to the main process and are not logged or surfaced to the renderer.

### Action Items

**Code Changes Required:**
- None.

**Advisory Notes (no action required):**
- Note: Consider adding a small negative/edge-case response suite for the production adapter to explicitly capture behavior when the provider returns empty arrays, mixed invalid entries, or unexpected shapes (tests/2.4-production-adapter-odds-api-io.test.cjs; src/main/adapters/odds-api-io.ts).
